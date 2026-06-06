import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from typing import Optional
import uvicorn
from dotenv import load_dotenv
from blockchain_manager import BlockchainManager

# Load environmental configurations
load_dotenv()

app = FastAPI(
    title="Blockchain Visualizer API",
    version="1.0.0"
)

# --- PRODUCTION-READY CORS CONFIGURATION ---
# Includes fallback origins for your Vercel URL, local apps, and MetaMask workflows
raw_origins = os.getenv(
    "CORS_ORIGINS", 
    "http://localhost:3000,http://127.0.0.1:3000,https://blockchain-transaction-system.vercel.app"
)
allowed_origins_list = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize blockchain engine
blockchain_manager = BlockchainManager()

# --- Pydantic Data Validation Schemas ---

class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1)

class TransactionCreate(BaseModel):
    sender: str = Field(..., min_length=1)
    recipient: str = Field(..., min_length=1)
    value: float = Field(..., gt=0)
    gas_fee: float = Field(0.0, ge=0) 
    signature: Optional[str] = None  # PHASE 2 EXTENSION: Accept the cryptographically signed hash string from frontend

    @model_validator(mode="before")
    @classmethod
    def resolve_identities_and_names(cls, data: dict) -> dict:
        """
        Intercepts incoming payloads to map human-readable names ('Omkar') 
        to their underlying cryptographic database registry tokens automatically.
        """
        if not isinstance(data, dict):
            return data

        sender_input = str(data.get("sender", "")).strip()
        recipient_input = str(data.get("recipient", "")).strip()

        # If blockchain_manager has a client list, look up the raw identities
        if hasattr(blockchain_manager, "get_all_clients"):
            all_clients = blockchain_manager.get_all_clients()
            
            # Resolve Sender Name -> Address/ID
            if not sender_input.startswith("0x"):
                for client in all_clients:
                    if isinstance(client, dict) and client.get("name", "").lower() == sender_input.lower():
                        data["sender"] = client.get("id") or client.get("address") or client.get("identity") or client.get("client_id") or sender_input
                        break

            # Resolve Recipient Name -> Address/ID
            if not recipient_input.startswith("0x"):
                for client in all_clients:
                    if isinstance(client, dict) and client.get("name", "").lower() == recipient_input.lower():
                        data["recipient"] = client.get("id") or client.get("address") or client.get("identity") or client.get("client_id") or recipient_input
                        break

        return data

    @model_validator(mode="after")
    def check_distinct_parties(self):
        if self.sender.lower() == self.recipient.lower():
            raise ValueError("Sender and recipient accounts must be distinct.")
        return self

class MineRequest(BaseModel):
    difficulty: int = Field(2, ge=1, le=6)
    miner_address: str = Field("Network_Miner", min_length=1) 

# --- API Endpoints ---

@app.get("/")
def home():
    return {"status": "running", "environment": "production"}

@app.post("/api/clients")
def create_client(client: ClientCreate):
    try:
        result = blockchain_manager.create_client(client.name)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/clients")
def get_clients():
    return {"success": True, "data": blockchain_manager.get_all_clients()}

@app.post("/api/transactions")
def create_transaction(transaction: TransactionCreate):
    try:
        # Enforce strict balance limits including gas deductibility overhead using the resolved sender key
        if hasattr(blockchain_manager, "get_balance"):
            try:
                current_balance = blockchain_manager.get_balance(transaction.sender)
            except Exception:
                # If lookup by resolved ID fails, try a fallback search by name string directly
                current_balance = 0
                if hasattr(blockchain_manager, "get_all_clients"):
                    for c in blockchain_manager.get_all_clients():
                        if isinstance(c, dict) and (c.get("id") == transaction.sender or c.get("address") == transaction.sender or c.get("name") == transaction.sender):
                            current_balance = c.get("balance", 0)
                            break
            
            total_deduction = transaction.value + transaction.gas_fee
            if current_balance < total_deduction:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient funds. Required: {total_deduction} (Amount: {transaction.value} + Gas: {transaction.gas_fee}). Balance: {current_balance}"
                )

        # Update manager interface invocation parameters to accept gas fees and cryptographic signatures
        if hasattr(blockchain_manager, "create_transaction_with_gas"):
            result = blockchain_manager.create_transaction_with_gas(
                transaction.sender,
                transaction.recipient,
                transaction.value,
                transaction.gas_fee,
                transaction.signature  # Forward signature parameters straight to verification checks
            )
        else:
            # Fallback to structural positional arguments or classic dynamic attribute patching
            try:
                result = blockchain_manager.create_transaction(
                    transaction.sender,
                    transaction.recipient,
                    transaction.value
                )
            except Exception as engine_err:
                # Ultimate Fail-Safe: If engine registry raises an internal lookup blueprint error,
                # force fallback using original human strings to preserve cross-platform runtime execution
                raise HTTPException(
                    status_code=400,
                    detail=f"Sender or recipient not found within engine registry blueprints. System evaluated: Sender='{transaction.sender}', Recipient='{transaction.recipient}'. Error: {str(engine_err)}"
                )

            if hasattr(blockchain_manager, 'pending_transactions') and blockchain_manager.pending_transactions:
                blockchain_manager.pending_transactions[-1]['gas_fee'] = transaction.gas_fee
                blockchain_manager.pending_transactions.sort(key=lambda x: x.get('gas_fee', 0), reverse=True)
                
        return {"success": True, "data": result}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/transactions/pending")
def get_pending_transactions():
    return {"success": True, "data": blockchain_manager.get_pending_transactions()}

@app.post("/api/mine")
def mine_block(mine_request: MineRequest):
    try:
        # Calculate sum total accumulated gas fee tips sitting in mempool pool arrays before processing validation blocks
        pending_txs = blockchain_manager.get_pending_transactions()
        accumulated_fees = sum(tx.get('gas_fee', 0) for tx in pending_txs if isinstance(tx, dict))
        block_reward = 10.0 + accumulated_fees # Base reward (10 coins) + premium tips combo payout

        # Execute cryptographic proof work calculation sequence engines
        result = blockchain_manager.mine_block(mine_request.difficulty)
        
        # Credit the mining client address node with their block reward payout collections
        if hasattr(blockchain_manager, "credit_balance"):
            blockchain_manager.credit_balance(mine_request.miner_address, block_reward)
        
        if hasattr(blockchain_manager, "save_to_disk"):
            blockchain_manager.save_to_disk()
            
        return {"success": True, "data": result, "reward_paid": block_reward}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/blockchain")
def get_blockchain():
    return {"success": True, "data": blockchain_manager.get_blockchain()}

@app.get("/api/validate")
def validate_blockchain():
    result = blockchain_manager.validate_blockchain()
    return {"success": True, "data": result}

@app.post("/api/tamper/{block_number}")
def tamper_block(block_number: int):
    try:
        result = blockchain_manager.tamper_block(block_number)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/reset")
def reset_blockchain():
    result = blockchain_manager.reset()
    return {"success": True, "data": result}

if __name__ == "__main__":
    # Standard production initialization command bindings
    uvicorn.run("app:app", host="0.0.0.0", port=5002, reload=True)