// ==========================================
// CONFIGURATION & GLOBAL STATE
// ==========================================
if (!window.API_BASE_URL) {
    window.API_BASE_URL = "https://blockchain-transaction-system.onrender.com";
}

let blockchainData = [];
let connectedMetaMaskAddress = null;

// ==========================================
// CLIENT MANAGEMENT
// ==========================================
async function createClient() {
  const name = document.getElementById("clientName").value.trim();
  if (!name) {
    showMessage("clientError", "Please enter a name");
    return;
  }

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const result = await response.json();

    if (result.success) {
      showMessage("clientSuccess", `Client "${name}" created!`);
      document.getElementById("clientName").value = "";
      await loadClients();
    } else {
      showMessage("clientError", result.detail || "Failed to create client");
    }
  } catch (error) {
    showMessage("clientError", "Error creating client");
  }
}

async function loadClients() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/api/clients`);
    const result = await response.json();

    const clientsList = document.getElementById("clientsList");
    const sender = document.getElementById("sender");
    const recipient = document.getElementById("recipient");

    if (!clientsList || !sender || !recipient) return;

    // Cache current selections to retain them across visual refreshes
    const previousSender = sender.value;
    const previousRecipient = recipient.value;

    clientsList.innerHTML = "";
    sender.innerHTML = '<option value="">Select sender</option>';
    recipient.innerHTML = '<option value="">Select recipient</option>';

    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((client) => {
        const balance = client.balance !== undefined ? client.balance : 100.00;
        
        // Comprehensive fallback layout to ensure raw hex mapping parameters are never missed
        const accountAddress = (client.id || client.identity || client.address || client.client_id || client.name).toLowerCase();

        // Skip adding raw standalone 0x web3 addresses into local sandbox visual lists
        if (client.name.startsWith("0x")) return;

        clientsList.innerHTML += `
          <div class="client-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 10px; background: #1a1a1a; border: 1px solid #333; border-radius: 4px;">
            <div>
              <strong style="color: #fff;">${client.name}</strong><br>
              <small style="color: #888; font-family: monospace;">${accountAddress.substring(0, 10)}...</small>
            </div>
            <div style="background: #222; border: 1px solid #444; padding: 4px 10px; border-radius: 4px; text-align: right;">
              <strong style="color: #90ee90; font-family: monospace;">${balance.toFixed(2)} 🪙</strong>
            </div>
          </div>
        `;
        
        // Store hex hash directly in the element value attribute
        sender.innerHTML += `<option value="${accountAddress}">${client.name} (Bal: ${balance.toFixed(2)})</option>`;
        recipient.innerHTML += `<option value="${accountAddress}">${client.name}</option>`;
      });
    }

    // Safely inject active MetaMask targets if connected
    if (connectedMetaMaskAddress) {
      const metaMaskLabel = `🦊 MetaMask (${connectedMetaMaskAddress.substring(0, 6)}...${connectedMetaMaskAddress.slice(-4)})`;
      injectWalletToDropdown(sender, connectedMetaMaskAddress.toLowerCase(), metaMaskLabel);
      injectWalletToDropdown(recipient, connectedMetaMaskAddress.toLowerCase(), metaMaskLabel);
    }

    // Reapply cached selection targets safely
    if (previousSender && sender.querySelector(`option[value="${previousSender}"]`)) {
      sender.value = previousSender;
    }
    if (previousRecipient && recipient.querySelector(`option[value="${previousRecipient}"]`)) {
      recipient.value = previousRecipient;
    }

  } catch (error) {
    console.error("Error loading client database registries:", error);
  }
}

function injectWalletToDropdown(dropdownElement, walletValue, labelText) {
  if (!dropdownElement) return;
  // Clear pre-existing identity vectors to avoid duplication stack builds
  for (let i = dropdownElement.options.length - 1; i >= 0; i--) {
    const opt = dropdownElement.options[i];
    if (opt.value && opt.value.toLowerCase() === walletValue.toLowerCase()) {
      dropdownElement.remove(i);
    }
  }
  const newOption = document.createElement("option");
  newOption.value = walletValue.toLowerCase();
  newOption.text = labelText;
  dropdownElement.appendChild(newOption);
}

// ==========================================
// TRANSACTION MANAGEMENT
// ==========================================
async function createTransaction() {
  const senderElement = document.getElementById("sender");
  const recipientElement = document.getElementById("recipient");
  
  if (!senderElement || !recipientElement) return;

  const sender = senderElement.value.toLowerCase().trim();
  const recipient = recipientElement.value.toLowerCase().trim();
  const amountInput = document.getElementById("amount").value;
  const gasInput = document.getElementById("gasFee") ? document.getElementById("gasFee").value : "0";
  
  const value = parseFloat(amountInput);
  const gas_fee = parseFloat(gasInput);

  if (!sender || !recipient || isNaN(value) || value <= 0 || isNaN(gas_fee) || gas_fee < 0) {
    showMessage("txError", "Please fill all fields with valid amounts greater than or equal to 0");
    return;
  }

  if (sender === recipient) {
    showMessage("txError", "Transaction rejected: Sender and Recipient cannot be identical.");
    return;
  }

  let transactionSignature = null;

  // Web3 MetaMask personal signature compilation processing rules
  if (sender.startsWith("0x")) {
    if (typeof window.ethereum === "undefined") {
      showMessage("txError", "MetaMask extension is required to sign for this wallet address!");
      return;
    }
    
    if (sender !== connectedMetaMaskAddress) {
      showMessage("txError", `Active MetaMask account (${connectedMetaMaskAddress.substring(0,6)}...) does not match selected sender.`);
      return;
    }

    try {
      showMessage("txSuccess", "✍️ Please sign the transaction verification request in your MetaMask extension...");
      
      const messageToSign = `Submitting a transaction of ${value.toFixed(2)} coins from ${sender} to ${recipient} with gas fee ${gas_fee.toFixed(2)}.`;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(messageToSign);
      const hexMessage = "0x" + Array.from(data).map(b => b.toString(16).padStart(2, "0")).join("");
      
      transactionSignature = await window.ethereum.request({
        method: "personal_sign",
        params: [hexMessage, connectedMetaMaskAddress],
      });
      
    } catch (signError) {
      console.error("MetaMask signature request rejected:", signError);
      showMessage("txError", "Transaction cancelled: Signature request was declined.");
      return;
    }
  }

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        sender: sender, 
        recipient: recipient, 
        value: value, 
        gas_fee: gas_fee,
        signature: transactionSignature
      }),
    });
    
    const result = await response.json();

    if (response.ok && result.success) {
      showMessage("txSuccess", "Transaction verified and queued into prioritized Mempool! ✅");
      document.getElementById("amount").value = "";
      if (document.getElementById("gasFee")) document.getElementById("gasFee").value = "0.05";
      
      await loadPendingTransactions();
      await loadClients();
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
    const response = await fetch(`${window.API_BASE_URL}/api/transactions/pending`);
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
          <div class="transaction-item" style="padding: 10px; background: #111; border: 1px solid #222; margin-bottom: 6px; border-radius: 4px;">
            <div class="transaction-flow">
              <span class="flow-sender" title="${tx.sender}" style="font-family: monospace; color: #aaa;">${senderShort}</span>
              <span class="flow-arrow" style="color: #f67d19;"> → </span>
              <span class="flow-recipient" title="${tx.recipient}" style="font-family: monospace; color: #aaa;">${recipientShort}</span>
              ${gasTipLabel}
            </div>
            <div style="margin-top: 5px; display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: #f67d19;">${tx.value.toFixed(2)} coins</strong>
              <small style="color: #555;">${tx.time || "Pending"}</small>
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
  const statusEl = document.getElementById("miningStatus");
  if (statusEl) statusEl.style.display = "flex";

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/mine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty, miner_address: connectedMetaMaskAddress || "Network_Miner" }),
    });
    const result = await response.json();

    if (result.success) {
      await loadBlockchain();
      await loadPendingTransactions();
      await loadClients();
    } else {
      alert("Mining operation encountered an error: " + (result.detail || "Unknown error"));
    }
  } catch (error) {
    alert("Error mining block: " + error.message);
  } finally {
    if (statusEl) statusEl.style.display = "none";
  }
}

// ==========================================
// BLOCKCHAIN LAYER DISPLAY
// ==========================================
async function loadBlockchain() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/api/blockchain`);
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

  const block = blockchainData.find(b => b && (b.block_number === blockNumber || b.index === blockNumber));
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
    const response = await fetch(`${window.API_BASE_URL}/api/validate`);
    const result = await response.json();
    if (result.success && result.data.valid) {
      showMessage("validateSuccess", result.data.message);
    } else {
      const errorMsg = result.data.errors ? result.data.errors.join(", ") : "Validation checking routing failed";
      showMessage("validateError", errorMsg);
    }
  } catch (error) {
    showMessage("validateError", "Error validating blockchain");
  }
}

