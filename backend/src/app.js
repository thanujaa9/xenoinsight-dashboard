// src/app.js
const express = require('express');
const cors = require('cors');
const prisma = require('./utils/db');
require('./cron/shopifySync');


require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    message: 'Xeno FDE API Server is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/auth/profile'
      ],
      tenants: [
        'GET /api/tenants',
        'POST /api/tenants',
        'PUT /api/tenants/:id'
      ],
      shopify: [
        'GET /api/shopify/test/:tenantId',
        'GET /api/shopify/customers/:tenantId',
        'GET /api/shopify/products/:tenantId',
        'GET /api/shopify/orders/:tenantId',
        'POST /api/shopify/sync/:tenantId',
        'POST /api/shopify/sync/products/:tenantId',
        'POST /api/shopify/sync/customers/:tenantId',
        'POST /api/shopify/sync/orders/:tenantId'
      ],
      analytics: [
        'GET /api/analytics/dashboard/:tenantId',
        'GET /api/analytics/orders-by-date/:tenantId',
        'GET /api/analytics/customers/:tenantId',
        'GET /api/analytics/products/:tenantId',
        'GET /api/analytics/revenue-trends/:tenantId',
        'GET /api/analytics/quick-stats/:tenantId'
      ]
    }
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/shopify', require('./routes/shopify'));
app.use('/api/analytics', require('./routes/analytics'));

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Express error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!'});
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API available at http://localhost:${PORT}`);
  console.log(`📊 Analytics ready at http://localhost:${PORT}/api/analytics`);
});

module.exports = app;