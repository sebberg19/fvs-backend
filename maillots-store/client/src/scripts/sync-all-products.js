/**
 * Sync all products from different pages to ensure tous-les-maillots.html has everything
 * This script loads products from all sources and deduplicates them
 */

async function syncAllProducts() {
  const productContainer = document.querySelector('.row.g-0') || document.querySelector('main .row');
  if (!productContainer) {
    (typeof DEBUG !== 'undefined' && DEBUG) && console.warn('Product container not found');
    return;
  }

  // Get currently existing product images to avoid duplicates
  const existingImages = new Set();
  const existingProducts = productContainer.querySelectorAll('.product-card');
  
  (typeof DEBUG !== 'undefined' && DEBUG) && console.log(`Found ${existingProducts.length} existing products`);
  
  existingProducts.forEach(card => {
    // Track by image URL (most unique identifier)
    const img = card.querySelector('img');
    if (img && img.src) {
      existingImages.add(img.src.toLowerCase().trim());
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
      if (!response.ok) {
        (typeof DEBUG !== 'undefined' && DEBUG) && console.warn(`Failed to fetch ${source.url}: ${response.status}`);
        continue;
      }

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const products = doc.querySelectorAll(source.selector);

      (typeof DEBUG !== 'undefined' && DEBUG) && console.log(`Fetched ${products.length} products from ${source.name}`);

      products.forEach(product => {
        // Get product image URL as primary identifier
        const img = product.querySelector('img');
        if (!img || !img.src) return;
        
        const imageUrl = img.src.toLowerCase().trim();
        if (existingImages.has(imageUrl)) {
          return; // Product already exists
        }

        // Clone and add the product
        const clone = product.cloneNode(true);
        
        // Create wrapper div with col classes if needed
        const wrapper = document.createElement('div');
        wrapper.className = 'col-6 col-md-4 col-lg-3 mb-4';
        wrapper.appendChild(clone);
        
        productContainer.appendChild(wrapper);
        existingImages.add(imageUrl);
        newProductsAdded++;
      });
    } catch (error) {
      (typeof DEBUG !== 'undefined' && DEBUG) && console.warn(`Failed to fetch products from ${source.url}:`, error);
    }
  }

  if (newProductsAdded > 0) {
    (typeof DEBUG !== 'undefined' && DEBUG) && console.log(`✓ Added ${newProductsAdded} new products to tous-les-maillots.html`);
    // Reattach product customizer events to newly added products
    if (window.productCustomizerInit) {
      (typeof DEBUG !== 'undefined' && DEBUG) && console.log('Reattaching product customizer events...');
      window.productCustomizerInit();
    }
    // Trigger search update if search-utils is available
    if (window.searchProductsGlobal) {
      (typeof DEBUG !== 'undefined' && DEBUG) && console.log('Triggering search update...');
      const searchInput = document.getElementById('carousel-search-input');
      if (searchInput && searchInput.value) {
        // Re-trigger search to include newly added products
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  } else {
    (typeof DEBUG !== 'undefined' && DEBUG) && console.log('No new products to add');
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncAllProducts);
} else {
  syncAllProducts();
}
