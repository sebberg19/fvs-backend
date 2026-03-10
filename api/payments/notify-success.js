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
    const storedPerUnit = Number(item.perUnitPrice);
    const baseUnit = Number(item.price || 0);
    let unitForHtml = (!Number.isNaN(storedPerUnit) && storedPerUnit > 0) ? storedPerUnit : baseUnit;
    if (Number.isNaN(storedPerUnit) || storedPerUnit <= 0) {
      unitForHtml += (Number(item.personalization?.extra || 0) || 0) + (Number(item.personalization?.badgeExtra || 0) || 0);
    }
    const price = unitForHtml.toFixed(2);
    const totalItemPrice = (unitForHtml * quantity).toFixed(2);
    const imgUrl = item.img || item.image || item.imageUrl || '';
    const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `${baseUrl}/${imgUrl}`;
    
    let personalizationHTML = '';
    if (item.personalization && (item.personalization.name || item.personalization.number || item.personalization.badge)) {
      const perso = item.personalization;
      const persoName = String(perso.name || '').trim() || 'Sans';
      const persoNumber = String(perso.number ?? '').trim() || 'Sans';
      const extra = Number(perso.extra || 0) || 0;
      personalizationHTML = `<p style="margin:4px 0 0 0;font-size:12px;color:#888888;">Personnalisation : ${persoName} / ${persoNumber}${perso.badge ? ' / ' + perso.badge : ''}${extra > 0 ? ' (+$' + extra.toFixed(2) + ' CAD)' : ''}</p>`;
    }
    
    return `
      <tr style="border-bottom:1px solid #e8e8e8;">
        <td style="padding:16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="72" style="vertical-align:top;">
                ${imgUrl ? `<img src="${fullImgUrl}" alt="${itemName}" style="width:72px;height:72px;object-fit:cover;border:1px solid #e8e8e8;display:block;">` : ''}
              </td>
              <td style="padding-left:16px;vertical-align:top;">
                <p style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:#121314;">${itemName}</p>
                ${item.size ? `<p style="margin:0 0 2px 0;font-size:12px;color:#888888;">${item.size}</p>` : ''}
                ${item.isVintage ? '<p style="margin:0 0 2px 0;font-size:12px;color:#888888;">Vintage</p>' : ''}
                ${personalizationHTML}
              </td>
              <td align="right" style="vertical-align:top;white-space:nowrap;">
                <p style="margin:0;font-size:13px;font-weight:700;color:#121314;">$${totalItemPrice} CAD</p>
                ${quantity > 1 ? `<p style="margin:2px 0 0 0;font-size:11px;color:#888888;">x${quantity}</p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const subtotal = (items || []).reduce((sum, item) => {
    const storedPerUnit = Number(item.perUnitPrice);
    const baseUnit = Number(item.price || 0);
    let unitPrice = (!Number.isNaN(storedPerUnit) && storedPerUnit > 0) ? storedPerUnit : baseUnit;
    const qty = item.quantity || 1;
    if (Number.isNaN(storedPerUnit) || storedPerUnit <= 0) {
      unitPrice += (Number(item.personalization?.extra || 0) || 0) + (Number(item.personalization?.badgeExtra || 0) || 0);
    }
    return sum + (unitPrice * qty);
  }, 0);

  const shippingCost = Number(total || 0) - subtotal > 0.5 ? (Number(total || 0) - subtotal).toFixed(2) : '7.00';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de commande</title>
