
import 'dotenv/config';
import Razorpay from 'razorpay';
import { randomUUID,  createHmac, timingSafeEqual, } from 'node:crypto';
import { supabase } from '../../config/db.js';
import { getBillingStatus } from './billing.manager.js';
import { logger } from '../../utils/logger.js';

/** GET /api/billing/status — how much free/credit allowance is left. */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = {
  starter: { amount: 4900, credits: 10 },
  pro: { amount: 9900, credits: 30 },
  power: { amount: 24900, credits: 100 },
};

export async function createPaymentOrder(req, res) {
  try {
    if (!process.env.RAZORPAY_KEY_ID ||
        !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        error: 'Razorpay keys are not configured',
      });
    }

    const { planId } = req.body || {};
    const plan = PLANS[planId];

    if (!plan) {
      return res.status(400).json({
        error: 'Invalid plan selected',
      });
    }

    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: 'INR',
      receipt: `cbe_${randomUUID().replaceAll('-', '').slice(0, 24)}`,
    });

    const { error } = await supabase
      .from('payment_orders')
      .insert({
        user_id: req.userId,
        razorpay_order_id: order.id,
        plan_id: planId,
        amount_paise: plan.amount,
        credits: plan.credits,
        status: 'pending',
      });

    if (error) {
      logger.error(error);
      return res.status(500).json({
        error: 'Failed to save payment order',
      });
    }

    return res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planId,
      credits: plan.credits,
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({
      error: 'Failed to create payment order',
    });
  }
}

export async function getStatus(req, res) {
  try {
    const status = await getBillingStatus(req.userId);
    res.json(status);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function verifyPayment(req, res) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        error: 'Missing payment verification details',
      });
    }

    // Ensure the order belongs to the authenticated user.
    const { data: paymentOrder, error: orderError } =
      await supabase
        .from('payment_orders')
        .select('razorpay_order_id, status')
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('user_id', req.userId)
        .single();

    if (orderError || !paymentOrder) {
      return res.status(404).json({
        error: 'Payment order not found',
      });
    }

    const expectedSignature = createHmac(
      'sha256',
      process.env.RAZORPAY_KEY_SECRET
    )
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expected = Buffer.from(expectedSignature, 'hex');
    const received = Buffer.from(razorpay_signature, 'hex');

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      return res.status(400).json({
        error: 'Invalid payment signature',
      });
    }

    // Confirm Razorpay reports this payment as captured.
    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== 'captured'
    ) {
      return res.status(400).json({
        error: 'Payment has not been captured',
      });
    }

    const { data, error } = await supabase.rpc(
      'complete_razorpay_order',
      {
        p_user_id: req.userId,
        p_order_id: razorpay_order_id,
        p_payment_id: razorpay_payment_id,
      }
    );

    if (error) {
      logger.error(error);
      return res.status(500).json({
        error: 'Could not complete payment',
      });
    }

    return res.json(data);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({
      error: 'Payment verification failed',
    });
  }
}



