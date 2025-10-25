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

// Fonction pour télécharger une image et la convertir en base64
const getImageAsBase64 = async (imageUrl) => {
  return new Promise((resolve, reject) => {
    if (!imageUrl || !imageUrl.length) {
      resolve('');
      return;
    }

    const protocol = imageUrl.startsWith('https') ? https : http;
    const timeout = setTimeout(() => {
      reject(new Error('Image download timeout'));
    }, 5000);

    protocol.get(imageUrl, (response) => {
      clearTimeout(timeout);
      
      if (response.statusCode !== 200) {
        console.warn(`[webhook] Image fetch failed with status ${response.statusCode}: ${imageUrl}`);
        resolve('');
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const contentType = response.headers['content-type'] || 'image/webp';
          const dataUrl = `data:${contentType};base64,${base64}`;
          resolve(dataUrl);
        } catch (err) {
          console.warn('[webhook] Failed to encode image:', err.message);
          resolve('');
        }
      });
    }).on('error', err => {
      clearTimeout(timeout);
      console.warn('[webhook] Image download error:', err.message);
      resolve('');
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

// Template email détaillé avec articles et photos - Style du site
const renderEmailTemplate = (session, orderId) => {
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
  const itemsHtml = items.map((item, itemIdx) => {
    // Convertir les chemins relatifs en URLs absolues - multiple fallbacks
    let imageUrl = '';
    if (item.image) {
      if (item.image.startsWith('http')) {
        imageUrl = item.image; // URL absolue déjà
      } else if (item.image.startsWith('images/')) {
        imageUrl = `https://futbolerovintageshop.com/${item.image}`;
      } else if (item.image.startsWith('/')) {
        imageUrl = `https://futbolerovintageshop.com${item.image}`;
      } else {
        imageUrl = `https://futbolerovintageshop.com/images/${item.image}`;
      }
    } else {
      // Fallback: créer une URL basée sur le nom du produit
      const slug = (item.name || 'item').toLowerCase().replace(/[^a-z0-9]/g, '_');
      imageUrl = `https://futbolerovintageshop.com/images/${slug}.webp`;
      console.log(`[webhook] No image for "${item.name}", trying fallback: ${imageUrl}`);
    }
    
    console.log(`[webhook] Item ${itemIdx} "${item.name}": image="${item.image}", final URL="${imageUrl}"`);
    
    // Construire les détails de l'article (taille, personnalisation, etc)
    let detailsHtml = '';
    
    // Taille
    if (item.size) {
      detailsHtml += `<p style="margin: 0 0 4px 0; color: #666; font-size: 13px; font-family: Inter, system-ui, sans-serif;">Taille: <strong>${item.size}</strong></p>`;
    }
    
    // Type (Vintage)
    if (item.isVintage) {
      detailsHtml += `<p style="margin: 0 0 4px 0; color: #666; font-size: 13px; font-family: Inter, system-ui, sans-serif;">Maillot Vintage</p>`;
    }
    
    // Personnalisation (IMPORTANT!)
    if (item.persoName || item.persoNumber) {
      detailsHtml += `<div style="margin: 6px 0; padding: 8px; background: #f0f8ff; border-left: 3px solid #4CAF50; border-radius: 4px;">
        <p style="margin: 0 0 4px 0; color: #000; font-size: 13px; font-weight: 600; font-family: Inter, system-ui, sans-serif;">PERSONNALISATION:</p>`;
      
      if (item.persoName) {
        detailsHtml += `<p style="margin: 0 0 2px 0; color: #333; font-size: 13px; font-family: Inter, system-ui, sans-serif;">Nom: <strong>${item.persoName}</strong></p>`;
      }
      
      if (item.persoNumber) {
        detailsHtml += `<p style="margin: 0 0 2px 0; color: #333; font-size: 13px; font-family: Inter, system-ui, sans-serif;">Numéro: <strong>${item.persoNumber}</strong></p>`;
      }
      
      if (item.persoFee) {
        detailsHtml += `<p style="margin: 2px 0 0 0; color: #666; font-size: 12px; font-style: italic; font-family: Inter, system-ui, sans-serif;">(+$${item.persoFee.toFixed(2)} CAD)</p>`;
      }
      
      detailsHtml += `</div>`;
    }
    
    return `
    <div style="background: #ffffff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 12px 0; display: flex; align-items: flex-start; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${imageUrl && imageUrl.length > 10 ? `
        <img src="${imageUrl}" alt="${item.name}" 
             style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; margin-right: 16px; border: 1px solid #ddd; flex-shrink: 0;">
      ` : ''}
      <div style="flex: 1;">
        <h4 style="margin: 0 0 8px 0; color: #000; font-size: 16px; font-weight: 600; font-family: Inter, system-ui, sans-serif;">${item.name}</h4>
        ${detailsHtml}
        <p style="margin: 4px 0 0 0; color: #666; font-size: 14px; font-family: Inter, system-ui, sans-serif;">Quantité: ${item.quantity}</p>
        <p style="margin: 4px 0 0 0; color: #000; font-weight: 600; font-size: 15px; font-family: Inter, system-ui, sans-serif;">Prix unitaire: $${(item.price || 0).toFixed(2)} CAD</p>
        ${item.quantity > 1 ? `<p style="margin: 2px 0 0 0; color: #000; font-weight: 700; font-size: 16px; font-family: Inter, system-ui, sans-serif;">Total: $${((item.price || 0) * item.quantity).toFixed(2)} CAD</p>` : ''}
      </div>
    </div>
  `;
  }).join('');
  
  return `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #000;">
      <!-- Header avec style noir et blanc -->
      <div style="background: #ffffff; padding: 32px 24px; text-align: center; border-bottom: 2px solid #000;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <img src="https://futbolerovintageshop.com/assets/logo.png" alt="Futbolero Logo" 
               style="height: 40px; width: auto; margin-right: 12px;">
          <div>
            <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: 700; font-family: Inter, system-ui, sans-serif;">Futbolero</h1>
            <p style="color: #666; margin: 0; font-size: 14px; font-weight: 500;">Vintage Shop</p>
          </div>
        </div>
      </div>
      
      <!-- Message principal -->
      <div style="background: #000; padding: 32px 24px; text-align: center; color: #ffffff;">
        <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Nouvelle commande reçue</h2>
        <p style="color: #ffffff; margin: 0; font-size: 16px;">Une nouvelle commande vient d'être confirmée sur votre boutique.</p>
      </div>
      
      <!-- Corps de l'email -->
      <div style="padding: 24px; background: #f9f9f9;">
        <!-- Détails de la commande -->
        <div style="background: #ffffff; border: 2px solid #000; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h3 style="color: #000; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Détails de la commande</h3>
          <div style="display: grid; gap: 8px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666; font-weight: 500;">ID Commande:</span>
              <span style="color: #000; font-weight: 600;">${orderId}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666; font-weight: 500;">Montant total:</span>
              <span style="color: #000; font-weight: 700; font-size: 18px;">$${total} ${currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666; font-weight: 500;">Articles:</span>
              <span style="color: #000; font-weight: 600;">${items.length}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #666; font-weight: 500;">ID Session:</span>
              <span style="color: #000; font-size: 12px; font-family: monospace;">${sessionId}</span>
            </div>
          </div>
        </div>
        
        <!-- Informations client -->
        <div style="background: #ffffff; border: 2px solid #000; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h3 style="color: #000; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Informations client</h3>
          <div style="display: grid; gap: 8px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666; font-weight: 500;">Nom:</span>
              <span style="color: #000; font-weight: 600;">${customerName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666; font-weight: 500;">Email:</span>
              <span style="color: #000;"><a href="mailto:${customerEmail}" style="color: #000; text-decoration: underline;">${customerEmail}</a></span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666; font-weight: 500;">Téléphone:</span>
              <span style="color: #000; font-weight: 600;">${customerPhone}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #666; font-weight: 500;">Paiement:</span>
              <span style="color: #000; font-weight: 600;">Confirmé</span>
            </div>
          </div>
        </div>
        
        <!-- Adresse de livraison -->
        <div style="background: #ffffff; border: 2px solid #000; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h3 style="color: #000; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Adresse de livraison</h3>
          <div style="background: #f9f9f9; padding: 16px; border-radius: 4px; border: 1px solid #ddd;">
            <p style="margin: 0; line-height: 1.5; color: #000;">${fullAddress}</p>
          </div>
        </div>
        
        <!-- Articles commandés -->
        <div style="background: #ffffff; border: 2px solid #000; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h3 style="color: #000; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Articles commandés</h3>
          ${itemsHtml}
        </div>
        
        <!-- Actions à faire -->
        <div style="background: #f9f9f9; border: 2px solid #000; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h3 style="color: #000; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Prochaines étapes</h3>
          <div style="display: grid; gap: 8px;">
            <p style="margin: 0; color: #000; font-weight: 600;">Paiement confirmé par Stripe</p>
            <p style="margin: 0; color: #000;">Préparer la commande</p>
            <p style="margin: 0; color: #000;">Contacter le client: <a href="mailto:${customerEmail}" style="color: #000; text-decoration: underline; font-weight: 600;">${customerEmail}</a></p>
            <p style="margin: 0; color: #000;">Téléphone: <strong>${customerPhone}</strong></p>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #000; padding: 24px; text-align: center; color: #ffffff;">
        <p style="margin: 0 0 8px 0; font-size: 14px;">Email automatique - Futbolero Vintage Shop</p>
        <p style="margin: 0; font-size: 12px; color: #ccc;">Date: ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}</p>
      </div>
    </div>
  `;
};

// Template email pour le CLIENT (confirmation de commande) - Style du site
const renderCustomerEmailTemplate = (session, orderId) => {
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
  const itemsHtml = items.map(item => {
    // Convertir les chemins relatifs en URLs absolues - multiple fallbacks
    let imageUrl = '';
    if (item.image) {
      if (item.image.startsWith('http')) {
        imageUrl = item.image; // URL absolue déjà
      } else if (item.image.startsWith('images/')) {
        imageUrl = `https://futbolerovintageshop.com/${item.image}`;
      } else if (item.image.startsWith('/')) {
        imageUrl = `https://futbolerovintageshop.com${item.image}`;
      } else {
        imageUrl = `https://futbolerovintageshop.com/images/${item.image}`;
      }
    }
    
    console.log(`[webhook] [CLIENT] Processing item "${item.name}": original image="${item.image}", final imageUrl="${imageUrl}"`);
    
    // Construire les détails de l'article (taille, personnalisation, etc)
    let detailsHtml = '';
    
    // Taille
    if (item.size) {
      detailsHtml += `<p style="margin: 0 0 4px 0; color: #666; font-size: 13px; font-family: Inter, system-ui, sans-serif;">Taille: <strong>${item.size}</strong></p>`;
    }
    
    // Type (Vintage)
    if (item.isVintage) {
      detailsHtml += `<p style="margin: 0 0 4px 0; color: #666; font-size: 13px; font-family: Inter, system-ui, sans-serif;">Maillot Vintage</p>`;
    }
    
    // Personnalisation (IMPORTANT!)
    if (item.persoName || item.persoNumber) {
      detailsHtml += `<div style="margin: 6px 0; padding: 8px; background: #f0f8ff; border-left: 3px solid #4CAF50; border-radius: 4px;">
        <p style="margin: 0 0 4px 0; color: #000; font-size: 13px; font-weight: 600; font-family: Inter, system-ui, sans-serif;">PERSONNALISATION:</p>`;
      
      if (item.persoName) {
        detailsHtml += `<p style="margin: 0 0 2px 0; color: #333; font-size: 13px; font-family: Inter, system-ui, sans-serif;">Nom: <strong>${item.persoName}</strong></p>`;
      }
      
      if (item.persoNumber) {
        detailsHtml += `<p style="margin: 0 0 2px 0; color: #333; font-size: 13px; font-family: Inter, system-ui, sans-serif;">Numéro: <strong>${item.persoNumber}</strong></p>`;
      }
      
      if (item.persoFee) {
        detailsHtml += `<p style="margin: 2px 0 0 0; color: #666; font-size: 12px; font-style: italic; font-family: Inter, system-ui, sans-serif;">(+$${item.persoFee.toFixed(2)} CAD)</p>`;
      }
      
      detailsHtml += `</div>`;
    }
    
    return `
    <div style="background: #ffffff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 12px 0; display: flex; align-items: flex-start; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${imageUrl && imageUrl.length > 10 && !imageUrl.includes('data:image/svg') ? `
        <img src="${imageUrl}" alt="${item.name}" 
             style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; margin-right: 16px; border: 1px solid #ddd; flex-shrink: 0;">
      ` : ''}
      <div style="flex: 1;">
        <h4 style="margin: 0 0 8px 0; color: #000; font-size: 16px; font-weight: 600; font-family: Inter, system-ui, sans-serif;">${item.name}</h4>
        ${detailsHtml}
        <p style="margin: 4px 0 0 0; color: #666; font-size: 14px; font-family: Inter, system-ui, sans-serif;">Quantité: ${item.quantity}</p>
        <p style="margin: 4px 0 0 0; color: #000; font-weight: 600; font-size: 15px; font-family: Inter, system-ui, sans-serif;">Prix unitaire: $${(item.price || 0).toFixed(2)} CAD</p>
        ${item.quantity > 1 ? `<p style="margin: 2px 0 0 0; color: #000; font-weight: 700; font-size: 16px; font-family: Inter, system-ui, sans-serif;">Total: $${((item.price || 0) * item.quantity).toFixed(2)} CAD</p>` : ''}
      </div>
    </div>
  `;
  }).join('');
  
  return `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #000;">
      <!-- Header avec logo noir et blanc -->
      <div style="background: #ffffff; padding: 32px 24px; text-align: center; border-bottom: 2px solid #000;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <img src="https://futbolerovintageshop.com/assets/logo.png" alt="Futbolero Logo" 
               style="height: 40px; width: auto; margin-right: 12px;">
          <div>
            <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: 700; font-family: Inter, system-ui, sans-serif;">Futbolero</h1>
            <p style="color: #666; margin: 0; font-size: 14px; font-weight: 500;">Vintage Shop</p>
          </div>
        </div>
      </div>
      
      <!-- Message de remerciement -->
      <div style="background: #000; padding: 32px 24px; text-align: center; color: #ffffff;">
        <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Merci pour votre commande</h2>
        <p style="color: #ffffff; margin: 0; font-size: 16px; line-height: 1.5;">
          Bonjour <strong style="color: #ffffff;">${customerName}</strong>,<br>
          Votre commande a été confirmée avec succès. Nous préparons vos articles avec soin !
        </p>
      </div>
      
      <!-- Corps de l'email -->
      <div style="padding: 24px; background: #f9f9f9;">
        <!-- Récapitulatif de commande -->
        <div style="background: #ffffff; border: 2px solid #000; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h3 style="color: #000; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Récapitulatif de votre commande</h3>
          <div style="display: grid; gap: 8px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666; font-weight: 500;">Numéro de commande:</span>
              <span style="color: #000; font-weight: 600;">${orderId}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666; font-weight: 500;">Total payé:</span>
              <span style="color: #000; font-weight: 700; font-size: 18px;">$${total} ${currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #666; font-weight: 500;">Nombre d'articles:</span>
              <span style="color: #000; font-weight: 600;">${items.length}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #666; font-weight: 500;">Email de confirmation:</span>
              <span style="color: #000; font-size: 14px;">${customerEmail}</span>
            </div>
          </div>
        </div>
        
        <!-- Articles commandés -->
        <div style="background: #ffffff; border: 2px solid #000; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h3 style="color: #000; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Vos articles</h3>
          ${itemsHtml}
        </div>
        
        <!-- Informations importantes -->
        <div style="background: #f9f9f9; border: 2px solid #000; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h3 style="color: #000; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Prochaines étapes</h3>
          <div style="display: grid; gap: 8px;">
            <p style="margin: 0; color: #000; font-weight: 600;">Votre paiement a été confirmé</p>
            <p style="margin: 0; color: #000;">Nous préparons votre commande</p>
            <p style="margin: 0; color: #000;">Vous recevrez un email avec les détails d'expédition</p>
            <p style="margin: 0; color: #000;">Questions ? Contactez-nous : <a href="mailto:futbolerovintageshop@gmail.com" style="color: #000; text-decoration: underline; font-weight: 600;">futbolerovintageshop@gmail.com</a></p>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #000; padding: 24px; text-align: center; color: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
          <img src="https://futbolerovintageshop.com/assets/logo.png" alt="Futbolero Logo" 
               style="height: 24px; width: auto; margin-right: 8px; filter: invert(1);">
          <p style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 600;">
            Futbolero Vintage Shop
          </p>
        </div>
        <p style="color: #ccc; margin: 0 0 8px 0; font-size: 14px; font-style: italic;">Des maillots iconiques, un style intemporel</p>
        <p style="color: #ccc; margin: 0; font-size: 12px;">Email automatique envoyé le ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}</p>
      </div>
    </div>
  `;
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
      const ownerEmailHtml = renderEmailTemplate(session, orderId);
      
      const ownerMailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ORDER_NOTIFY_TO,
        subject: `🛒 Nouvelle commande ${orderId} - $${total} CAD`,
        html: ownerEmailHtml,
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
        const customerEmailHtml = renderCustomerEmailTemplate(session, orderId);
        
        const customerMailOptions = {
          from: process.env.SMTP_USER,
          to: finalCustomerEmail,
          subject: `Confirmation de commande ${orderId} - Futbolero Vintage Shop`,
          html: customerEmailHtml,
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
