import multer from 'multer';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.resolve('tmp_uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Store ZIPs on disk instead of holding the entire multipart body in RAM.
// This prevents Node from resetting the connection for larger repositories.
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/zip' && !file.originalname.toLowerCase().endsWith('.zip')) {
      return cb(new Error('Only .zip files are accepted'));
    }
    cb(null, true);
  },
});

export default upload;
