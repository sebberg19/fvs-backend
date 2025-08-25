// Checkout Modal - Universal checkout form that can be opened from any page
(function() {
  'use strict';

  let modalElement = null;
  let modalInstance = null;

  // Create modal HTML structure
  function createCheckoutModal() {
    if (modalElement) return;

    const modalHTML = `
    <style>
      .btn-accent{ --bs-btn-bg:#2f6f3e; --bs-btn-border-color:#2f6f3e; --bs-btn-hover-bg:#285a33; --bs-btn-hover-border-color:#285a33; --bs-btn-color:#fff; }
      .btn-accent:hover, .btn-accent:focus, .btn-accent:active { background-color: #285a33 !important; border-color: #285a33 !important; color: #fff !important; }
    </style>
    <div class="modal fade" id="checkoutModal" tabindex="-1" aria-labelledby="checkoutModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title h5" id="checkoutModalLabel">Informations de livraison</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="checkoutModalForm" class="row g-3">
              <div class="col-12 col-sm-6">
                <label class="form-label">Prénom</label>
                <input type="text" class="form-control" name="firstName" required>
              </div>
              <div class="col-12 col-sm-6">
                <label class="form-label">Nom</label>
                <input type="text" class="form-control" name="lastName" required>
              </div>
              <div class="col-12">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" name="email" required>
              </div>
              <div class="col-12">
                <label class="form-label">Téléphone (optionnel)</label>
                <input type="tel" class="form-control" name="phone">
              </div>
              <div class="col-12">
                <label class="form-label">Adresse</label>
                <input type="text" class="form-control" name="address1" placeholder="N°, rue" required>
              </div>
              <div class="col-12">
                <label class="form-label">Complément d'adresse (optionnel)</label>
                <input type="text" class="form-control" name="address2" placeholder="Bâtiment, étage...">
              </div>
              <div class="col-6">
                <label class="form-label">Code postal</label>
                <input type="text" class="form-control" name="postalCode" required>
              </div>
              <div class="col-6">
                <label class="form-label">Ville</label>
                <input type="text" class="form-control" name="city" required>
              </div>
              <div class="col-12">
                <label class="form-label">Pays</label>
                <select class="form-select" name="country" required>
                  <option value="">Sélectionnez votre pays</option>
                  <option value="France">France</option>
                  <option value="Canada">Canada</option>
                  <option value="Belgique">Belgique</option>
                  <option value="Suisse">Suisse</option>
                  <option value="Luxembourg">Luxembourg</option>
                  <option value="Allemagne">Allemagne</option>
                  <option value="Italie">Italie</option>
                  <option value="Espagne">Espagne</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Pays-Bas">Pays-Bas</option>
                  <option value="Royaume-Uni">Royaume-Uni</option>
                  <option value="États-Unis">États-Unis</option>
                  <option value="Maroc">Maroc</option>
                  <option value="Algérie">Algérie</option>
                  <option value="Tunisie">Tunisie</option>
                  <option value="Sénégal">Sénégal</option>
                  <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                  <option value="Cameroun">Cameroun</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div id="modalFormError" class="text-danger small mt-2 d-none"></div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
            <button type="submit" form="checkoutModalForm" class="btn btn-accent">Continuer vers le résumé</button>
          </div>
        </div>
      </div>
    </div>`;

    // Add to document body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modalElement = document.getElementById('checkoutModal');

    // Setup form handler
    setupModalForm();
  }

  function setupModalForm() {
    const form = document.getElementById('checkoutModalForm');
    const errorEl = document.getElementById('modalFormError');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      errorEl.classList.add('d-none');
      errorEl.textContent = '';

      const fd = new FormData(form);
      
      // Collect form data
      const contact = { 
        firstName: fd.get('firstName'), 
        lastName: fd.get('lastName'), 
        email: fd.get('email'), 
        phone: fd.get('phone') 
      };
      const shipping = { 
        address1: fd.get('address1'), 
        address2: fd.get('address2'), 
        postalCode: fd.get('postalCode'), 
        city: fd.get('city'), 
        country: fd.get('country') 
      };
      
      // Check if cart has items
      let cartItems = [];
      try { 
        cartItems = JSON.parse(localStorage.getItem('cartItems')) || []; 
      } catch {}
      
      if (!Array.isArray(cartItems) || cartItems.length === 0) { 
        errorEl.textContent = 'Votre panier est vide.'; 
        errorEl.classList.remove('d-none'); 
        return; 
      }
      
      // Store checkout info in localStorage
      try {
        localStorage.setItem('checkoutInfo', JSON.stringify({ contact, shipping }));
        
        // Close modal and redirect to cart.html
        if (modalInstance) {
          modalInstance.hide();
        } else {
          hideModal();
        }
        
        // Small delay to let modal close, then redirect
        setTimeout(() => {
          window.location.href = './cart.html';
        }, 300);
        
      } catch(err) {
        errorEl.textContent = 'Erreur de sauvegarde. Merci de réessayer.';
        errorEl.classList.remove('d-none');
      }
    });
  }

  // Load existing checkout info into form
  function loadExistingInfo() {
    try {
      const checkoutInfo = JSON.parse(localStorage.getItem('checkoutInfo') || '{}');
      if (checkoutInfo.contact && checkoutInfo.shipping) {
        // Update modal title to indicate editing
        const modalTitle = document.getElementById('checkoutModalLabel');
        if (modalTitle) {
          modalTitle.textContent = 'Modifier les informations de livraison';
        }
        
        const form = document.getElementById('checkoutModalForm');
        if (form) {
          // Fill contact fields
          const { firstName, lastName, email, phone } = checkoutInfo.contact;
          form.querySelector('[name="firstName"]').value = firstName || '';
          form.querySelector('[name="lastName"]').value = lastName || '';
          form.querySelector('[name="email"]').value = email || '';
          form.querySelector('[name="phone"]').value = phone || '';
          
          // Fill shipping fields
          const { address1, address2, postalCode, city, country } = checkoutInfo.shipping;
          form.querySelector('[name="address1"]').value = address1 || '';
          form.querySelector('[name="address2"]').value = address2 || '';
          form.querySelector('[name="postalCode"]').value = postalCode || '';
          form.querySelector('[name="city"]').value = city || '';
          
          // Handle country select
          const countrySelect = form.querySelector('[name="country"]');
          if (countrySelect && country) {
            countrySelect.value = country;
          }
        }
      } else {
        // No existing info, reset modal title
        const modalTitle = document.getElementById('checkoutModalLabel');
        if (modalTitle) {
          modalTitle.textContent = 'Informations de livraison';
        }
      }
    } catch {}
  }

  // Public function to open checkout modal
  function openCheckoutModal() {
    // Check if cart has items first
    let cartItems = [];
    try { 
      cartItems = JSON.parse(localStorage.getItem('cartItems')) || []; 
    } catch {}
    
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      alert('Votre panier est vide. Ajoutez des articles avant de procéder au checkout.');
      return;
    }

    // Create modal if it doesn't exist
    createCheckoutModal();
    
    // Load existing info if any
    loadExistingInfo();
    
    // Show modal
    if (typeof bootstrap !== 'undefined') {
      modalInstance = new bootstrap.Modal(modalElement);
      modalInstance.show();
    } else {
      // Fallback: show as regular popup if Bootstrap is not available
      modalElement.style.display = 'block';
      modalElement.classList.add('show');
      document.body.classList.add('modal-open');
      
      // Add close handler for backdrop
      modalElement.addEventListener('click', function(e) {
        if (e.target === modalElement) {
          hideModal();
        }
      });
    }
  }

  function hideModal() {
    if (modalElement) {
      modalElement.style.display = 'none';
      modalElement.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
  }

  // Expose globally
  window.openCheckoutModal = openCheckoutModal;
})();