</head>
<body style="margin:0;padding:0;background-color:#f2f2f2;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f2;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- Email container -->
      <table width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;">

        <!-- Top banner -->
        <tr>
          <td style="background:#121314;text-align:center;padding:10px 20px;">
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.05em;">Livraison gratuite au Canada dès 100 CAD</span>
          </td>
        </tr>

        <!-- Logo -->
        <tr>
          <td style="background:#ffffff;text-align:center;padding:28px 40px 24px 40px;border-bottom:1px solid #e8e8e8;">
            <img src="https://futbolerovintageshop.com/assets/FVS_SVG.svg" alt="Futbolero" style="height:60px;width:auto;display:block;margin:0 auto;">
          </td>
        </tr>

        <!-- Hero title -->
        <tr>
          <td style="background:#ffffff;text-align:center;padding:36px 40px 8px 40px;">
            <h1 style="margin:0;font-size:26px;font-weight:900;color:#121314;letter-spacing:-0.02em;">Votre commande est confirmée&nbsp;!</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;text-align:center;padding:12px 48px 8px 48px;">
            <p style="margin:0;font-size:14px;color:#666666;line-height:1.6;">
              Merci ${checkoutInfo.firstName || ''}&nbsp;! Votre commande <strong style="color:#121314;">#${orderId}</strong> a bien été reçue.<br>
              Vous recevrez un e-mail dès qu'elle sera expédiée.
            </p>
          </td>
        </tr>

        <!-- CTA button -->
        <tr>
          <td style="background:#ffffff;text-align:center;padding:24px 40px 36px 40px;">
            <a href="https://futbolerovintageshop.com/tous-les-maillots.html" style="display:inline-block;background:#121314;color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.1em;text-decoration:none;padding:14px 36px;">VISITER LA BOUTIQUE</a>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e8e8e8;"></div></td></tr>

        <!-- Items section -->
        <tr>
          <td style="padding:28px 40px 8px 40px;">
            <p style="margin:0 0 16px 0;font-size:15px;font-weight:900;color:#121314;letter-spacing:0.02em;">ARTICLES DE CETTE COMMANDE</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 8px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemsHTML}
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:8px 40px 0 40px;"><div style="height:1px;background:#e8e8e8;"></div></td></tr>

        <!-- Totals -->
        <tr>
          <td style="padding:0 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:14px 0 6px 0;font-size:12px;font-weight:700;color:#999999;letter-spacing:0.08em;text-transform:uppercase;">SOUS-TOTAL</td>
                <td align="right" style="padding:14px 0 6px 0;font-size:13px;font-weight:700;color:#121314;">$${subtotal.toFixed(2)} CAD</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:12px;font-weight:700;color:#999999;letter-spacing:0.08em;text-transform:uppercase;">LIVRAISON</td>
                <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#121314;">$${shippingCost} CAD</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e8e8e8;"></div></td></tr>

        <!-- Total -->
        <tr>
          <td style="padding:0 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:16px 0;font-size:12px;font-weight:700;color:#999999;letter-spacing:0.08em;text-transform:uppercase;">TOTAL</td>
                <td align="right" style="padding:16px 0;font-size:22px;font-weight:900;color:#121314;">$${Number(total || 0).toFixed(2)} CAD</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e8e8e8;"></div></td></tr>

        <!-- Customer info -->
        <tr>
          <td style="padding:28px 40px 8px 40px;">
            <p style="margin:0 0 20px 0;font-size:15px;font-weight:900;color:#121314;letter-spacing:0.02em;">INFORMATIONS CLIENT</p>
            <p style="margin:0 0 6px 0;font-size:11px;font-weight:900;color:#121314;letter-spacing:0.08em;text-transform:uppercase;">ADRESSE DE LIVRAISON</p>
            <p style="margin:0 0 20px 0;font-size:13px;color:#444444;line-height:1.8;">
              ${checkoutInfo.firstName || ''} ${checkoutInfo.lastName || ''}<br>
              ${checkoutInfo.address || ''}<br>
              ${checkoutInfo.city || ''}${checkoutInfo.postalCode ? ' ' + checkoutInfo.postalCode : ''}<br>
              ${checkoutInfo.country || ''}
            </p>
          </td>
        </tr>

        <!-- Shipping & Payment method -->
        <tr>
          <td style="padding:0 40px 28px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="vertical-align:top;padding-right:16px;">
                  <p style="margin:0 0 6px 0;font-size:11px;font-weight:900;color:#121314;letter-spacing:0.08em;text-transform:uppercase;">MODE DE LIVRAISON</p>
                  <p style="margin:0;font-size:13px;color:#444444;">Standard (12-20 jours ouvrables)</p>
                </td>
                <td width="50%" style="vertical-align:top;padding-left:16px;">
                  <p style="margin:0 0 6px 0;font-size:11px;font-weight:900;color:#121314;letter-spacing:0.08em;text-transform:uppercase;">MODE DE PAIEMENT</p>
                  <p style="margin:0;font-size:13px;color:#444444;">Carte de crédit &mdash; $${Number(total || 0).toFixed(2)} CAD</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e8e8e8;"></div></td></tr>

        <!-- Shop category buttons -->
        <tr>
          <td style="padding:28px 40px 0 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding:0 6px 12px 0;">
                  <a href="https://futbolerovintageshop.com/maillots-vintage.html" style="display:block;background:#121314;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:0.1em;text-decoration:none;text-align:center;padding:16px 8px;">MAILLOTS VINTAGE</a>
                </td>
                <td width="50%" style="padding:0 0 12px 6px;">
                  <a href="https://futbolerovintageshop.com/maillots.html" style="display:block;background:#121314;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:0.1em;text-decoration:none;text-align:center;padding:16px 8px;">MAILLOTS ACTUELS</a>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:0 6px 0 0;">
                  <a href="https://futbolerovintageshop.com/maillots-pays.html" style="display:block;background:#121314;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:0.1em;text-decoration:none;text-align:center;padding:16px 8px;">SÉLECTIONS NATIONALES</a>
                </td>
                <td width="50%" style="padding:0 0 0 6px;">
                  <a href="https://futbolerovintageshop.com/tous-les-maillots.html" style="display:block;background:#121314;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:0.1em;text-decoration:none;text-align:center;padding:16px 8px;">TOUS LES MAILLOTS</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#e8e8e8;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px 0;font-size:12px;color:#999999;">&copy;${new Date().getFullYear()} Futbolero Vintage Shop. Tous droits réservés.</p>
            <p style="margin:0;font-size:12px;color:#999999;">
              Questions ? <a href="mailto:futbolerovintageshop@gmail.com" style="color:#121314;font-weight:700;text-decoration:none;">futbolerovintageshop@gmail.com</a>
            </p>
          </td>
        </tr>

      </table>
      <!-- /Email container -->

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
    const storedPerUnit = Number(item.perUnitPrice);
    const baseUnit = Number(item.price || 0);
    let unitForText = (!Number.isNaN(storedPerUnit) && storedPerUnit > 0) ? storedPerUnit : baseUnit;
    // Si perUnitPrice n'est pas fourni, ajouter les extras éventuellement stockés.
    if (Number.isNaN(storedPerUnit) || storedPerUnit <= 0) {
      const extra = Number(item.personalization?.extra || 0) || 0;
      const badgeExtra = Number(item.personalization?.badgeExtra || 0) || 0;
      unitForText += extra + badgeExtra;
    }
    const price = unitForText.toFixed(2);
    const totalItemPrice = (unitForText * quantity).toFixed(2);
    
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
        const persoName = String(perso.name || '').trim() || 'Sans';
        const persoNumber = String(perso.number ?? '').trim() || 'Sans';
        details += `  PERSONNALISATION:\n`;
        details += `     Nom: ${persoName}\n`;
        details += `     Numéro: ${persoNumber}\n`;
        if (perso.badge) {
          details += `     Badge: ${perso.badge}\n`;
        }
        const extra = Number(perso.extra || 0) || 0;
        if (extra > 0) {
          details += `     Frais personnalisation: +$${extra.toFixed(2)} CAD\n`;
        }
        if (perso.badgeExtra && perso.badgeExtra > 0) {
          details += `     Frais badge: +$${perso.badgeExtra.toFixed(2)} CAD\n`;
        }
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
    const storedPerUnit = Number(item.perUnitPrice);
    const baseUnit = Number(item.price || 0);
    let unitPrice = (!Number.isNaN(storedPerUnit) && storedPerUnit > 0) ? storedPerUnit : baseUnit;
    const qty = item.quantity || 1;
    // Si perUnitPrice n'est pas fourni, ajouter les extras éventuellement stockés.
    if (Number.isNaN(storedPerUnit) || storedPerUnit <= 0) {
      unitPrice += (Number(item.personalization?.extra || 0) || 0) + (Number(item.personalization?.badgeExtra || 0) || 0);
    }
    return sum + (unitPrice * qty);
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
