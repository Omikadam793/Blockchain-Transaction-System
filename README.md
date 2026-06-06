# 🔗 Blockchain Transaction System

A full-stack, real-time blockchain simulation platform that demonstrates distributed ledger operations, Proof-of-Work (PoW) mining, transaction validation, and blockchain integrity verification. The system supports both local sandbox accounts and **Web3 MetaMask integration**, allowing users to sign and validate transactions using cryptographic signatures (`personal_sign`).

🌐 **Live Backend API:** https://blockchain-transaction-system.onrender.com/

---

## 🚀 Key Features

- ⛏️ Proof-of-Work (PoW) Mining simulation
- 🦊 MetaMask wallet integration with cryptographic signing
- 📊 Real-time blockchain visualization dashboard
- 💰 Priority-based mempool using gas tip values
- 🔒 Transaction signature verification
- ⚠️ Blockchain tampering simulation
- ✅ Chain validation and integrity auditing
- 🌙 Responsive Dark/Light theme support

---

## 🏗️ System Architecture

### Frontend
- HTML5
- CSS3 (Grid & Flexbox)
- JavaScript (ES6)
- Fetch API
- Web3 MetaMask Integration

### Backend
- Python
- FastAPI
- Uvicorn

### Blockchain Components
- SHA-256 Hashing
- Proof-of-Work Consensus
- Transaction Mempool
- Digital Signature Verification
- Blockchain Validation

---

## 🛠️ Installation & Local Setup

### 1. Backend Setup

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
# .venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --host 127.0.0.1 --port 8000