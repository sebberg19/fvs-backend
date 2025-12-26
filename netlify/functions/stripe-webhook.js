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

const OFFICIAL_LOGO_URL = 'https://futbolerovintageshop.com/assets/logo.png';

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
  <body style="margin:0;padding:0;background:#f4f4f5;">
    <div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePreheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f4f4f5;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;border-collapse:separate;background:#ffffff;border:1px solid #e6e6e6;border-radius:12px;overflow:hidden;">
            ${safeBody}
          </table>
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;border-collapse:collapse;">
            <tr>
              <td align="center" style="padding:14px 10px 0 10px;color:#777;font-family:Arial, sans-serif;font-size:12px;line-height:16px;">
                Futbolero Vintage Shop • <a href="https://futbolerovintageshop.com" style="color:#777;text-decoration:underline;">futbolerovintageshop.com</a>
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
      detailsHtml += `<div style="margin: 8px 0 0 0; padding: 6px 8px; background: #e8f5e9; border-left: 4px solid #4CAF50; border-radius: 2px;">`;
      
      if (item.persoName) {
        detailsHtml += `<p style="margin: 0 0 2px 0; color: #333; font-size: 13px; font-family: 'Manrope', system-ui, sans-serif;"><strong>Nom:</strong> ${item.persoName}</p>`;
      }
      
      if (item.persoNumber) {
        detailsHtml += `<p style="margin: 0 0 2px 0; color: #333; font-size: 13px; font-family: 'Manrope', system-ui, sans-serif;"><strong>Numéro:</strong> ${item.persoNumber}</p>`;
      }
      
      if (item.persoFee) {
        detailsHtml += `<p style="margin: 2px 0 0 0; color: #666; font-size: 12px; font-family: 'Manrope', system-ui, sans-serif;">Supplément: +$${item.persoFee.toFixed(2)} CAD</p>`;
      }
      
      detailsHtml += `</div>`;
    }
    
    return `
    <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin: 10px 0;">
      <table style="width: 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        <tbody>
        <tr>
          <td style="width: 80px; padding-right: 12px; padding-bottom: 0; padding-top: 0; vertical-align: middle;">
            <img src="${imgSrc}" alt="${item.name}" style="width: 70px; height: 70px; display: block; border-radius: 4px; border: 1px solid #ddd; background-color: #f0f0f0; object-fit: cover; object-position: center;">
          </td>
          <td style="padding-bottom: 0; padding-top: 0; vertical-align: top;">
            <h4 style="margin: 0 0 8px 0; color: #000; font-size: 15px; font-weight: 700; font-family: 'Manrope', system-ui, sans-serif;">${item.name}</h4>
            ${detailsHtml}
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 2px 0; color: #666; font-size: 13px; font-family: 'Manrope', system-ui, sans-serif;">Quantité: <strong>${item.quantity}</strong></p>
              <p style="margin: 0; color: #000; font-size: 14px; font-weight: 700; font-family: 'Manrope', system-ui, sans-serif;">Prix: <strong>$${((item.price || 0) * item.quantity).toFixed(2)} CAD</strong></p>
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
    preheader: `Nouvelle commande ${orderId} - $${total} ${currency}`,
    bodyHtml: `
      <tr>
        <td align="center" style="padding: 22px 20px 16px 20px; border-bottom: 1px solid #eee;">
          <img src="${OFFICIAL_LOGO_URL}" alt="Futbolero" style="height: 44px; width: auto; display: block;">
        </td>
      </tr>

      <tr>
        <td style="background:#000; padding: 22px 20px;">
          <h1 style="margin:0;color:#fff;font-family:Arial, sans-serif;font-size:20px;line-height:26px;">Nouvelle commande reçue</h1>
          <p style="margin:8px 0 0 0;color:#ddd;font-family:Arial, sans-serif;font-size:14px;line-height:20px;">Commande <strong style="color:#fff;">${orderId}</strong> — Total <strong style="color:#fff;">$${total} ${currency}</strong></p>
        </td>
      </tr>

      <tr>
        <td style="padding: 18px 20px; background:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e6e6e6;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:14px 14px 10px 14px; border-bottom:1px solid #eee; font-family:Arial, sans-serif; font-weight:700; color:#111;">Détails de la commande</td>
            </tr>
            <tr>
              <td style="padding: 12px 14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">ID Commande</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;font-weight:700;">${orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Montant total</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;font-weight:700;">$${total} ${currency}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Articles</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;font-weight:700;">${items.length}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">ID Session</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:12px;font-family:monospace;">${sessionId}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e6e6e6;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:14px 14px 10px 14px; border-bottom:1px solid #eee; font-family:Arial, sans-serif; font-weight:700; color:#111;">Informations client</td>
            </tr>
            <tr>
              <td style="padding: 12px 14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Nom</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;font-weight:700;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Email</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;">
                      <a href="mailto:${customerEmail}" style="color:#111;text-decoration:underline;">${customerEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Téléphone</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;font-weight:700;">${customerPhone}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Paiement</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;font-weight:700;">Confirmé</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e6e6e6;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:14px 14px 10px 14px; border-bottom:1px solid #eee; font-family:Arial, sans-serif; font-weight:700; color:#111;">Adresse de livraison</td>
            </tr>
            <tr>
              <td style="padding:12px 14px; color:#111; font-family:Arial, sans-serif; font-size:13px; line-height:18px;">
                ${fullAddress}
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e6e6e6;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:14px 14px 10px 14px; border-bottom:1px solid #eee; font-family:Arial, sans-serif; font-weight:700; color:#111;">Articles commandés</td>
            </tr>
            <tr>
              <td style="padding: 12px 14px;">
                ${itemsHtml}
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e6e6e6;border-radius:10px;overflow:hidden;background:#fafafa;">
            <tr>
              <td style="padding:14px 14px 10px 14px; border-bottom:1px solid #eee; font-family:Arial, sans-serif; font-weight:700; color:#111;">Prochaines étapes</td>
            </tr>
            <tr>
              <td style="padding: 12px 14px; color:#111; font-family:Arial, sans-serif; font-size:13px; line-height:18px;">
                <p style="margin:0 0 6px 0;">- Paiement confirmé par Stripe</p>
                <p style="margin:0 0 6px 0;">- Préparer la commande</p>
                <p style="margin:0 0 6px 0;">- Contacter le client: <a href="mailto:${customerEmail}" style="color:#111;text-decoration:underline;font-weight:700;">${customerEmail}</a></p>
                <p style="margin:0;">- Téléphone: <strong>${customerPhone}</strong></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td align="center" style="background:#000; padding: 16px 20px; color:#ddd; font-family:Arial, sans-serif; font-size:12px; line-height:16px;">
          Email automatique • ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}
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
      detailsHtml += `<div style="margin: 8px 0 0 0; padding: 6px 8px; background: #e8f5e9; border-left: 4px solid #4CAF50; border-radius: 2px;">`;
      
      if (item.persoName) {
        detailsHtml += `<p style="margin: 0 0 2px 0; color: #333; font-size: 13px; font-family: 'Manrope', system-ui, sans-serif;"><strong>Nom:</strong> ${item.persoName}</p>`;
      }
      
      if (item.persoNumber) {
        detailsHtml += `<p style="margin: 0 0 2px 0; color: #333; font-size: 13px; font-family: 'Manrope', system-ui, sans-serif;"><strong>Numéro:</strong> ${item.persoNumber}</p>`;
      }
      
      if (item.persoFee) {
        detailsHtml += `<p style="margin: 2px 0 0 0; color: #666; font-size: 12px; font-family: 'Manrope', system-ui, sans-serif;">Supplément: +$${item.persoFee.toFixed(2)} CAD</p>`;
      }
      
      detailsHtml += `</div>`;
    }
    
    return `
    <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin: 10px 0;">
      <table style="width: 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        <tbody>
        <tr>
          <td style="width: 80px; padding-right: 12px; padding-bottom: 0; padding-top: 0; vertical-align: middle;">
            <img src="${imgSrc}" alt="${item.name}" style="width: 70px; height: 70px; display: block; border-radius: 4px; border: 1px solid #ddd; background-color: #f0f0f0; object-fit: cover; object-position: center;">
          </td>
          <td style="padding-bottom: 0; padding-top: 0; vertical-align: top;">
            <h4 style="margin: 0 0 8px 0; color: #000; font-size: 15px; font-weight: 700; font-family: 'Manrope', system-ui, sans-serif;">${item.name}</h4>
            ${detailsHtml}
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 2px 0; color: #666; font-size: 13px; font-family: 'Manrope', system-ui, sans-serif;">Quantité: <strong>${item.quantity}</strong></p>
              <p style="margin: 0; color: #000; font-size: 14px; font-weight: 700; font-family: 'Manrope', system-ui, sans-serif;">Prix: <strong>$${((item.price || 0) * item.quantity).toFixed(2)} CAD</strong></p>
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
    title: `Confirmation de commande ${orderId} - Futbolero Vintage Shop`,
    preheader: `Votre commande ${orderId} est confirmée - $${total} ${currency}`,
    bodyHtml: `
      <tr>
        <td align="center" style="padding: 22px 20px 16px 20px; border-bottom: 1px solid #eee;">
          <img src="${OFFICIAL_LOGO_URL}" alt="Futbolero" style="height: 44px; width: auto; display: block;">
        </td>
      </tr>

      <tr>
        <td style="background:#000; padding: 22px 20px;">
          <h1 style="margin:0;color:#fff;font-family:Arial, sans-serif;font-size:20px;line-height:26px;">Merci pour votre commande</h1>
          <p style="margin:8px 0 0 0;color:#ddd;font-family:Arial, sans-serif;font-size:14px;line-height:20px;">
            Bonjour <strong style="color:#fff;">${customerName}</strong>, votre commande est confirmée. Nous préparons vos articles avec soin.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding: 18px 20px; background:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e6e6e6;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:14px 14px 10px 14px; border-bottom:1px solid #eee; font-family:Arial, sans-serif; font-weight:700; color:#111;">Récapitulatif de votre commande</td>
            </tr>
            <tr>
              <td style="padding: 12px 14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Numéro de commande</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;font-weight:700;">${orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Total payé</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;font-weight:700;">$${total} ${currency}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Nombre d'articles</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;font-weight:700;">${items.length}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-family:Arial, sans-serif;font-size:13px;">Email</td>
                    <td align="right" style="padding:6px 0;color:#111;font-family:Arial, sans-serif;font-size:13px;">${customerEmail}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e6e6e6;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:14px 14px 10px 14px; border-bottom:1px solid #eee; font-family:Arial, sans-serif; font-weight:700; color:#111;">Vos articles</td>
            </tr>
            <tr>
              <td style="padding: 12px 14px;">
                ${itemsHtml}
              </td>
            </tr>
          </table>

          <div style="height:14px; line-height:14px;">&nbsp;</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e6e6e6;border-radius:10px;overflow:hidden;background:#fafafa;">
            <tr>
              <td style="padding:14px 14px 10px 14px; border-bottom:1px solid #eee; font-family:Arial, sans-serif; font-weight:700; color:#111;">Prochaines étapes</td>
            </tr>
            <tr>
              <td style="padding: 12px 14px; color:#111; font-family:Arial, sans-serif; font-size:13px; line-height:18px;">
                <p style="margin:0 0 6px 0;">- Votre paiement a été confirmé</p>
                <p style="margin:0 0 6px 0;">- Nous préparons votre commande</p>
                <p style="margin:0 0 6px 0;">- Vous recevrez un email avec les détails d'expédition</p>
                <p style="margin:0;">- Questions ? <a href="mailto:futbolerovintageshop@gmail.com" style="color:#111;text-decoration:underline;font-weight:700;">futbolerovintageshop@gmail.com</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td align="center" style="background:#000; padding: 16px 20px; color:#ddd; font-family:Arial, sans-serif; font-size:12px; line-height:16px;">
          Futbolero Vintage Shop • ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}
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
