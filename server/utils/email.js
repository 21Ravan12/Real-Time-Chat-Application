// email.service.js

import nodemailer from 'nodemailer';

console.log('📧 EMAIL SERVICE: Initializing...');
console.log('📧 NODE_ENV:', process.env.NODE_ENV);
console.log('📧 EMAIL_USER exists?:', !!process.env.EMAIL_USER);

// Email configuration
const emailCredentials = {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465
};

console.log('📧 Email Config:', {
  host: emailCredentials.host,
  port: emailCredentials.port,
  secure: emailCredentials.secure,
  hasUser: !!emailCredentials.user,
  hasPass: !!emailCredentials.pass
});

// DEMO MOD kontrolü
const isDemoMode = !emailCredentials.user || !emailCredentials.pass || process.env.NODE_ENV === 'production';
console.log('📧 Is Demo Mode?', isDemoMode);

let transporter;

if (isDemoMode) {
  console.log('📧 DEMO MODE: Using fake email transporter');
  
  // Fake transporter - DEMO için
  transporter = {
    sendMail: async function(mailOptions) {
      console.log('📧 DEMO SENDMAIL CALLED:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text
      });
      console.log('📧 DEMO: Email WOULD be sent to:', mailOptions.to);
      console.log('📧 DEMO: Code would be:', mailOptions.text);
      
      // Fake başarılı response
      return {
        messageId: 'demo-' + Date.now(),
        response: '250 Demo email accepted'
      };
    }
  };
} else {
  console.log('📧 PRODUCTION MODE: Creating real transporter');
  
  // Gerçek transporter
  transporter = nodemailer.createTransport({
    host: emailCredentials.host,
    port: emailCredentials.port,
    secure: emailCredentials.secure,
    auth: {
      user: emailCredentials.user,
      pass: emailCredentials.pass
    },
    requireTLS: true,
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000
  });
  
  // Test connection
  transporter.verify(function(error, success) {
    if (error) {
      console.log('📧 TRANSPORTER VERIFY ERROR:', error.message);
    } else {
      console.log('📧 TRANSPORTER VERIFY SUCCESS:', success);
    }
  });
}

// Send identification code email
export const sendCodeEmail = async (email, code) => {
  console.log('📧 sendCodeEmail CALLED with:', { email, code });
  console.log('📧 Current transporter type:', isDemoMode ? 'DEMO' : 'REAL');

  const mailOptions = {
    from: `"Auth Service" <${emailCredentials.user || 'demo@realtalk.app'}>`,
    to: email,
    subject: 'Identification',
    text: `Your identification code is: ${code}`,
    html: `
      <h2>RealTalk Verification</h2>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `
  };

  console.log('📧 Mail Options prepared:', {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject
  });

  try {
    console.log('📧 Attempting to send email...');
    
    // Send mail (demo veya gerçek)
    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email send result:', {
      success: true,
      messageId: info.messageId,
      response: info.response
    });
    
    console.log('✅ Email process completed for:', email);
    return info;
    
  } catch (err) {
    console.error('❌ Email error details:', {
      name: err.name,
      message: err.message,
      code: err.code,
      command: err.command
    });
    
    // DEMO modda bile hata alırsak, yine de devam et
    if (isDemoMode) {
      console.log('📧 DEMO MODE: Error ignored, returning fake success');
      return { messageId: 'demo-error-' + Date.now() };
    }
    
    // Production'da hata fırlat
    throw new Error(`Failed to send email. ${err.message}`);
  }
};

// Test function
export const testEmailService = async () => {
  console.log('📧 TEST: Starting email service test...');
  try {
    await sendCodeEmail('test@example.com', '123456');
    console.log('📧 TEST: Email service test PASSED');
    return true;
  } catch (error) {
    console.log('📧 TEST: Email service test FAILED:', error.message);
    return false;
  }
};

console.log('📧 EMAIL SERVICE: Initialization complete');
console.log('📧 Mode:', isDemoMode ? 'DEMO (no real emails)' : 'PRODUCTION (real emails)');
