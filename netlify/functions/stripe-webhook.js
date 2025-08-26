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
  
  // Extraire les informations de livraison
  const customerDetails = session.customer_details || {};
  const address = customerDetails.address || {};
  const customerName = customerDetails.name || 'Non fourni';
  const customerPhone = customerDetails.phone || 'Non fourni';
  
  // Formater l'adresse
  const fullAddress = [
    address.line1,
    address.line2,
    `${address.city || ''} ${address.state || ''} ${address.postal_code || ''}`.trim(),
    address.country || ''
  ].filter(Boolean).join('<br>') || 'Adresse non fournie';
  
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
        <p><strong>Nom:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Téléphone:</strong> ${customerPhone}</p>
        <p><strong>Statut paiement:</strong> ✅ Confirmé</p>
      </div>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ffeaa7;">
        <h3 style="color: #333; margin-top: 0;">🏠 Adresse de livraison</h3>
        <div style="background: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #e9ecef;">
          <p style="margin: 0; line-height: 1.6;">${fullAddress}</p>
        </div>
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
        <p>📞 Téléphone client: ${customerPhone}</p>
      </div>
      
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        Email automatique - Futbolero Vintage Shop<br>
        Date: ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}
      </p>
    </div>
  `;
};

// Template email pour le CLIENT (confirmation de commande)
const renderCustomerEmailTemplate = (session, orderId) => {
  const customerEmail = session.customer_email || 'Non fourni';
  const total = ((session.amount_total || 0) / 100).toFixed(2);
  const currency = (session.currency || 'cad').toUpperCase();
  const customerDetails = session.customer_details || {};
  const customerName = customerDetails.name || 'Cher(e) client(e)';
  
  // Extraire les articles depuis les métadonnées
  const metadata = session.metadata || {};
  let items = [];
  try {
    if (metadata.items) {
      items = JSON.parse(metadata.items);
    }
  } catch (e) {
    items = [{ name: 'Votre commande Futbolero', quantity: 1, price: parseFloat(total), image: '' }];
  }
  
  // Générer le HTML des articles pour le client
  const itemsHtml = items.map(item => `
    <div style="border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin: 10px 0; display: flex; align-items: center; background: #ffffff;">
      ${item.image && !item.image.includes('data:image/svg') ? `
        <img src="${item.image}" alt="${item.name}" 
             style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 15px;">
      ` : `
        <div style="width: 60px; height: 60px; background: linear-gradient(45deg, #2c5aa0, #4a90e2); border-radius: 4px; margin-right: 15px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
          ⚽
        </div>
      `}
      <div style="flex: 1;">
        <h4 style="margin: 0 0 5px 0; color: #333; font-size: 16px;">${item.name}</h4>
        <p style="margin: 0; color: #666; font-size: 14px;">Quantité: ${item.quantity}</p>
        <p style="margin: 0; color: #2c5aa0; font-weight: bold; font-size: 16px;">$${(item.price || 0).toFixed(2)} CAD</p>
      </div>
    </div>
  `).join('');
  
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header avec logo/brand -->
      <div style="background: linear-gradient(135deg, #2c5aa0 0%, #4a90e2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">⚽ Futbolero</h1>
        <p style="color: #e8f4f8; margin: 10px 0 0 0; font-size: 16px;">Vintage Shop</p>
      </div>
      
      <!-- Message de remerciement -->
      <div style="background: #f8f9fa; padding: 30px 20px; text-align: center;">
        <h2 style="color: #2c5aa0; margin: 0 0 15px 0; font-size: 24px;">🎉 Merci pour votre commande!</h2>
        <p style="color: #333; margin: 0; font-size: 16px; line-height: 1.6;">
          Bonjour <strong>${customerName}</strong>,<br>
          Nous avons bien reçu votre commande et votre paiement a été confirmé avec succès.
        </p>
      </div>
      
      <!-- Détails de la commande -->
      <div style="padding: 20px;">
        <div style="background: #ffffff; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #2c5aa0; margin: 0 0 15px 0; font-size: 18px;">📋 Récapitulatif de votre commande</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;"><strong>Numéro de commande:</strong></td><td style="padding: 8px 0; text-align: right;">${orderId}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Total payé:</strong></td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #2c5aa0; font-size: 18px;">$${total} ${currency}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Nombre d'articles:</strong></td><td style="padding: 8px 0; text-align: right;">${items.length}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Email de confirmation:</strong></td><td style="padding: 8px 0; text-align: right;">${customerEmail}</td></tr>
          </table>
        </div>
        
        <!-- Articles commandés -->
        <div style="background: #ffffff; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #2c5aa0; margin: 0 0 15px 0; font-size: 18px;">🛍️ Vos articles</h3>
          ${itemsHtml}
        </div>
        
        <!-- Prochaines étapes -->
        <div style="background: #e8f5e8; border: 2px solid #c3e6c3; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #2d5a2d; margin: 0 0 15px 0; font-size: 18px;">📦 Prochaines étapes</h3>
          <div style="color: #2d5a2d; line-height: 1.8;">
            <p style="margin: 5px 0;">✅ <strong>Paiement confirmé</strong> - Votre commande est sécurisée</p>
            <p style="margin: 5px 0;">📦 <strong>Préparation</strong> - Nous préparons votre commande avec soin</p>
            <p style="margin: 5px 0;">🚚 <strong>Expédition</strong> - Vous recevrez un email de suivi</p>
            <p style="margin: 5px 0;">🏠 <strong>Livraison</strong> - À l'adresse indiquée lors de la commande</p>
          </div>
        </div>
        
        <!-- Contact et support -->
        <div style="background: #fff3cd; border: 2px solid #ffeaa7; border-radius: 8px; padding: 20px; text-align: center;">
          <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">💬 Une question?</h3>
          <p style="color: #856404; margin: 0 0 15px 0; line-height: 1.6;">
            Notre équipe est là pour vous aider! N'hésitez pas à nous contacter.
          </p>
          <a href="mailto:futbolerovintageshop@gmail.com" style="background: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            📧 Nous contacter
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 20px;">
        <p style="color: #666; margin: 0; font-size: 14px;">
          Merci de faire confiance à <strong>Futbolero Vintage Shop</strong><br>
          <em>Des maillots iconiques, un style intemporel</em>
        </p>
        <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
          Email automatique envoyé le ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}
        </p>
      </div>
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

    // Envoyer les 2 emails (propriétaire + client)
    try {
      console.log('[webhook] Creating transporter...');
      const transporter = createTransporter();
      
      const customerEmail = session.customer_email;
      const total = ((session.amount_total || 0) / 100).toFixed(2);
      const orderId = session.metadata?.orderId || session.id;
      
      console.log('[webhook] Customer email:', customerEmail || 'Non fourni');
      
      // 1. EMAIL POUR LE PROPRIÉTAIRE (vous)
      console.log('[webhook] Generating owner email template...');
      const ownerEmailHtml = renderEmailTemplate(session, orderId);
      
      const ownerMailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ORDER_NOTIFY_TO,
        subject: `🛒 Nouvelle commande ${orderId} - $${total} CAD`,
        html: ownerEmailHtml,
      };
      
      console.log('[webhook] Sending owner email...');
      const ownerInfo = await transporter.sendMail(ownerMailOptions);
      console.log('[webhook] Owner email sent! MessageId:', ownerInfo.messageId);
      
      // 2. EMAIL POUR LE CLIENT (seulement si email valide)
      if (customerEmail && customerEmail.includes('@') && !customerEmail.includes('example.com')) {
        console.log('[webhook] Generating customer email template...');
        const customerEmailHtml = renderCustomerEmailTemplate(session, orderId);
        
        const customerMailOptions = {
          from: process.env.SMTP_USER,
          to: customerEmail,
          subject: `✅ Confirmation de commande ${orderId} - Futbolero Vintage Shop`,
          html: customerEmailHtml,
        };
        
        console.log('[webhook] Sending customer email to:', customerEmail);
        const customerInfo = await transporter.sendMail(customerMailOptions);
        console.log('[webhook] Customer email sent! MessageId:', customerInfo.messageId);
      } else {
        console.log('[webhook] No valid customer email provided, skipping customer notification');
      }
      
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
