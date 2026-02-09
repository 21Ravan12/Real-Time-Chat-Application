// email.service.js

import nodemailer from 'nodemailer';

// Email configuration
const emailCredentials = {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465
};

// Create transporter
const transporter = nodemailer.createTransport({
  host: emailCredentials.host,
  port: emailCredentials.port,
  secure: emailCredentials.secure,
  auth: {
    user: emailCredentials.user,
    pass: emailCredentials.pass
  },
  requireTLS: true,
  tls: {
    rejectUnauthorized: false // Railway / cloud ortamları için
  },
  connectionTimeout: 10000
});

// Send identification code email
export const sendCodeEmail = async (email, code) => {
  const mailOptions = {
    from: `"Auth Service" <${emailCredentials.user}>`,
    to: email,
    subject: 'Identification',
    text: `Your identification code is: ${code}`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
  } catch (err) {
    console.error('Email error:', err);
    throw new Error(`Failed to send email. ${err.message}`);
  }
};
