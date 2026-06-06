// ==========================================
// SYSTEM NETWORK ROUTING CONFIGURATION
// ==========================================
// This points the frontend to your live production backend hosted on Render
const API_BASE_URL = "https://blockchain-transaction-system.onrender.com";

// Expose it to the global window scope cleanly so app.js can consume it immediately
window.API_BASE_URL = API_BASE_URL;

console.log("%c PRODUCTION CONFIG LOADED: ROUTING TRAFFIC TO RENDER ->", "background: #111; color: #90ee90; font-weight: bold;", window.API_BASE_URL);