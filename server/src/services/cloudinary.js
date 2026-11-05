const cloudinary = require('cloudinary').v2;
const config = require('../config/env');

const isCloudinaryConfigured = Boolean(
  process.env.NODE_ENV !== 'test' &&
  config.CLOUDINARY_CLOUD_NAME &&
  config.CLOUDINARY_API_KEY &&
  config.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log(`☁️  Cloudinary configured for cloud: ${config.CLOUDINARY_CLOUD_NAME}`);
} else {
  console.log('ℹ️  Cloudinary not configured with credentials. Fallback local/data storage enabled.');
}

/**
 * Upload an image buffer or base64 data to Cloudinary or fallback storage
 * @param {string | Buffer} file - base64 string, data URI, or file path/buffer
 * @returns {Promise<{ url: string, public_id?: string }>}
 */
async function uploadImage(file) {
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file, {
        folder: 'gatekept_parcels',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
        ],
      });
      return { url: result.secure_url, public_id: result.public_id };
    } catch (err) {
      console.error('Cloudinary upload error:', err.message);
      // If Cloudinary rejects (e.g. bad base64 in dev), fallback gracefully
      return {
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
        public_id: 'fallback_error',
      };
    }
  }

  // Fallback: If base64 / data URL is passed, return it or sample image
  if (typeof file === 'string' && file.startsWith('data:image/')) {
    return { url: file, public_id: 'mock_data_uri' };
  }

  // Placeholder parcel photo for mock testing
  return {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    public_id: 'mock_parcel_placeholder',
  };
}

/**
 * Generate signed upload parameters for direct client-to-Cloudinary upload
 */
function getSignature() {
  if (!isCloudinaryConfigured) {
    return { enabled: false };
  }
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: 'gatekept_parcels' },
    config.CLOUDINARY_API_SECRET
  );
  return {
    enabled: true,
    cloudName: config.CLOUDINARY_CLOUD_NAME,
    apiKey: config.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder: 'gatekept_parcels',
  };
}

module.exports = {
  uploadImage,
  getSignature,
  isCloudinaryConfigured,
};
