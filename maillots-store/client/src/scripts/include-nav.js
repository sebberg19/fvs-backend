document.addEventListener('DOMContentLoaded', async () => {
  const header = document.querySelector('#site-header') || document.querySelector('header');

  // Try to inject shared nav if a header exists
  if (header) {
    const tryPaths = [
      './maillots-store/client/src/partials/nav.html',
      '../partials/nav.html',
      './partials/nav.html'
    ];
    let injected = false;
    for (const p of tryPaths) {
      try {
        const res = await fetch(p, { cache: 'no-cache' });
        if (!res.ok) continue;
        header.innerHTML = await res.text();
        injected = true;
        break;
      } catch (_) { /* try next */ }
    }
    if (!injected) {
      (typeof DEBUG !== 'undefined' && DEBUG) && console.warn('Nav include not injected (partial not found).');
    }

    // Lien actif: set on injected header nav and on any existing static navbars.
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    function setActive(container){
      const links = container.querySelectorAll('a.nav-link[href]');
      links.forEach(a => a.classList.remove('active'));
      if (current === 'maillots.html' || current === 'maillots-nations.html' || current === 'maillots-pays.html') {
        const target = container.querySelector('a.nav-link[href="./maillots.html"]');
        if (target) target.classList.add('active');
        return;
      }
      if (current === 'maillots-vintage.html' || current === 'pays-vintage.html') {
        const target = container.querySelector('a.nav-link[href="./maillots-vintage.html"]');
        if (target) target.classList.add('active');
        return;
      }
      if (current === 'index.html' || current === '') {
        const target = container.querySelector('a.nav-link[href="./index.html"]');
        if (target) target.classList.add('active');
        return;
      }
      const match = Array.from(links).find(a => {
        const href = (a.getAttribute('href') || '').toLowerCase();
        return href.endsWith(current);
      });
      if (match) match.classList.add('active');
    }

  // Apply to injected header nav if present
  if (header) setActive(header);
  // Also apply to any existing static navbars in the page (outside header)
  document.querySelectorAll('nav.navbar').forEach(nav => setActive(nav));

    // Badge panier (toutes les navs): mettre à jour toutes les occurrences du badge
    function renderCartCountAll(count) {
      const n = Number(count) || 0;
      document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = n;
        el.classList.toggle('d-none', n <= 0);
        el.setAttribute('aria-label', n + ' article' + (n > 1 ? 's' : '') + ' dans le panier');
      });
    }
    if (typeof window.updateCartCount !== 'function') {
      window.updateCartCount = function(count) {
        try { localStorage.setItem('cartCount', String(Number(count) || 0)); } catch {}
        renderCartCountAll(count);
      };
    }
    
    // Initialize cart count based on actual cart items, not saved count
    let actualCartItems = [];
    try { 
      actualCartItems = JSON.parse(localStorage.getItem('cartItems')) || []; 
    } catch {}
    
    let actualCount = 0;
    if (Array.isArray(actualCartItems)) {
      actualCount = actualCartItems.length;
    }
    
    // Update both the display and the saved count
    renderCartCountAll(actualCount);
    try { localStorage.setItem('cartCount', String(actualCount)); } catch {}

    // Cart button now redirects directly to cart page (no modal needed)
    
    // Add global cart click handler - DIRECT REDIRECT to cart page
    window.handleCartClick = function() {
      // Check if cart has items first
      let cartItems = [];
      try { 
        cartItems = JSON.parse(localStorage.getItem('cartItems')) || []; 
      } catch {}
      
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        // Allow access to cart even if empty - no alert
        // User can still see the cart page and browse products
      }

      // Always redirect directly to cart page (no modal)
      console.log('� Redirection directe vers la page panier');
      window.location.href = './cart.html';
    };
  }
});

// Load checkout modal functionality
function loadCheckoutModal() {
  // Try multiple paths for the checkout modal script
  const possiblePaths = [
    './maillots-store/client/src/scripts/checkout-modal.js',
    '../scripts/checkout-modal.js',
    './scripts/checkout-modal.js'
  ];

  function tryLoadScript(paths, index = 0) {
    if (index >= paths.length) {
      console.warn('Checkout modal script not found in any expected location');
      return;
    }

    const script = document.createElement('script');
    script.src = paths[index];
    script.async = true;
    script.onload = () => {
      console.log('Checkout modal loaded from:', paths[index]);
    };
    script.onerror = () => {
      // Try next path
      tryLoadScript(paths, index + 1);
    };
    document.head.appendChild(script);
  }

  tryLoadScript(possiblePaths);
}