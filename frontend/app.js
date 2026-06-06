// ==========================================
// CONFIGURATION & GLOBAL STATE
// ==========================================
if (!window.API_BASE_URL) {
    window.API_BASE_URL = "http://127.0.0.1:8000";
}

let blockchainData = [];

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

    const previousSender = sender.value;
    const previousRecipient = recipient.value;

    clientsList.innerHTML = "";
    sender.innerHTML = '<option value="">Select sender</option>';
    recipient.innerHTML = '<option value="">Select recipient</option>';

    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((client) => {
        const balance = client.balance !== undefined ? client.balance : 100.00;

        clientsList.innerHTML += `
          <div class="client-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 10px; background: #1a1a1a; border: 1px solid #333; border-radius: 4px;">
            <div>
              <strong style="color: #fff;">${client.name}</strong>
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

    if (previousSender) sender.value = previousSender;
    if (previousRecipient) recipient.value = previousRecipient;

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
    showMessage("txError", "Please fill all fields with valid amounts");
    return;
  }

  if (sender === recipient) {
    showMessage("txError", "Sender and Recipient cannot be identical.");
    return;
  }

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender, recipient, value, gas_fee }),
    });
    
    const result = await response.json();

    if (response.ok && result.success) {
      showMessage("txSuccess", "Transaction queued into Mempool! ✅");
      document.getElementById("amount").value = "";
      await loadPendingTransactions();
      await loadClients();
    } else {
      showMessage("txError", result.detail || "Transaction rejected.");
    }
  } catch (error) {
    showMessage("txError", "Network error creating transaction");
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
        pendingList.innerHTML += `
          <div class="transaction-item" style="padding: 10px; background: #111; border: 1px solid #222; margin-bottom: 6px; border-radius: 4px;">
            <div class="transaction-flow">
              <span class="flow-sender">${tx.sender}</span>
              <span class="flow-arrow"> → </span>
              <span class="flow-recipient">${tx.recipient}</span>
              <span style="float: right; color: #90ee90; font-size: 0.85em;">⛽ Fee: ${tx.gas_fee}</span>
            </div>
            <div style="margin-top: 5px; display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: #f67d19;">${tx.value.toFixed(2)} coins</strong>
              <small style="color: #555;">Pending</small>
            </div>
          </div>
        `;
      });
    }
  } catch (error) {
    console.error("Error loading pending transactions:", error);
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
      body: JSON.stringify({ difficulty, miner_address: "Network_Miner" }),
    });
    const result = await response.json();

    if (result.success) {
      await loadBlockchain();
      await loadPendingTransactions();
      await loadClients();
    } else {
      alert("Mining error: " + (result.detail || "Unknown error"));
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
      visual.innerHTML = '<div class="empty-state">No blocks mined yet. Stage transactions to build your first block!</div>';
    } else {
      visual.innerHTML = "";
      let chainBroken = false;

      blockchainData.forEach((block) => {
        const num = block.block_number !== undefined ? block.block_number : block.index;
        const txCount = block.transactions ? block.transactions.length : 0;
        
        if (block.is_tampered) chainBroken = true;
        const cardClass = chainBroken ? "block tampered-break" : "block";
        const tamperedBadge = chainBroken ? '<span style="color: #ff4444; font-weight: bold; display:inline-block; margin-bottom:8px;">⚠️ CHAIN BROKEN</span><br>' : "";
        
        visual.innerHTML += `
          <div class="${cardClass}" id="block-card-${num}" onclick="showBlockDetails(${num})">
            <div class="block-header">Block #${num}</div>
            <div class="block-info">
              ${tamperedBadge}
              <strong>Nonce:</strong> ${block.nonce}<br>
              <strong>Transactions:</strong> ${txCount}<br>
              <strong>Block Hash:</strong><br>
              <div class="hash">${block.block_hash || block.hash}</div><br>
              <strong>Previous Hash:</strong><br>
              <div class="hash">${block.previous_hash}</div><br>
            </div>
          </div>
        `;
      });
    }

    // Refresh the Global Search Explorer anytime a new block gets loaded
    if (typeof renderGlobalExplorer === "function") {
      renderGlobalExplorer();
    }

  } catch (error) {
    console.error("Error loading blockchain visual timeline:", error);
  }
}

// ==========================================
// OVERLAY DETAILED MODALS & SECURITY
// ==========================================
async function showBlockDetails(blockNumber) {
  if (!blockchainData || blockchainData.length === 0) return;
  const block = blockchainData.find(b => (b.block_number === blockNumber || b.index === blockNumber));
  if (!block) return;

  const num = block.block_number !== undefined ? block.block_number : block.index;
  const txs = block.transactions || [];

  document.getElementById("modalHeader").textContent = `Block #${num} Details`;
  const modalBody = document.getElementById("modalBody");
  const tamperedWarning = block.is_tampered ? '<p style="color: #ff4444; font-weight: bold;">⚠️ THIS BLOCK HAS BEEN TAMPERED WITH!</p>' : "";

  modalBody.innerHTML = `
    ${tamperedWarning}
    <div class="modal-section">
      <h3>Block Information</h3>
      <p><strong>Block Number:</strong> ${num}</p>
      <p><strong>Nonce:</strong> ${block.nonce}</p>
      <p><strong>Status:</strong> ${block.is_tampered ? 'Tampered' : 'Valid'}</p>
      ${!block.is_tampered ? `<button onclick="tamperBlock(${num}); closeModal('close');" style="margin-top: 15px; background: #ff4444; border:none; padding:10px; color:white; font-weight:bold; cursor:pointer;">⚠️ Tamper This Block (Demo)</button>` : ""}
    </div>
    <div class="modal-section">
      <h3>Block Hash</h3>
      <div class="modal-hash">${block.block_hash || block.hash}</div>
    </div>
    <div class="modal-section">
      <h3>Transactions (${txs.length})</h3>
      ${txs.map((tx, i) => `<div class="transaction-detail"><p><strong>Transaction #${i + 1}</strong></p><div class="modal-hash">${typeof tx === 'object' ? JSON.stringify(tx) : tx}</div></div>`).join("")}
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
      showMessage("validateError", result.data.errors ? result.data.errors.join(", ") : "Chain validation failed");
    }
  } catch (error) {
    showMessage("validateError", "Error validating blockchain");
  }
}

