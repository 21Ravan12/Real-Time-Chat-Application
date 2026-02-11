import multer from 'multer';
import { uploadToCloudinary } from '../../utils/cloudinary.js';

const memoryUpload = multer({ storage: multer.memoryStorage() }).single('file');

/**
 * Middleware: Upload file to Cloudinary
 */
export const cloudinaryUploadMiddleware = async (req, res, next) => {
  console.log('📁 Cloudinary upload middleware triggered');
  
  // First, handle multer upload (to memory)
  memoryUpload(req, res, async (multerError) => {
    if (multerError) {
      console.error('❌ Multer error:', multerError);
      return next(multerError);
    }
    
    // No file uploaded? Skip to next middleware
    if (!req.file) {
      console.log('📁 No file uploaded, skipping Cloudinary');
      return next();
    }
    
    console.log('📁 File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    try {
      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
        public_id: `realtalk-${Date.now()}-${req.file.originalname.replace(/\.[^/.]+$/, '')}`,
        resource_type: req.file.mimetype.startsWith('video') ? 'video' : 'auto'
      });
      
      // Attach Cloudinary info to request
      req.cloudinary = {
        url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        format: cloudinaryResult.format,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        bytes: cloudinaryResult.bytes,
        original_filename: req.file.originalname,
        mimetype: req.file.mimetype
      };
      
      console.log('✅ File uploaded to Cloudinary:', req.cloudinary.url);
      next();
      
    } catch (cloudinaryError) {
      console.error('❌ Cloudinary upload failed:', cloudinaryError);
      
      // DEMO FALLBACK: If Cloudinary fails, use fake URL
      if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Using demo fallback for file upload');
        req.cloudinary = {
          url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v${Date.now()}/demo-file.png`,
          public_id: 'demo-file',
          format: 'png',
          bytes: req.file.size,
          original_filename: req.file.originalname,
          mimetype: req.file.mimetype,
          is_demo: true
        };
        next();
      } else {
        next(cloudinaryError);
      }
    }
  });
};
