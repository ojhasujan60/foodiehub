// Email Service - with graceful fallback if nodemailer not installed
let nodemailer;

try {
  nodemailer = require('nodemailer');
  console.log('✅ Nodemailer loaded successfully');
} catch (error) {
  console.log('⚠️ Nodemailer not installed. Email notifications will be logged only.');
  nodemailer = null;
}

// Configure email transporter
let transporter = null;

if (nodemailer && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('✅ Email transporter configured');
} else {
  console.log('⚠️ Email not configured. Set EMAIL_USER and EMAIL_PASS in .env to enable emails.');
}

const sendEmail = async ({ to, subject, html }) => {
  try {
    // If nodemailer is not available or transporter not configured, just log
    if (!nodemailer || !transporter) {
      console.log(`📧 [DEV] Email would be sent to ${to}: ${subject}`);
      console.log(`HTML Preview: ${html.substring(0, 200)}...`);
      return { success: true, message: 'Email logged (email service not configured)' };
    }
    
    const mailOptions = {
      from: `"FoodieHub" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}, Message ID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    // Don't throw - just log the error
    return { success: false, message: error.message };
  }
};

module.exports = { sendEmail };