async function tamperBlock(blockNumber) {
  try {
    const response = await fetch(`${window.API_BASE_URL}/api/tamper/${blockNumber}`, { method: "POST" });
    if (response.ok) {
      await loadBlockchain();
    }
  } catch (error) {
    alert("Error tampering block");
  }
}

async function resetBlockchain() {
  if (!confirm("Reset the entire blockchain?")) return;
  try {
    const response = await fetch(`${window.API_BASE_URL}/api/reset`, { method: "POST" });
    if (response.ok) {
      showMessage("validateSuccess", "Blockchain reset successfully!");
      await loadClients();
      await loadPendingTransactions();
      await loadBlockchain();
    }
  } catch (error) {
    showMessage("validateError", "Error resetting blockchain");
  }
}

function showMessage(id, message) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.style.display = "block";
  setTimeout(() => (element.style.display = "none"), 4000);
}

function toggleTheme() {
  const body = document.body;
  body.classList.toggle("light-mode");
  localStorage.setItem("theme", body.classList.contains("light-mode") ? "light" : "dark");
}

// ==========================================
// DYNAMIC NETWORK METRICS PANEL
// ==========================================
function updateNetworkAnalytics() {
  const statBlocks = document.getElementById("statBlocks");
  const statMempool = document.getElementById("statMempool");
  const statCirculation = document.getElementById("statCirculation");
  const statStatus = document.getElementById("statStatus");

  if (!statBlocks || !statMempool || !statCirculation || !statStatus) return;

  if (typeof blockchainData !== 'undefined' && Array.isArray(blockchainData)) {
    statBlocks.textContent = blockchainData.length;
    
    const hasTamper = blockchainData.some(block => block.is_tampered === true);
    if (hasTamper) {
      statStatus.textContent = "BREACHED ⚠️";
      statStatus.style.color = "#ff4444";
    } else {
      statStatus.textContent = "SECURE ✅";
      statStatus.style.color = "#00b894";
    }
  }

  const pendingList = document.getElementById("pendingList");
  const pendingCount = pendingList ? pendingList.getElementsByClassName("transaction-item").length : 0;
  statMempool.textContent = pendingCount;

  const clientsList = document.getElementById("clientsList");
  let totalCoins = 0;
  if (clientsList) {
    const coinElements = clientsList.getElementsByTagName("strong");
    for (let i = 0; i < coinElements.length; i++) {
      if (coinElements[i].textContent.includes("🪙")) {
        const val = parseFloat(coinElements[i].textContent.replace(/[^\d.]/g, ""));
        if (!isNaN(val)) totalCoins += val;
      }
    }
  }
  statCirculation.textContent = totalCoins > 0 ? `${totalCoins.toFixed(2)} 🪙` : "0.00 🪙";
}

