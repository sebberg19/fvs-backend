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
  // Utiliser la même logique de fallback pour l'email que pour le client
  const customerEmail = session.customer_email || session.customer_details?.email || 'Email non fourni';
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
  
  // Générer le HTML des articles pour le client avec style cohérent
  const itemsHtml = items.map(item => `
    <div style="border: 1px solid #e9ecef; border-radius: 12px; padding: 20px; margin: 15px 0; display: flex; align-items: center; background: #ffffff; transition: all 0.2s ease;">
      ${item.image && !item.image.includes('data:image/svg') ? `
        <img src="${item.image}" alt="${item.name}" 
             style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; margin-right: 20px; border: 2px solid #f8f9fa;">
      ` : `
        <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); border-radius: 8px; margin-right: 20px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px; font-family: 'Nunito', 'Segoe UI', Arial, sans-serif;">
          FB
        </div>
      `}
      <div style="flex: 1;">
        <h4 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 18px; font-weight: 700; font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; letter-spacing: -0.02em;">${item.name}</h4>
        <p style="margin: 0 0 5px 0; color: #666; font-size: 15px; font-family: 'Inter', 'Segoe UI', Arial, sans-serif;">Quantité: ${item.quantity}</p>
        <p style="margin: 0; color: #007bff; font-weight: 600; font-size: 18px; font-family: 'Inter', 'Segoe UI', Arial, sans-serif;">$${(item.price || 0).toFixed(2)} CAD</p>
      </div>
    </div>
  `).join('');
  
  return `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1a1a1a;">
      <!-- Header avec logo et style du site -->
      <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; position: relative;">
        <!-- Logo intégré -->
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
          <img src="https://futbolerovintageshop.com/assets/logo.png" alt="Futbolero Logo" 
               style="height: 50px; width: auto; margin-right: 15px; filter: brightness(0) invert(1);">
          <div>
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; letter-spacing: -0.02em;">Futbolero</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; font-weight: 500; letter-spacing: 0.5px;">Vintage Shop</p>
          </div>
        </div>
        <div style="height: 2px; background: rgba(255,255,255,0.3); margin: 0 auto; width: 80px; border-radius: 1px;"></div>
      </div>
      
      <!-- Message de remerciement avec style cohérent -->
      <div style="background: #f8f9fa; padding: 35px 25px; text-align: center; border-bottom: 3px solid #007bff;">
        <h2 style="color: #007bff; margin: 0 0 20px 0; font-size: 28px; font-weight: 800; font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; letter-spacing: -0.02em;">Merci pour votre commande !</h2>
        <p style="color: #1a1a1a; margin: 0; font-size: 17px; line-height: 1.6; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-weight: 400;">
          Bonjour <strong style="color: #007bff; font-weight: 600;">${customerName}</strong>,<br>
          Nous avons bien reçu votre commande et votre paiement a été confirmé avec succès.
        </p>
      </div>
      
      <!-- Détails de la commande avec design système -->
      <div style="padding: 25px;">
        <div style="background: #ffffff; border: 2px solid #e9ecef; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h3 style="color: #007bff; margin: 0 0 20px 0; font-size: 22px; font-weight: 700; font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; letter-spacing: -0.02em;">Récapitulatif de votre commande</h3>
          <table style="width: 100%; border-collapse: collapse; font-family: 'Inter', 'Segoe UI', Arial, sans-serif;">
            <tr><td style="padding: 12px 0; color: #666; font-weight: 500; font-size: 15px;"><strong>Numéro de commande:</strong></td><td style="padding: 12px 0; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 15px;">${orderId}</td></tr>
            <tr><td style="padding: 12px 0; color: #666; font-weight: 500; font-size: 15px;"><strong>Total payé:</strong></td><td style="padding: 12px 0; text-align: right; font-weight: 700; color: #007bff; font-size: 22px;">$${total} ${currency}</td></tr>
            <tr><td style="padding: 12px 0; color: #666; font-weight: 500; font-size: 15px;"><strong>Nombre d'articles:</strong></td><td style="padding: 12px 0; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 15px;">${items.length}</td></tr>
            <tr><td style="padding: 12px 0; color: #666; font-weight: 500; font-size: 15px;"><strong>Email de confirmation:</strong></td><td style="padding: 12px 0; text-align: right; color: #1a1a1a; font-weight: 500; font-size: 15px;">${customerEmail}</td></tr>
          </table>
        </div>
        
        <!-- Articles commandés avec style site -->
        <div style="background: #ffffff; border: 2px solid #e9ecef; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h3 style="color: #007bff; margin: 0 0 20px 0; font-size: 22px; font-weight: 700; font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; letter-spacing: -0.02em;">Vos articles</h3>
          ${itemsHtml}
        </div>
      </div>
      
      <!-- Footer avec style cohérent -->
      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px 25px; text-align: center; border-radius: 0 0 12px 12px; margin-top: 25px; border-top: 3px solid #007bff;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
          <img src="https://futbolerovintageshop.com/assets/logo.png" alt="Futbolero Logo" 
               style="height: 28px; width: auto; margin-right: 10px; opacity: 0.7;">
          <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 600; font-family: 'Nunito', 'Segoe UI', Arial, sans-serif;">
            Futbolero Vintage Shop
          </p>
        </div>
        <p style="color: #666; margin: 0 0 10px 0; font-size: 15px; font-style: italic; font-family: 'Inter', 'Segoe UI', Arial, sans-serif;">
          Des maillots iconiques, un style intemporel
        </p>
        <p style="color: #999; margin: 0; font-size: 13px; font-family: 'Inter', 'Segoe UI', Arial, sans-serif;">
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
      
      console.log('[webhook] Customer email from session:', customerEmail || 'UNDEFINED');
      console.log('[webhook] Session customer_details:', JSON.stringify(session.customer_details, null, 2));
      console.log('[webhook] Full session object keys:', Object.keys(session));
      
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
      // Essayer plusieurs sources pour l'email client
      let finalCustomerEmail = customerEmail || session.customer_details?.email || null;
      
      console.log('[webhook] Final customer email after fallbacks:', finalCustomerEmail || 'STILL UNDEFINED');
      console.log('[webhook] Email validation check:');
      console.log('  - Has email:', !!finalCustomerEmail);
      console.log('  - Contains @:', finalCustomerEmail ? finalCustomerEmail.includes('@') : false);
      console.log('  - Not example.com:', finalCustomerEmail ? !finalCustomerEmail.includes('example.com') : false);
      
      if (finalCustomerEmail && finalCustomerEmail.includes('@') && !finalCustomerEmail.includes('example.com')) {
        console.log('[webhook] ✅ Customer email validation PASSED - sending email to:', finalCustomerEmail);
        const customerEmailHtml = renderCustomerEmailTemplate(session, orderId);
        
        const customerMailOptions = {
          from: process.env.SMTP_USER,
          to: finalCustomerEmail,
          subject: `Confirmation de commande ${orderId} - Futbolero Vintage Shop`,
          html: customerEmailHtml,
        };
        
        console.log('[webhook] Sending customer email to:', finalCustomerEmail);
        const customerInfo = await transporter.sendMail(customerMailOptions);
        console.log('[webhook] ✅ Customer email sent successfully! MessageId:', customerInfo.messageId);
      } else {
        console.log('[webhook] ❌ Customer email validation FAILED - reasons:');
        console.log('  - Email exists:', !!finalCustomerEmail);
        console.log('  - Email value:', finalCustomerEmail || 'NONE');
        console.log('  - Contains @:', finalCustomerEmail ? finalCustomerEmail.includes('@') : 'NO EMAIL');
        console.log('  - Not example.com:', finalCustomerEmail ? !finalCustomerEmail.includes('example.com') : 'NO EMAIL');
        console.log('[webhook] Skipping customer email notification');
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
