import time
import hashlib
import json

class Client:
    def __init__(self):
        # Generates a pseudo-random unique public identity string for the local simulated account
        self.identity = hashlib.sha256(str(time.time()).encode('utf-8')).hexdigest()[:40]

class Transaction:
    def __init__(self, sender: Client, recipient: Client, value: float):
        self.sender = sender
        self.recipient = recipient
        self.value = value
        self.time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
        self.gas_fee = 0.0  # Acts as the structural fallback baseline property

    def sign_transaction(self) -> str:
        """Generates a default local structural signature string hash tracking fallback."""
        tx_dict = {
            "sender": self.sender.identity if hasattr(self.sender, 'identity') else str(self.sender),
            "recipient": self.recipient.identity if hasattr(self.recipient, 'identity') else str(self.recipient),
            "value": self.value,
            "time": self.time
        }
        tx_string = json.dumps(tx_dict, sort_keys=True)
        return hashlib.sha256(tx_string.encode('utf-8')).hexdigest()

class Block:
    def __init__(self, verified_transactions: list, previous_block_hash: str, nonce: int = 0):
        self.verified_transactions = verified_transactions
        self.previous_block_hash = previous_block_hash
        self.nonce = nonce
        self.timestamp = time.time()
        # Formulate complete block packet metadata tracking logs
        self.block_data = json.dumps({
            "transactions": verified_transactions,
            "previous_hash": previous_block_hash,
            "nonce": nonce
        }, sort_keys=True)
        self.block_hash = self.calculate_hash()

    def calculate_hash(self) -> str:
        return hashlib.sha256(self.block_data.encode('utf-8')).hexdigest()

def sha256(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def mine(signatures: list, previous_hash: str, difficulty: int = 2) -> Block:
    """Computes a valid Proof-of-Work block matching target prefix difficulty conditions efficiently."""
    target_prefix = '0' * difficulty
    nonce = 0
    
    while True:
        # ─── HIGH PERFORMANCE MINING SEARCH ENGINE ───
        # Stringify target block attributes directly to calculate hashes with low memory overhead
        raw_block_data = json.dumps({
            "transactions": signatures,
            "previous_hash": previous_hash,
            "nonce": nonce
        }, sort_keys=True)
        
        current_hash = hashlib.sha256(raw_block_data.encode('utf-8')).hexdigest()
        
        # Check if the block satisfies the cryptographic network difficulty
        if current_hash.startswith(target_prefix):
            # Once verified, construct the permanent Block payload to return to the manager
            final_block = Block(verified_transactions=signatures, previous_block_hash=previous_hash, nonce=nonce)
            final_block.block_data = raw_block_data
            final_block.block_hash = current_hash
            return final_block
            
        nonce += 1