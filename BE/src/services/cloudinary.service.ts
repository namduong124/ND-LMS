import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { AppError } from '../utils/app-error';

if (!isCloudinaryConfigured) {
  console.warn('Warning: Cloudinary env vars not set. Image upload answers 503 until they are.');
}

/**
 * Uploads an image buffer to Cloudinary under the given folder.
 * Returns the secure URL and public ID of the uploaded asset.
 */
export const uploadImage = (buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> => {
  if (!isCloudinaryConfigured) {
    return Promise.reject(
      new AppError(503, 'Image upload is not configured. Set the CLOUDINARY_* variables in BE/.env.')
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          const errMsg = error?.message || 'Upload failed';
          const isPermissionErr = error?.http_code === 403 || String(errMsg).includes('missing permissions');
          const status = isPermissionErr ? 502 : (error?.http_code || 500);
          const detailedMsg = isPermissionErr
            ? 'Cloudinary từ chối quyền tải tệp (403 Forbidden: API Key thiếu quyền "create"). Vui lòng kiểm tra quyền Access Key trên Cloudinary.'
            : `Lỗi tải ảnh lên Cloudinary: ${errMsg}`;
          return reject(new AppError(status, detailedMsg));
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Uploads any file buffer (document, archive, image, code) to Cloudinary.
 * Uses resource_type: 'auto' so Cloudinary handles documents, archives and media properly.
 */
export const uploadFile = (
  buffer: Buffer,
  folder: string,
  options?: { originalFilename?: string; resourceType?: 'auto' | 'image' | 'raw' }
): Promise<{ url: string; publicId: string; format?: string; bytes?: number; originalFilename?: string }> => {
  if (!isCloudinaryConfigured) {
    return Promise.reject(
      new AppError(503, 'File upload is not configured. Set the CLOUDINARY_* variables in BE/.env.')
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: options?.resourceType || 'auto',
        use_filename: true,
        filename_override: options?.originalFilename
      },
      (error, result: any) => {
        if (error || !result) {
          const errMsg = error?.message || 'Upload failed';
          const isPermissionErr = error?.http_code === 403 || String(errMsg).includes('missing permissions');
          const status = isPermissionErr ? 502 : (error?.http_code || 500);
          const detailedMsg = isPermissionErr
            ? 'Cloudinary từ chối quyền tải tệp (403 Forbidden: API Key thiếu quyền "create"). Vui lòng kiểm tra quyền Access Key trên Cloudinary.'
            : `Lỗi tải tệp lên Cloudinary: ${errMsg}`;
          return reject(new AppError(status, detailedMsg));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes ?? buffer.byteLength,
          originalFilename: options?.originalFilename || result.original_filename
        });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Deletes an image from Cloudinary by its public ID.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  if (!isCloudinaryConfigured) return;
  await cloudinary.uploader.destroy(publicId);
};

/**
 * Deletes any file from Cloudinary by its public ID.
 */
export const deleteFile = async (
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'raw'
): Promise<void> => {
  if (!isCloudinaryConfigured) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};
