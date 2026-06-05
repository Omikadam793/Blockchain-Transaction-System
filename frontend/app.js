// ==========================================
// CONFIGURATION & GLOBAL STATE
// ==========================================
// Fallback declaration ensuring window context variables from config.js bind flawlessly
const API_BASE_URL = window.API_BASE_URL || "https://blockchain-transaction-system.onrender.com";

let blockchainData = [];
let connectedMetaMaskAddress = null;

// ==========================================
// CLIENT MANAGEMENT
// ==========================================
async function createClient() {
  const name = document.getElementById("clientName").value;
  if (!name) {
    showMessage("clientError", "Please enter a name");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const result = await response.json();

    if (result.success) {
      showMessage("clientSuccess", `Client "${name}" created!`);
      document.getElementById("clientName").value = "";
      loadClients();
    }
  } catch (error) {
    showMessage("clientError", "Error creating client");
  }
}

async function loadClients() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/clients`);
    const result = await response.json();

    const clientsList = document.getElementById("clientsList");
    const sender = document.getElementById("sender");
    const recipient = document.getElementById("recipient");

    if (!clientsList || !sender || !recipient) return;

    clientsList.innerHTML = "";
    sender.innerHTML = '<option value="">Select sender</option>';
    recipient.innerHTML = '<option value="">Select recipient</option>';

    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((client) => {
        const balance = client.balance !== undefined ? client.balance : 100.00;

        clientsList.innerHTML += `
          <div class="client-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 10px; background: #1a1a1a; border: 1px solid #333; border-radius: 4px;">
            <div>
              <strong style="color: #fff;">${client.name}</strong><br>
              <small style="color: #888; font-family: monospace;">${client.identity || 'Local Account'}</small>
            </div>
            <div style="background: #222; border: 1px solid #444; padding: 4px 10px; border-radius: 4px; text-align: right;">
              <strong style="color: #90ee90; font-family: monospace;">${balance.toFixed(2)} 🪙</strong>
            </div>
          </div>
        `;
        
        sender.innerHTML += `<option value="${client.name}">${client.name} (Bal: ${balance.toFixed(2)})</option>`;
        recipient.innerHTML += `<option value="${client.name}">${client.name}</option>`;
      });
    }

    if (connectedMetaMaskAddress) {
      const metaMaskLabel = `🦊 MetaMask (${connectedMetaMaskAddress.substring(0, 6)}...${connectedMetaMaskAddress.slice(-4)})`;
      injectWalletToDropdown(sender, connectedMetaMaskAddress, metaMaskLabel);
      injectWalletToDropdown(recipient, connectedMetaMaskAddress, metaMaskLabel);
    }
  } catch (error) {
    console.error("Error loading client database registries:", error);
  }
}

// ==========================================
// TRANSACTION MANAGEMENT
// ==========================================
async function createTransaction() {
  const sender = document.getElementById("sender").value;
  const recipient = document.getElementById("recipient").value;
  const amountInput = document.getElementById("amount").value;
  const gasInput = document.getElementById("gasFee") ? document.getElementById("gasFee").value : "0";
  
  const value = parseFloat(amountInput);
  const gas_fee = parseFloat(gasInput);

  if (!sender || !recipient || isNaN(value) || value <= 0 || isNaN(gas_fee) || gas_fee < 0) {
    showMessage("txError", "Please fill all fields with valid amounts greater than or equal to 0");
    return;
  }

  let transactionSignature = null;

  if (sender.startsWith("0x")) {
    if (typeof window.ethereum === "undefined") {
      showMessage("txError", "MetaMask extension is required to sign for this wallet address!");
      return;
    }
    
    try {
      showMessage("txSuccess", "✍️ Please sign the transaction verification request in your MetaMask extension...");
      
      //  FIXED: Added the missing $ token before {value} for accurate string interpolation
      const messageToSign = `Submitting a transaction of ${value} coins from ${sender} to ${recipient} with gas fee ${gas_fee}.`;
      
      transactionSignature = await window.ethereum.request({
        method: "personal_sign",
        params: [messageToSign, sender],
      });
      
    } catch (signError) {
      console.error("MetaMask signature request rejected:", signError);
      showMessage("txError", "Transaction cancelled: Signature request was declined.");
      return;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        sender, 
        recipient, 
        value, 
        gas_fee,
        signature: transactionSignature
      }),
    });
    
    const result = await response.json();

    if (response.ok && result.success) {
      showMessage("txSuccess", "Transaction verified and queued into prioritized Mempool! ✅");
      document.getElementById("amount").value = "";
      loadPendingTransactions();
      loadClients();
    } else {
      const backendError = result.detail || "Transaction rejected by ledger rules.";
      showMessage("txError", typeof backendError === "object" ? JSON.stringify(backendError) : backendError);
    }
  } catch (error) {
    showMessage("txError", "Network connection error creating transaction");
  }
}

async function loadPendingTransactions() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transactions/pending`);
    const result = await response.json();

    const pendingList = document.getElementById("pendingList");
    if (!pendingList) return;
    pendingList.innerHTML = "";

    if (!result.data || result.data.length === 0) {
      pendingList.innerHTML = '<div class="empty-state" style="padding: 20px; font-size: 0.9em;">No pending transactions</div>';
    } else {
      result.data.forEach((tx) => {
        const senderShort = tx.sender.length > 12 ? `${tx.sender.substring(0, 6)}...${tx.sender.slice(-4)}` : tx.sender;
        const recipientShort = tx.recipient.length > 12 ? `${tx.recipient.substring(0, 6)}...${tx.recipient.slice(-4)}` : tx.recipient;
        const gasTipLabel = tx.gas_fee !== undefined ? `<span style="float: right; color: #90ee90; font-size: 0.85em;">⛽ Fee: ${tx.gas_fee}</span>` : "";

        pendingList.innerHTML += `
          <div class="transaction-item">
            <div class="transaction-flow">
              <span class="flow-sender" title="${tx.sender}">${senderShort}</span>
              <span class="flow-arrow">→</span>
              <span class="flow-recipient" title="${tx.recipient}">${recipientShort}</span>
              ${gasTipLabel}
            </div>
            <div style="margin-top: 5px;">
              <strong style="color: #f67d19ff;">${tx.value} coins</strong>
              <br><small>${tx.time || "Pending confirmation"}</small>
            </div>
          </div>
        `;
      });
    }
  } catch (error) {
    console.error("Error connecting to transaction mempool payload endpoints:", error);
  }
}

