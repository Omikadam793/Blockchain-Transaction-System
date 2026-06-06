// ==========================================
// SYSTEM NETWORK ROUTING CONFIGURATION
// ==========================================
const API_BASE_URL = "https://blockchain-transaction-system.onrender.com";

// Expose it cleanly to the global window scope
window.API_BASE_URL = API_BASE_URL;

console.log("🚀 TRAFFIC ROUTED TO BACKEND:", window.API_BASE_URL);