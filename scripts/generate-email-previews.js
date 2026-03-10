const fs = require('fs');
const path = require('path');

const webhookModule = require('../netlify/functions/stripe-webhook.js');

const rootDir = path.resolve(__dirname, '..');
const previewDir = path.join(rootDir, 'previews');

const sampleItems = [
  {
    name: 'Croatie 1998 Domicile',
    quantity: 1,
    price: 32,
    image: './images/France.png',
    size: 'L',
    isVintage: true,
    productId: 'CRO98H',
    persoName: 'MODRIC',
    persoNumber: '10',
    persoFee: 4,
  },
  {
    name: 'Allemagne 1990 Extérieur',
    quantity: 2,
    price: 32,
    image: './images/Allemagne.png',
    size: 'M',
    isVintage: true,
    productId: 'GER90A',
  },
];

const session = {
  id: 'cs_test_futbolero_preview',
  amount_total: 10700,
  currency: 'cad',
  payment_method_types: ['card'],
  customer_email: 'client@example.com',
  customer_details: {
    email: 'client@example.com',
    name: 'Alex Martin',
    phone: '+1 514 555 0199',
    address: {
      line1: '123 Rue Saint-Paul O',
      line2: 'Appartement 4',
      city: 'Montréal',
      state: 'QC',
      postal_code: 'H2Y 1Z5',
      country: 'Canada',
    },
  },
  metadata: {
    orderId: 'FVS-EMAIL-PREVIEW',
    itemCount: String(sampleItems.length),
    item_0: JSON.stringify(sampleItems[0]),
    item_1: JSON.stringify(sampleItems[1]),
  },
};

async function main() {
  if (!webhookModule.__preview) {
    throw new Error('Preview exports are not available from stripe-webhook.js');
  }

  fs.mkdirSync(previewDir, { recursive: true });

  const orderId = session.metadata.orderId;
  const { html: adminHtml } = await webhookModule.__preview.renderEmailTemplate(session, orderId);
  const { html: customerHtml } = await webhookModule.__preview.renderCustomerEmailTemplate(session, orderId);

  const adminPath = path.join(previewDir, 'email-admin-preview.html');
  const customerPath = path.join(previewDir, 'email-customer-preview.html');

  fs.writeFileSync(adminPath, adminHtml, 'utf8');
  fs.writeFileSync(customerPath, customerHtml, 'utf8');

  console.log(`Generated: ${adminPath}`);
  console.log(`Generated: ${customerPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});