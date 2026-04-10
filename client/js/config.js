// config.js - API Configuration
// This automatically switches between local and production

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'   // Development (your computer)
  : '';                        // Production (the internet)

export { API_BASE };