async function tamperBlock(blockNumber) {
  try {
    const response = await fetch(`${window.API_BASE_URL}/api/tamper/${blockNumber}`, { method: "POST" });
    const result = await response.json();
    if (result.success) {
      applyVisualChainBreak(blockNumber);
      setTimeout(async () => { await loadBlockchain(); }, 800);
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
    const response = await fetch(`${window.API_BASE_URL}/api/reset`, { method: "POST" });
    const result = await response.json();
    if (result.success) {
      showMessage("validateSuccess", "Blockchain reset successfully!");
      await loadClients();
      await loadPendingTransactions();
      await loadBlockchain();
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
    if (statusEl) {
      statusEl.innerText = "Disconnected";
      statusEl.style.color = "red";
    }
    alert("Connection failed: " + error.message);
  }
}

async function handleAccountsChanged(accounts) {
  const statusEl = document.getElementById("walletStatus");
  const addressEl = document.getElementById("walletAddress");

  if (!statusEl || !addressEl) return;

  if (accounts.length === 0) {
    connectedMetaMaskAddress = null;
    statusEl.innerText = "Disconnected";
    statusEl.style.color = "red";
    addressEl.innerText = "0x0000...0000";
    await loadClients(); 
  } else {
    connectedMetaMaskAddress = accounts[0].toLowerCase();
    statusEl.innerText = "Connected";
    statusEl.style.color = "#90ee90";
    addressEl.innerText = connectedMetaMaskAddress;

    try {
      await fetch(`${window.API_BASE_URL}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: connectedMetaMaskAddress }),
      });
    } catch (err) {
      console.warn("MetaMask address auto-registration notice:", err.message);
    }
    
    // Crucial: Run client loader to parse and update dropdown maps cleanly
    await loadClients();
  }
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("%c CONFIG CHECK: API DESTINATION PORT ->", "background: #f67d19; color: white; font-weight: bold;", window.API_BASE_URL);
  
  const savedTheme = localStorage.getItem("theme");
  const themeToggle = document.getElementById("themeToggle");

  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    if (themeToggle) themeToggle.textContent = "Light Mode";
  }

  await loadClients();
  await loadPendingTransactions();
  await loadBlockchain();

  if (typeof window.ethereum !== "undefined") {
    window.ethereum.on("accountsChanged", handleAccountsChanged);
  }
});