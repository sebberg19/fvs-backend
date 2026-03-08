// Netlify Function pour le webhook Stripe
// Location: netlify/functions/stripe-webhook.js

exports.config = {
  bodyParser: false, // CRITICAL: désactive le parsing automatique
};

const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const OFFICIAL_LOGO_URL = 'https://futbolerovintageshop.com/assets/FVS_logo_email.png';

const wrapEmailHtml = ({ title, preheader, bodyHtml }) => {
  const safeTitle = title || 'Futbolero Vintage Shop';
  const safePreheader = preheader || '';
  const safeBody = bodyHtml || '';

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f8f9;">
    <div style="display:none;font-size:1px;color:#f7f8f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePreheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f7f8f9;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;border-collapse:separate;background:#ffffff;border:1px solid #e9ebf0;border-radius:16px;overflow:hidden;">
            ${safeBody}
          </table>
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;border-collapse:collapse;">
            <tr>
              <td align="center" style="padding:14px 10px 0 10px;color:#6b6f76;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:16px;">
                Futbolero Vintage Shop • <a href="https://futbolerovintageshop.com" style="color:#6b6f76;text-decoration:underline;">futbolerovintageshop.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

// Fonction pour télécharger une image et la convertir en base64
const getImageAsBase64 = async (imageUrl) => {
  return new Promise((resolve, reject) => {
    if (!imageUrl || !imageUrl.length) {
      resolve('');
      return;
    }

    const protocol = imageUrl.startsWith('https') ? https : http;
    const timeout = setTimeout(() => {
      console.warn('[webhook] Image download timeout for:', imageUrl);
      reject(new Error('Image download timeout'));
    }, 8000);

    const request = protocol.get(imageUrl, (response) => {
      clearTimeout(timeout);
      
      if (response.statusCode !== 200) {
        console.warn(`[webhook] Image fetch failed with status ${response.statusCode}: ${imageUrl}`);
        resolve('');
        return;
      }

      const chunks = [];
      let totalSize = 0;
      const maxSize = 5 * 1024 * 1024; // 5MB max

      response.on('data', chunk => {
        totalSize += chunk.length;
        if (totalSize > maxSize) {
          request.abort();
          console.warn('[webhook] Image too large (>5MB):', imageUrl);
          resolve('');
          return;
        }
        chunks.push(chunk);
      });

      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          if (buffer.length === 0) {
            console.warn('[webhook] Empty buffer for:', imageUrl);
            resolve('');
            return;
          }
          
          const base64 = buffer.toString('base64');
          const contentType = response.headers['content-type'] || 'image/webp';
          const dataUrl = `data:${contentType};base64,${base64}`;
          console.log(`[webhook] ✅ Image converted to base64 (${(buffer.length/1024).toFixed(2)}KB): ${imageUrl}`);
          resolve(dataUrl);
        } catch (err) {
          console.warn('[webhook] Failed to encode image:', err.message);
          resolve('');
        }
      });

      response.on('error', err => {
        clearTimeout(timeout);
        console.warn('[webhook] Response error:', err.message);
        resolve('');
      });
    }).on('error', err => {
      clearTimeout(timeout);
      console.warn('[webhook] Image download error:', err.message);
      resolve('');
    });
  });
};

// Télécharger une image et renvoyer le buffer + content-type (utilisé pour attachments CID)
const getImageBuffer = async (imageUrl) => {
  return new Promise((resolve, reject) => {
    if (!imageUrl || !imageUrl.length) return resolve({ buffer: null, contentType: null });
    const protocol = imageUrl.startsWith('https') ? https : http;
    const timeout = setTimeout(() => {
      reject(new Error('Image download timeout'));
    }, 5000);

    protocol.get(imageUrl, (response) => {
      clearTimeout(timeout);
      if (response.statusCode !== 200) {
        console.warn(`[webhook] Image fetch failed with status ${response.statusCode}: ${imageUrl}`);
        resolve({ buffer: null, contentType: null });
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const contentType = response.headers['content-type'] || 'image/webp';
          resolve({ buffer, contentType });
        } catch (err) {
          console.warn('[webhook] Failed to build image buffer:', err.message);
          resolve({ buffer: null, contentType: null });
        }
      });
    }).on('error', err => {
      clearTimeout(timeout);
      console.warn('[webhook] Image download error:', err.message);
      resolve({ buffer: null, contentType: null });
    });
  });
};

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

