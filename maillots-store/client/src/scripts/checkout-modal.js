// Checkout Modal - Simple cart display that redirects to Stripe checkout
(function() {
  'use strict';

  let modalElement = null;
  let modalInstance = null;

  // Create modal HTML structure - SIMPLIFIED VERSION (NO FORM)
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
            <h1 class="modal-title h5" id="checkoutModalLabel">🛒 Votre panier</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- Cart items will be populated here -->
            <div id="checkoutModalItems"></div>
            
            <!-- Cart total -->
            <div class="row mt-4">
              <div class="col-12">
                <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                  <strong class="h5 mb-0">Total:</strong>
                  <span class="h4 mb-0 text-success" id="checkoutModalTotal">$0.00 CAD</span>
                </div>
              </div>
            </div>
            
            <!-- Info message -->
            <div class="alert alert-info mt-3" role="alert">
              <i class="bi bi-info-circle"></i>
              Les informations de livraison et de paiement seront demandées sur la page sécurisée suivante.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Continuer les achats</button>
            <button type="button" class="btn btn-accent" id="checkoutModalProceed">
              Procéder au paiement
            </button>
          </div>
        </div>
      </div>
    </div>`;

    // Add to document body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modalElement = document.getElementById('checkoutModal');

    // Setup proceed button handler
    setupProceedButton();
  }

  function setupProceedButton() {
    const proceedButton = document.getElementById('checkoutModalProceed');
    
    proceedButton.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Check if cart has items
      let cartItems = [];
      try { 
        cartItems = JSON.parse(localStorage.getItem('cartItems')) || []; 
      } catch {}
      
      if (!Array.isArray(cartItems) || cartItems.length === 0) { 
        alert('Votre panier est vide.');
        return; 
      }
      
      // Close modal and redirect to checkout
      if (modalInstance) {
        modalInstance.hide();
      } else {
        hideModal();
      }
      
      // Small delay to let modal close, then redirect to cart.html for Stripe checkout
      setTimeout(() => {
        window.location.href = './cart.html';
      }, 300);
    });
  }

  function populateCartItems() {
    const itemsContainer = document.getElementById('checkoutModalItems');
    const totalElement = document.getElementById('checkoutModalTotal');
    
    if (!itemsContainer || !totalElement) return;
    
    let cartItems = [];
    try { 
      cartItems = JSON.parse(localStorage.getItem('cartItems')) || []; 
    } catch {}
    
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      itemsContainer.innerHTML = '<p class="text-muted">Votre panier est vide.</p>';
      totalElement.textContent = '$0.00 CAD';
      return;
    }
    
    let total = 0;
    let itemsHTML = '';
    
    cartItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      
      itemsHTML += `
        <div class="row mb-3 border-bottom pb-3">
          <div class="col-3">
            <img src="${item.image}" alt="${item.name}" class="img-fluid rounded">
          </div>
          <div class="col-6">
            <h6 class="mb-1">${item.name}</h6>
            <small class="text-muted">Taille: ${item.size}</small>
          </div>
          <div class="col-3 text-end">
            <div class="small text-muted">Qté: ${item.quantity}</div>
            <div class="fw-bold">$${itemTotal.toFixed(2)} CAD</div>
          </div>
        </div>
      `;
    });
    
    itemsContainer.innerHTML = itemsHTML;
    totalElement.textContent = `$${total.toFixed(2)} CAD`;
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
    
    // Populate cart items
    populateCartItems();
    
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
