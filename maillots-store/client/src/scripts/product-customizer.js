// Shared product customizer (canonical modal + behavior)
(function(){
  const PERSONALIZE_FEE = 5;

  function ensureCustomizeModal(){
    if(document.getElementById('customizeModal')) return;
    const modalHtml = `
<div class="modal fade" id="customizeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Personnaliser</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div class="modal-body">
                <div class="text-center mb-3">
                    <img id="modalImg" src="" alt="" class="img-fluid rounded" style="max-height:180px; object-fit:contain; background:#f4f6f7;">
                </div>

                <div class="mb-2">
                    <div class="d-flex justify-content-between">
                        <strong id="modalTitle">Produit</strong>
                        <span id="modalPrice" class="text-muted small"></span>
                    </div>
                    <small class="text-secondary">Choisissez taille et quantité</small>
                </div>

                <div class="row g-2 mt-2">
                    <div class="col-6">
                        <label class="form-label small">Taille</label>
                        <select id="modalSize" class="form-select form-select-sm">
                            <option>M</option>
                            <option>S</option>
                            <option>L</option>
                            <option>XL</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label class="form-label small">Quantité</label>
                        <input id="modalQty" type="number" min="1" value="1" class="form-control form-control-sm">
                    </div>
                </div>

                <div class="form-check mt-3">
                    <input class="form-check-input" type="checkbox" id="modalPersonalize">
                    <label class="form-check-label small" for="modalPersonalize">Ajouter nom & numéro (+5 $ CAD)</label>
                </div>

                <div id="personalizeFields" class="row g-2 mt-2" style="display:none;">
                    <div class="col-6">
                        <label class="form-label small">Nom</label>
                        <input id="modalName" type="text" maxlength="12" class="form-control form-control-sm" autocomplete="off">
                        <div class="invalid-feedback">Veuillez renseigner le nom.</div>
                    </div>
                    <div class="col-6">
                        <label class="form-label small">Numéro</label>
                        <input id="modalNumber" type="number" min="0" max="99" class="form-control form-control-sm" autocomplete="off">
                        <div class="invalid-feedback">Veuillez renseigner le numéro.</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="confirmAdd" type="button" class="btn btn-accent btn-sm">Ajouter au panier</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Annuler</button>
            </div>
        </div>
    </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function formatPrice(n){ return '$' + Number(n).toFixed(2) + ' CAD'; }

  function init(){
    ensureCustomizeModal();
    const customizeModalEl = document.getElementById('customizeModal');
    const bsCustomizeModal = new bootstrap.Modal(customizeModalEl);
    let currentProduct = { name: '', price: 0, img: '' };

    // DOM refs
    const modalPriceEl = () => customizeModalEl.querySelector('#modalPrice');
    const modalImgEl = () => customizeModalEl.querySelector('#modalImg');
    const modalTitleEl = () => customizeModalEl.querySelector('#modalTitle');
    const modalSizeEl = () => customizeModalEl.querySelector('#modalSize');
    const modalQtyEl = () => customizeModalEl.querySelector('#modalQty');
    const modalPersonalizeEl = () => customizeModalEl.querySelector('#modalPersonalize');
    const personalizeFieldsEl = () => customizeModalEl.querySelector('#personalizeFields');
    const modalNameEl = () => customizeModalEl.querySelector('#modalName');
    const modalNumberEl = () => customizeModalEl.querySelector('#modalNumber');

    function updateModalPriceDisplay() {
      const base = Number(currentProduct.price) || 0;
      const qty = Math.max(1, Number(modalQtyEl().value) || 1);
      const personalize = modalPersonalizeEl().checked;
      const perUnitExtra = personalize ? PERSONALIZE_FEE : 0;
      const unitTotal = base + perUnitExtra;
      const total = unitTotal * qty;
      modalPriceEl().textContent = formatPrice(total);
    }

    // attach click -> open modal
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = btn.closest('.card');
        const name = (card?.querySelector('h2')?.textContent || 'Article').trim();
        const price = Number(btn.dataset.price) || Number(btn.dataset.price) || 36.70;
        const img = btn.dataset.img || card?.querySelector('img')?.src || '';
        currentProduct = { name, price, img };

        // populate modal
        customizeModalEl.querySelector('.modal-title').textContent = 'Personnaliser';
        modalTitleEl().textContent = name;
        modalImgEl().src = img;
        modalImgEl().alt = name;
        modalSizeEl().value = 'M';
        modalQtyEl().value = 1;
        modalPersonalizeEl().checked = false;
        personalizeFieldsEl().style.display = 'none';
        modalNameEl().value = '';
        modalNumberEl().value = '';
        modalNameEl().classList.remove('is-invalid');
        modalNumberEl().classList.remove('is-invalid');

        updateModalPriceDisplay();
        bsCustomizeModal.show();
      });
    });

    // modal interactions
    modalPersonalizeEl().addEventListener('change', (e) => {
      const checked = modalPersonalizeEl().checked;
      personalizeFieldsEl().style.display = checked ? 'flex' : 'none';
      modalNameEl().required = checked;
      modalNumberEl().required = checked;
      if (!checked) { modalNameEl().classList.remove('is-invalid'); modalNumberEl().classList.remove('is-invalid'); }
      updateModalPriceDisplay();
    });
    modalQtyEl().addEventListener('input', updateModalPriceDisplay);
    modalSizeEl().addEventListener('change', updateModalPriceDisplay);
    modalNameEl().addEventListener('input', () => { if (modalPersonalizeEl().checked) { if ((modalNameEl().value||'').trim()) modalNameEl().classList.remove('is-invalid'); } });
    modalNumberEl().addEventListener('input', () => { if (modalPersonalizeEl().checked) { if ((modalNumberEl().value||'').toString().trim() !== '') modalNumberEl().classList.remove('is-invalid'); } });

    // confirm -> add to cart
    customizeModalEl.querySelector('#confirmAdd').addEventListener('click', () => {
      const size = modalSizeEl().value;
      const qty = Math.max(1, Number(modalQtyEl().value) || 1);
      const personalize = modalPersonalizeEl().checked;
      const pName = (modalNameEl().value || '').trim();
      const pNumber = (modalNumberEl().value ?? '').toString().trim();

      if (personalize) {
        const missingName = !pName;
        const missingNumber = pNumber === '';
        if (missingName || missingNumber) {
          if (missingName) modalNameEl().classList.add('is-invalid'); else modalNameEl().classList.remove('is-invalid');
          if (missingNumber) modalNumberEl().classList.add('is-invalid'); else modalNumberEl().classList.remove('is-invalid');
          (missingName ? modalNameEl() : modalNumberEl()).focus();
          return;
        }
      }

      const base = Number(currentProduct.price) || 0;
      const perUnitExtra = personalize ? PERSONALIZE_FEE : 0;
      const perUnitFinal = base + perUnitExtra;

      // update cart count
      let saved = 0; try { saved = Number(localStorage.getItem('cartCount')) || 0; } catch {}
      const next = saved + qty;
      if (typeof window.updateCartCount === 'function') window.updateCartCount(next); else { try { localStorage.setItem('cartCount', String(next)); } catch {} }

      let cartItems = [];
      try { cartItems = JSON.parse(localStorage.getItem('cartItems')) || []; } catch {}
      const personalization = personalize ? { name: pName, ...(pNumber ? { number: pNumber } : {}), extra: PERSONALIZE_FEE } : null;
      const placeholderImg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23eef0f3%22/%3E%3Ctext x=%2250%22 y=%2255%22 font-size=%2210%22 text-anchor=%22middle%22 fill=%22%236b6f76%22%3ENo image%3C/text%3E%3C/svg%3E';
      const imgVal = currentProduct.img || placeholderImg;
      cartItems.push({ name: currentProduct.name, basePrice: base, perUnitPrice: perUnitFinal, quantity: qty, size: size, isVintage: !!(document.title && /vintage/i.test(document.title)), img: imgVal, personalized: personalize, personalization });
      try { localStorage.setItem('cartItems', JSON.stringify(cartItems)); } catch {}
      try { localStorage.setItem('cartCount', String(next)); } catch {}
      bsCustomizeModal.hide();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
