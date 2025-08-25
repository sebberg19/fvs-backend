// This file contains JavaScript logic for managing the shopping cart.

let cart = [];

// Function to add an item to the cart
function addToCart(item) {
    cart.push(item);
    updateCartCount();
}

// Function to remove an item from the cart
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartCount();
}

// Function to get the current cart items
function getCartItems() {
    return cart;
}

// Function to update the cart count displayed in the UI
function updateCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = cart.length;
    }
}

// Function to clear the cart
function clearCart() {
    cart = [];
    updateCartCount();
}

// Function to handle checkout process
function checkout() {
    // Here you would typically send the cart data to the server for processing
    console.log('Checking out with items:', cart);
    // After successful payment, you can send an email summary
}

// Event listeners for adding/removing items can be added here

// Exporting functions for use in other modules
export { addToCart, removeFromCart, getCartItems, clearCart, checkout };