// Système de recherche global avec recherche cross-page
// Permet de chercher des produits même s'ils sont sur d'autres pages

(function() {
    'use strict';

    // If the page already uses the unified search (search-utils.js), do not bind this
    // older cross-page search to avoid duplicate handlers and conflicting results.
    if (typeof window.searchProducts === 'function') {
        return;
    }

    function normalizeForSearch(s) {
        try {
            if (typeof window.normalizeText === 'function') return window.normalizeText(s);
        } catch {}
        return (s || '').toString().toLowerCase().trim();
    }

    function expandQueryTokens(query) {
        try {
            if (typeof window.__expandQueryTokens__ === 'function') return window.__expandQueryTokens__(query);
        } catch {}
        const q = normalizeForSearch(query);
        return q ? [q] : [];
    }

    // Configuration des pages produits
    const PRODUCT_PAGES = {
        'tous-les-maillots.html': 'Tous les maillots',
        'maillots.html': 'Maillots Actuels',
        'maillots-vintage.html': 'Maillots Vintage',
        'maillots-pays.html': 'Sélections Nationales',
        'classiques.html': 'Classiques',
        'pays-vintage.html': 'Pays Vintage'
    };

    // Détecter la page actuelle
    function getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        return filename;
    }

    // Extraire tous les produits de la page actuelle
    function getCurrentPageProducts() {
        const products = [];
        const cards = document.querySelectorAll('.col-6 .product-card, .col-md-4 .product-card, .col-lg-3 .product-card');
        
        cards.forEach((card, index) => {
            const titleEl = card.querySelector('.product-title');
            const imgEl = card.querySelector('.product-image img');
            const priceEl = card.querySelector('.product-price');
            const btnEl = card.querySelector('.add-to-cart');
            
            if (titleEl && imgEl) {
                const imgSrc = imgEl.getAttribute('src') || '';
                const match = imgSrc.match(/\/([^\/]+)\.(webp|png|jpg)/i);
                const filename = match ? match[1].toLowerCase() : '';
                
                products.push({
                    index,
                    title: titleEl.textContent.trim(),
                    filename,
                    imgSrc,
                    price: priceEl ? priceEl.textContent.trim() : '',
                    element: card.closest('.col-6, .col-md-4, .col-lg-3'),
                    vintage: btnEl ? btnEl.getAttribute('data-vintage') === 'true' : false,
                    dataPrice: btnEl ? btnEl.getAttribute('data-price') : null
                });
            }
        });
        
        return products;
    }

    // Chercher dans les autres pages via fetch
    async function searchOtherPages(query) {
        const currentPage = getCurrentPage();
        const otherResults = [];

        const queryTokens = expandQueryTokens(query);
        
        for (const [page, pageTitle] of Object.entries(PRODUCT_PAGES)) {
            if (page === currentPage) continue;
            
            try {
                const response = await fetch(page);
                if (!response.ok) continue;
                
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const cards = doc.querySelectorAll('.col-6 .product-card, .col-md-4 .product-card, .col-lg-3 .product-card');
                
                cards.forEach(card => {
                    const titleEl = card.querySelector('.product-title');
                    const imgEl = card.querySelector('.product-image img');
                    const priceEl = card.querySelector('.product-price');
                    const btnEl = card.querySelector('.add-to-cart');
                    
                    if (titleEl && imgEl) {
                        const imgSrc = imgEl.getAttribute('src') || '';
                        const match = imgSrc.match(/\/([^\/]+)\.(webp|png|jpg)/i);
                        const filename = match ? match[1].toLowerCase() : '';
                        const title = normalizeForSearch(titleEl.textContent);

                        // Vérifier si le produit correspond à la recherche (avec aliases si dispo)
                        const matches = queryTokens.length > 0 && queryTokens.some((tok) => {
                            if (!tok) return false;
                            const tokNoSpaces = tok.replace(/\s+/g, '');
                            return title.includes(tok) || filename.includes(tokNoSpaces);
                        });

                        if (matches) {
                            otherResults.push({
                                page,
                                pageTitle,
                                title: titleEl.textContent.trim(),
                                filename,
                                imgSrc,
                                price: priceEl ? priceEl.textContent.trim() : '',
                                vintage: btnEl ? btnEl.getAttribute('data-vintage') === 'true' : false,
                                dataPrice: btnEl ? btnEl.getAttribute('data-price') : null,
                                dataImg: btnEl ? btnEl.getAttribute('data-img') : imgSrc
                            });
                        }
                    }
                });
            } catch (err) {
                console.warn(`Erreur lors de la recherche dans ${page}:`, err);
            }
        }
        
        return otherResults;
    }

    // Créer une carte produit depuis une autre page
    function createCrossPageCard(product) {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';
        col.setAttribute('data-cross-page', 'true');
        
        col.innerHTML = `
            <div class="cross-page-banner">
                <i class="bi bi-info-circle-fill me-1"></i>
                Ce maillot est dans : <strong>${product.pageTitle}</strong>
            </div>
            <div class="product-card h-100">
                <div class="product-image ratio ratio-1x1 clickable add-to-cart" 
                     data-price="${product.dataPrice}" 
                     data-vintage="${product.vintage}" 
                     data-img="${product.dataImg}">
                    <img loading="lazy" src="${product.imgSrc}" alt="${product.title}" class="w-100 h-100 object-fit-cover">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-price">${product.price}</div>
                    <button class="product-btn btn btn-dark add-to-cart" 
                            data-price="${product.dataPrice}" 
                            data-vintage="${product.vintage}" 
                            data-img="${product.dataImg}">Ajouter</button>
                </div>
            </div>
        `;
        
        return col;
    }

    // Fonction de recherche principale
    async function performSearch() {
        const searchInput = document.getElementById('carousel-search-input');
        const resultsCount = document.getElementById('carousel-search-results-count');
        const container = document.querySelector('.row.g-0');
        
        if (!searchInput || !container) return;
        
        const rawQuery = searchInput.value || '';
        const queryTokens = expandQueryTokens(rawQuery);
        
        // Supprimer les anciennes cartes cross-page
        container.querySelectorAll('[data-cross-page="true"]').forEach(el => el.remove());
        
        if (queryTokens.length === 0) {
            // Réafficher tous les produits de la page actuelle
            container.querySelectorAll('.col-6, .col-md-4, .col-lg-3').forEach(col => {
                col.style.display = '';
            });
            resultsCount.textContent = '';
            return;
        }
        
        // 1. Chercher dans la page actuelle
        const currentProducts = getCurrentPageProducts();
        let localCount = 0;
        
        currentProducts.forEach(product => {
            const title = normalizeForSearch(product.title);
            const matches = queryTokens.some((tok) => {
                if (!tok) return false;
                const tokNoSpaces = tok.replace(/\s+/g, '');
                return title.includes(tok) || product.filename.includes(tokNoSpaces);
            });
            
            if (matches) {
                product.element.style.display = '';
                localCount++;
            } else {
                product.element.style.display = 'none';
            }
        });
        
        // 2. Chercher dans les autres pages
        const otherResults = await searchOtherPages(normalizeForSearch(rawQuery));
        
        // 3. Ajouter les résultats des autres pages à la fin
        if (otherResults.length > 0) {
            otherResults.forEach(product => {
                const card = createCrossPageCard(product);
                container.appendChild(card);
            });
        }
        
        // 4. Mettre à jour le compteur
        const totalCount = localCount + otherResults.length;
        
        if (totalCount === 0) {
            resultsCount.textContent = 'Aucun maillot trouvé';
        } else if (totalCount === 1) {
            resultsCount.textContent = '1 maillot trouvé';
        } else {
            resultsCount.textContent = `${totalCount} maillots trouvés`;
            if (otherResults.length > 0) {
                resultsCount.textContent += ` (${otherResults.length} sur d'autres pages)`;
            }
        }
        
        // Réinitialiser les event listeners pour les nouvelles cartes
        if (otherResults.length > 0) {
            // Attendre que le DOM soit mis à jour
            setTimeout(() => {
                // Réactiver les boutons add-to-cart
                const newButtons = container.querySelectorAll('[data-cross-page="true"] .add-to-cart');
                newButtons.forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        const title = this.closest('.product-card').querySelector('.product-title').textContent;
                        const price = parseFloat(this.getAttribute('data-price'));
                        const vintage = this.getAttribute('data-vintage') === 'true';
                        const img = this.getAttribute('data-img');
                        
                        // Utiliser la fonction globale d'ajout au panier si elle existe
                        if (typeof window.addToCart === 'function') {
                            window.addToCart({ name: title, price, vintage, img });
                        } else {
                            // Fallback: ajouter directement au localStorage
                            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                            cart.push({
                                name: title,
                                price: price,
                                quantity: 1,
                                vintage: vintage,
                                img: img,
                                size: 'M' // Taille par défaut
                            });
                            localStorage.setItem('cart', JSON.stringify(cart));
                            
                            // Notification
                            alert(`✅ ${title} ajouté au panier !`);
                            
                            // Mettre à jour le compteur du panier
                            if (typeof window.updateCartCount === 'function') {
                                window.updateCartCount();
                            }
                        }
                    });
                });
            }, 100);
        }
    }

    // Initialisation
    document.addEventListener('DOMContentLoaded', function() {
        const searchInput = document.getElementById('carousel-search-input');
        const clearButton = document.getElementById('carousel-clear-search');
        
        if (searchInput) {
            // Debounce pour éviter trop de requêtes
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(performSearch, 300);
            });
        }
        
        if (clearButton) {
            clearButton.addEventListener('click', function() {
                searchInput.value = '';
                performSearch();
                searchInput.focus();
            });
        }
    });

    // Styles pour le bandeau cross-page
    const style = document.createElement('style');
    style.textContent = `
        [data-cross-page="true"] {
            position: relative;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #ffffff;
        }
        
        [data-cross-page="true"]:first-of-type {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
        }
        
        .cross-page-banner {
            background: #ffffff;
            color: #000000;
            font-size: 11px;
            font-weight: 600;
            padding: 6px 10px;
            text-align: center;
            border-radius: 0;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        
        .cross-page-banner i {
            font-size: 12px;
            color: #000000;
        }
        
        [data-cross-page="true"] .product-card {
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
            border: none;
        }
    `;
    document.head.appendChild(style);
})();
