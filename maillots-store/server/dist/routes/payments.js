"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsWebhookHandler = paymentsWebhookHandler;
const express_1 = require("express");
const env_1 = require("../config/env");
const stripe_1 = __importDefault(require("stripe"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
const stripe = new stripe_1.default(env_1.config.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
router.post('/create-session-from-total', async (req, res) => {
    try {
        const total = Number(req.body?.total);
        if (!Number.isFinite(total) || total <= 0) {
            return res.status(400).json({ error: 'Invalid total' });
        }
        const amount = Math.round(total * 100);
        // Determine return base (prefer Origin header when present)
        const base = req.headers.origin || env_1.config.RETURN_BASE || 'http://localhost:3000';
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
        const ordersDir = path_1.default.join(__dirname, '..', '..', 'data', 'orders');
        if (!fs_1.default.existsSync(ordersDir))
            fs_1.default.mkdirSync(ordersDir, { recursive: true });
        const orderFile = path_1.default.join(ordersDir, `${order.id}.json`);
        fs_1.default.writeFileSync(orderFile, JSON.stringify(order, null, 2), 'utf8');
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
    }
    catch (e) {
        // Log details for debugging (but don't include env secrets)
        console.error('[payments] error creating session:', e && e.message ? e.message : e);
        if (e && e.raw && e.raw.message)
            console.error('[payments] stripe raw:', e.raw.message);
        return res.status(500).json({ error: 'server_error', message: e && e.message ? String(e.message) : 'unknown_error' });
    }
});
// Send an email when user clicks the payment button (immediate notification)
router.post('/notify-click', async (req, res) => {
    try {
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        const checkoutInfo = req.body.checkoutInfo || {};
        const total = Number(req.body.total) || (items.reduce((s, it) => s + ((Number(it.perUnitPrice) || Number(it.price) || 0) * (Number(it.quantity) || 1)), 0));
        const itemsHtml = (items || []).map((it) => {
            const img = it.img || it.image || it.imageUrl || '';
            return `<li><strong>${it.name || 'Article'}</strong> — ${it.quantity || 1} × $${(it.perUnitPrice || it.price || 0).toFixed ? (it.perUnitPrice || it.price).toFixed(2) : (it.perUnitPrice || it.price)} ${img ? `<br><img src="${img}" style="height:80px;border-radius:.25rem;">` : ''}</li>`;
        }).join('');
        const html = (0, email_service_1.renderTemplate)('orderConfirmation.html', {
            contact_name: (checkoutInfo?.contact?.firstName || '') + ' ' + (checkoutInfo?.contact?.lastName || ''),
            contact_email: checkoutInfo?.contact?.email || '',
            items_html: itemsHtml,
            total: `$${(total || 0).toFixed ? (total).toFixed(2) : total}`,
        });
        await (0, email_service_1.sendOrderConfirmation)(env_1.config.ORDER_NOTIFY_TO || env_1.config.SMTP_USER || 'owner@futbolero.shop', `Clic paiement — nouvelle intention de paiement`, html);
        return res.json({ ok: true });
    }
    catch (err) {
        console.error('[notify-click] error sending email', err);
        return res.status(500).json({ error: 'email_error' });
    }
});
// Send an email when user lands on the payment success page
router.post('/notify-success', async (req, res) => {
    try {
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        const checkoutInfo = req.body.checkoutInfo || {};
        const total = Number(req.body.total) || (items.reduce((s, it) => s + ((Number(it.perUnitPrice) || Number(it.price) || 0) * (Number(it.quantity) || 1)), 0));
        const itemsHtml = (items || []).map((it) => {
            const img = it.img || it.image || it.imageUrl || '';
            return `<li><strong>${it.name || 'Article'}</strong> — ${it.quantity || 1} × $${(it.perUnitPrice || it.price || 0).toFixed ? (it.perUnitPrice || it.price).toFixed(2) : (it.perUnitPrice || it.price)} ${img ? `<br><img src="${img}" style="height:80px;border-radius:.25rem;">` : ''}</li>`;
        }).join('');
        const html = (0, email_service_1.renderTemplate)('orderConfirmation.html', {
            contact_name: (checkoutInfo?.contact?.firstName || '') + ' ' + (checkoutInfo?.contact?.lastName || ''),
            contact_email: checkoutInfo?.contact?.email || '',
            items_html: itemsHtml,
            total: `$${(total || 0).toFixed ? (total).toFixed(2) : total}`,
        });
        await (0, email_service_1.sendOrderConfirmation)(env_1.config.ORDER_NOTIFY_TO || env_1.config.SMTP_USER || 'owner@futbolero.shop', `Paiement atterri — page de confirmation visitée`, html);
        return res.json({ ok: true });
    }
    catch (err) {
        console.error('[notify-success] error sending email', err);
        return res.status(500).json({ error: 'email_error' });
    }
});
// --- NEW: Robust webhook handler ---
// POST /api/payments/webhook must be mounted with express.raw middleware to preserve the
// exact request body for Stripe signature verification. See app.ts where the route is
// mounted before express.json().
// Simple in-memory idempotence guard for demo (do NOT use in production — replace with DB)
const processedEvents = new Set();
async function paymentsWebhookHandler(req, res) {
    // Use the raw body collected by our middleware instead of req.body
    console.info('[webhook] incoming');
    try {
        // Debug info to determine whether we have the raw bytes available
        console.info('[webhook-debug] rawBodyAvailable=', !!req.rawBody, 'rawBodyIsBuffer=', Buffer.isBuffer(req.rawBody));
        console.info('[webhook-debug] bodyIsBuffer=', Buffer.isBuffer(req.body), 'type=', typeof req.body, 'len=', req.body && req.body.length);
        console.info('[webhook-debug] content-type=', req.headers['content-type']);
    }
    catch (e) {
        console.warn('[webhook-debug] failed to log body shape', e);
    }
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        console.warn('[webhook] missing Stripe-Signature header');
        return res.status(400).send('Missing Stripe-Signature header');
    }
    // Use req.rawBody (from our collector middleware) as the primary source
    // This bypasses any platform-level body parsing that corrupts the bytes
    let payload;
    if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
        payload = req.rawBody;
        console.info('[webhook] using req.rawBody for verification, length:', payload.length);
    }
    else if (Buffer.isBuffer(req.body)) {
        payload = req.body;
        console.info('[webhook] fallback to req.body (Buffer), length:', payload.length);
    }
    else if (typeof req.body === 'string') {
        payload = req.body;
        console.info('[webhook] fallback to req.body (string), length:', payload.length);
    }
    else {
        console.error('[webhook] no valid payload - neither req.rawBody nor req.body is Buffer/string');
        return res.status(400).send('Webhook Error: no valid raw payload available for signature verification');
    }
    let event;
    try {
        // constructEvent will throw if verification fails
        event = stripe.webhooks.constructEvent(payload, sig, env_1.config.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
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
        const session = event.data.object;
        // Fire-and-forget email (do not block webhook response)
        (async () => {
            try {
                const orderId = session.metadata?.orderId;
                // Try to load stored order details if available
                let order = null;
                if (orderId) {
                    const orderFile = path_1.default.join(__dirname, '..', '..', 'data', 'orders', `${orderId}.json`);
                    if (fs_1.default.existsSync(orderFile)) {
                        order = JSON.parse(fs_1.default.readFileSync(orderFile, 'utf8'));
                    }
                }
                const items = (order && order.items) || [];
                const customerEmail = session.customer_email || (order && order.checkoutInfo && order.checkoutInfo.contact && order.checkoutInfo.contact.email) || '';
                const currency = session.currency || (order && order.currency) || 'EUR';
                const amount = (session.amount_total || session.amount_subtotal || (order && order.amount)) || 0;
                const itemsHtml = (items || []).map((it) => `<li>${it.name} x ${it.quantity || 1} - ${(it.perUnitPrice || it.price || 0).toFixed ? (it.perUnitPrice || it.price).toFixed(2) : (it.perUnitPrice || it.price)}</li>`).join('');
                const html = (0, email_service_1.renderTemplate)('orderConfirmation.html', {
                    contact_name: (order?.checkoutInfo?.contact?.firstName || '') + ' ' + (order?.checkoutInfo?.contact?.lastName || ''),
                    contact_email: customerEmail,
                    items_html: itemsHtml,
                    total: `${(order?.total || (amount / 100)).toFixed ? (order?.total || (amount / 100)).toFixed(2) : (amount / 100)}`,
                });
                const ownerTo = env_1.config.ORDER_NOTIFY_TO || env_1.config.SMTP_USER || 'futbolerovintageshop@gmail.com';
                // sendOrderConfirmation handles missing SMTP silently
                await (0, email_service_1.sendOrderConfirmation)(ownerTo, `Nouvelle commande ${orderId || session.id}`, html);
                console.info('[webhook] email triggered for', ownerTo);
            }
            catch (e) {
                const err = e;
                console.error('[webhook] async error processing session:', err && err.message ? err.message : err);
            }
        })();
    }
    // Always acknowledge quickly
    return res.json({ received: true });
}
// Remove old fallback parsing approach (TODO:REMOVED — original code used JSON.parse on raw body when
// no STRIPE_WEBHOOK_SECRET was present; that allowed signature bypass.)
exports.default = router;
