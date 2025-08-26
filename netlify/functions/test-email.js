// Test simple d'email Netlify Function
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  console.log('[test-email] Starting email test...');
  
  // Vérifier les variables d'environnement
  console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'MISSING');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'MISSING');
  console.log('ORDER_NOTIFY_TO:', process.env.ORDER_NOTIFY_TO ? 'SET' : 'MISSING');
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    console.log('[test-email] Transporter created');
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.ORDER_NOTIFY_TO,
      subject: '🧪 Test Email Futbolero',
      text: 'Ceci est un test simple d\'email',
      html: '<h1>TEST EMAIL</h1><p>Si vous recevez ceci, l\'email fonctionne!</p>'
    };
    
    console.log('[test-email] Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('[test-email] Email sent successfully:', info.messageId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        messageId: info.messageId,
        message: 'Email sent successfully'
      })
    };
    
  } catch (error) {
    console.error('[test-email] Error:', error.message);
    console.error('[test-email] Error stack:', error.stack);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};
