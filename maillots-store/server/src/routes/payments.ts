import express, { Router, Request, Response } from 'express';
import { config } from '../config/env';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { renderTemplate, sendOrderConfirmation } from '../services/email.service';

const router = Router();
const stripe = new Stripe(config.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' } as any);

router.post('/create-session-from-total', async (req: Request, res: Response) => {
  try {
    const total = Number(req.body?.total);
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ error: 'Invalid total' });
    }
    const amount = Math.round(total * 100);

  // Determine return base (prefer Origin header when present)
  const base = (req.headers.origin as string) || config.RETURN_BASE || 'http://localhost:3000';

    // Lightweight request logging to help diagnose production 500s
    console.info('[payments] create-session-from-total | origin=', req.headers.origin, '| amount=', amount, '| email=', req.body?.contact?.email);

    // Persist a simple order object so we can email it after Stripe confirms payment
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const checkoutInfo = req.body.checkoutInfo || {};
    const order = {
      id: `order_${Date.now()}`,
      total,
      amount,
      items,
      checkoutInfo,
      createdAt: new Date().toISOString(),
    };
    const ordersDir = path.join(__dirname, '..', '..', 'data', 'orders');
    if (!fs.existsSync(ordersDir)) fs.mkdirSync(ordersDir, { recursive: true });
    const orderFile = path.join(ordersDir, `${order.id}.json`);
    fs.writeFileSync(orderFile, JSON.stringify(order, null, 2), 'utf8');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${base}/payment-success.html`,
      cancel_url: `${base}/cart.html`,
      customer_email: req.body?.contact?.email,
      payment_method_types: ['card', 'link'],
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
      metadata: { source: 'total_only', orderId: order.id },
    });

    return res.json({ id: session.id, url: session.url });
  } catch (e: any) {
    // Log details for debugging (but don't include env secrets)
    console.error('[payments] error creating session:', e && e.message ? e.message : e);
    if (e && e.raw && e.raw.message) console.error('[payments] stripe raw:', e.raw.message);
    return res.status(500).json({ error: 'server_error', message: e && e.message ? String(e.message) : 'unknown_error' });
  }
});

// Send an email when user clicks the payment button (immediate notification)
router.post('/notify-click', async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const checkoutInfo = req.body.checkoutInfo || {};
    const total = Number(req.body.total) || (items.reduce((s: number, it: any) => s + ((Number(it.perUnitPrice) || Number(it.price) || 0) * (Number(it.quantity)||1)), 0));

    const itemsHtml = (items || []).map((it: any) => {
      const img = it.img || it.image || it.imageUrl || '';
      return `<li><strong>${it.name||'Article'}</strong> — ${it.quantity||1} × $${(it.perUnitPrice||it.price||0).toFixed ? (it.perUnitPrice||it.price).toFixed(2) : (it.perUnitPrice||it.price)} ${img?`<br><img src="${img}" style="height:80px;border-radius:.25rem;">`:''}</li>`;
    }).join('');

    const html = renderTemplate('orderConfirmation.html', {
      contact_name: (checkoutInfo?.contact?.firstName || '') + ' ' + (checkoutInfo?.contact?.lastName || ''),
      contact_email: checkoutInfo?.contact?.email || '',
      items_html: itemsHtml,
      total: `$${(total||0).toFixed ? (total).toFixed(2) : total}`,
    });

    await sendOrderConfirmation(config.ORDER_NOTIFY_TO || config.SMTP_USER || 'owner@futbolero.shop', `Clic paiement — nouvelle intention de paiement`, html);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[notify-click] error sending email', err);
    return res.status(500).json({ error: 'email_error' });
  }
});

// Send an email when user lands on the payment success page
router.post('/notify-success', async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const checkoutInfo = req.body.checkoutInfo || {};
    const total = Number(req.body.total) || (items.reduce((s: number, it: any) => s + ((Number(it.perUnitPrice) || Number(it.price) || 0) * (Number(it.quantity)||1)), 0));

    const itemsHtml = (items || []).map((it: any) => {
      const img = it.img || it.image || it.imageUrl || '';
      return `<li><strong>${it.name||'Article'}</strong> — ${it.quantity||1} × $${(it.perUnitPrice||it.price||0).toFixed ? (it.perUnitPrice||it.price).toFixed(2) : (it.perUnitPrice||it.price)} ${img?`<br><img src="${img}" style="height:80px;border-radius:.25rem;">`:''}</li>`;
    }).join('');

    const html = renderTemplate('orderConfirmation.html', {
      contact_name: (checkoutInfo?.contact?.firstName || '') + ' ' + (checkoutInfo?.contact?.lastName || ''),
      contact_email: checkoutInfo?.contact?.email || '',
      items_html: itemsHtml,
      total: `$${(total||0).toFixed ? (total).toFixed(2) : total}`,
    });

    await sendOrderConfirmation(config.ORDER_NOTIFY_TO || config.SMTP_USER || 'owner@futbolero.shop', `Paiement atterri — page de confirmation visitée`, html);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[notify-success] error sending email', err);
    return res.status(500).json({ error: 'email_error' });
  }
});
// --- NEW: Robust webhook handler ---
// POST /api/payments/webhook must be mounted with express.raw middleware to preserve the
// exact request body for Stripe signature verification. See app.ts where the route is
// mounted before express.json().

// Simple in-memory idempotence guard for demo (do NOT use in production — replace with DB)
const processedEvents = new Set<string>();

export async function paymentsWebhookHandler(req: Request, res: Response) {
  // Expect raw body (Buffer)
  console.info('[webhook] incoming');

  const sig = req.headers['stripe-signature'] as string | undefined;
  if (!sig) {
    console.warn('[webhook] missing Stripe-Signature header');
    return res.status(400).send('Missing Stripe-Signature header');
  }

  let event: any;
  try {
    // constructEvent will throw if verification fails
    event = stripe.webhooks.constructEvent(req.body as any, sig, config.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[webhook] signature verification failed:', err && err.message ? err.message : err);
    return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : 'invalid signature'}`);
  }

  console.info('[webhook] event:', event.type, 'id:', event.id);

  // Idempotence guard
  if (processedEvents.has(event.id)) {
    console.info('[webhook] already processed event', event.id);
    return res.json({ received: true, idempotent: true });
  }
  processedEvents.add(event.id);

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    // Fire-and-forget email (do not block webhook response)
    (async () => {
      try {
        const orderId = session.metadata?.orderId;
        // Try to load stored order details if available
        let order = null;
        if (orderId) {
          const orderFile = path.join(__dirname, '..', '..', 'data', 'orders', `${orderId}.json`);
          if (fs.existsSync(orderFile)) {
            order = JSON.parse(fs.readFileSync(orderFile, 'utf8'));
          }
        }

        const items = (order && order.items) || [];
        const customerEmail = session.customer_email || (order && order.checkoutInfo && order.checkoutInfo.contact && order.checkoutInfo.contact.email) || '';
        const currency = session.currency || (order && order.currency) || 'EUR';
        const amount = (session.amount_total || session.amount_subtotal || (order && order.amount)) || 0;

        const itemsHtml = (items || []).map((it: any) => `<li>${it.name} x ${it.quantity || 1} - ${(it.perUnitPrice || it.price || 0).toFixed ? (it.perUnitPrice || it.price).toFixed(2) : (it.perUnitPrice || it.price)}</li>`).join('');
        const html = renderTemplate('orderConfirmation.html', {
          contact_name: (order?.checkoutInfo?.contact?.firstName || '') + ' ' + (order?.checkoutInfo?.contact?.lastName || ''),
          contact_email: customerEmail,
          items_html: itemsHtml,
          total: `${(order?.total || (amount/100)).toFixed ? (order?.total || (amount/100)).toFixed(2) : (amount/100)}`,
        });

        const ownerTo = config.ORDER_NOTIFY_TO || config.SMTP_USER || 'futbolerovintageshop@gmail.com';
        // sendOrderConfirmation handles missing SMTP silently
        await sendOrderConfirmation(ownerTo, `Nouvelle commande ${orderId || session.id}`, html);
        console.info('[webhook] email triggered for', ownerTo);
      } catch (e) {
        const err: any = e;
        console.error('[webhook] async error processing session:', err && err.message ? err.message : err);
      }
    })();
  }
  // Always acknowledge quickly
  return res.json({ received: true });
}

// Remove old fallback parsing approach (TODO:REMOVED — original code used JSON.parse on raw body when
// no STRIPE_WEBHOOK_SECRET was present; that allowed signature bypass.)

export default router;
