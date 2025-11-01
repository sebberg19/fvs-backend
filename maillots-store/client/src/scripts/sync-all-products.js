/**
 * Sync all products from different pages to ensure tous-les-maillots.html has everything
 * This script loads products from all sources and deduplicates them
 */

async function syncAllProducts() {
  const productContainer = document.querySelector('.row.g-0') || document.querySelector('main .row');
  if (!productContainer) return;

  // Get currently existing product IDs to avoid duplicates
  const existingProductIds = new Set();
  const existingProducts = productContainer.querySelectorAll('.product-card');
  
  existingProducts.forEach(card => {
    const id = card.getAttribute('data-id') || card.getAttribute('data-product-id');
    if (id) existingProductIds.add(id.toLowerCase());
    
    // Also track by product name as fallback
    const titleEl = card.querySelector('.product-title') || card.querySelector('h3');
    if (titleEl) {
      const normalized = titleEl.textContent.toLowerCase().trim();
      existingProductIds.add(normalized);
    }
  });

  // Sources to fetch products from
  const sources = [
    { url: './maillots.html', selector: '.product-card', name: 'maillots' },
    { url: './maillots-vintage.html', selector: '.product-card', name: 'vintage' },
    { url: './maillots-pays.html', selector: '.product-card', name: 'pays' },
    { url: './pays-vintage.html', selector: '.product-card', name: 'pays-vintage' },
    { url: './classiques.html', selector: '.product-card', name: 'classiques' }
  ];

  let newProductsAdded = 0;

  for (const source of sources) {
    try {
      const response = await fetch(source.url);
      if (!response.ok) continue;

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const products = doc.querySelectorAll(source.selector);

      products.forEach(product => {
        // Get product ID
        const productId = product.getAttribute('data-id') || product.getAttribute('data-product-id');
        const titleEl = product.querySelector('.product-title') || product.querySelector('h3');
        const productTitle = titleEl ? titleEl.textContent.toLowerCase().trim() : '';

        // Check if product already exists
        const id = productId ? productId.toLowerCase() : productTitle;
        if (!id || existingProductIds.has(id)) return;

        // Clone and add the product
        const clone = product.cloneNode(true);
        
        // Create wrapper div with col classes if needed
        const wrapper = document.createElement('div');
        wrapper.className = 'col-6 col-md-4 col-lg-3 mb-4';
        wrapper.appendChild(clone);
        
        productContainer.appendChild(wrapper);
        existingProductIds.add(id);
        newProductsAdded++;
      });
    } catch (error) {
      console.warn(`Failed to fetch products from ${source.url}:`, error);
    }
  }

  if (newProductsAdded > 0) {
    console.log(`✓ Added ${newProductsAdded} new products to tous-les-maillots.html`);
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncAllProducts);
} else {
  syncAllProducts();
}
