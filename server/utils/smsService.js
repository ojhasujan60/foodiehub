// SMS Service - with graceful fallback if twilio not installed
let twilio;

try {
  twilio = require('twilio');
  console.log('✅ Twilio loaded successfully');
} catch (error) {
  console.log('⚠️ Twilio not installed. SMS notifications will be logged only.');
  twilio = null;
}

// Initialize Twilio client
let client = null;

if (twilio && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('✅ Twilio client configured');
} else {
  console.log('⚠️ SMS not configured. Set TWILIO_* variables in .env to enable SMS.');
}

const sendSMS = async ({ to, message }) => {
  try {
    // If twilio is not available or client not configured, just log
    if (!twilio || !client) {
      console.log(`📱 [DEV] SMS would be sent to ${to}: ${message}`);
      return { success: true, message: 'SMS logged (SMS service not configured)' };
    }
    
    const result = await client.messages.create({
      body: message,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    
    console.log(`✅ SMS sent to ${to}, SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    // Don't throw - just log the error
    return { success: false, message: error.message };
  }
};

module.exports = { sendSMS };