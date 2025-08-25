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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP not configured, emails will be logged only');
    return null;
  }
  
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Template email détaillé
const renderEmailTemplate = (session, orderId) => {
  const customerEmail = session.customer_email || 'Non fourni';
  const total = ((session.amount_total || 0) / 100).toFixed(2);
  const currency = (session.currency || 'cad').toUpperCase();
  const paymentMethod = session.payment_method_types?.join(', ') || 'Card';
  const sessionId = session.id;
  
  // Extraire infos du metadata si disponibles
  const metadata = session.metadata || {};
  const itemCount = metadata.itemCount || '1';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c5aa0;">🎉 Nouvelle commande reçue!</h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">📋 Détails de la commande</h3>
        <p><strong>ID Commande:</strong> ${orderId}</p>
        <p><strong>ID Session Stripe:</strong> ${sessionId}</p>
        <p><strong>Montant total:</strong> $${total} ${currency}</p>
        <p><strong>Méthode de paiement:</strong> ${paymentMethod}</p>
        <p><strong>Nombre d'articles:</strong> ${itemCount}</p>
      </div>
      
      <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">👤 Informations client</h3>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Statut paiement:</strong> ✅ Confirmé</p>
      </div>
      
      <div style="background: #f0f8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">📦 Prochaines étapes</h3>
        <p>✅ Paiement confirmé par Stripe</p>
        <p>⏳ Préparer la commande</p>
        <p>📧 Contacter le client si nécessaire</p>
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

    // Envoyer email (async, ne pas bloquer la réponse)
    setImmediate(async () => {
      try {
        const transporter = createTransporter();
        const customerEmail = session.customer_email || 'client@example.com';
        const total = ((session.amount_total || 0) / 100).toFixed(2);
        const orderId = session.metadata?.orderId || session.id;
        
        const emailHtml = renderEmailTemplate(session, orderId);
        const ownerEmail = 'futbolerovintageshop@gmail.com'; // Email fixe

        if (transporter) {
          await transporter.sendMail({
            from: process.env.SMTP_USER || 'noreply@futbolero.shop',
            to: ownerEmail,
            subject: `🛒 Nouvelle commande ${orderId} - $${total} CAD`,
            html: emailHtml,
          });
          console.log('[webhook] Email sent to:', ownerEmail);
        } else {
          console.log('[webhook] SMTP not configured, email logged:', {
            to: ownerEmail,
            subject: `Nouvelle commande ${orderId} - $${total}`,
            orderId,
            customerEmail,
            total,
            sessionId: session.id
          });
        }
      } catch (emailErr) {
        console.error('[webhook] Email error:', emailErr.message);
      }
    });
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