// Template email détaillé avec articles et photos - Style du site (ASYNC)
const renderEmailTemplate = async (session, orderId) => {
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
  
  // Extraire les articles depuis les métadonnées (nouveau format avec clés séparées)
  const metadata = session.metadata || {};
  let items = [];
  try {
    console.log('[webhook] Metadata received:', JSON.stringify(metadata, null, 2));
    const itemCount = parseInt(metadata.itemCount) || 0;
    console.log('[webhook] Item count:', itemCount);
    
    for (let i = 0; i < itemCount && i < 20; i++) {
      const itemKey = `item_${i}`;
      if (metadata[itemKey]) {
        const item = JSON.parse(metadata[itemKey]);
        console.log(`[webhook] Item ${i}:`, item);
        items.push(item);
      }
    }
    
    // Fallback vers l'ancien format si pas d'articles trouvés
    if (items.length === 0 && metadata.items) {
      items = JSON.parse(metadata.items);
      console.log('[webhook] Using fallback items:', items);
    }
  } catch (e) {
    console.warn('[webhook] Failed to parse items from metadata:', e.message);
    items = [{ name: 'Commande Futbolero', quantity: 1, price: parseFloat(total), image: '' }];
  }
  
  console.log('[webhook] Final items for email:', items);
  
  // Debug: afficher les images de chaque item
  items.forEach((item, idx) => {
    console.log(`[webhook] Item ${idx} - name: "${item.name}", image: "${item.image}"`);
  });
  
  // Générer le HTML des articles avec le style noir et blanc et TOUS les détails
  const attachments = [];
  const itemsHtmlPromises = items.map(async (item, itemIdx) => {
    console.log(`[webhook] [EMAIL_RENDER] Processing item ${itemIdx}:`, JSON.stringify(item, null, 2));
    
    // Convertir les chemins relatifs en URLs absolues - multiple fallbacks
    let imageUrl = '';
    const rawImage = item.image || item.img || item.imageUrl || '';
    
    if (rawImage) {
      if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
        imageUrl = rawImage; // URL absolue déjà
      } else if (rawImage.startsWith('images/')) {
        imageUrl = `https://futbolerovintageshop.com/${rawImage}`;
      } else if (rawImage.startsWith('./images/')) {
        imageUrl = `https://futbolerovintageshop.com/${rawImage.substring(2)}`;
      } else if (rawImage.startsWith('/images/')) {
        imageUrl = `https://futbolerovintageshop.com${rawImage}`;
      } else if (rawImage.startsWith('/')) {
        imageUrl = `https://futbolerovintageshop.com${rawImage}`;
      } else {
        // Assume it's just a filename
        imageUrl = `https://futbolerovintageshop.com/images/${rawImage}`;
      }
    } else {
      // No image provided - use placeholder
      imageUrl = 'https://futbolerovintageshop.com/assets/logo.png';
      console.log(`[webhook] No image for "${item.name}", using placeholder`);
    }
    
    console.log(`[webhook] [EMAIL_RENDER] Item ${itemIdx} "${item.name}": raw="${rawImage}" -> final="${imageUrl}"`);
    
    // Utiliser l'URL directement (plus fiable que base64 pour les clients email)
    const imgSrc = imageUrl;
    console.log(`[webhook] [EMAIL_RENDER] ✅ Image URL: ${imgSrc}`);
    
    // Construire les détails de l'article (taille, personnalisation, etc)
    let detailsHtml = '';
    
    // ID du produit (en premier, bien visible)
    if (item.productId) {
      detailsHtml += `<div style="margin: 0 0 8px 0; padding: 6px 8px; background: #f5f5f5; border-left: 4px solid #000; border-radius: 2px;">
        <p style="margin: 0; color: #000; font-size: 12px; font-family: 'Courier New', monospace; font-weight: 700;">🔖 ID: <strong>${item.productId}</strong></p>
      </div>`;
    }
    
    // Taille
    if (item.size) {
      detailsHtml += `<p style="margin: 0 0 4px 0; color: #333; font-size: 13px; font-family: 'Manrope', system-ui, sans-serif;"><strong>Taille:</strong> ${item.size}</p>`;
    }
    
    // Type (Vintage)
    if (item.isVintage) {
      detailsHtml += `<p style="margin: 0 0 4px 0; color: #333; font-size: 13px; font-family: 'Manrope', system-ui, sans-serif;"><strong>Type:</strong> Maillot Vintage</p>`;
    }
    
    // Personnalisation
    if (item.persoName || item.persoNumber) {
      detailsHtml += `<div style="margin: 8px 0 0 0; padding: 6px 8px; background: #f7f8f9; border-left: 3px solid #121314; border-radius: 4px;">`;

      const persoName = String(item.persoName || '').trim() || 'Sans';
      const persoNumber = String(item.persoNumber ?? '').trim() || 'Sans';
      detailsHtml += `<p style="margin: 0 0 2px 0; color: #121314; font-size: 12px; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-weight:700;">✦ Personnalisation</p>`;
      detailsHtml += `<p style="margin: 0 0 2px 0; color: #121314; font-size: 12px; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;"><strong>Nom:</strong> ${persoName}</p>`;
      detailsHtml += `<p style="margin: 0 0 2px 0; color: #121314; font-size: 12px; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;"><strong>Numéro:</strong> ${persoNumber}</p>`;
      
      if (item.persoFee) {
        detailsHtml += `<p style="margin: 2px 0 0 0; color: #6b6f76; font-size: 11px; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Supplément: +$${item.persoFee.toFixed(2)} CAD</p>`;
      }
      
      detailsHtml += `</div>`;
    }
    
    return `
    <div style="background: #ffffff; border: 1px solid #e9ebf0; border-radius: 8px; padding: 12px; margin: 8px 0;">
      <table style="width: 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        <tbody>
        <tr>
          <td style="width: 80px; padding-right: 12px; padding-bottom: 0; padding-top: 0; vertical-align: top;">
            <img src="${imgSrc}" alt="${item.name}" style="width: 72px; height: 72px; display: block; border-radius: 6px; border: 1px solid #e9ebf0; background-color: #f7f8f9; object-fit: cover; object-position: center;">
          </td>
          <td style="padding-bottom: 0; padding-top: 0; vertical-align: top;">
            <h4 style="margin: 0 0 6px 0; color: #121314; font-size: 14px; font-weight: 700; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">${item.name}</h4>
            ${detailsHtml}
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e9ebf0;">
              <p style="margin: 0 0 2px 0; color: #6b6f76; font-size: 12px; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Qté: <strong style="color:#121314">${item.quantity}</strong></p>
              <p style="margin: 0; color: #121314; font-size: 13px; font-weight: 700; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">$${((item.price || 0) * item.quantity).toFixed(2)} CAD</p>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  `;
  });
  
  const itemsHtmlArray = await Promise.all(itemsHtmlPromises);
  const itemsHtml = itemsHtmlArray.join('');

  const html = wrapEmailHtml({
    title: `Nouvelle commande ${orderId} - Futbolero Vintage Shop`,
    preheader: `Nouvelle commande ${orderId} — $${total} ${currency}`,
    bodyHtml: `
      <tr>
        <td align="center" style="padding: 24px 20px 20px 20px;">
          <img src="${OFFICIAL_LOGO_URL}" alt="Futbolero Vintage Shop" style="height: 40px; width: auto; display: block; margin: 0 auto;">
        </td>
      </tr>

      <tr>
        <td style="background:#121314; padding: 22px 20px;">
          <h1 style="margin:0;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:20px;font-weight:700;line-height:26px;">Nouvelle commande reçue</h1>
          <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.65);font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:20px;">Commande <strong style="color:#fff;">${orderId}</strong> — Total <strong style="color:#fff;">$${total} ${currency}</strong></p>
        </td>
      </tr>

      <tr>
        <td style="padding: 20px 20px 0 20px; background:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e9ebf0;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:10px 16px; background:#f7f8f9; border-bottom:1px solid #e9ebf0; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif; font-size:10px; font-weight:700; color:#6b6f76; text-transform:uppercase; letter-spacing:0.08em;">Détails de la commande</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:5px 0;color:#6b6f76;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;">ID Commande</td>
                    <td align="right" style="padding:5px 0;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;">${orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#6b6f76;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;">Montant total</td>
                    <td align="right" style="padding:5px 0;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;">$${total} ${currency}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#6b6f76;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;">Articles</td>
                    <td align="right" style="padding:5px 0;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;">${items.length}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#6b6f76;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;">ID Session</td>
                    <td align="right" style="padding:5px 0;color:#121314;font-family:monospace;font-size:12px;">${sessionId}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e9ebf0;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:10px 16px; background:#f7f8f9; border-bottom:1px solid #e9ebf0; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif; font-size:10px; font-weight:700; color:#6b6f76; text-transform:uppercase; letter-spacing:0.08em;">Informations client</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:5px 0;color:#6b6f76;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;">Nom</td>
                    <td align="right" style="padding:5px 0;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#6b6f76;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;">Email</td>
                    <td align="right" style="padding:5px 0;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;">
                      <a href="mailto:${customerEmail}" style="color:#121314;text-decoration:underline;">${customerEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#6b6f76;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;">Téléphone</td>
                    <td align="right" style="padding:5px 0;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;">${customerPhone}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#6b6f76;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;">Paiement</td>
                    <td align="right" style="padding:5px 0;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;">Confirmé &#10003;</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e9ebf0;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:10px 16px; background:#f7f8f9; border-bottom:1px solid #e9ebf0; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif; font-size:10px; font-weight:700; color:#6b6f76; text-transform:uppercase; letter-spacing:0.08em;">Adresse de livraison</td>
            </tr>
            <tr>
              <td style="padding:14px 16px; color:#121314; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif; font-size:13px; line-height:20px;">
                ${fullAddress}
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e9ebf0;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:10px 16px; background:#f7f8f9; border-bottom:1px solid #e9ebf0; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif; font-size:10px; font-weight:700; color:#6b6f76; text-transform:uppercase; letter-spacing:0.08em;">Articles commandés</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px;">
                ${itemsHtml}
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e9ebf0;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:10px 16px; background:#f7f8f9; border-bottom:1px solid #e9ebf0; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif; font-size:10px; font-weight:700; color:#6b6f76; text-transform:uppercase; letter-spacing:0.08em;">Action requise</td>
            </tr>
            <tr>
              <td style="padding: 14px 16px; color:#121314; font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif; font-size:13px; line-height:22px;">
                <p style="margin:0 0 5px 0;">&#10003; Paiement confirmé par Stripe</p>
                <p style="margin:0 0 5px 0;">&#187; Préparer et expédier la commande</p>
                <p style="margin:0 0 5px 0;">&#187; Contacter le client : <a href="mailto:${customerEmail}" style="color:#121314;text-decoration:underline;font-weight:700;">${customerEmail}</a></p>
                <p style="margin:0;">&#187; Téléphone : <strong>${customerPhone}</strong></p>
              </td>
            </tr>
          </table>

          <div style="height:20px; line-height:20px;">&nbsp;</div>
        </td>
      </tr>

      <tr>
        <td align="center" style="background:#121314; padding: 18px 20px;">
          <p style="margin:0 0 3px 0;color:rgba(255,255,255,0.9);font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;">Futbolero Vintage Shop</p>
          <p style="margin:0;color:rgba(255,255,255,0.45);font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:11px;">Email automatique • ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}</p>
        </td>
      </tr>
    `
  });

  return { html, attachments };
};

