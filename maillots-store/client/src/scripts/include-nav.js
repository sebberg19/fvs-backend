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
      console.warn('Nav include not injected (partial not found).');
    }

    // Lien actif: set on injected header nav and on any existing static navbars.
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    function setActive(container){
      const links = container.querySelectorAll('a.nav-link[href]');
      links.forEach(a => a.classList.remove('active'));
      if (current === 'maillots.html') {
        const target = container.querySelector('a.nav-link[href="./maillots.html"]');
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
      document.querySelectorAll('#cartCount').forEach(el => {
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
    let saved = 0;
    try { saved = Number(localStorage.getItem('cartCount')) || 0; } catch {}
    renderCartCountAll(saved);

    // Load checkout modal script after nav is set up
    loadCheckoutModal();
    
    // Add global cart click handler with smart routing
    window.handleCartClick = function() {
      // Check if cart has items first
      let cartItems = [];
      try { 
        cartItems = JSON.parse(localStorage.getItem('cartItems')) || []; 
      } catch {}
      
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        alert('Votre panier est vide. Ajoutez des articles avant de procéder au checkout.');
        return;
      }

      // Check if checkout info already exists
      let hasCheckoutInfo = false;
      try {
        const checkoutInfo = JSON.parse(localStorage.getItem('checkoutInfo') || '{}');
        hasCheckoutInfo = checkoutInfo.contact && checkoutInfo.shipping && 
                         checkoutInfo.contact.email && checkoutInfo.shipping.address1;
      } catch {}

      if (hasCheckoutInfo) {
        // Infos already filled → go directly to cart summary
        console.log('📋 Infos checkout déjà présentes, redirection vers cart.html');
        window.location.href = './cart.html';
      } else {
        // No info yet → open modal or redirect to checkout
        console.log('📝 Pas d\'infos checkout, ouverture du modal');
        if (typeof window.openCheckoutModal === 'function') {
          window.openCheckoutModal();
        } else {
          // Fallback: redirect to checkout page
          window.location.href = './checkout.html';
        }
      }
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