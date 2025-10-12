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
// Cloud Run provides PORT environment variable (usually 8080)
const PORT = process.env.PORT || 3004;
 
// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
 
// Root endpoint for Cloud Run health checks
app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Basky API is running on Cloud Run',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});
 
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Basky API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'cloud-run'
  });
});
 
// Mount routes
app.use('/api/location', locationRoutes);
app.use('/api/products', productRoutes);
app.use('/api', scrapeRoutes); // scrape, cache, health endpoints
app.use('/api/zepto', zeptoRoutes);
 
// Fallback route
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});
 
// Start server - bind to all interfaces for Cloud Run
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Basky backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`☁️ Platform: Google Cloud Run`);
});
 
module.exports = app;