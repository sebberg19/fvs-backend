// Netlify Function pour créer les sessions Stripe
// Location: netlify/functions/create-session.js

const Stripe = require('stripe');

exports.handler = async (event, context) => {
  console.log('[create-session] Netlify function started');
  // Quick environment validation
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[create-session] MISSING STRIPE_SECRET_KEY');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'stripe_key_missing', message: 'STRIPE_SECRET_KEY is not set in environment' })
    };
  }
  // instantiate stripe here to avoid throwing at module load time
  let stripe;
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (err) {
    console.error('[create-session] Error initializing Stripe:', err && err.message);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'stripe_init_error', message: err && err.message })
    };
  }
  
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

  // Validate provided email (if any) and only send it to Stripe when valid
  const maybeEmail = (body && body.contact && body.contact.email) ? String(body.contact.email).trim() : '';
  const isValidEmail = (em) => !!em && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em);
  const customerEmailToSend = isValidEmail(maybeEmail) ? maybeEmail : undefined;

    // Créer un ID de commande simple
    const orderId = `order_${Date.now()}`;
    
    // Préparer les infos des articles pour les métadonnées
    const items = Array.isArray(body.items) ? body.items : [];
    
    // Créer un objet metadata optimisé pour éviter la troncature
    const metadata = { 
      source: 'netlify_function', 
      orderId: orderId,
      itemCount: items.length.toString()
    };
    
    // Ajouter chaque article comme clé séparée pour éviter la troncature
    items.forEach((item, index) => {
      if (index < 10) { // Limite à 10 articles pour éviter d'atteindre la limite de métadonnées
        const itemData = {
          name: item.name || 'Article',
          quantity: item.quantity || 1,
          price: item.perUnitPrice || item.price || 0,
          image: item.img || item.image || item.imageUrl || ''
        };
        metadata[`item_${index}`] = JSON.stringify(itemData);
      }
    });
    
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
  // If we have a valid email from the client, send it; otherwise omit to let Stripe collect it
  ...(customerEmailToSend ? { customer_email: customerEmailToSend } : {}),
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
      metadata: metadata,
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
    console.error('[create-session] error:', e && e.message);
    console.error(e && e.stack);

    // Return a safer error message to the client but include the error code if available
    const resp = {
      error: 'server_error',
      message: e && e.message
    };

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(resp)
    };
  }
};
