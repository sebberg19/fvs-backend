// Example Netlify Function to receive Stripe webhooks with raw body
// Location: maillots-store/netlify/stripe-webhook-example.js
// Note: Netlify Functions automatically parse request bodies unless you
// export `config.bodyParser = false` which allows you to access the raw
// request body via `event.body` (string) and verify signatures.

exports.config = {
  bodyParser: false,
};

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports.handler = async function (event, context) {
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!sig) return { statusCode: 400, body: 'Missing Stripe-Signature header' };

  try {
    // event.body is the raw string when bodyParser is false
    const stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    // handle stripeEvent.type ...
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('Webhook Error:', err && err.message ? err.message : err);
    return { statusCode: 400, body: `Webhook Error: ${err && err.message ? err.message : 'invalid signature'}` };
  }
};
