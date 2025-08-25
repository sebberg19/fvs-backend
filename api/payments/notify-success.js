const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Create transporter using env vars. If EMAIL_PASS is missing, transporter may not be able to send — we still accept requests for testing.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Non-blocking verify to log status
transporter.verify().then(() => {
  console.log('Mail transporter ready');
}).catch((err) => {
  console.warn('Mail transporter verify failed (will still accept requests):', err && err.message ? err.message : err);
});

// Small helper to build order text
function buildOrderText({ items = [], checkoutInfo = {}, total = 0, timestamp = new Date().toISOString(), orderId }) {
  const itemsList = (items || []).map(item =>
    `• ${item.name || 'Article'} ${item.size ? `(Taille: ${item.size})` : ''} - Quantité: ${item.quantity || 1} - ${Number(item.perUnitPrice || item.price || 0).toFixed(2)}€`
  ).join('\n') || 'Aucun article listé.';

  return `Bonjour ${checkoutInfo.firstName || ''} ${checkoutInfo.lastName || ''},\n\nMerci pour votre commande sur Futbolero Vintage Shop !\n\nDétails de votre commande :\nNuméro de commande : ${orderId}\nDate : ${new Date(timestamp).toLocaleString('fr-FR')}\n\nArticles commandés :\n${itemsList}\n\nAdresse de livraison :\n${checkoutInfo.address || ''}\n${checkoutInfo.city || ''} ${checkoutInfo.postalCode || ''}\n${checkoutInfo.country || ''}\n\nTotal : ${Number(total || 0).toFixed(2)}€\n\nCordialement,\nL'équipe Futbolero Vintage Shop\n`;
}

router.post('/notify-success', async (req, res) => {
  const body = req.body || {};
  const { items, checkoutInfo, total, timestamp, stage, action } = body;
  const effectiveStage = stage || (action === 'payment_success' ? 'confirmation' : 'confirmation');

  console.log('[notify-success] called stage=', effectiveStage, 'email=', checkoutInfo && checkoutInfo.email);

  // Validation
  if (effectiveStage === 'confirmation' && (!checkoutInfo || !checkoutInfo.email)) {
    return res.status(400).json({ success: false, emailSent: false, error: 'Client email required for confirmation' });
  }

  const orderId = 'FUT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  const shopEmail = process.env.SHOP_EMAIL || process.env.EMAIL_USER;

  const orderText = buildOrderText({ items, checkoutInfo, total, timestamp, orderId });

  const shopMail = {
    from: process.env.EMAIL_USER,
    to: shopEmail,
    subject: `Nouvelle commande ${orderId} (${effectiveStage})`,
    text: `Stage: ${effectiveStage}\n\nNouvelle commande reçue :\n\n${orderText}\nEmail client : ${checkoutInfo && checkoutInfo.email ? checkoutInfo.email : 'Non fourni'}\nTéléphone : ${checkoutInfo && checkoutInfo.phone ? checkoutInfo.phone : 'Non renseigné'}`
  };

  try {
    if (effectiveStage === 'order') {
      // notify shop only
      const info = await transporter.sendMail(shopMail);
      console.log('[notify-success] shop notified, messageId=', info && info.messageId);
      return res.json({ success: true, emailSent: true, stage: effectiveStage, orderId });
    }

    // confirmation: send to customer and shop
    const customerMail = {
      from: process.env.EMAIL_USER,
      to: checkoutInfo.email,
      subject: `Confirmation de commande ${orderId} - Futbolero Vintage Shop`,
      text: orderText
    };

    const results = await Promise.allSettled([
      transporter.sendMail(customerMail),
      transporter.sendMail(shopMail)
    ]);

    const settled = results.map((r, i) => ({ index: i, status: r.status, reason: r.status === 'rejected' ? (r.reason && r.reason.message) || r.reason : undefined }));
    console.log('[notify-success] settled results=', settled);

    const anyRejected = results.some(r => r.status === 'rejected');
    return res.json({ success: !anyRejected, emailSent: !anyRejected, stage: effectiveStage, orderId, details: settled });
  } catch (err) {
    console.error('[notify-success] error sending emails:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, emailSent: false, error: err && err.message ? err.message : 'Failed to send emails' });
  }
});

module.exports = router;
