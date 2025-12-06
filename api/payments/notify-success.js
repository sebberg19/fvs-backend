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

// Helper to build HTML email with images
function buildOrderHTML({ items = [], checkoutInfo = {}, total = 0, timestamp = new Date().toISOString(), orderId }) {
  const baseUrl = 'https://futbolerovintageshop.com';
  
  const itemsHTML = (items || []).map((item, index) => {
    const itemName = item.name || 'Article';
    const quantity = item.quantity || 1;
    const price = Number(item.perUnitPrice || item.price || 0).toFixed(2);
    const totalItemPrice = (Number(item.perUnitPrice || item.price || 0) * quantity).toFixed(2);
    const imgUrl = item.img || item.image || item.imageUrl || '';
    const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `${baseUrl}/${imgUrl}`;
    
    let personalizationHTML = '';
    if (item.personalization && (item.personalization.name || item.personalization.number || item.personalization.badge)) {
      const perso = item.personalization;
      personalizationHTML = `
        <div style="margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-family: 'Manrope', sans-serif; font-weight: 700;">
          <strong style="font-family: 'Manrope', sans-serif; font-weight: 800;">Personnalisation:</strong><br>
          ${perso.name ? `<span style="font-family: 'Manrope', sans-serif; font-weight: 600;">Nom: ${perso.name}</span><br>` : ''}
          ${perso.number ? `<span style="font-family: 'Manrope', sans-serif; font-weight: 600;">Numéro: ${perso.number}</span><br>` : ''}
          ${perso.badge ? `<span style="font-family: 'Manrope', sans-serif; font-weight: 600;">Badge: ${perso.badge}</span><br>` : ''}
          <span style="color: #198754; font-family: 'Manrope', sans-serif; font-weight: 700;">Frais: +$5.00 CAD</span>
          ${perso.badgeExtra && perso.badgeExtra > 0 ? `<br><span style="color: #198754; font-family: 'Manrope', sans-serif; font-weight: 700;">Badge: +$${perso.badgeExtra.toFixed(2)} CAD</span>` : ''}
        </div>
      `;
    }
    
    return `
      <tr>
        <td style="padding: 20px; border-bottom: 1px solid #dee2e6;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="100" style="vertical-align: top;">
                ${imgUrl ? `<img src="${fullImgUrl}" alt="${itemName}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #dee2e6;">` : ''}
              </td>
              <td style="padding-left: 20px; vertical-align: top; font-family: 'Manrope', sans-serif; font-weight: 700;">
                <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #212529; font-weight: 800; font-family: 'Manrope', sans-serif;">${itemName}</h3>
                ${item.size ? `<p style="margin: 4px 0; color: #6c757d; font-family: 'Manrope', sans-serif; font-weight: 600;">Taille: ${item.size}</p>` : ''}
                <p style="margin: 4px 0; color: #6c757d; font-family: 'Manrope', sans-serif; font-weight: 600;">Quantité: ${quantity}</p>
                <p style="margin: 8px 0; font-size: 16px; font-weight: 800; color: #212529; font-family: 'Manrope', sans-serif;">$${totalItemPrice} CAD</p>
                ${item.isVintage ? '<p style="margin: 4px 0; color: #198754; font-weight: 700; font-family: \'Manrope\', sans-serif;">Maillot Vintage</p>' : ''}
                ${personalizationHTML}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const subtotal = (items || []).reduce((sum, item) => {
    const unitPrice = Number(item.perUnitPrice || item.price || 0);
    const qty = item.quantity || 1;
    let itemTotal = unitPrice * qty;
    if (item.personalization && (item.personalization.name || item.personalization.number)) {
      itemTotal += 5.00;
    }
    return sum + itemTotal;
  }, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de commande</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Manrope', 'Segoe UI', Arial, sans-serif; font-weight: 600; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Logo Header -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background: #ffffff; border-bottom: 1px solid #dee2e6;">
              <img src="https://futbolerovintageshop.com/assets/FVS.png" alt="Futbolero Logo" style="height: 40px; width: auto; object-fit: contain; margin-bottom: 10px;">
              <h1 style="margin: 0; color: #000000; font-size: 24px; font-weight: 800; font-family: 'Manrope', sans-serif;">Futbolero Vintage Shop</h1>
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #2f6f3e 0%, #1a4d2e 100%); border-radius: 0;">
              <h2 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; font-family: 'Manrope', sans-serif;">Commande confirmée ✓</h2>
              <p style="margin: 10px 0 0 0; color: #e8f5e9; font-size: 16px; font-family: 'Manrope', sans-serif; font-weight: 700;">Merci pour votre achat !</p>
            </td>
          </tr>
          
          <!-- Order Info -->
          <tr>
            <td style="padding: 30px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #212529; font-size: 20px; font-weight: 800; font-family: 'Manrope', sans-serif;">Bonjour ${checkoutInfo.firstName || ''} ${checkoutInfo.lastName || ''},</h2>
              <p style="margin: 0 0 20px 0; color: #6c757d; line-height: 1.6; font-family: 'Manrope', sans-serif; font-weight: 600;">
                Votre commande a été reçue et sera préparée dans les plus brefs délais. Vous recevrez un email de confirmation d'expédition avec le numéro de suivi.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background: #f8f9fa; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; color: #6c757d; font-family: 'Manrope', sans-serif; font-weight: 700;"><strong>Numéro de commande:</strong> ${orderId}</p>
                    <p style="margin: 0; color: #6c757d; font-family: 'Manrope', sans-serif; font-weight: 700;"><strong>Date:</strong> ${new Date(timestamp).toLocaleString('fr-FR', { 
                      timeZone: 'America/Toronto',
                      dateStyle: 'full',
                      timeStyle: 'short'
                    })}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Items -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #212529; font-size: 20px; font-weight: 800; font-family: 'Manrope', sans-serif;">Articles commandés</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden;">
                ${itemsHTML}
              </table>
            </td>
          </tr>
          
          <!-- Summary -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8f9fa; border-radius: 8px; padding: 20px;">
                <tr>
                  <td style="padding: 8px 0; font-family: 'Manrope', sans-serif; font-weight: 700;">
                    <span style="color: #6c757d;">Sous-total:</span>
                  </td>
                  <td align="right" style="padding: 8px 0; font-family: 'Manrope', sans-serif; font-weight: 700;">
                    <strong style="color: #212529;">$${subtotal.toFixed(2)} CAD</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-family: 'Manrope', sans-serif; font-weight: 700;">
                    <span style="color: #6c757d;">Livraison:</span>
                  </td>
                  <td align="right" style="padding: 8px 0; font-family: 'Manrope', sans-serif; font-weight: 700;">
                    <strong style="color: #212529;">$7.00 CAD</strong>
                  </td>
                </tr>
                <tr style="border-top: 2px solid #dee2e6;">
                  <td style="padding: 16px 0 0 0; font-family: 'Manrope', sans-serif; font-weight: 800;">
                    <strong style="color: #212529; font-size: 18px;">Total:</strong>
                  </td>
                  <td align="right" style="padding: 16px 0 0 0; font-family: 'Manrope', sans-serif; font-weight: 800;">
                    <strong style="color: #2f6f3e; font-size: 20px;">$${Number(total || 0).toFixed(2)} CAD</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Shipping Address -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #212529; font-size: 20px; font-weight: 800; font-family: 'Manrope', sans-serif;">Adresse de livraison</h2>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; font-family: 'Manrope', sans-serif; font-weight: 700;">
                <p style="margin: 0; color: #212529; line-height: 1.8;">
                  <strong>${checkoutInfo.firstName || ''} ${checkoutInfo.lastName || ''}</strong><br>
                  ${checkoutInfo.address || ''}<br>
                  ${checkoutInfo.city || ''} ${checkoutInfo.postalCode || ''}<br>
                  ${checkoutInfo.country || ''}<br>
                  ${checkoutInfo.phone ? `Téléphone: ${checkoutInfo.phone}<br>` : ''}
                  ${checkoutInfo.email ? `Email: ${checkoutInfo.email}` : ''}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center; font-family: 'Manrope', sans-serif; font-weight: 700;">
              <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px; font-family: 'Manrope', sans-serif; font-weight: 600;">
                Pour toute question, contactez-nous à<br>
                <a href="mailto:futbolerovintageshop@gmail.com" style="color: #2f6f3e; text-decoration: none; font-weight: 700;">futbolerovintageshop@gmail.com</a>
              </p>
              <p style="margin: 20px 0 0 0; color: #6c757d; font-size: 14px; font-family: 'Manrope', sans-serif; font-weight: 600;">
                <strong>Futbolero Vintage Shop</strong><br>
                Maillots vintage et actuels de qualité premium
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

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
      details += `  Taille: ${item.size}\n`;
    }
    
    // Quantité
    details += `  Quantité: ${quantity}\n`;
    
    // Prix unitaire et total
    details += `  Prix unitaire: $${price} CAD\n`;
    if (quantity > 1) {
      details += `  Prix total: $${totalItemPrice} CAD\n`;
    }
    
    // Personnalisation (si présente)
    if (item.personalization) {
      const perso = item.personalization;
      if (perso.name || perso.number || perso.badge) {
        details += `  PERSONNALISATION:\n`;
        if (perso.name) {
          details += `     Nom: ${perso.name}\n`;
        }
        if (perso.number) {
          details += `     Numéro: ${perso.number}\n`;
        }
        if (perso.badge) {
          details += `     Badge: ${perso.badge}\n`;
        }
        details += `     Frais personnalisation: +$5.00 CAD\n`;
        if (perso.badgeExtra && perso.badgeExtra > 0) {
          details += `     Frais badge: +$${perso.badgeExtra.toFixed(2)} CAD\n`;
        }
        details += `     Frais de personnalisation: +$5.00 CAD\n`;
      }
    }
    
    // Type de maillot (vintage ou récent)
    if (item.isVintage) {
      details += `  Type: Maillot Vintage\n`;
    }
    
    // Image du produit (pour référence)
    if (item.img || item.image || item.imageUrl) {
      const imgUrl = item.img || item.image || item.imageUrl;
      details += `  Image: ${imgUrl}\n`;
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

Merci pour votre commande sur Futbolero Vintage Shop !

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DÉTAILS DE VOTRE COMMANDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Numéro de commande : ${orderId}
Date : ${new Date(timestamp).toLocaleString('fr-FR', { 
  timeZone: 'America/Toronto',
  dateStyle: 'full',
  timeStyle: 'short'
})}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARTICLES COMMANDÉS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÉCAPITULATIF DES PRIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sous-total: $${subtotal.toFixed(2)} CAD
Frais de livraison: $7.00 CAD
───────────────────────────────
TOTAL: $${Number(total || 0).toFixed(2)} CAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADRESSE DE LIVRAISON
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
Email: futbolerovintageshop@gmail.com

Merci de votre confiance !

Cordialement,
L'équipe Futbolero Vintage Shop
www.futbolerovintageshop.com
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
  const orderHTML = buildOrderHTML({ items, checkoutInfo, total, timestamp, orderId });

  const shopMail = {
    from: process.env.EMAIL_USER,
    to: shopEmail,
    subject: `Nouvelle commande ${orderId} - ${(items || []).length} article${(items || []).length > 1 ? 's' : ''}`,
    text: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOUVELLE COMMANDE REÇUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stage: ${effectiveStage}
Commande: ${orderId}
Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'America/Toronto' })}

${orderText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COORDONNÉES DU CLIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${checkoutInfo && checkoutInfo.email ? checkoutInfo.email : 'Non fourni'}
Téléphone: ${checkoutInfo && checkoutInfo.phone ? checkoutInfo.phone : 'Non renseigné'}

Action requise: Préparer et expédier la commande
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    html: orderHTML
  };

  try {
    if (effectiveStage === 'order') {
      // notify shop only
      const info = await transporter.sendMail(shopMail);
      console.log('[notify-success] shop notified, messageId=', info && info.messageId);
      return res.json({ success: true, emailSent: true, stage: effectiveStage, orderId });
    }

    // confirmation: send to customer and shop (with HTML)
    const customerMail = {
      from: process.env.EMAIL_USER,
      to: checkoutInfo.email,
      subject: `Confirmation de commande ${orderId} - Futbolero Vintage Shop`,
      text: orderText,
      html: orderHTML
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
