// Importing required modules
import nodemailer from 'nodemailer';
import { emailCredentials } from '../config/email.config.js';

// Creating a transporter object using nodemailer for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailCredentials.user,
    pass: emailCredentials.pass
  }
});

// Function to send an identification code email
export const sendCodeEmail = async (email, code) => {
  const mailOptions = {
    from: emailCredentials.user,
    to: email,
    subject: 'Identification',
    text: `Your identification code is: ${code}`
  };

  try {
    // Sending the email using the transporter
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (err) {
    // Logging and throwing an error if email sending fails
    console.error("Email error:", err);
    throw new Error(`Failed to send email. ${err.message}`);
  }
};