// ==========================================
// MINING PROOF-OF-WORK
// ==========================================
async function mineBlock() {
  const difficulty = parseInt(document.getElementById("difficulty").value) || 2;
  document.getElementById("miningStatus").style.display = "block";

  try {
    const response = await fetch(`${API_BASE_URL}/api/mine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty }),
    });
    const result = await response.json();

    if (result.success) {
      loadBlockchain();
      loadPendingTransactions();
      loadClients();
    }
  } catch (error) {
    alert("Error mining block: " + error.message);
  } finally {
    document.getElementById("miningStatus").style.display = "none";
  }
}

// ==========================================
// BLOCKCHAIN LAYER DISPLAY
// ==========================================
async function loadBlockchain() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blockchain`);
    const result = await response.json();
    blockchainData = result.data || [];

    const visual = document.getElementById("blockchainVisual");
    if (!visual) return;

    if (blockchainData.length === 0) {
      visual.innerHTML = '<div class="empty-state">No blocks yet. Create clients, transactions, and mine your first block!</div>';
    } else {
      visual.innerHTML = "";
      let localBreakTriggered = false;

      blockchainData.forEach((block, index) => {
        const num = block.block_number !== undefined ? block.block_number : block.index;
        const txCount = block.transactions ? block.transactions.length : 0;
        
        if (block.is_tampered) {
          localBreakTriggered = true;
        }

        const cardStyleClass = localBreakTriggered ? "block tampered-break" : "block";
        const tamperedBadge = localBreakTriggered ? '<span style="color: #ff4444; font-weight: bold; display:inline-block; margin-bottom:8px;">⚠️ CHAIN BROKEN</span><br>' : "";
        
        visual.innerHTML += `
          <div class="${cardStyleClass}" id="block-card-${num}" onclick="showBlockDetails(${num})">
            <div class="block-header">Block #${num}</div>
            <div class="block-info">
              ${tamperedBadge}
              <strong>Nonce:</strong> ${block.nonce}<br>
              <strong>Transactions:</strong> ${txCount}<br>
              <strong>Block Hash:</strong><br>
              <div class="hash" id="ui-hash-${num}">${block.block_hash || block.hash}</div><br>
              <strong>Previous Block Hash:</strong><br>
              <div class="hash">${block.previous_hash}</div><br>
            </div>
          </div>
        `;
      });
    }
  } catch (error) {
    console.error("Error downloading target sequence ledger hashes:", error);
  }
}

