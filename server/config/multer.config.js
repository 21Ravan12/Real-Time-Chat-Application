import multer from 'multer';

// Memory storage kullan (Cloudinary'e buffer göndereceğiz)
const storage = multer.memoryStorage();

const upload = multer({
  storage: multer.memoryStorage(), // Dosyayı memory'de tut
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Sadece image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
    }
  }
});

export default upload;
