// Backup of api/payments/notify-success.js
// Moved to backup on 2025-08-22

const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configuration du transporteur email (utilise les variables d'environnement)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Vérifier la configuration du transporteur (non bloquant)
transporter.verify().then(() => {
  console.log('Mail transporter ready');
}).catch((err) => {
  console.warn('Mail transporter verification failed:', err && err.message ? err.message : err);
});

router.post('/notify-success', async (req, res) => {
  try {
  const { items = [], checkoutInfo = {}, total = 0, timestamp = new Date().toISOString(), stage, action } = req.body || {};

  console.log('notify-success called, stage=', stage || action || 'none', 'email=', checkoutInfo && checkoutInfo.email);

    // Map legacy action to stage (backwards compatibility)
    const effectiveStage = stage || (action === 'payment_success' ? 'confirmation' : 'confirmation');

    // Minimal validation: for 'confirmation' we need client email; for 'order' we only need shop notification
    if (effectiveStage === 'confirmation' && (!checkoutInfo || !checkoutInfo.email)) {
      return res.status(400).json({
        success: false,
        emailSent: false,
        error: 'Informations client manquantes (email requis pour confirmation).'
      });
    }

    const orderId = 'FUT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    const itemsList = (items || []).map(item =>
      `• ${item.name || 'Article'} ${item.size ? `(Taille: ${item.size})` : ''} - Quantité: ${item.quantity || 1} - ${Number(item.perUnitPrice || item.price || 0).toFixed(2)}€`
    ).join('\n');

    const emailContent = `\nBonjour ${checkoutInfo.firstName || ''} ${checkoutInfo.lastName || ''},\n\nMerci pour votre commande sur Futbolero Vintage Shop !\n\nDétails de votre commande :\nNuméro de commande : ${orderId}\nDate : ${new Date(timestamp).toLocaleString('fr-FR')}\n\nArticles commandés :\n${itemsList || 'Aucun article listé.'}\n\nAdresse de livraison :\n${checkoutInfo.address || ''}\n${checkoutInfo.city || ''} ${checkoutInfo.postalCode || ''}\n${checkoutInfo.country || ''}\n\nTotal : ${Number(total || 0).toFixed(2)}€\n\nCordialement,\nL'équipe Futbolero Vintage Shop\n`;

    const shopEmail = process.env.SHOP_EMAIL || process.env.EMAIL_USER || 'futbolerovintageshop@gmail.com';

    const shopMailOptions = {
      from: process.env.EMAIL_USER,
      to: shopEmail,
      subject: `Nouvelle commande ${orderId} (${effectiveStage})`,
      text: `Stage: ${effectiveStage}\n\nNouvelle commande reçue :\n\n${emailContent}\n\nEmail client : ${checkoutInfo && checkoutInfo.email ? checkoutInfo.email : 'Non fourni'}\nTéléphone : ${checkoutInfo && checkoutInfo.phone ? checkoutInfo.phone : 'Non renseigné'}`
    };

    if (effectiveStage === 'order') {
      // Pre-order: only notify shop
      await transporter.sendMail(shopMailOptions);
      return res.status(200).json({ success: true, emailSent: true, orderId, stage: effectiveStage });
    }

    // confirmation: send to customer and shop
    const customerMailOptions = {
      from: process.env.EMAIL_USER,
      to: checkoutInfo.email,
      subject: `Confirmation de commande ${orderId} - Futbolero Vintage Shop`,
      text: emailContent
    };

    await Promise.all([
      transporter.sendMail(customerMailOptions),
      transporter.sendMail(shopMailOptions)
    ]);

    return res.status(200).json({ success: true, emailSent: true, orderId, stage: effectiveStage });
  } catch (error) {
    console.error('Erreur envoi email:', error && error.message ? error.message : error);
    return res.status(500).json({
      success: false,
      emailSent: false,
      error: error && error.message ? error.message : 'Échec envoi email'
    });
  }
});

module.exports = router;
