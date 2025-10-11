const { pool } = require('../config/database');

// Simple health check endpoint that doesn't require database
const healthCheck = async (req, res) => {
  try {
    // Get basic system info without database dependency
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: uptime,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        status: 'disconnected'
      }
    });
  }
};

// Readiness check (for Kubernetes/Docker)
const readinessCheck = async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error.message 
    });
  }
};

// Liveness check
const livenessCheck = (req, res) => {
  res.status(200).json({ status: 'alive' });
};

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck
};
