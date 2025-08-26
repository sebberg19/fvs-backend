// Netlify Function pour le webhook Stripe
// Location: netlify/functions/stripe-webhook.js

exports.config = {
  bodyParser: false, // CRITICAL: désactive le parsing automatique
};

const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configuration email
const createTransporter = () => {
  // Configuration Gmail SMTP
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Template email détaillé avec articles et photos
const renderEmailTemplate = (session, orderId) => {
  const customerEmail = session.customer_email || 'Non fourni';
  const total = ((session.amount_total || 0) / 100).toFixed(2);
  const currency = (session.currency || 'cad').toUpperCase();
  const paymentMethod = session.payment_method_types?.join(', ') || 'Card';
  const sessionId = session.id;
  
  // Extraire les articles depuis les métadonnées
  const metadata = session.metadata || {};
  let items = [];
  try {
    if (metadata.items) {
      items = JSON.parse(metadata.items);
    }
  } catch (e) {
    console.warn('[webhook] Failed to parse items from metadata:', e.message);
    items = [{ name: 'Commande Futbolero', quantity: 1, price: parseFloat(total), image: '' }];
  }
  
  // Générer le HTML des articles
  const itemsHtml = items.map(item => `
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; display: flex; align-items: center;">
      ${item.image ? `
        <img src="${item.image}" alt="${item.name}" 
             style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; margin-right: 15px;">
      ` : `
        <div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; margin-right: 15px; display: flex; align-items: center; justify-content: center; color: #999;">
          📦
        </div>
      `}
      <div style="flex: 1;">
        <h4 style="margin: 0 0 5px 0; color: #333;">${item.name}</h4>
        <p style="margin: 0; color: #666;">Quantité: ${item.quantity}</p>
        <p style="margin: 0; color: #2c5aa0; font-weight: bold;">$${(item.price || 0).toFixed(2)} CAD</p>
      </div>
    </div>
  `).join('');
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c5aa0;">🎉 Nouvelle commande reçue!</h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">📋 Détails de la commande</h3>
        <p><strong>ID Commande:</strong> ${orderId}</p>
        <p><strong>ID Session Stripe:</strong> ${sessionId}</p>
        <p><strong>Montant total:</strong> $${total} ${currency}</p>
        <p><strong>Méthode de paiement:</strong> ${paymentMethod}</p>
        <p><strong>Nombre d'articles:</strong> ${items.length}</p>
      </div>
      
      <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">👤 Informations client</h3>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Statut paiement:</strong> ✅ Confirmé</p>
      </div>
      
      <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #e9ecef;">
        <h3 style="color: #333; margin-top: 0;">🛍️ Articles commandés</h3>
        ${itemsHtml}
      </div>
      
      <div style="background: #f0f8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">📦 Prochaines étapes</h3>
        <p>✅ Paiement confirmé par Stripe</p>
        <p>⏳ Préparer la commande</p>
        <p>📧 Contacter le client: <a href="mailto:${customerEmail}">${customerEmail}</a></p>
      </div>
      
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        Email automatique - Futbolero Vintage Shop<br>
        Date: ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}
      </p>
    </div>
  `;
};

// Idempotence simple (en production, utiliser une DB)
const processedEvents = new Set();

exports.handler = async (event, context) => {
  console.log('[webhook] === WEBHOOK STARTED ===');
  console.log('[webhook] Method:', event.httpMethod);
  console.log('[webhook] Environment check:');
  console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING');
  console.log('- STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING');
  console.log('- SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'MISSING');
  console.log('- SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'MISSING');
  console.log('- ORDER_NOTIFY_TO:', process.env.ORDER_NOTIFY_TO ? 'SET' : 'MISSING');
  
  console.log('[webhook] Netlify function started');
  
  // Vérifier que c'est un POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!sig) {
    console.warn('[webhook] missing Stripe-Signature header');
    return {
      statusCode: 400,
      body: 'Missing Stripe-Signature header'
    };
  }

  console.log('[webhook] Raw body type:', typeof event.body);
  console.log('[webhook] Raw body length:', event.body ? event.body.length : 0);

  let stripeEvent;
  try {
    // event.body est une string raw avec bodyParser: false
    stripeEvent = stripe.webhooks.constructEvent(
      event.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('[webhook] Signature verification successful');
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };
  }

  console.log('[webhook] Event type:', stripeEvent.type, 'ID:', stripeEvent.id);

  // Idempotence
  if (processedEvents.has(stripeEvent.id)) {
    console.log('[webhook] Event already processed:', stripeEvent.id);
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, idempotent: true })
    };
  }
  processedEvents.add(stripeEvent.id);

  // Traiter checkout.session.completed
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    console.log('[webhook] Processing completed session:', session.id);

    // Envoyer email directement
    try {
      console.log('[webhook] Creating transporter...');
      const transporter = createTransporter();
      
      const customerEmail = session.customer_email || 'client@example.com';
      const total = ((session.amount_total || 0) / 100).toFixed(2);
      const orderId = session.metadata?.orderId || session.id;
      
      console.log('[webhook] Generating email template...');
      const emailHtml = renderEmailTemplate(session, orderId);
      
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ORDER_NOTIFY_TO,
        subject: `🛒 Nouvelle commande ${orderId} - $${total} CAD`,
        html: emailHtml,
      };
      
      console.log('[webhook] Sending email...');
      console.log('[webhook] From:', process.env.SMTP_USER);
      console.log('[webhook] To:', process.env.ORDER_NOTIFY_TO);
      
      const info = await transporter.sendMail(mailOptions);
      console.log('[webhook] Email sent successfully! MessageId:', info.messageId);
      
    } catch (emailErr) {
      console.error('[webhook] Email error:', emailErr.message);
      console.error('[webhook] Email stack:', emailErr.stack);
    }
  }

  // Réponse rapide à Stripe
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ received: true })
  };
};
