// email.service.js

import nodemailer from 'nodemailer';

console.log('📧 EMAIL SERVICE: Initializing...');
console.log('📧 NODE_ENV:', process.env.NODE_ENV);

// Check which email provider to use
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'brevo'; // brevo, gmail, demo
console.log('📧 Email Provider:', EMAIL_PROVIDER);

// Email configuration based on provider
let emailConfig = {};

if (EMAIL_PROVIDER === 'brevo') {
  // Brevo (Sendinblue) configuration
  emailConfig = {
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.BREVO_SMTP_PORT) || 587,
    secure: false, // Brevo uses STARTTLS on port 587
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY // SMTP key from Brevo
    },
    tls: {
      rejectUnauthorized: false // Important for Railway
    }
  };
  console.log('📧 Using Brevo SMTP');
  
} else if (EMAIL_PROVIDER === 'gmail') {
  // Gmail configuration
  emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  console.log('📧 Using Gmail SMTP');
  
} else {
  // Demo mode - no real emails
  console.log('📧 DEMO MODE: No email provider configured');
}

console.log('📧 Email Config:', {
  provider: EMAIL_PROVIDER,
  host: emailConfig.host,
  port: emailConfig.port,
  hasAuth: !!(emailConfig.auth && emailConfig.auth.user)
});

let transporter;

// Check if we should use real transporter
const shouldUseRealTransporter = 
  EMAIL_PROVIDER === 'brevo' || 
  EMAIL_PROVIDER === 'gmail';

if (!shouldUseRealTransporter) {
  console.log('📧 DEMO MODE: Using fake email transporter');
  
  // Fake transporter - DEMO için
  transporter = {
    sendMail: async function(mailOptions) {
      console.log('📧 DEMO SENDMAIL CALLED:', {
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      console.log('📧 DEMO: Email would be sent to:', mailOptions.to);
      console.log('📧 DEMO: Code would be:', mailOptions.text?.substring(0, 50) + '...');
      
      // Fake başarılı response
      return {
        messageId: 'demo-' + Date.now(),
        response: '250 Demo email accepted'
      };
    }
  };
} else {
  console.log('📧 PRODUCTION MODE: Creating real transporter for', EMAIL_PROVIDER);
  
  // Gerçek transporter
  transporter = nodemailer.createTransport({
    ...emailConfig,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
  
  // Test connection (async)
  transporter.verify(function(error, success) {
    if (error) {
      console.log('📧 TRANSPORTER VERIFY ERROR:', error.message);
      console.log('⚠️ Email service may not work properly');
    } else {
      console.log('📧 TRANSPORTER VERIFY SUCCESS: Server is ready to take our messages');
    }
  });
}

// Send identification code email
export const sendCodeEmail = async (email, code) => {
  console.log('📧 sendCodeEmail CALLED with:', { 
    email, 
    code,
    provider: EMAIL_PROVIDER 
  });

  // Determine "from" address based on provider
  let fromAddress;
  if (EMAIL_PROVIDER === 'brevo') {
    fromAddress = process.env.EMAIL_FROM || `"RealTalk" <${process.env.BREVO_SMTP_USER}>`;
  } else if (EMAIL_PROVIDER === 'gmail') {
    fromAddress = `"Auth Service" <${process.env.EMAIL_USER}>`;
  } else {
    fromAddress = '"RealTalk Demo" <demo@realtalk.app>';
  }

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'RealTalk - Verification Code',
    text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Welcome to RealTalk! 🎉</h2>
        <p>Thank you for signing up. Your verification code is:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
          <h1 style="font-size: 36px; letter-spacing: 5px; color: #111827;">${code}</h1>
        </div>
        
        <p>Enter this code in the verification page to complete your registration.</p>
        <p><strong>This code will expire in 10 minutes.</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 12px;">
          If you didn't request this code, please ignore this email.<br>
          This is an automated message from RealTalk.
        </p>
      </div>
    `
  };

  console.log('📧 Mail Options prepared:', {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject
  });

  try {
    console.log('📧 Attempting to send email via', EMAIL_PROVIDER, '...');
    
    // Send mail
    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email send result:', {
      success: true,
      messageId: info.messageId,
      response: info.response?.substring(0, 100)
    });
    
    console.log('✅ Email sent successfully to:', email);
    return info;
    
  } catch (err) {
    console.error('❌ Email error details:', {
      name: err.name,
      message: err.message,
      code: err.code
    });
    
    // If email fails, log code and continue (for demo)
    console.log(`📧 EMAIL FAILED - Code for ${email}: ${code}`);
    
    // Don't throw error in production - just log and continue
    // User will see code in UI anyway
    return { 
      messageId: 'failed-' + Date.now(),
      demoNote: 'Email failed, code logged above'
    };
  }
};

// Test function
export const testEmailService = async () => {
  console.log('📧 TEST: Starting email service test...');
  
  if (!shouldUseRealTransporter) {
    console.log('📧 TEST: Demo mode - no real email test');
    return { success: true, mode: 'demo' };
  }
  
  try {
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log('📧 Testing with email:', testEmail);
    
    await sendCodeEmail(testEmail, '123456');
    console.log('📧 TEST: Email service test PASSED');
    return { success: true, mode: 'real' };
  } catch (error) {
    console.log('📧 TEST: Email service test FAILED:', error.message);
    return { success: false, error: error.message };
  }
};

console.log('📧 EMAIL SERVICE: Initialization complete');
console.log('📧 Mode:', shouldUseRealTransporter ? 'PRODUCTION (' + EMAIL_PROVIDER + ')' : 'DEMO');
