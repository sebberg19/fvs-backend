// This file contains JavaScript functions for making API calls to the server.

const API_BASE_URL = 'http://localhost:3000/api'; // Change this to your server URL

// Function to create an order
async function createOrder(orderData) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        if (!response.ok) {
            throw new Error('Failed to create order');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}

// Function to handle payment
async function processPayment(paymentData) {
    try {
        const response = await fetch(`${API_BASE_URL}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData),
        });

        if (!response.ok) {
            throw new Error('Payment processing failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error processing payment:', error);
        throw error;
    }
}

// Function to get order summary
async function getOrderSummary(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch order summary');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching order summary:', error);
        throw error;
    }
}