// ==========================================
// CORE DETAILED MODALS & SECURITY SYSTEMS
// ==========================================
async function showBlockDetails(blockNumber) {
  if (!blockchainData || blockchainData.length === 0) return;

  const block = blockchainData.find(b => b && (b.block_number === blockNumber || b.index === blockNumber)) || blockchainData[blockNumber];
  if (!block) return;

  const num = block.block_number !== undefined ? block.block_number : block.index;
  const txs = block.transactions || [];

  document.getElementById("modalHeader").textContent = `Block #${num} Details`;
  const modalBody = document.getElementById("modalBody");
  const tamperedWarning = block.is_tampered ? '<p style="color: #ff4444; font-weight: bold; font-size: 1.1em;">⚠️ THIS BLOCK HAS BEEN TAMPERED WITH!</p>' : "";

  modalBody.innerHTML = `
    ${tamperedWarning}
    <div class="modal-section">
      <h3>Block Information</h3>
      <p style="color: #f67d19ff;"><strong>Block Number:</strong> ${num}</p>
      <p style="color: #f67d19ff;"><strong>Nonce:</strong> ${block.nonce}</p>
      <p style="color: #f67d19ff;"><strong>Transactions Count:</strong> ${txs.length}</p>
      <p style="color: #f67d19ff;"><strong>Status:</strong> ${block.is_tampered ? '<span style="color: #ff4444;">Tampered</span>' : '<span style="color: #90ee90;">Valid</span>'}</p>
      ${!block.is_tampered ? `<button onclick="tamperBlock(${num}); closeModal('close');" style="margin-top: 15px; background: #ff4444; border:none; padding:12px; color:white; font-weight:bold; cursor:pointer; border-radius:2px;">⚠️ Tamper This Block (Demo)</button>` : ""}
    </div>
    <div class="modal-section">
      <h3>Block Data</h3>
      <div class="modal-hash" style="font-size: 0.8em; max-height: 150px; overflow-y: auto;">${block.block_data || JSON.stringify(txs)}</div>
    </div>
    <div class="modal-section">
      <h3>Block Hash</h3>
      <div class="modal-hash">${block.block_hash || block.hash}</div>
      ${block.is_tampered ? `<h3 style="margin-top: 20px; color: #ff4444;">Actual Hash</h3><div class="modal-hash" style="border: 2px solid #ff4444;">${block.actual_hash}</div>` : ""}
    </div>
    <div class="modal-section">
      <h3>Previous Block Hash</h3>
      <div class="modal-hash">${block.previous_hash}</div>
    </div>
    <div class="modal-section">
      <h3 style="color: #f67d19ff;">Transactions (${txs.length})</h3>
      ${txs.map((tx, i) => `<div class="transaction-detail"><p style="color: #f67d19ff;"><strong>Transaction #${i + 1}</strong></p><div class="modal-hash" style="font-size: 0.85em; margin-top: 5px;">${typeof tx === 'object' ? JSON.stringify(tx) : tx}</div></div>`).join("")}
    </div>
  `;

  document.getElementById("blockModal").style.display = "flex";
}

function closeModal(event) {
  const modal = document.getElementById("blockModal");
  if (!modal) return;
  if (!event || event === 'close' || event.target.id === "blockModal") {
    modal.style.display = "none";
  }
}

async function validateBlockchain() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/validate`);
    const result = await response.json();
    if (result.success && result.data.valid) {
      showMessage("validateSuccess", result.data.message);
    } else {
      const errorMsg = result.data.errors ? result.data.errors.join(", ") : "Validation failed";
      showMessage("validateError", errorMsg);
    }
  } catch (error) {
    showMessage("validateError", "Error validating blockchain");
  }
}

