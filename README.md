# 🔗 Blockchain Visualizer: A Blockchain-Based Transaction System

A sleek, full-stack decentralized ledger simulation system. It combines a robust **FastAPI (Python)** cryptographic core hosted on **Render** with an interactive and responsive frontend dashboard featuring native **Web3 MetaMask** wallet integration.

**🌐 Live Production API:** https://blockchain-transaction-system.onrender.com/

---

## 🚀 Key Features

* **Proof-of-Work (PoW) Mining:** Simulates real-world mining using adjustable cryptographic difficulty.
* **MetaMask Web3 Integration:** Connects your MetaMask wallet to perform real asymmetric key signatures using `personal_sign`.
* **Prioritized Mempool:** Groups and manages unmined transactions based on user-defined gas tip priorities.
* **Tamper Simulation Engine:** Modify any block on the ledger with a single click and visualize how chain integrity breaks.
* **One-Click Ledger Validation:** Verifies blockchain hashes and identifies the exact block where tampering occurred.

---

## 📂 Project Structure

```text
├── blockchain.py           # Cryptographic primitives (Block, Transaction, PoW Mining)
├── blockchain_manager.py   # FastAPI routes, state management, and mempool handling
├── requirements.txt        # Python dependencies
├── .gitignore              # Ignored files and folders
├── index.html              # Dashboard UI layout
├── styles.css              # Styling and Dark/Light mode support
├── config.js               # Backend API configuration
└── app.js                  # Frontend logic, API calls, and Web3 interactions
```

---

## 🛠️ Local Setup & Installation

### 1. Backend Server Setup

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate.bat

# Install dependencies and start the server
pip install -r requirements.txt
uvicorn blockchain_manager:app --reload --port 8000
```

### 2. Frontend Configuration

Update the API URL in `config.js`:

```javascript
const API_BASE_URL = "http://127.0.0.1:8000";
```

---

## 📡 API Endpoint Cheat Sheet

| Method | Endpoint              | Description                                           |
| ------ | --------------------- | ----------------------------------------------------- |
| GET    | `/api/blockchain`     | Fetch the complete blockchain ledger                  |
| POST   | `/api/clients`        | Create a new simulated account                        |
| POST   | `/api/transactions`   | Verify signatures and add transactions to the mempool |
| POST   | `/api/mine`           | Mine pending transactions using Proof-of-Work         |
| GET    | `/api/validate`       | Validate blockchain integrity                         |
| POST   | `/api/tamper/{index}` | Tamper with a specific block                          |
| POST   | `/api/reset`          | Reset the blockchain to the Genesis Block             |

---

## 💡 Quick Demo Testing Guide

### 🔹 Web3 Transaction Flow

1. Connect your MetaMask wallet.
2. Select it as the transaction sender.
3. Enter transaction details and a gas fee tip.
4. Click **Create Transaction**.
5. Sign the message in MetaMask.
6. The transaction will appear in the prioritized mempool.

### 🔹 Security & Tampering Demo

1. Select any mined block.
2. Click **Tamper This Block**.
3. The blockchain status will change to **⚠️ CHAIN BROKEN**.
4. Visual indicators will highlight the compromised chain.

### 🔹 Chain Validation Demo

1. Click **Validate Chain**.
2. The backend will verify all hashes and block links.
3. Any tampered block will be detected and reported with its exact index.
