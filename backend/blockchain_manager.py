import hashlib
import json
import time
from typing import List, Dict

class BlockchainManager:
    def __init__(self):
        # State tracking arrays for the text-based sandbox
        self.blockchain_ledger: List[Dict] = []
        self.mempool_pending_transactions: List[Dict] = []
        self.client_database_registry: Dict[str, Dict] = {
            "Alice": {"name": "Alice", "balance": 500.0},
            "Bob": {"name": "Bob", "balance": 500.0}
        }
        # Automatically generate the first block upon starting
        self.create_genesis_block()

    def create_genesis_block(self):
        genesis_block = {
            "block_number": 0,
            "timestamp": time.time(),
            "transactions": [],
            "nonce": 0,
            "previous_hash": "0" * 64,
            "block_hash": "0" * 64,
            "is_tampered": False
        }
        self.blockchain_ledger.append(genesis_block)

    def calculate_block_hash(self, block: Dict) -> str:
        # Create structural fingerprint copy of data
        hash_payload = {
            "block_number": block["block_number"],
            "timestamp": block["timestamp"],
            "transactions": block["transactions"],
            "nonce": block["nonce"],
            "previous_hash": block["previous_hash"]
        }
        block_string = json.dumps(hash_payload, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    def add_client(self, name: str) -> bool:
        if name in self.client_database_registry:
            return False
        self.client_database_registry[name] = {"name": name, "balance": 100.0}
        return True

    def add_transaction(self, sender: str, recipient: str, value: float, gas_fee: float) -> bool:
        # Emergency server-sleep check: Auto-register user names if Render wiped state arrays
        if sender not in self.client_database_registry:
            self.client_database_registry[sender] = {"name": sender, "balance": 100.0}
        if recipient not in self.client_database_registry:
            self.client_database_registry[recipient] = {"name": recipient, "balance": 100.0}

        sender_account = self.client_database_registry[sender]
        total_cost = value + gas_fee

        if sender_account["balance"] < total_cost:
            return False

        # Deduct balances from sender during pool placement
        sender_account["balance"] -= total_cost

        tx_data = {
            "sender": sender,
            "recipient": recipient,
            "value": value,
            "gas_fee": gas_fee,
            "timestamp": time.time()
        }
        
        self.mempool_pending_transactions.append(tx_data)
        # Prioritize gas fees top down
        self.mempool_pending_transactions.sort(key=lambda x: x["gas_fee"], reverse=True)
        return True

    def mine_pending_pool(self, difficulty: int) -> Dict:
        if not self.mempool_pending_transactions:
            return {"success": False, "detail": "Mempool is empty."}

        last_block = self.blockchain_ledger[-1]
        new_block_number = last_block["block_number"] + 1
        previous_hash = last_block["block_hash"]

        packaged_txs = list(self.mempool_pending_transactions)
        self.mempool_pending_transactions = [] # Empty out the queue pool

        new_block = {
            "block_number": new_block_number,
            "timestamp": time.time(),
            "transactions": packaged_txs,
            "nonce": 0,
            "previous_hash": previous_hash,
            "is_tampered": False
        }

        # Mining Proof of Work loop
        target_prefix = "0" * difficulty
        while True:
            current_hash = self.calculate_block_hash(new_block)
            if current_hash.startswith(target_prefix):
                new_block["block_hash"] = current_hash
                break
            new_block["nonce"] += 1

        # Award settled coin totals to the recipient text registry addresses
        for tx in packaged_txs:
            recipient = tx["recipient"]
            if recipient in self.client_database_registry:
                self.client_database_registry[recipient]["balance"] += tx["value"]
            else:
                self.client_database_registry[recipient] = {"name": recipient, "balance": 100.0 + tx["value"]}

        self.blockchain_ledger.append(new_block)
        return {"success": True, "block": new_block}

    def validate_ledger_integrity(self) -> Dict:
        errors = []
        for i in range(1, len(self.blockchain_ledger)):
            current = self.blockchain_ledger[i]
            previous = self.blockchain_ledger[i-1]

            if current["previous_hash"] != previous["block_hash"]:
                errors.append(f"Linkage broken between Block #{previous['block_number']} and Block #{current['block_number']}.")

            recalculated = self.calculate_block_hash(current)
            if current["block_hash"] != recalculated:
                errors.append(f"Data mutation violation detected at Block #{current['block_number']}.")

        if errors:
            return {"valid": False, "errors": errors}
        return {"valid": True, "message": "Blockchain ledger integrity fully intact! ✅"}

    def tamper_target_block(self, block_number: int) -> bool:
        for block in self.blockchain_ledger:
            if block["block_number"] == block_number:
                block["is_tampered"] = True
                block["transactions"] = [{"sender": "HACKER", "recipient": "MALICIOUS", "value": 99999.0, "gas_fee": 0.0}]
                block["block_hash"] = "CORRUPTED_HASH_VAL_ERROR"
                return True
        return False

    def hard_reset_state(self):
        self.blockchain_ledger = []
        self.mempool_pending_transactions = []
        self.client_database_registry = {
            "Alice": {"name": "Alice", "balance": 500.0},
            "Bob": {"name": "Bob", "balance": 500.0}
        }
        self.create_genesis_block()