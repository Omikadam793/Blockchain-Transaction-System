from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import hashlib
import json
import time

app = FastAPI(title="Blockchain Sandbox Engine")

# Configure CORS so your Vercel or local frontend can talk to it cleanly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# DATA MODELS (SCHEMAS)
# ==========================================
class ClientCreateSchema(BaseModel):
    name: str

class TransactionSchema(BaseModel):
    sender: str
    recipient: str
    value: float
    gas_fee: float

class MineRequestSchema(BaseModel):
    difficulty: int
    miner_address: str

# ==========================================
# IN-MEMORY STORAGE STATE
# ==========================================
# Simple global tracking dictionaries
client_database_registry: Dict[str, Dict] = {
    "Alice": {"name": "Alice", "balance": 500.0},
    "Bob": {"name": "Bob", "balance": 500.0}
}
mempool_pending_transactions: List[Dict] = []
blockchain_ledger: List[Dict] = []

# Create the initial Genesis Block to boot the ledger
def create_genesis_block():
    genesis_block = {
        "block_number": 0,
        "timestamp": time.time(),
        "transactions": [],
        "nonce": 0,
        "previous_hash": "0" * 64,
        "block_hash": "0" * 64,
        "is_tampered": False
    }
    blockchain_ledger.append(genesis_block)

create_genesis_block()

# ==========================================
# CRYPTOGRAPHIC UTILITIES
# ==========================================
def calculate_block_hash(block: Dict) -> str:
    # Hash calculation excluding the hash itself
    hash_payload = {
        "block_number": block["block_number"],
        "timestamp": block["timestamp"],
        "transactions": block["transactions"],
        "nonce": block["nonce"],
        "previous_hash": block["previous_hash"]
    }
    block_string = json.dumps(hash_payload, sort_keys=True).encode()
    return hashlib.sha256(block_string).hexdigest()

# ==========================================
# API ENDPOINTS
# ==========================================

# 1. CLIENTS MANAGEMENT
@app.get("/api/clients")
async def get_clients():
    data = list(client_database_registry.values())
    return {"success": True, "data": data}

@app.post("/api/clients")
async def create_client(client: ClientCreateSchema):
    name = client.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Client name cannot be blank.")
    if name in client_database_registry:
        raise HTTPException(status_code=400, detail="Client name already exists inside the sandbox.")
    
    client_database_registry[name] = {"name": name, "balance": 100.0}
    return {"success": True, "detail": f"Client {name} successfully initialized."}

# 2. TRANSACTIONS & MEMPOOL
@app.get("/api/transactions/pending")
async def get_pending_transactions():
    return {"success": True, "data": mempool_pending_transactions}

@app.post("/api/transactions")
async def create_transaction(tx: TransactionSchema):
    # Resiliency Fallback: Re-register user dynamically if Render woke up from a sleep wipe
    if tx.sender not in client_database_registry:
        client_database_registry[tx.sender] = {"name": tx.sender, "balance": 100.0}
    if tx.recipient not in client_database_registry:
        client_database_registry[tx.recipient] = {"name": tx.recipient, "balance": 100.0}

    sender_account = client_database_registry[tx.sender]
    total_cost = tx.value + tx.gas_fee

    if sender_account["balance"] < total_cost:
        raise HTTPException(status_code=400, detail=f"Insufficient funds. Required: {total_cost} coins.")

    # Deduct funds immediately upon staging to mempool
    sender_account["balance"] -= total_cost

    tx_data = {
        "sender": tx.sender,
        "recipient": tx.recipient,
        "value": tx.value,
        "gas_fee": tx.gas_fee,
        "timestamp": time.time()
    }
    # Priority Queue: Higher gas fees stay at the top of the stack
    mempool_pending_transactions.append(tx_data)
    mempool_pending_transactions.sort(key=lambda x: x["gas_fee"], reverse=True)

    return {"success": True, "detail": "Transaction verified and staged into Mempool."}

# 3. PROOF OF WORK MINING ENGINE
@app.post("/api/mine")
async def mine_block(req: MineRequestSchema):
    global mempool_pending_transactions
    if not mempool_pending_transactions:
        raise HTTPException(status_code=400, detail="Mempool is completely empty. Nothing to mine!")

    last_block = blockchain_ledger[-1]
    new_block_number = last_block["block_number"] + 1
    previous_hash = last_block["block_hash"]

    # Grab pending transactions to package inside this block
    packaged_txs = list(mempool_pending_transactions)
    mempool_pending_transactions = [] # Flush mempool

    new_block = {
        "block_number": new_block_number,
        "timestamp": time.time(),
        "transactions": packaged_txs,
        "nonce": 0,
        "previous_hash": previous_hash,
        "is_tampered": False
    }

    # Execute Proof of Work looping
    target_prefix = "0" * req.difficulty
    while True:
        current_hash = calculate_block_hash(new_block)
        if current_hash.startswith(target_prefix):
            new_block["block_hash"] = current_hash
            break
        new_block["nonce"] += 1

    # Process and settle recipient payouts
    for tx in packaged_txs:
        recipient = tx["recipient"]
        if recipient in client_database_registry:
            client_database_registry[recipient]["balance"] += tx["value"]
        else:
            client_database_registry[recipient] = {"name": recipient, "balance": 100.0 + tx["value"]}

    blockchain_ledger.append(new_block)
    return {"success": True, "detail": f"Block #{new_block_number} mined successfully."}

# 4. LEDGER TIMELINE & VALIDATION
@app.get("/api/blockchain")
async def get_blockchain():
    return {"success": True, "data": blockchain_ledger}

@app.get("/api/validate")
async def validate_chain():
    errors = []
    for i in range(1, len(blockchain_ledger)):
        current = blockchain_ledger[i]
        previous = blockchain_ledger[i-1]

        # Check hash chaining link
        if current["previous_hash"] != previous["block_hash"]:
            errors.append(f"Hash linkage broken between Block #{previous['block_number']} and #{current['block_number']}.")

        # Check structural data integrity hash
        recalculated = calculate_block_hash(current)
        if current["block_hash"] != recalculated:
            errors.append(f"Data corruption detected on Block #{current['block_number']}.")

    if errors:
        return {"success": True, "data": {"valid": False, "errors": errors}}
    return {"success": True, "data": {"valid": True, "message": "Blockchain ledger integrity fully intact! ✅"}}

# 5. SECURITY TESTING: MANIPULATE HISTORY
@app.post("/api/tamper/{block_number}")
async def tamper_block(block_number: int):
    for block in blockchain_ledger:
        if block["block_number"] == block_number:
            block["is_tampered"] = True
            # Intentionally corrupt data properties to simulate a hack
            block["transactions"] = [{"sender": "HACKER", "recipient": "MALICIOUS", "value": 99999.0, "gas_fee": 0.0}]
            block["block_hash"] = "CORRUPTED_HASH_VAL_ERROR"
            return {"success": True, "detail": f"Block #{block_number} successfully corrupted."}
    raise HTTPException(status_code=404, detail="Block not found.")

# 6. RESET NETWORK SYSTEM
@app.post("/api/reset")
async def reset_ledger():
    global client_database_registry, mempool_pending_transactions, blockchain_ledger
    client_database_registry = {
        "Alice": {"name": "Alice", "balance": 500.0},
        "Bob": {"name": "Bob", "balance": 500.0}
    }
    mempool_pending_transactions = []
    blockchain_ledger = []
    create_genesis_block()
    return {"success": True, "detail": "Ledger state flushed back to core defaults."}