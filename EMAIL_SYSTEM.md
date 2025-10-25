# Système d'emails - Futbolero

## Comment ça fonctionne

Les emails sont envoyés **automatiquement** par le webhook Stripe après chaque paiement réussi.

### Fichier responsable
- `netlify/functions/stripe-webhook.js` - Gère TOUT le processus d'emails

### Emails envoyés
1. **Email au propriétaire** (`ORDER_NOTIFY_TO`)
   - Contient toutes les infos de la commande
   - **Photos des maillots** (70x70px)
   - Détails de personnalisation
   - Adresse de livraison complète
   
2. **Email au client** (email Stripe)
   - Confirmation de commande
   - **Photos des maillots** commandés
   - Récapitulatif du paiement

## Configuration requise (Netlify)

Dans **Netlify Dashboard → Site settings → Environment variables** :

```
SMTP_USER=futbolerovintageshop@gmail.com
SMTP_PASS=[mot de passe d'application Gmail]
ORDER_NOTIFY_TO=futbolerovintageshop@gmail.com
STRIPE_WEBHOOK_SECRET=[secret du webhook Stripe]
STRIPE_SECRET_KEY=[clé secrète Stripe]
```

## Configuration Stripe

Dans **Stripe Dashboard → Developers → Webhooks** :

- **URL du webhook** : `https://futbolerovintageshop.com/.netlify/functions/stripe-webhook`
- **Événement** : `checkout.session.completed`
- **Secret** : Copiez-le dans `STRIPE_WEBHOOK_SECRET` sur Netlify

## Format des emails

✅ Les emails sont en **HTML** avec :
- Images des maillots affichées
- Design noir et blanc moderne
- Toutes les infos de personnalisation
- Responsive (mobile-friendly)

## Dépannage

Si vous ne recevez pas d'emails :

1. Vérifiez les logs Netlify : `Functions → stripe-webhook → Logs`
2. Vérifiez que le webhook Stripe est actif
3. Vérifiez les variables d'environnement Netlify
4. Vérifiez que Gmail autorise les connexions moins sécurisées ou utilisez un mot de passe d'application

## Notes importantes

- ❌ `api/payments/notify-success.js` a été supprimé (créait des conflits)
- ✅ Un seul système d'emails maintenant = plus simple et plus fiable
- ✅ Les images des maillots sont automatiquement converties en URLs complètes
