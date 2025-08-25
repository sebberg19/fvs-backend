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

// Template email simple
const renderEmailTemplate = (orderId, customerEmail, items, total) => {
  const itemsHtml = (items || []).map(item => 
    `<li><strong>${item.name}</strong> × ${item.quantity || 1} - $${(item.price || 0).toFixed(2)}</li>`
  ).join('');
  
  return `
    <h2>Nouvelle commande reçue! 🎉</h2>
    <p><strong>Commande:</strong> ${orderId}</p>
    <p><strong>Email client:</strong> ${customerEmail}</p>
    <p><strong>Total:</strong> $${total}</p>
    <h3>Articles:</h3>
    <ul>${itemsHtml}</ul>
    <hr>
    <p>Email automatique - Futbolero Vintage Shop</p>
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
        
        // Items basiques (tu peux enrichir depuis session.metadata si tu stockes plus d'infos)
        const items = [
          { name: 'Commande Futbolero', quantity: 1, price: parseFloat(total) }
        ];

        const emailHtml = renderEmailTemplate(orderId, customerEmail, items, total);
        const ownerEmail = process.env.ORDER_NOTIFY_TO || process.env.SMTP_USER || 'owner@futbolero.shop';

        if (transporter) {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: ownerEmail,
            subject: `Nouvelle commande ${orderId} - $${total}`,
            html: emailHtml,
          });
          console.log('[webhook] Email sent to:', ownerEmail);
        } else {
          console.log('[webhook] SMTP not configured, email logged:', {
            to: ownerEmail,
            subject: `Nouvelle commande ${orderId} - $${total}`,
            orderId,
            customerEmail,
            total
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
