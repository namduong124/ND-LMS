import path from 'path';
import multer, { memoryStorage } from 'multer';
import { badRequest } from '../utils/app-error';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Accepts one image up to 5 MB, kept in memory for `uploadImage()`.
 * Too-large files answer 413, other types 400 (see `errorMiddleware`).
 *
 *   router.post('/cover', authGuard, imageUpload.single('image'), uploadCover);
 */
export const imageUpload = multer({
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(badRequest('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  }
});

const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi', '.com', '.scr', '.pif'];

/**
 * Accepts assignment submission attachments up to 25 MB, kept in memory for `uploadFile()`.
 * Allows documents (PDF, Word, Excel, PPT), archives (ZIP, RAR, 7Z), images, text, and code files.
 * Rejects dangerous executable binaries.
 */
export const fileAttachmentUpload = multer({
  storage: memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      return cb(badRequest('Tệp thực thi không được phép tải lên vì lý do an toàn bảo mật'));
    }
    cb(null, true);
  }
});
