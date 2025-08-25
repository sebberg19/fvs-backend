const http = require('http');

const payload = JSON.stringify({
  items: [{ name: 'Maillot Test', size: 'M', quantity: 1, perUnitPrice: 49.9 }],
  checkoutInfo: { email: 'client@example.com', firstName: 'Jean', lastName: 'Dupont', address: '1 rue Exemple', city: 'Paris', postalCode: '75001', country: 'France', phone: '0600000000' },
  total: 49.9,
  timestamp: new Date().toISOString(),
  stage: 'order'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/payments/notify-success',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => console.error('Request error:', e));
req.write(payload);
req.end();