// ==========================================
// GLOBAL TRANSACTION EXPLORER LEDGER
// ==========================================
function renderGlobalExplorer() {
  const explorerList = document.getElementById("globalTxExplorerList");
  if (!explorerList || typeof blockchainData === 'undefined' || !blockchainData) return;

  let allTransactions = [];
  blockchainData.forEach(block => {
    if (block.transactions && block.transactions.length > 0) {
      block.transactions.forEach(tx => {
        allTransactions.push({
          sender: tx.sender || "Unknown",
          recipient: tx.recipient || "Unknown",
          value: parseFloat(tx.value) || 0.0,
          gas_fee: tx.gas_fee !== undefined ? tx.gas_fee : 0.05,
          blockOrigin: block.block_number !== undefined ? block.block_number : 0
        });
      });
    }
  });

  if (allTransactions.length === 0) {
    explorerList.innerHTML = `<div class="empty-state" style="padding: 20px;">No transactions settled on-chain yet.</div>`;
    return;
  }

  allTransactions.reverse();

  explorerList.innerHTML = allTransactions.map(tx => `
    <div class="transaction-item tx-explorer-row" data-users="${String(tx.sender).toLowerCase()} ${String(tx.recipient).toLowerCase()}" style="border-left: 3px solid #00b894; display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px;">
      <div class="transaction-flow">
        <span class="flow-sender">${tx.sender}</span>
        <span class="flow-arrow">➔</span>
        <span class="flow-recipient">${tx.recipient}</span>
      </div>
      <div style="font-size: 0.9em; text-align: right;">
        <strong style="color: #90ee90;">+${tx.value.toFixed(2)} 🪙</strong>
        <div style="font-size: 0.75em; color: #888;">Block #${tx.blockOrigin} • Tip: ${tx.gas_fee}</div>
      </div>
    </div>
  `).join('');
}

function filterTransactions() {
  const searchVal = document.getElementById("txSearchInput").value.toLowerCase();
  const rows = document.getElementsByClassName("tx-explorer-row");
  
  for (let i = 0; i < rows.length; i++) {
    const userTags = rows[i].getAttribute("data-users");
    if (userTags.includes(searchVal)) {
      rows[i].style.display = "flex";
    } else {
      rows[i].style.display = "none";
    }
  }
}

// ==========================================
// UNIFIED ORCHESTRATION BOOTSTRAPPER
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Establish Theme Overrides
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
  }
  
  // 2. Fetch Core Backend API State Data
  await loadClients();
  await loadPendingTransactions();
  await loadBlockchain(); // Automatically triggers explorer panel display inside it
  
  // 3. Fire Analytics and Kickstart Real-Time Calculation Loop
  updateNetworkAnalytics();
  setInterval(updateNetworkAnalytics, 1500);
});