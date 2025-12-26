/**
 * Unified search utility for all product pages
 * - Searches by product name/title
 * - Searches by product ID (productId or data-id)
 * - Supports cross-section results with labeling (e.g., "(Vintage section)" for regular pages)
 */

function normalizeText(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

// Aliases / surnoms / abréviations d'équipes pour la recherche
// (clé: ce que l'utilisateur tape; valeurs: équivalents à matcher dans les titres)
const __SEARCH_ALIAS_RAW__ = {
  // France
  'psg': ['paris saint germain', 'paris saint-germain', 'paris sg', 'paris'],
  'om': ['olympique de marseille', 'olympique marseille', 'marseille'],
  'ol': ['olympique lyonnais', 'lyon'],
  'asm': ['as monaco', 'monaco'],
  'losc': ['lille', 'losc lille'],

  // Espagne
  'barca': ['barcelona', 'fc barcelona', 'barça'],
  'fcb': ['fc barcelona', 'barcelona'],
  'rm': ['real madrid', 'madrid'],
  'real': ['real madrid', 'madrid'],
  'atleti': ['atletico madrid', 'atletico'],

  // Angleterre
  'manutd': ['manchester united', 'man utd', 'man united'],
  'man u': ['manchester united', 'man utd', 'manutd', 'man united'],
  'manunited': ['manchester united', 'man utd', 'manutd', 'man united'],
  'man utd': ['manchester united', 'manutd', 'man united'],
  'man city': ['manchester city', 'mancity'],
  'mancity': ['manchester city', 'man city'],
  'lfc': ['liverpool', 'liverpool fc'],
  'spurs': ['tottenham', 'tottenham hotspur'],

  // Italie
  'juve': ['juventus'],
  'inter': ['inter milan', 'internazionale'],
  'acm': ['ac milan', 'milan'],
  'milan': ['ac milan']
};

const __SEARCH_ALIAS_MAP__ = (() => {
  const map = new Map();
  for (const [alias, expansions] of Object.entries(__SEARCH_ALIAS_RAW__)) {
    const key = normalizeText(alias);
    const values = (expansions || []).map((v) => normalizeText(v)).filter(Boolean);
    if (key) map.set(key, values);
  }
  return map;
})();

function __expandQueryTokens__(query) {
  const normalized = normalizeText(query);
  if (!normalized) return [];

  const parts = normalized.split(' ').filter(Boolean);
  const seeds = new Set([normalized, ...parts]);
  const out = new Set();

  for (const seed of seeds) {
    if (!seed) continue;
    out.add(seed);
    const expansions = __SEARCH_ALIAS_MAP__.get(seed);
    if (expansions) {
      for (const e of expansions) out.add(e);
    }
  }

  return Array.from(out).filter(Boolean);
}

function __getDisplayElementForCard__(card) {
  const parent = card && card.parentElement;
  if (parent && typeof parent.className === 'string' && /(^|\s)col-/.test(parent.className)) {
    return parent;
  }
  return card;
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

  const queryTokens = __expandQueryTokens__(query);
  const normalizedQueryNoSpaces = normalizeText(query).replace(/\s+/g, '');
  let visibleCount = 0;

  // Search by title OR by product ID
  container.querySelectorAll('.product-card').forEach((card) => {
    // Get product title
    const titleElement = card.querySelector('.product-title') || card.querySelector('h3') || card.querySelector('h2');
    const title = titleElement ? normalizeText(titleElement.textContent) : '';

    // Get product ID (could be data-id or look for it in attributes)
    const productId = (card.getAttribute('data-id') || card.getAttribute('data-product-id') || '').trim().toLowerCase();

    // Match either title (with aliases) or ID
    const titleMatches = queryTokens.length > 0 && queryTokens.some((tok) => tok && title.includes(tok));
    const idMatches = normalizedQueryNoSpaces && productId && productId === normalizedQueryNoSpaces;

    if (titleMatches || idMatches) {
      const displayEl = __getDisplayElementForCard__(card);
      if (displayEl) displayEl.style.display = '';

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
      const displayEl = __getDisplayElementForCard__(card);
      if (displayEl) displayEl.style.display = 'none';
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
