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

// Small helper to build order text with FULL product details
function buildOrderText({ items = [], checkoutInfo = {}, total = 0, timestamp = new Date().toISOString(), orderId }) {
  const itemsList = (items || []).map((item, index) => {
    const itemName = item.name || 'Article';
    const quantity = item.quantity || 1;
    const price = Number(item.perUnitPrice || item.price || 0).toFixed(2);
    const totalItemPrice = (Number(item.perUnitPrice || item.price || 0) * quantity).toFixed(2);
    
    // Build detailed item description
    let details = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nArticle ${index + 1}: ${itemName}\n`;
    
    // Taille
    if (item.size) {
      details += `  → Taille: ${item.size}\n`;
    }
    
    // Quantité
    details += `  → Quantité: ${quantity}\n`;
    
    // Prix unitaire et total
    details += `  → Prix unitaire: $${price} CAD\n`;
    if (quantity > 1) {
      details += `  → Prix total: $${totalItemPrice} CAD\n`;
    }
    
    // Personnalisation (si présente)
    if (item.personalization) {
      const perso = item.personalization;
      if (perso.name || perso.number) {
        details += `  → ⭐ PERSONNALISATION:\n`;
        if (perso.name) {
          details += `     • Nom: ${perso.name}\n`;
        }
        if (perso.number) {
          details += `     • Numéro: ${perso.number}\n`;
        }
        details += `     • Frais de personnalisation: +$5.00 CAD\n`;
      }
    }
    
    // Type de maillot (vintage ou récent)
    if (item.isVintage) {
      details += `  → Type: Maillot Vintage\n`;
    }
    
    // Image du produit (pour référence)
    if (item.img || item.image || item.imageUrl) {
      const imgUrl = item.img || item.image || item.imageUrl;
      details += `  → Image: ${imgUrl}\n`;
    }
    
    return details;
  }).join('\n') || 'Aucun article listé.';

  const subtotal = (items || []).reduce((sum, item) => {
    const unitPrice = Number(item.perUnitPrice || item.price || 0);
    const qty = item.quantity || 1;
    let itemTotal = unitPrice * qty;
    // Ajouter frais de personnalisation si présent
    if (item.personalization && (item.personalization.name || item.personalization.number)) {
      itemTotal += 5.00;
    }
    return sum + itemTotal;
  }, 0);

  return `Bonjour ${checkoutInfo.firstName || ''} ${checkoutInfo.lastName || ''},

Merci pour votre commande sur Futbolero Vintage Shop ! ⚽

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DÉTAILS DE VOTRE COMMANDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Numéro de commande : ${orderId}
Date : ${new Date(timestamp).toLocaleString('fr-FR', { 
  timeZone: 'America/Toronto',
  dateStyle: 'full',
  timeStyle: 'short'
})}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ ARTICLES COMMANDÉS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 RÉCAPITULATIF DES PRIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sous-total: $${subtotal.toFixed(2)} CAD
Frais de livraison: $7.00 CAD
───────────────────────────────
TOTAL: $${Number(total || 0).toFixed(2)} CAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 ADRESSE DE LIVRAISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${checkoutInfo.firstName || ''} ${checkoutInfo.lastName || ''}
${checkoutInfo.address || ''}
${checkoutInfo.city || ''} ${checkoutInfo.postalCode || ''}
${checkoutInfo.country || ''}

${checkoutInfo.phone ? `Téléphone: ${checkoutInfo.phone}` : ''}
${checkoutInfo.email ? `Email: ${checkoutInfo.email}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Votre commande sera préparée et expédiée dans les plus brefs délais.
Vous recevrez un email de confirmation d'expédition avec le numéro de suivi.

Pour toute question, n'hésitez pas à nous contacter à :
📧 futbolerovintageshop@gmail.com

Merci de votre confiance ! 🙏

Cordialement,
L'équipe Futbolero Vintage Shop
⚽ www.futbolerovintageshop.com
`;
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
    subject: `🔔 Nouvelle commande ${orderId} - ${(items || []).length} article${(items || []).length > 1 ? 's' : ''}`,
    text: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏪 NOUVELLE COMMANDE REÇUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stage: ${effectiveStage}
Commande: ${orderId}
Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'America/Toronto' })}

${orderText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 COORDONNÉES DU CLIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${checkoutInfo && checkoutInfo.email ? checkoutInfo.email : 'Non fourni'}
Téléphone: ${checkoutInfo && checkoutInfo.phone ? checkoutInfo.phone : 'Non renseigné'}

⚠️ Action requise: Préparer et expédier la commande
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
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
