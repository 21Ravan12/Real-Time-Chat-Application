import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configuration function (doesn't auto-run)
const configureCloudinary = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('⚠️ Cloudinary not configured - missing env variables');
    return null;
  }
  
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  console.log('📁 Cloudinary configured for:', process.env.CLOUDINARY_CLOUD_NAME);
  return cloudinary;
};

// Initialize only when needed
let cloudinaryInstance = null;

const getCloudinary = () => {
  if (!cloudinaryInstance) {
    cloudinaryInstance = configureCloudinary();
  }
  return cloudinaryInstance;
};

// Upload function
export const uploadToCloudinary = (fileBuffer, options = {}) => {
  const cloudinary = getCloudinary();
  if (!cloudinary) {
    throw new Error('Cloudinary not configured');
  }
  
  return new Promise((resolve, reject) => {
    console.log('📁 Uploading to Cloudinary...', {
      size: fileBuffer.length,
      options: options
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'realtalk-uploads',
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4', 'mov'],
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto:good' }
        ],
        ...options
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload successful:', {
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            size: result.bytes
          });
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// Delete function
export const deleteFromCloudinary = async (publicId) => {
  const cloudinary = getCloudinary();
  if (!cloudinary) {
    console.warn('⚠️ Cloudinary not configured, skipping delete');
    return null;
  }
  
  try {
    console.log('🗑️ Deleting from Cloudinary:', publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Deletion result:', result);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary deletion error:', error);
    throw error;
  }
};

// Test function
export const testCloudinaryConnection = async () => {
  const cloudinary = getCloudinary();
  if (!cloudinary) {
    console.log('⚠️ Cloudinary not configured for testing');
    return false;
  }
  
  try {
    console.log('🧪 Testing Cloudinary connection...');
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection test:', result);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection test failed:', error.message);
    return false;
  }
};

// Optional: Export configured instance
export const initCloudinary = () => getCloudinary();

// Don't export cloudinary by default
export default { uploadToCloudinary, deleteFromCloudinary, testCloudinaryConnection };
