/**
 * Unified search utility for all product pages
 * - Searches by product name/title
 * - Searches by product ID (productId or data-id)
 * - Supports cross-section results with labeling (e.g., "(Vintage section)" for regular pages)
 */

function normalizeText(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Unified search function that looks for both title and product ID
 * @param {HTMLElement} container - The container with .product-card elements
 * @param {string} query - Search query
 * @param {Object} options - Options
 * @param {boolean} options.isVintage - Whether this page is vintage (to mark regular results)
 * @param {string} options.crossSectionLabel - Label to show for cross-section results (e.g., "(Vintage section)")
 * @param {boolean} options.showCrossSectionResults - Whether to show results from other section
 * @returns {number} Number of visible cards
 */
function searchProducts(container, query, options = {}) {
  const {
    isVintage = false,
    crossSectionLabel = '',
    showCrossSectionResults = true
  } = options;

  const normalizedQuery = normalizeText(query);
  let visibleCount = 0;

  // Search by title OR by product ID
  container.querySelectorAll('.product-card').forEach((card) => {
    // Get product title
    const titleElement = card.querySelector('.product-title') || card.querySelector('h3') || card.querySelector('h2');
    const title = titleElement ? normalizeText(titleElement.textContent) : '';

    // Get product ID (could be data-id or look for it in attributes)
    const productId = (card.getAttribute('data-id') || card.getAttribute('data-product-id') || '').trim().toLowerCase();

    // Match either title or ID
    const titleMatches = normalizedQuery && title.includes(normalizedQuery);
    const idMatches = normalizedQuery && productId && productId === normalizedQuery;

    if (titleMatches || idMatches) {
      card.style.display = '';

      // Add cross-section label if needed
      if (crossSectionLabel && titleElement) {
        // Check if label already exists
        let badge = card.querySelector('.cross-section-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'cross-section-badge';
          badge.style.cssText = `
            display: inline-block;
            margin-left: 6px;
            padding: 2px 6px;
            background: #f0f0f0;
            color: #666;
            font-size: 11px;
            border-radius: 3px;
            font-weight: 500;
          `;
          titleElement.appendChild(badge);
        }
        badge.textContent = crossSectionLabel;
      }

      visibleCount++;
    } else {
      card.style.display = 'none';
      // Remove cross-section badge when hiding
      const badge = card.querySelector('.cross-section-badge');
      if (badge) badge.remove();
    }
  });

  return visibleCount;
}

/**
 * Unified debounced search wrapper
 * @param {HTMLElement} container - Product container
 * @param {HTMLInputElement} input - Search input
 * @param {Object} options - Options for searchProducts
 */
function setupSearchWithDebounce(container, input, options = {}) {
  let debounceTimer;

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value.trim();
      searchProducts(container, query, options);
    }, 200);
  });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeText, searchProducts, setupSearchWithDebounce };
}
