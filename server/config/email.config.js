// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

export const emailCredentials = {
  // Email address used for sending emails
  user: process.env.EMAIL_USER || '',
  
  // Password for the email account
  pass: process.env.EMAIL_PASS || ''
};
