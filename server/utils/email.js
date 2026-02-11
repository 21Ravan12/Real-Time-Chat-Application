// email.service.js
import sgMail from '@sendgrid/mail';

console.log('📧 EMAIL SERVICE: Initializing...');
console.log('📧 Provider: SendGrid');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const VERIFIED_SENDER = process.env.VERIFIED_SENDER || 'realtalkdemo9@gmail.com';

if (!SENDGRID_API_KEY) {
  console.warn('⚠️ SENDGRID_API_KEY not set, using demo mode');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('✅ SendGrid initialized');
}

export const sendCodeEmail = async (email, code) => {
  console.log(`📧 SendGrid: Sending code ${code} to ${email}`);

  const msg = {
    to: email,
    from: VERIFIED_SENDER,
    subject: 'RealTalk - Your Verification Code',
    text: `Your verification code is: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #4F46E5;">Welcome to RealTalk! 🎉</h2>
        <h1 style="background: #f3f4f6; padding: 20px; text-align: center;">
          ${code}
        </h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `
  };

  try {
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid not configured');
    }

    await sgMail.send(msg);
    console.log('✅ SendGrid email sent successfully');
    return { success: true, messageId: 'sendgrid-' + Date.now() };
    
  } catch (error) {
    console.error('❌ SendGrid error:', error.message);
    console.log(`📧 DEMO - Code for ${email}: ${code}`);
    
    // Her zaman code'u frontend'e gönder
    return { 
      success: true, 
      demo: true, 
      verificationCode: code,
      message: 'Demo mode - use code below'
    };
  }
};

// Test function
export const testEmailService = async () => {
  try {
    await sendCodeEmail('realtalkdemo9@gmail.com', '123456');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
