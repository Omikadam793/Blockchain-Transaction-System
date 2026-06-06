# Layer 1 Blockchain Simulation Engine & Visualizer 🪙

A high-performance, self-contained **Layer 1 Blockchain Sandbox Simulation Engine** built from the ground up using **Python (FastAPI)** and asynchronous **JavaScript (ES6+)**. This project completely bypasses external Web3 wallet extension dependencies (like MetaMask) or local testnets (like Hardhat) to expose a raw, highly educational, and lightning-fast architectural deep-dive into how distributed cryptographic ledgers behave under the hood.

**🚀 Live Frontend Visualizer:** [blockchain-transaction-system.vercel.app](https://blockchain-transaction-system.vercel.app/)  
**⚙️ Live Core API Routing Instance:** [blockchain-transaction-system.onrender.com](https://blockchain-transaction-system.onrender.com)

---

## 🏗️ Core Architectural Mechanics

Unlike standard web visualizers that mock static array shifts directly in UI script files, this platform isolates state computation within a dedicated object-oriented backend layout engine. 

### 1. Proof-of-Work (PoW) Mining Consensus
The network forces cryptographic honesty by requiring miners to discover a custom valid block hash that satisfies an adjustable target difficulty parameter. The system iteratively modifies a 32-bit `nonce` field alongside transaction roots inside a **SHA-256 algorithm pipeline** until the generated hash contains the required leading zeros.

### 2. Priority-Driven Gas Fee Mempool
Transactions do not settle in a simple First-In-First-Out (FIFO) timeline. Instead, the application implements a microeconomic **Priority Queue** structure inside the Mempool. Pending transactions are continuously ranked top-down by competitive user-defined `gas_fee` tips, simulating the authentic fee-market priority dynamics found on Ethereum or Bitcoin mainnets.

### 3. Ledger Integrity Verification & Tamper Detection
The blockchain maps linear historic immutability by tying each block structurally to the hash of its predecessor:
$$\text{Current Block Hash} = \text{SHA256}(\text{Block Number} + \text{Nonce} + \text{Transactions Data} + \text{Previous Hash})$$

The platform contains a dedicated **Security Tamper Vector**. If an entity retroactively modifies data inside an on-chain block via the modal dashboard, the backend state machine breaks. The network validation loop instantly flags the structural hash mismatch, breaks the cryptographic linkage, and propagates a `BREACHED ⚠️` network alert state across the UI timeline elements.

---

## 📊 Technical Feature Matrix

| Core Attribute | Production Networks (Bitcoin/Ethereum) | Standard Portfolio Projects | This Engine Simulation |
| :--- | :--- | :--- | :--- |
| **Consensus Target** | Distributed global P2P nodes | Static hardcoded fake data strings | **Dynamic Proof-of-Work Target Engine** |
| **Mempool Structure** | Gossip Network Protocol | Basic JavaScript array queues | **Gas Fee Tip Priority Ranking Sorting** |
| **State Tracking** | Distributed P2P DBs (LevelDB) | Temporary browser LocalStorage | **Asynchronous Live Cloud REST State API** |
| **Identity Verification** | Hex Private Keys (ECDSA Signatures) | Required Extension Plug-ins | **Named Balance Registry State Machine** |

---

## 🛠️ Tech Stack & Systems Design

### Backend Engine (`/backend`)
* **Language:** Python 3.10+
* **Framework:** FastAPI (Asynchronous Web Gateway)
* **Design Pattern:** Object-Oriented State Encapsulation (`blockchain.py` handles cryptographic math; `app.py` exposes RESTful endpoints)
* **Deployment Instance:** Render Cloud Infrastructure

### Frontend Interface (`/frontend`)
* **Languages:** Semantic HTML5, CSS3 Variables Architecture, Vanilla Modern JavaScript (ES6+ Web Fetch API Async Loops)
* **Fonts:** Poppins Layout Typography
* **Hosting Container:** Vercel Hosting Pipeline

---

## 🔌 API Endpoints Documentation

The backend service layer exposes raw RESTful JSON pathways to poll network states cleanly:

* **`GET /api/blockchain`** — Returns the entire serialized list of mined ledger blocks, including transaction records, nonces, and historical hash relationships.
* **`GET /api/clients`** — Pulls the registered addresses and their matching live currency token balance metrics.
* **`POST /api/transactions`** — Pushes a fresh transaction structural payload into the priority mempool queue (`{ sender, recipient, value, gas_fee }`).
* **`POST /api/mine`** — Triggers the cryptographic hashing thread to forge a new block container utilizing pending mempool transactions (`{ difficulty, miner_address }`).
* **`GET /api/validate`** — Audits the mathematical link chains between all sequential cryptographic block pointers to confirm whole-network security status.
* **`POST /api/tamper/{block_number}`** — Maliciously alters a target block's internal records to showcase network vulnerability tracking systems.
* **`POST /api/reset`** — Completely wipes active tracking configurations and seeds a clean, fresh Genesis Block (#0).

---

## 🚀 Local Installation & Workspace Execution

If you want to clone this repository and spin up your own local development sandbox instance, run these simple sequential operations in your terminal layout:

### 1. Set Up the Backend Server Engine
```bash
# Clone down your project repository
git clone [https://github.com/Omikadam793/Blockchain-Transaction-System.git](https://github.com/Omikadam793/Blockchain-Transaction-System.git)
cd Blockchain-Transaction-System/backend

# Create your virtual environment layer and launch it
python -m venv venv
source venv/bin/activate  # On Windows terminal: .\venv\Scripts\activate

# Install essential execution modules
pip install fastapi uvicorn pydantic

# Boot up the local development hot-reload server
uvicorn app:app --reload --port 8000

## 🖥️ Launch the Web Visualizer

1. Open a new terminal window and navigate to the `frontend` directory.

2. In `config.js`, ensure that `API_BASE_URL` points to your local backend server:

```javascript
const API_BASE_URL = "http://127.0.0.1:8000";
```

3. Launch the frontend using any local web server. You can:

   * Open `index.html` using the VS Code **Live Server** extension, or
   * Run a simple Python server:

```bash
python -m http.server 5500
```

4. Open your browser and navigate to:

```text
http://localhost:5500
```

---

## 📈 System Extension Roadmap

### 🔐 Asymmetric Public-Key Signatures

Introduce mock RSA/ECDSA key-pair generation within the frontend, allowing users to create and sign transactions using simulated private keys before submitting them to the backend transaction queue.

### 📜 Smart Contract Layer Visualizer

Add a dedicated smart contract editor where users can create simple IF/THEN transaction rules. These contracts can automatically trigger token transfers or actions when predefined conditions, such as balance thresholds, are met.

### ⚡ Real-Time Event Updates

Integrate WebSockets to provide instant updates for new transactions, mined blocks, and chain validation results without requiring manual page refreshes.