async function tamperBlock(blockNumber) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tamper/${blockNumber}`, { method: "POST" });
    const result = await response.json();
    if (result.success) {
      applyVisualChainBreak(blockNumber);
      
      setTimeout(() => {
        loadBlockchain();
      }, 800);
    }
  } catch (error) {
    console.error("Error tampering block sequence:", error);
    alert("Error tampering block");
  }
}

function applyVisualChainBreak(brokenFromIndex) {
  const cards = document.querySelectorAll('#blockchainVisual .block');
  cards.forEach((card) => {
    const cardIdStr = card.id || "";
    const currentCardNum = parseInt(cardIdStr.replace("block-card-", ""));
    
    if (!isNaN(currentCardNum) && currentCardNum >= brokenFromIndex) {
      card.style.transition = "all 0.4s ease";
      card.style.background = "#5c1d1d";
      card.style.borderColor = "#ff4444";
      card.style.boxShadow = "0 0 25px rgba(255, 68, 68, 0.4)";
    }
  });
}

async function resetBlockchain() {
  if (!confirm("Are you sure you want to reset the entire blockchain?")) return;
  try {
    const response = await fetch(`${API_BASE_URL}/api/reset`, { method: "POST" });
    const result = await response.json();
    if (result.success) {
      showMessage("validateSuccess", "Blockchain reset successfully!");
      loadClients();
      loadPendingTransactions();
      loadBlockchain();
    }
  } catch (error) {
    showMessage("validateError", "Error resetting blockchain");
  }
}

// ==========================================
// UTILITY FUNCTIONS & MANAGEMENT
// ==========================================
function showMessage(id, message) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.style.display = "block";
  setTimeout(() => (element.style.display = "none"), 4000);
}

function toggleTheme() {
  const body = document.body;
  const themeToggle = document.getElementById("themeToggle");
  body.classList.toggle("light-mode");
  if (body.classList.contains("light-mode")) {
    if (themeToggle) themeToggle.textContent = "Light Mode";
    localStorage.setItem("theme", "light");
  } else {
    if (themeToggle) themeToggle.textContent = "Dark Mode";
    localStorage.setItem("theme", "dark");
  }
}

// ==========================================
// METAMASK WALLET INTEGRATION LAYER
// ==========================================
async function connectMetaMask() {
  const statusEl = document.getElementById("walletStatus");
  const addressEl = document.getElementById("walletAddress");

  if (typeof window.ethereum === "undefined") {
    alert("MetaMask extension not found! Please install it.");
    return;
  }

  try {
    if (statusEl) {
      statusEl.innerText = "Connecting...";
      statusEl.style.color = "#f67d19";
    }

    let accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    await handleAccountsChanged(accounts);
  } catch (error) {
    console.error("MetaMask connection failed:", error);
    if (statusEl && addressEl) {
      statusEl.innerText = "Disconnected";
      statusEl.style.color = "red";
      addressEl.innerText = "0x0000...0000";
    }
    alert("Connection failed: " + error.message);
  }
}

async function handleAccountsChanged(accounts) {
  const statusEl = document.getElementById("walletStatus");
  const addressEl = document.getElementById("walletAddress");
  const senderDropdown = document.getElementById("sender");
  const recipientDropdown = document.getElementById("recipient");

  if (!statusEl || !addressEl) return;

  if (accounts.length === 0) {
    connectedMetaMaskAddress = null;
    statusEl.innerText = "Disconnected";
    statusEl.style.color = "red";
    addressEl.innerText = "0x0000...0000";
    loadClients(); 
  } else {
    connectedMetaMaskAddress = accounts[0];
    statusEl.innerText = "Connected";
    statusEl.style.color = "#90ee90";
    addressEl.innerText = connectedMetaMaskAddress;

    try {
      await fetch(`${API_BASE_URL}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: connectedMetaMaskAddress }),
      });
    } catch (err) {
      console.warn("MetaMask address registration notice:", err.message);
    }

    const metaMaskLabel = `🦊 MetaMask (${connectedMetaMaskAddress.substring(0, 6)}...${connectedMetaMaskAddress.slice(-4)})`;
    injectWalletToDropdown(senderDropdown, connectedMetaMaskAddress, metaMaskLabel);
    injectWalletToDropdown(recipientDropdown, connectedMetaMaskAddress, metaMaskLabel);
  }
}

function injectWalletToDropdown(dropdownElement, walletValue, labelText) {
  if (!dropdownElement) return;
  for (let i = dropdownElement.options.length - 1; i >= 0; i--) {
    const opt = dropdownElement.options[i];
    if (opt.value && opt.value.startsWith("0x")) {
      dropdownElement.remove(i);
    }
  }
  const newOption = document.createElement("option");
  newOption.value = walletValue;
  newOption.text = labelText;
  dropdownElement.appendChild(newOption);
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("%c CONFIG CHECK: API DESTINATION PORT ->", "background: #f67d19; color: white; font-weight: bold;", API_BASE_URL);
  
  const savedTheme = localStorage.getItem("theme");
  const themeToggle = document.getElementById("themeToggle");

  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    if (themeToggle) themeToggle.textContent = "Light Mode";
  }

  loadClients();
  loadPendingTransactions();
  loadBlockchain();

  if (typeof window.ethereum !== "undefined") {
    window.ethereum.on("accountsChanged", handleAccountsChanged);
  }
});

function switchTab(event, tabId) {
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active-content'));

  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabId).classList.add('active-content');
  event.currentTarget.classList.add('active');
}