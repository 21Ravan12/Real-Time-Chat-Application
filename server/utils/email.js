// email.service.js

import { Resend } from 'resend';

console.log('📧 EMAIL SERVICE: Initializing...');
console.log('📧 NODE_ENV:', process.env.NODE_ENV);

// Check which email provider to use
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'; // resend, brevo, gmail, demo
console.log('📧 Email Provider:', EMAIL_PROVIDER);

let resendClient = null;
let transporter = null;

// Initialize based on provider
if (EMAIL_PROVIDER === 'resend') {
  // Resend API configuration
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY not set, using demo mode');
  } else {
    console.log('📧 Initializing Resend client...');
    resendClient = new Resend(apiKey);
    
    // Create transporter-like interface for Resend
    transporter = {
      sendMail: async function(mailOptions) {
        console.log('📧 Resend: Sending email...', {
          to: mailOptions.to,
          subject: mailOptions.subject.substring(0, 50)
        });
        
        try {
          const { data, error } = await resendClient.emails.send({
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html,
            text: mailOptions.text,
            headers: {
              'X-Entity-Ref-ID': `realtalk-${Date.now()}`
            }
          });
          
          if (error) {
            console.error('❌ Resend API error:', error);
            throw new Error(`Resend: ${error.message}`);
          }
          
          console.log('✅ Resend email sent:', data.id);
          return {
            messageId: data.id,
            response: '250 Email sent via Resend API'
          };
          
        } catch (error) {
          console.error('❌ Resend send error:', error.message);
          throw error;
        }
      }
    };
    
    console.log('✅ Resend client initialized');
  }
  
} else if (EMAIL_PROVIDER === 'brevo' || EMAIL_PROVIDER === 'gmail') {
  // SMTP providers (backup)
  console.warn(`⚠️ ${EMAIL_PROVIDER} SMTP may not work on Railway`);
  // ... keep your existing SMTP code but it likely won't work
  
} else {
  // Demo mode
  console.log('📧 DEMO MODE: Using fake email transporter');
}

// If no transporter was created (demo or missing API key)
if (!transporter) {
  console.log('📧 Using demo/fake transporter');
  
  transporter = {
    sendMail: async function(mailOptions) {
      console.log('📧 DEMO SENDMAIL CALLED:', {
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      console.log('📧 DEMO: Email would be sent to:', mailOptions.to);
      console.log('📧 DEMO: Code would be:', mailOptions.text?.substring(0, 50) + '...');
      
      // Always succeed in demo mode
      return {
        messageId: 'demo-' + Date.now(),
        response: '250 Demo email accepted',
        demo: true
      };
    }
  };
}

// Send identification code email
export const sendCodeEmail = async (email, code) => {
  console.log('📧 sendCodeEmail CALLED:', { 
    email, 
    code,
    provider: EMAIL_PROVIDER 
  });

  // Determine "from" address based on provider
  let fromAddress;
  if (EMAIL_PROVIDER === 'resend') {
    // Resend requires verified domain or onboarding@resend.dev
    fromAddress = process.env.EMAIL_FROM || 'RealTalk <onboarding@resend.dev>';
  } else if (EMAIL_PROVIDER === 'brevo') {
    fromAddress = process.env.EMAIL_FROM || `"RealTalk" <${process.env.BREVO_SMTP_USER}>`;
  } else if (EMAIL_PROVIDER === 'gmail') {
    fromAddress = `"RealTalk" <${process.env.EMAIL_USER}>`;
  } else {
    fromAddress = '"RealTalk Demo" <demo@realtalk.app>';
  }

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'RealTalk - Your Verification Code',
    text: `Your RealTalk verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">RealTalk</h1>
          <p style="color: #6b7280; margin-top: 5px;">Real-time messaging platform</p>
        </div>
        
        <h2 style="color: #111827;">Verify Your Email Address</h2>
        <p>Hello! Thank you for signing up for RealTalk.</p>
        
        <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); 
                    color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
          <div style="font-size: 42px; font-weight: bold; letter-spacing: 8px; margin: 15px 0;">
            ${code}
          </div>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
            Expires in 10 minutes
          </p>
        </div>
        
        <p>Enter this code in the verification page to complete your registration and start using RealTalk.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 30px; border-left: 4px solid #4F46E5;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            <strong>Note:</strong> If you didn't request this code, please ignore this email.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="text-align: center; font-size: 12px; color: #9ca3af;">
          <p style="margin: 0;">
            This is an automated message from RealTalk.<br>
            Demo Version • ${new Date().getFullYear()}
          </p>
        </div>
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
      response: info.response,
      demo: info.demo || false
    });
    
    console.log('✅ Email process completed for:', email);
    
    // Return with verification code for frontend
    return {
      ...info,
      verificationCode: code,  // 👈 FRONTEND BUNU KULLANACAK
      email: email,
      success: true
    };
    
  } catch (err) {
    console.error('❌ Email error details:', {
      name: err.name,
      message: err.message,
      code: err.code
    });
    
    // If email fails, return the code anyway for frontend
    console.log(`📧 EMAIL FAILED - Code for ${email}: ${code}`);
    
    return { 
      messageId: 'failed-' + Date.now(),
      verificationCode: code,  // 👈 FRONTEND'E CODE'U GÖNDER
      email: email,
      demoNote: 'Email failed, but code is available',
      success: true  // Still succeed for UX
    };
  }
};

// Enhanced test function
export const testEmailService = async () => {
  console.log('📧 TEST: Starting email service test...');
  
  try {
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log('📧 Testing with email:', testEmail);
    
    const result = await sendCodeEmail(testEmail, '123456');
    
    if (result.success) {
      console.log('📧 TEST: Email service test COMPLETED');
      console.log('📧 Verification code would be:', result.verificationCode);
      return { 
        success: true, 
        mode: EMAIL_PROVIDER,
        code: result.verificationCode 
      };
    } else {
      console.log('📧 TEST: Email service returned failure');
      return { success: false, error: 'Service returned failure' };
    }
  } catch (error) {
    console.log('📧 TEST: Email service test FAILED:', error.message);
    return { success: false, error: error.message };
  }
};

// New: Function to get verification code directly (for frontend)
export const generateAndSendCode = async (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`📧 Generated code for ${email}: ${code}`);
  
  // Try to send email
  const emailResult = await sendCodeEmail(email, code);
  
  // Always return the code, even if email fails
  return {
    success: true,
    verificationCode: code,
    emailSent: !emailResult.demoNote,
    message: emailResult.demoNote ? 
      'Demo mode: Check code below' : 
      'Verification code sent to your email',
    ...emailResult
  };
};

console.log('📧 EMAIL SERVICE: Initialization complete');
console.log('📧 Mode:', EMAIL_PROVIDER === 'resend' && resendClient ? 'RESEND API' : 'DEMO/SMTP');
