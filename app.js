// Main entry point for Basky backend (Blinkit only)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');


// Import routes
const locationRoutes = require('./routes/locationRoutes');
const productRoutes = require('./routes/productRoutes');
const scrapeRoutes = require('./routes/scrapeRoutes');
const zeptoRoutes = require('./routes/zeptoRoutes');

const app = express();
const PORT = 3004;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true }));


// Mount routes
app.use('/api/location', locationRoutes);
app.use('/api/products', productRoutes);
app.use('/api', scrapeRoutes); // scrape, cache, health endpoints
app.use('/api/zepto', zeptoRoutes);

// Fallback route
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Basky backend (Blinkit) running on port ${PORT}`);
});
