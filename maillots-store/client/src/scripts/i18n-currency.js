// Système d'internationalisation et conversion de devises
// Pour Futbolero Vintage Shop

// Taux de change (tu peux les mettre à jour manuellement ou via une API)
const EXCHANGE_RATES = {
  CAD: 1.0,      // Devise de base
  USD: 0.74,     // 1 CAD = 0.74 USD (approximatif)
  EUR: 0.68      // 1 CAD = 0.68 EUR (approximatif)
};

// Traductions
const TRANSLATIONS = {
  fr: {
    'nav.home': 'Accueil',
    'nav.all': 'Tous les maillots',
    'nav.jerseys': 'Maillots',
    'nav.vintage': 'Maillots vintage',
    'cart.title': 'Panier',
    'cart.subtotal': 'Sous-total',
    'cart.shipping': 'Frais de livraison',
    'cart.total': 'Total',
    'cart.promo': 'Code promo',
    'cart.promo.apply': 'Appliquer',
    'cart.promo.applied': 'Appliqué',
    'cart.promo.success': 'Code promotionnel appliqué',
    'cart.promo.invalid': 'Code promo invalide',
    'cart.promo.enter': 'Veuillez entrer un code promo',
    'cart.checkout': 'Procéder au paiement sécurisé',
    'cart.empty': 'Votre panier est vide.',
    'cart.quantity': 'Qté',
    'cart.free': 'Gratuit',
    'cart.back': 'Retour',
    'footer.rights': 'Tous droits réservés.'
  },
  en: {
    'nav.home': 'Home',
    'nav.all': 'All Jerseys',
    'nav.jerseys': 'Jerseys',
    'nav.vintage': 'Vintage Jerseys',
    'cart.title': 'Cart',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Shipping',
    'cart.total': 'Total',
    'cart.promo': 'Promo Code',
    'cart.promo.apply': 'Apply',
    'cart.promo.applied': 'Applied',
    'cart.promo.success': 'Promotional code applied',
    'cart.promo.invalid': 'Invalid promo code',
    'cart.promo.enter': 'Please enter a promo code',
    'cart.checkout': 'Proceed to Secure Payment',
    'cart.empty': 'Your cart is empty.',
    'cart.quantity': 'Qty',
    'cart.free': 'Free',
    'cart.back': 'Back',
    'footer.rights': 'All rights reserved.'
  }
};

// Variables globales
let currentLanguage = localStorage.getItem('language') || 'fr';
let currentCurrency = localStorage.getItem('currency') || 'CAD';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
  initializeI18nAndCurrency();
});

function initializeI18nAndCurrency() {
  // Mettre à jour l'affichage des sélecteurs
  updateLanguageDisplay();
  updateCurrencyDisplay();
  
  // Appliquer les traductions
  applyTranslations();
  
  // Convertir les prix
  convertAllPrices();
}

function switchLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('language', lang);
  
  updateLanguageDisplay();
  applyTranslations();
  
  console.log('🌐 Langue changée vers:', lang);
}

function switchCurrency(currency) {
  currentCurrency = currency;
  localStorage.setItem('currency', currency);
  
  updateCurrencyDisplay();
  convertAllPrices();
  
  console.log('💱 Devise changée vers:', currency);
}

function updateLanguageDisplay() {
  const langElements = ['currentLang', 'currentLangMobile'];
  langElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = currentLanguage.toUpperCase();
    }
  });
}

function updateCurrencyDisplay() {
  const currencyElements = ['currentCurrency', 'currentCurrencyMobile'];
  currencyElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = currentCurrency;
    }
  });
}

function applyTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = TRANSLATIONS[currentLanguage]?.[key];
    if (translation) {
      el.textContent = translation;
    }
  });
  
  // Traductions spéciales pour les éléments avec ID
  const specialTranslations = {
    'cart.title': ['cart-title'],
    'cart.subtotal': ['subtotal-label'],
    'cart.shipping': ['shipping-label'],
    'cart.total': ['total-label'],
    'cart.promo': ['promo-label'],
    'cart.promo.apply': ['applyPromo'],
    'cart.checkout': ['checkout-button'],
    'cart.empty': ['empty'],
    'cart.back': ['backBtn']
  };
  
  Object.entries(specialTranslations).forEach(([key, ids]) => {
    const translation = TRANSLATIONS[currentLanguage]?.[key];
    if (translation) {
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          if (el.tagName === 'BUTTON' || el.tagName === 'A') {
            el.textContent = translation;
          } else {
            el.textContent = translation;
          }
        }
      });
    }
  });
}

function convertPrice(priceCAD) {
  const rate = EXCHANGE_RATES[currentCurrency] || 1;
  return priceCAD * rate;
}

function formatPrice(amount) {
  const symbols = {
    CAD: '$',
    USD: '$',
    EUR: '€'
  };
  
  const symbol = symbols[currentCurrency] || '$';
  const formatted = amount.toFixed(2);
  
  if (currentCurrency === 'EUR') {
    return `${formatted}${symbol}`;
  } else {
    return `${symbol}${formatted}`;
  }
}

function convertAllPrices() {
  // Convertir les prix dans le panier
  const priceElements = document.querySelectorAll('[data-price-cad]');
  priceElements.forEach(el => {
    const priceCAD = parseFloat(el.getAttribute('data-price-cad'));
    if (!isNaN(priceCAD)) {
      const convertedPrice = convertPrice(priceCAD);
      el.textContent = `${formatPrice(convertedPrice)} ${currentCurrency}`;
    }
  });
  
  // Convertir les totaux
  updateCartTotals();
}

function updateCartTotals() {
  // Cette fonction sera appelée pour mettre à jour les totaux du panier
  // Elle sera intégrée avec le système de panier existant
  if (typeof render === 'function') {
    render(); // Re-render le panier avec les nouveaux prix
  }
}

// Fonction utilitaire pour obtenir le taux de change actuel
function getCurrentExchangeRate() {
  return EXCHANGE_RATES[currentCurrency] || 1;
}

// Fonction utilitaire pour obtenir la langue actuelle
function getCurrentLanguage() {
  return currentLanguage;
}

// Fonction utilitaire pour obtenir la devise actuelle
function getCurrentCurrency() {
  return currentCurrency;
}

// Exporter les fonctions globalement
window.switchLanguage = switchLanguage;
window.switchCurrency = switchCurrency;
window.convertPrice = convertPrice;
window.formatPrice = formatPrice;
window.getCurrentExchangeRate = getCurrentExchangeRate;
window.getCurrentLanguage = getCurrentLanguage;
window.getCurrentCurrency = getCurrentCurrency;