// Template email pour le CLIENT (confirmation de commande) - Style du site (ASYNC)
const renderCustomerEmailTemplate = async (session, orderId) => {
  const customerEmail = session.customer_email || 'Non fourni';
  const total = ((session.amount_total || 0) / 100).toFixed(2);
  const currency = (session.currency || 'cad').toUpperCase();
  const customerDetails = session.customer_details || {};
  const customerName = customerDetails.name || 'Cher(e) client(e)';
  const address = customerDetails.address || {};
  const customerPhone = customerDetails.phone || '';
  const fullAddress = [
    address.line1,
    address.line2,
    `${address.city || ''} ${address.state || ''} ${address.postal_code || ''}`.trim(),
    address.country || ''
  ].filter(Boolean).join('<br>') || 'Adresse non fournie';
  
  // Extraire les articles depuis les métadonnées (nouveau format avec clés séparées)
  const metadata = session.metadata || {};
  let items = [];
  try {
    const itemCount = parseInt(metadata.itemCount) || 0;
    for (let i = 0; i < itemCount && i < 20; i++) {
      const itemKey = `item_${i}`;
      if (metadata[itemKey]) {
        const item = JSON.parse(metadata[itemKey]);
        items.push(item);
      }
    }
    
    // Fallback vers l'ancien format si pas d'articles trouvés
    if (items.length === 0 && metadata.items) {
      items = JSON.parse(metadata.items);
    }
  } catch (e) {
    items = [{ name: 'Votre commande Futbolero', quantity: 1, price: parseFloat(total), image: '' }];
  }
  
  // Générer le HTML des articles pour le client avec style noir et blanc et TOUS les détails
  const attachments = [];
  const itemsHtmlPromises = items.map(async (item, itemIdx) => {
    console.log(`[webhook] [CLIENT_EMAIL] Processing item ${itemIdx}:`, JSON.stringify(item, null, 2));
    
    // Convertir les chemins relatifs en URLs absolues - multiple fallbacks
    let imageUrl = '';
    const rawImage = item.image || item.img || item.imageUrl || '';
    
    if (rawImage) {
      if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
        imageUrl = rawImage; // URL absolue déjà
      } else if (rawImage.startsWith('images/')) {
        imageUrl = `https://futbolerovintageshop.com/${rawImage}`;
      } else if (rawImage.startsWith('./images/')) {
        imageUrl = `https://futbolerovintageshop.com/${rawImage.substring(2)}`;
      } else if (rawImage.startsWith('/images/')) {
        imageUrl = `https://futbolerovintageshop.com${rawImage}`;
      } else if (rawImage.startsWith('/')) {
        imageUrl = `https://futbolerovintageshop.com${rawImage}`;
      } else {
        // Assume it's just a filename
        imageUrl = `https://futbolerovintageshop.com/images/${rawImage}`;
      }
    } else {
      // No image provided - use placeholder
      imageUrl = 'https://futbolerovintageshop.com/assets/logo.png';
      console.log(`[webhook] [CLIENT_EMAIL] No image for "${item.name}", using placeholder`);
    }
    
    console.log(`[webhook] [CLIENT_EMAIL] Item ${itemIdx} "${item.name}": raw="${rawImage}" -> final="${imageUrl}"`);
    
    // Utiliser l'URL directement (plus fiable que base64 pour les clients email)
    const imgSrc = imageUrl;
    console.log(`[webhook] [CLIENT_EMAIL] ✅ Image URL: ${imgSrc}`);
    
    // Construire les détails de l'article (taille, personnalisation, etc)
    let detailsHtml = '';
    
    // Taille
    if (item.size) {
      detailsHtml += `<p style="margin: 0 0 2px 0; color: #888888; font-size: 12px; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">${item.size}</p>`;
    }
    
    // Type (Vintage)
    if (item.isVintage) {
      detailsHtml += `<p style="margin: 0 0 2px 0; color: #888888; font-size: 12px; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Vintage</p>`;
    }
    
    // Personnalisation
    if (item.persoName || item.persoNumber) {
      const persoName = String(item.persoName || '').trim() || 'Sans';
      const persoNumber = String(item.persoNumber ?? '').trim() || 'Sans';
      detailsHtml += `<p style="margin: 4px 0 0 0; font-size: 12px; color: #888888; font-family: system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Personnalisation : ${persoName} / ${persoNumber}${item.persoFee ? ' (+$' + item.persoFee.toFixed(2) + ' CAD)' : ''}</p>`;
    }
    
    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-bottom:1px solid #e9ebf0;">
      <tr>
        <td width="72" style="padding:12px 12px 12px 0;vertical-align:top;">
          <img src="${imgSrc}" alt="${item.name}" style="width:72px;height:72px;display:block;border:1px solid #e9ebf0;object-fit:cover;object-position:center;">
        </td>
        <td style="padding:12px 0;vertical-align:top;">
          <p style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">${item.name}</p>
          ${detailsHtml}
        </td>
        <td align="right" style="padding:12px 0;vertical-align:top;white-space:nowrap;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">$${((item.price || 0) * item.quantity).toFixed(2)} CAD</p>
          ${item.quantity > 1 ? `<p style="margin:2px 0 0 0;font-size:11px;color:#888888;font-family:system-ui,sans-serif;">x${item.quantity}</p>` : ''}
        </td>
      </tr>
    </table>
  `;
  });
  
  const itemsHtmlArray = await Promise.all(itemsHtmlPromises);
  const itemsHtml = itemsHtmlArray.join('');

  const html = wrapEmailHtml({
    title: `Confirmation de commande ${orderId} - Futbolero Vintage Shop`,
    preheader: `Votre commande ${orderId} est confirmée — $${total} ${currency}`,
    bodyHtml: `
      <!-- Logo -->
      <tr>
        <td align="center" style="padding:28px 20px 20px 20px;border-bottom:1px solid #e9ebf0;">
          <img src="${OFFICIAL_LOGO_URL}" alt="Futbolero Vintage Shop" style="height:60px;width:auto;display:block;margin:0 auto;">
        </td>
      </tr>

      <!-- Hero title -->
      <tr>
        <td style="padding:32px 32px 8px 32px;text-align:center;">
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;letter-spacing:-0.01em;">Votre commande est confirm&eacute;e&nbsp;!</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 40px 6px 40px;text-align:center;">
          <p style="margin:0;font-size:14px;color:#666666;line-height:1.6;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
            Merci <strong style="color:#121314;">${customerName}</strong>&nbsp;! Votre commande <strong style="color:#121314;">#${orderId}</strong> a bien &eacute;t&eacute; re&ccedil;ue et est en cours de pr&eacute;paration.
          </p>
        </td>
      </tr>

      <!-- CTA button -->
      <tr>
        <td style="text-align:center;padding:20px 32px 32px 32px;">
          <a href="https://futbolerovintageshop.com/tous-les-maillots.html" style="display:inline-block;background:#121314;color:#ffffff;font-size:12px;font-weight:800;letter-spacing:0.12em;text-decoration:none;padding:14px 36px;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">VISITER LA BOUTIQUE</a>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px;"><div style="height:1px;background:#e9ebf0;"></div></td></tr>

      <!-- Items section title -->
      <tr>
        <td style="padding:24px 32px 12px 32px;">
          <p style="margin:0;font-size:12px;font-weight:800;color:#121314;letter-spacing:0.08em;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;text-transform:uppercase;">Articles de votre commande</p>
        </td>
      </tr>

      <!-- Items -->
      <tr>
        <td style="padding:0 32px 8px 32px;">
          ${itemsHtml}
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:8px 32px 0 32px;"><div style="height:1px;background:#e9ebf0;"></div></td></tr>

      <!-- Totals -->
      <tr>
        <td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:14px 0 6px 0;font-size:11px;font-weight:700;color:#999999;letter-spacing:0.08em;text-transform:uppercase;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Sous-total</td>
              <td align="right" style="padding:14px 0 6px 0;font-size:13px;font-weight:700;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">$${(parseFloat(total) - 7).toFixed(2)} ${currency}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:11px;font-weight:700;color:#999999;letter-spacing:0.08em;text-transform:uppercase;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Livraison</td>
              <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">$7.00 ${currency}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px;"><div style="height:1px;background:#e9ebf0;"></div></td></tr>

      <!-- Total -->
      <tr>
        <td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:16px 0;font-size:11px;font-weight:700;color:#999999;letter-spacing:0.08em;text-transform:uppercase;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Total</td>
              <td align="right" style="padding:16px 0;font-size:20px;font-weight:900;color:#121314;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">$${total} ${currency}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px;"><div style="height:1px;background:#e9ebf0;"></div></td></tr>

      <!-- Customer info -->
      <tr>
        <td style="padding:24px 32px 8px 32px;">
          <p style="margin:0 0 16px 0;font-size:12px;font-weight:800;color:#121314;letter-spacing:0.08em;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;text-transform:uppercase;">Informations client</p>
          <p style="margin:0 0 8px 0;font-size:10px;font-weight:800;color:#121314;letter-spacing:0.08em;text-transform:uppercase;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Adresse de livraison</p>
          <p style="margin:0 0 20px 0;font-size:13px;color:#444444;line-height:1.8;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
            <strong>${customerName}</strong><br>
            ${fullAddress}${customerPhone ? `<br>T&eacute;l : ${customerPhone}` : ''}
          </p>
        </td>
      </tr>

      <!-- Shipping + Payment row -->
      <tr>
        <td style="padding:0 32px 28px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td width="50%" style="vertical-align:top;padding-right:12px;">
                <p style="margin:0 0 6px 0;font-size:10px;font-weight:800;color:#121314;letter-spacing:0.08em;text-transform:uppercase;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Mode de livraison</p>
                <p style="margin:0;font-size:13px;color:#444444;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Standard (12&ndash;20 jours ouvrables)</p>
              </td>
              <td width="50%" style="vertical-align:top;padding-left:12px;">
                <p style="margin:0 0 6px 0;font-size:10px;font-weight:800;color:#121314;letter-spacing:0.08em;text-transform:uppercase;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Mode de paiement</p>
                <p style="margin:0;font-size:13px;color:#444444;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Carte de cr&eacute;dit &mdash; $${total} ${currency}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px;"><div style="height:1px;background:#e9ebf0;"></div></td></tr>

      <!-- Shop category buttons 2x2 -->
      <tr>
        <td style="padding:24px 32px 0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td width="50%" style="padding:0 5px 10px 0;">
                <a href="https://futbolerovintageshop.com/maillots-vintage.html" style="display:block;background:#121314;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.1em;text-decoration:none;text-align:center;padding:15px 8px;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">MAILLOTS VINTAGE</a>
              </td>
              <td width="50%" style="padding:0 0 10px 5px;">
                <a href="https://futbolerovintageshop.com/maillots.html" style="display:block;background:#121314;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.1em;text-decoration:none;text-align:center;padding:15px 8px;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">MAILLOTS ACTUELS</a>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding:0 5px 0 0;">
                <a href="https://futbolerovintageshop.com/maillots-pays.html" style="display:block;background:#121314;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.1em;text-decoration:none;text-align:center;padding:15px 8px;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">S&Eacute;LECTIONS</a>
              </td>
              <td width="50%" style="padding:0 0 0 5px;">
                <a href="https://futbolerovintageshop.com/tous-les-maillots.html" style="display:block;background:#121314;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.1em;text-decoration:none;text-align:center;padding:15px 8px;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">TOUS LES MAILLOTS</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:24px 32px 0 32px;"><div style="height:1px;background:#e9ebf0;"></div></td></tr>

      <!-- Social -->
      <tr>
        <td style="padding:20px 32px;text-align:center;">
          <p style="margin:0 0 12px 0;font-size:10px;font-weight:800;color:#121314;letter-spacing:0.1em;text-transform:uppercase;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Nous suivre</p>
          <a href="https://www.instagram.com/futbolerovintageshop" style="display:inline-block;margin:0 10px;color:#666666;font-size:12px;text-decoration:none;font-family:system-ui,sans-serif;">Instagram</a>
          <a href="https://www.tiktok.com/@futbolerovintageshop" style="display:inline-block;margin:0 10px;color:#666666;font-size:12px;text-decoration:none;font-family:system-ui,sans-serif;">TikTok</a>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px;"><div style="height:1px;background:#e9ebf0;"></div></td></tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 32px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:12px;color:#999999;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">&copy;${new Date().getFullYear()} Futbolero Vintage Shop. Tous droits r&eacute;serv&eacute;s.</p>
          <p style="margin:0;font-size:12px;color:#999999;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">Questions ? <a href="mailto:futbolerovintageshop@gmail.com" style="color:#121314;font-weight:700;text-decoration:none;">futbolerovintageshop@gmail.com</a></p>
        </td>
      </tr>
    `
  });

  return { html, attachments };
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
      const { html: ownerEmailHtml, attachments: ownerAttachments } = await renderEmailTemplate(session, orderId);
      
      const ownerMailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ORDER_NOTIFY_TO,
        subject: `🛒 Nouvelle commande ${orderId} - $${total} CAD`,
        html: ownerEmailHtml,
        attachments: ownerAttachments && ownerAttachments.length ? ownerAttachments : undefined,
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
        const { html: customerEmailHtml, attachments: customerAttachments } = await renderCustomerEmailTemplate(session, orderId);
        
        const customerMailOptions = {
          from: process.env.SMTP_USER,
          to: finalCustomerEmail,
          subject: `Confirmation de commande ${orderId} - Futbolero Vintage Shop`,
          html: customerEmailHtml,
          attachments: customerAttachments && customerAttachments.length ? customerAttachments : undefined,
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
