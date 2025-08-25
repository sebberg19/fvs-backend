// Configuration des URLs selon l'environnement
const API_CONFIG = {
    // Détection automatique de l'environnement
    isProduction: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    
    // URLs du serveur backend
    development: {
    // Use the current page origin so dev servers using 127.0.0.1 or localhost both resolve
    baseURL: window.location.origin + '/api'
    },
    production: {
        // URL Render (backend déployé)
        baseURL: 'https://fvs-backend-1.onrender.com/api'
    }
};

// Obtenir l'URL de base de l'API selon l'environnement
function getApiBaseURL() {
    // Allow a manual override (useful for testing against a different host)
    if (window.API_BASE) return window.API_BASE;
    return API_CONFIG.isProduction ? API_CONFIG.production.baseURL : API_CONFIG.development.baseURL;
}

// Helper pour construire les URLs d'API
function buildApiURL(endpoint) {
    return `${getApiBaseURL()}${endpoint}`;
}

// Exporter pour utilisation globale
window.API = {
    baseURL: getApiBaseURL(),
    payments: {
        createSession: () => buildApiURL('/payments/create-checkout-session'),
        createSessionFromTotal: () => buildApiURL('/payments/create-session-from-total')
    }
};

console.log(`🚀 API configurée: ${window.API.baseURL}`);
