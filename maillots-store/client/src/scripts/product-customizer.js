// Shared product customizer (canonical modal + behavior)
// Version: 2.2 - Added badge field with championship/league examples (+$2.50)
(function(){
  const PERSONALIZE_FEE = 5;
  const BADGE_FEE = 2.50;

  function ensureCustomizeModal(){
    if(document.getElementById('customizeModal')) return;
    const modalHtml = `
<div class="modal fade" id="customizeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-md-lg modal-dialog-centered" style="max-width: 100%; margin: 0 auto; padding: 12px;">
        <style>
            @media (min-width: 992px) {
                #customizeModal .modal-dialog {
                    max-width: 950px !important;
                }
                #customizeModal .modal-body {
                    display: flex !important;
                    gap: 1.5rem !important;
                    padding: 1.5rem !important;
                }
                #modalImgContainer {
                    flex: 0 0 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                #modalImg {
                    max-height: 600px !important;
                }
                #modalFormContainer {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
            }
            @media (min-width: 768px) and (max-width: 991px) {
                #customizeModal .modal-dialog {
                    max-width: 550px !important;
                }
                #modalImgContainer {
                    margin-bottom: 1.5rem;
                }
            }
            @media (max-width: 767px) {
                #customizeModal .modal-dialog {
                    max-width: 95vw !important;
                }
                #modalImgContainer {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }
                #modalImg {
                    max-height: 280px !important;
                }
            }
        </style>
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Personnaliser</h5>
                <div style="display: flex; align-items: center; gap: 8px; margin-left: auto; margin-right: 8px;">
                    <span id="modalProductId" style="font-size: 12px; color: #666; font-family: monospace; font-weight: 600;"></span>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>
            </div>
            <div class="modal-body">
                <div id="modalImgContainer">
                    <img id="modalImg" src="" alt="" class="img-fluid rounded" style="object-fit:contain;">
                </div>

                <div id="modalFormContainer">
                    <div class="mb-2">
                        <div class="d-flex justify-content-between">
                            <strong id="modalTitle">Produit</strong>
                        <span id="modalPrice" class="d-none"></span>
                        </div>
                        <small class="text-secondary">Choisissez taille et quantité</small>
                    </div>

                    <div class="row g-2 mt-2">
                        <div class="col-6">
                            <label class="form-label small">Taille</label>
                            <select id="modalSize" class="form-select form-select-sm" style="font-size: 16px;">
                                <option>M</option>
                                <option>S</option>
                                <option>L</option>
                                <option>XL</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label small">Quantité</label>
                            <input id="modalQty" type="number" min="1" value="1" class="form-control form-control-sm" style="font-size: 16px;">
                        </div>
                    </div>

                    <div class="row g-2 mt-3">
                        <div class="col-6">
                            <label class="form-label small">Nom</label>
                            <input id="modalName" type="text" maxlength="12" class="form-control form-control-sm" autocomplete="off" style="font-size: 16px;" placeholder="Votre nom">
                            <div class="invalid-feedback">Veuillez renseigner le nom.</div>
                        </div>
                        <div class="col-6">
                            <label class="form-label small">Numéro</label>
                            <input id="modalNumber" type="number" min="0" max="99" class="form-control form-control-sm" autocomplete="off" style="font-size: 16px;" placeholder="10">
                            <div class="invalid-feedback">Veuillez renseigner le numéro.</div>
                        </div>
                    </div>
                    <small class="text-muted d-block mt-2" style="color: #198754; font-weight: 600;">Nom + Numéro: +5,00 $ CAD</small>

                    <div class="mt-3">
                        <label class="form-label small">Badge (Championnat/Ligue)</label>
                        <textarea id="modalBadge" class="form-control form-control-sm" rows="2" maxlength="50" style="font-size: 16px;" placeholder="Ex: Champions League, Europa League, Ligue 1, Premier League, Serie A..."></textarea>
                    </div>
                    <small class="text-muted d-block mt-2" style="color: #dc3545; font-weight: 600;">Badge: +2,50 $ CAD</small>
                </div>
            </div>
            <div class="modal-footer">
                <button id="confirmAdd" type="button" class="btn btn-dark btn-sm">Ajouter au panier</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Annuler</button>
            </div>
        </div>
    </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Générer un ID unique pour chaque produit basé sur son image
  function generateProductId(imagePath, productName) {
    // Combiner le chemin de l'image et le nom pour créer un ID unique
    const combined = (imagePath || productName || '').toLowerCase();
    const normalized = combined.replace(/[^a-z0-9]/g, '');
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const id = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0');
    return id.slice(0, 6);
  }

  function formatPrice(n){ return '$' + Number(n).toFixed(2) + ' CAD'; }

  function init(){
    ensureCustomizeModal();
    const customizeModalEl = document.getElementById('customizeModal');
    const bsCustomizeModal = new bootstrap.Modal(customizeModalEl);
    let currentProduct = { name: '', price: 0, img: '', productId: '' };

    // DOM refs
    const modalPriceEl = () => customizeModalEl.querySelector('#modalPrice');
    const modalImgEl = () => customizeModalEl.querySelector('#modalImg');
    const modalTitleEl = () => customizeModalEl.querySelector('#modalTitle');
    const modalSizeEl = () => customizeModalEl.querySelector('#modalSize');
    const modalQtyEl = () => customizeModalEl.querySelector('#modalQty');
    const modalNameEl = () => customizeModalEl.querySelector('#modalName');
    const modalNumberEl = () => customizeModalEl.querySelector('#modalNumber');
    const modalBadgeEl = () => customizeModalEl.querySelector('#modalBadge');

    function qualifiesForNameNumberFee(nameValue, numberValue) {
      const hasName = String(nameValue || '').trim().length > 0;
      const hasNumber = String(numberValue ?? '').trim().length > 0;
      return hasName && hasNumber;
    }

    function updateModalPriceDisplay() {
      const base = Number(currentProduct.price) || 0;
      const qty = Math.max(1, Number(modalQtyEl().value) || 1);
      // +5$ uniquement si Nom ET Numéro sont renseignés
      const hasNameNumber = qualifiesForNameNumberFee(modalNameEl().value, modalNumberEl().value);
      let perUnitExtra = hasNameNumber ? PERSONALIZE_FEE : 0;
      // Ajouter +2.50$ si badge renseigné
      const hasBadge = (modalBadgeEl().value || '').trim().length > 0;
      if (hasBadge) {
        perUnitExtra += BADGE_FEE;
      }
      const unitTotal = base + perUnitExtra;
      const total = unitTotal * qty;

      const priceEl = modalPriceEl();
      if (priceEl) priceEl.textContent = formatPrice(total);
    }

    function attachEvents() {
      // attach click -> open modal
      document.querySelectorAll('.add-to-cart').forEach(btn => {
        // Éviter les doubles événements
        if (btn.hasAttribute('data-customizer-attached')) return;
        btn.setAttribute('data-customizer-attached', 'true');
        
        btn.addEventListener('click', (e) => {
          const card = btn.closest('.product-card') || btn.closest('.card');
          const name = (card?.querySelector('.product-title')?.textContent || card?.querySelector('h3')?.textContent || card?.querySelector('h2')?.textContent || 'Article').trim();
          const price = Number(btn.dataset.price) || 0;
          // Prioriser data-img du bouton, sinon chercher data-img sur l'image parente, sinon fallback sur src
          const img = btn.dataset.img || card?.querySelector('[data-img]')?.dataset.img || card?.querySelector('img')?.getAttribute('src') || '';
          const productId = generateProductId(img, name);
          currentProduct = { name, price, img, productId };

          // populate modal
          customizeModalEl.querySelector('.modal-title').textContent = 'Personnaliser';
          modalTitleEl().textContent = name;
          customizeModalEl.querySelector('#modalProductId').textContent = `ID: ${productId}`;
          modalImgEl().src = img;
          modalImgEl().alt = name;
          modalSizeEl().value = 'M';
          modalQtyEl().value = 1;
          modalNameEl().value = '';
          modalNumberEl().value = '';
          modalBadgeEl().value = '';
          modalNameEl().classList.remove('is-invalid');
          modalNumberEl().classList.remove('is-invalid');

          updateModalPriceDisplay();
          bsCustomizeModal.show();
        });
      });
    }

    // Attacher les événements initiaux
    attachEvents();

    // modal interactions
    modalQtyEl().addEventListener('input', updateModalPriceDisplay);
    modalSizeEl().addEventListener('change', updateModalPriceDisplay);
    modalBadgeEl().addEventListener('input', updateModalPriceDisplay);
    modalNameEl().addEventListener('input', updateModalPriceDisplay);
    modalNumberEl().addEventListener('input', updateModalPriceDisplay);

    // confirm -> add to cart
    customizeModalEl.querySelector('#confirmAdd').addEventListener('click', () => {
      const size = modalSizeEl().value;
      const qty = Math.max(1, Number(modalQtyEl().value) || 1);
      const pName = (modalNameEl().value || '').trim();
      const pNumber = (modalNumberEl().value ?? '').toString().trim();
      const pBadge = (modalBadgeEl().value || '').trim();
      const hasPersonalization = pName || pNumber || pBadge; // Optionnel

      const base = Number(currentProduct.price) || 0;
      const nameNumberExtra = qualifiesForNameNumberFee(pName, pNumber) ? PERSONALIZE_FEE : 0;
      let perUnitFinal = base + nameNumberExtra;
      // Ajouter +2.50$ si badge renseigné
      if (pBadge) {
        perUnitFinal += BADGE_FEE;
      }

      // update cart count
      let saved = 0; try { saved = Number(localStorage.getItem('cartCount')) || 0; } catch {}
      const next = saved + qty;
      if (typeof window.updateCartCount === 'function') window.updateCartCount(next); else { try { localStorage.setItem('cartCount', String(next)); } catch {} }

      let cartItems = [];
      try { cartItems = JSON.parse(localStorage.getItem('cartItems')) || []; } catch {}
      const personalization = hasPersonalization
        ? { name: pName, ...(pNumber ? { number: pNumber } : {}), ...(pBadge ? { badge: pBadge } : {}), extra: nameNumberExtra, badgeExtra: pBadge ? BADGE_FEE : 0 }
        : { extra: 0, badgeExtra: 0 };
      const placeholderImg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23eef0f3%22/%3E%3Ctext x=%2250%22 y=%2255%22 font-size=%2210%22 text-anchor=%22middle%22 fill=%22%236b6f76%22%3ENo image%3C/text%3E%3C/svg%3E';
      const imgVal = currentProduct.img || placeholderImg;
      cartItems.push({ name: currentProduct.name, basePrice: base, perUnitPrice: perUnitFinal, quantity: qty, size: size, isVintage: !!(document.title && /vintage/i.test(document.title)), img: imgVal, productId: currentProduct.productId, personalized: !!hasPersonalization, personalization });
      try { localStorage.setItem('cartItems', JSON.stringify(cartItems)); } catch {}
      try { localStorage.setItem('cartCount', String(next)); } catch {}
      bsCustomizeModal.hide();
    });

    // Empêcher le zoom sur mobile lors de la fermeture du modal
    customizeModalEl.addEventListener('hidden.bs.modal', () => {
      // Retirer le focus de tous les inputs
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      
      // Réinitialiser le viewport sur mobile
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        const content = viewport.getAttribute('content');
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
        setTimeout(() => {
          viewport.setAttribute('content', content);
        }, 300);
      }
    });

    // Exposer la fonction de réattachement pour les éléments dynamiques
    window.productCustomizerInit = attachEvents;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
