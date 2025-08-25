// This file contains the main JavaScript logic for the client application.
// It includes functionality for handling the shopping cart and updating the UI.

document.addEventListener('DOMContentLoaded', () => {
    const cartIcon = document.getElementById('cart-icon');
    const cartCount = document.getElementById('cart-count');
    let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

    // Function to update the cart count display
    function updateCartCount() {
        cartCount.textContent = cartItems.length;
    }

    // Function to add an item to the cart
    function addToCart(item) {
        cartItems.push(item);
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        updateCartCount();
    }

    // Example of adding an item to the cart (this would be triggered by a button click in a real application)
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            const item = {
                id: button.dataset.id,
                name: button.dataset.name,
                price: button.dataset.price
            };
            addToCart(item);
        });
    });

    // Initial update of the cart count
    updateCartCount();
});