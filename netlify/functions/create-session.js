// Netlify Function pour créer les sessions Stripe
// Location: netlify/functions/create-session.js

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  console.log('[create-session] Netlify function started');
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const total = Number(body?.total);
    
    if (!Number.isFinite(total) || total <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid total' })
      };
    }

    const amount = Math.round(total * 100);
    
    // Determine return base (utilise l'origine de la requête)
    const origin = event.headers.origin || event.headers.referer;
    const base = origin || process.env.RETURN_BASE || 'https://futbolerovintageshop.com';
    
    console.log('[create-session] Creating session | amount=', amount, '| email=', body?.contact?.email);

    // Créer un ID de commande simple
    const orderId = `order_${Date.now()}`;
    
    // Préparer les infos des articles pour les métadonnées (limité à 500 chars par clé)
    const items = Array.isArray(body.items) ? body.items : [];
    const itemsJson = JSON.stringify(items.map(item => ({
      name: item.name || 'Article',
      quantity: item.quantity || 1,
      price: item.perUnitPrice || item.price || 0,
      image: item.img || item.image || item.imageUrl || ''
    })));
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${base}/payment-success.html`,
      cancel_url: `${base}/cart.html`,
      payment_method_types: ['card', 'link'],
      // Collecter les informations de livraison via Stripe
      shipping_address_collection: {
        allowed_countries: ['FR', 'CA', 'BE', 'CH', 'LU', 'DE', 'IT', 'ES', 'PT', 'NL', 'GB', 'US', 'MA', 'DZ', 'TN', 'SN', 'CI', 'CM']
      },
      // Collecter le numéro de téléphone (obligatoire)
      phone_number_collection: {
        enabled: true
      },
      // S'assurer que l'email est collecté et requis
      customer_email: null, // Force Stripe à demander l'email
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: { name: 'Commande Futbolero' },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: { 
        source: 'netlify_function', 
        orderId: orderId,
        itemCount: items.length,
        // Stocker les articles (attention à la limite de 500 chars)
        items: itemsJson.substring(0, 499)
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        id: session.id, 
        url: session.url,
        orderId: orderId 
      })
    };

  } catch (e) {
    console.error('[create-session] error:', e.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'server_error', 
        message: e.message 
      })
    };
  }
};
