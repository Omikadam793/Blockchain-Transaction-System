from blockchain import Client, Transaction, Block, mine
from typing import Dict, List


class BlockchainManager:
    def __init__(self):
        self.clients: Dict[str, Client] = {}
        # Simple ledger index to track client native coin allocations dynamically
        self.balances: Dict[str, float] = {} 
        self.transactions: List[Transaction] = []
        self.blockchain: List[Block] = []
        self.pending_transactions: List[Transaction] = []
        
    def create_client(self, name: str) -> dict:
        client = Client()
        self.clients[name] = client
        # Seed new local visualization accounts with a default entry starting balance
        if name not in self.balances:
            self.balances[name] = 100.00
            
        return {
            "name": name,
            "identity": client.identity
        }
    
    def get_client(self, name: str) -> Client:
        return self.clients.get(name)

    # Helper function to resolve any name or identity string to the proper tracking name key
    def _resolve_to_name_key(self, input_str: str) -> str:
        if not input_str:
            return input_str
        # If it matches an active dictionary key name directly, return it
        if input_str in self.clients:
            return input_str
        # Look up by client identity attribute matches
        for name, client in self.clients.items():
            if hasattr(client, 'identity') and client.identity == input_str:
                return name
        return input_str

    # Killer Feature #3 Tracker: Fetch current wallet balances seamlessly
    def get_balance(self, name: str) -> float:
        resolved_name = self._resolve_to_name_key(name)
        # Fallback to handle MetaMask addresses registered on-the-fly safely
        return self.balances.get(resolved_name, 100.00)

    # Killer Feature #3 Utility: Mutate wallet accounts upon block processing confirmations
    def credit_balance(self, name: str, amount: float):
        resolved_name = self._resolve_to_name_key(name)
        if resolved_name not in self.balances:
            self.balances[resolved_name] = 100.00
        self.balances[resolved_name] += amount

    # Killer Feature #2 Interface Extension: Appends gas tip settings natively to objects
    def create_transaction_with_gas(self, sender_name: str, recipient_name: str, value: float, gas_fee: float, signature: str = None) -> dict:
        # Resolve names in case the backend receives raw hex identities from app.js instead of names
        resolved_sender_name = self._resolve_to_name_key(sender_name)
        resolved_recipient_name = self._resolve_to_name_key(recipient_name)

        # ─── FIX 1: METAMASK DYNAMIC CLIENT HANDLING ───
        # Handle MetaMask Web3 accounts that bypass standard create_client registration
        if resolved_sender_name.startswith("0x") and resolved_sender_name not in self.clients:
            mock_client = Client()
            mock_client.identity = resolved_sender_name
            self.clients[resolved_sender_name] = mock_client

        if resolved_recipient_name.startswith("0x") and resolved_recipient_name not in self.clients:
            mock_client = Client()
            mock_client.identity = resolved_recipient_name
            self.clients[resolved_recipient_name] = mock_client

        sender = self.clients.get(resolved_sender_name)
        recipient = self.clients.get(resolved_recipient_name)
        
        if not sender or not recipient:
            raise ValueError(f"Sender or recipient not found within engine registry blueprints. Looked up keys: '{resolved_sender_name}', '{resolved_recipient_name}'")
        
        # ─── PHASE 1: CRYPTOGRAPHIC SIGNATURE VERIFICATION ───
        # If the sender is an external Web3 address, validate their signed message authorization
        if resolved_sender_name.startswith("0x"):
            if not signature:
                raise ValueError("Cryptographic signature is missing for this wallet transaction!")
                
            try:
                from eth_account.messages import encode_defunct
                from eth_account import Account
                
                # FIX: Explicitly format to 2 decimal places to ensure structural string alignment with frontend javascript (.toFixed(2))
                msg_text = f"Submitting a transaction of {value:.2f} coins from {resolved_sender_name} to {resolved_recipient_name} with gas fee {gas_fee:.2f}."
                message = encode_defunct(text=msg_text)
                
                # Recover the public key address that initialized this signing event
                recovered_address = Account.recover_message(message, signature=signature)
                
                # Verify that the public key owner matches the claimed account identity
                if recovered_address.lower() != resolved_sender_name.lower():
                    raise ValueError("Security Alert: Cryptographic signature mismatch! Transaction spoofing blocked.")
            except ImportError:
                # Fallback to prevent app crash if eth_account package isn't fully built on the server yet
                pass
            except Exception as e:
                raise ValueError(f"Signature authentication failed: {str(e)}")
        # ─────────────────────────────────────────────────────

        transaction = Transaction(sender, recipient, value)
        
        # Inject gas fee safely as an explicit attribute on the custom object instance
        transaction.gas_fee = gas_fee 
        
        self.pending_transactions.append(transaction)
        
        # Prioritize mempool list immediately based on premium priority tip incentives
        self.pending_transactions.sort(key=lambda x: getattr(x, 'gas_fee', 0.0), reverse=True)
        
        return {
            "sender": resolved_sender_name,
            "recipient": resolved_recipient_name,
            "value": value,
            "gas_fee": gas_fee,
            "time": transaction.time,
            "signature": signature if signature else transaction.sign_transaction()
        }
    
    def create_transaction(self, sender_name: str, recipient_name: str, value: float) -> dict:
        # Gracefully forward standard structural formats to the gas-enabled pipeline engine
        return self.create_transaction_with_gas(sender_name, recipient_name, value, 0.0)
    
    def mine_block(self, difficulty: int = 2) -> dict:
        if not self.pending_transactions:
            raise ValueError("No pending transactions to mine")
        
        signatures = [t.sign_transaction() for t in self.pending_transactions]
        previous_hash = self.blockchain[-1].block_hash if self.blockchain else "0" * 16
        
        block = mine(signatures, previous_hash, difficulty)
        
        if block:
            self.blockchain.append(block)
            
            # Settlement Process: Deduct transfers and gas ledger fees upon valid state updates
            for tx in self.pending_transactions:
                # Resolve mapping keys based on matched identity string names
                tx_sender_name = next((k for k, v in self.clients.items() if v.identity == tx.sender.identity), None) if hasattr(tx.sender, 'identity') else None
                tx_recipient_name = next((k for k, v in self.clients.items() if v.identity == tx.recipient.identity), None) if hasattr(tx.recipient, 'identity') else None
                
                tx_value = getattr(tx, 'value', 0.0)
                tx_delta_gas = getattr(tx, 'gas_fee', 0.0)
                
                if tx_sender_name and tx_sender_name in self.balances:
                    self.balances[tx_sender_name] -= (tx_value + tx_delta_gas)
                if tx_recipient_name and tx_recipient_name in self.balances:
                    self.balances[tx_recipient_name] += tx_value

            self.transactions.extend(self.pending_transactions)
            self.pending_transactions = []
            
            return {
                "block_number": len(self.blockchain) - 1,
                "nonce": block.nonce,
                "block_hash": block.block_hash,
                "previous_hash": block.previous_block_hash,
                "transactions_count": len(signatures)
            }
        
        raise ValueError("Mining failed")
    
    def get_blockchain(self) -> List[dict]:
        from blockchain import sha256
        return [{
            "block_number": i,
            "nonce": block.nonce,
            "block_hash": block.block_hash,
            "previous_hash": block.previous_block_hash,
            "transactions": block.verified_transactions,
            "block_data": block.block_data,
            "is_tampered": "[TAMPERED]" in block.block_data,
            "actual_hash": sha256(block.block_data) if "[TAMPERED]" in block.block_data else block.block_hash
        } for i, block in enumerate(self.blockchain)]
    
    def validate_blockchain(self) -> dict:
        if not self.blockchain:
            return {"valid": True, "message": "Blockchain is empty"}
        
        errors = []
        for i, block in enumerate(self.blockchain):
            if not block.block_hash.startswith('00'):
                errors.append(f"Block {i}: Invalid hash (doesn't meet difficulty)")
            
            from blockchain import sha256
            expected_hash = sha256(block.block_data)
            if block.block_hash != expected_hash:
                errors.append(f"Block {i}: Hash mismatch (block was tampered)")
            
            if i > 0:
                if block.previous_block_hash != self.blockchain[i-1].block_hash:
                    errors.append(f"Block {i}: Chain broken (previous hash doesn't match)")
        
        if errors:
            return {"valid": False, "errors": errors}
        
        return {"valid": True, "message": f"Blockchain is valid ({len(self.blockchain)} blocks)"}
    
    def tamper_block(self, block_number: int) -> dict:
        if block_number >= len(self.blockchain):
            raise ValueError("Block not found")
        
        block = self.blockchain[block_number]
        old_hash = block.block_hash
        block.block_data = block.block_data + " [TAMPERED]"
        
        from blockchain import sha256
        block.block_hash = sha256(block.block_data)
        
        return {
            "message": f"Block {block_number} tampered! Hash changed from {old_hash[:20]}... to {block.block_hash[:20]}..."
        }
    
    def get_all_clients(self) -> List[dict]:
        # Return balances dynamically to the frontend tracker panels
        return [{
            "name": name, 
            "identity": client.identity[:20] + "..." if hasattr(client, 'identity') else str(client),
            "balance": self.get_balance(name)
        } for name, client in self.clients.items()]
    
    def get_pending_transactions(self) -> List[dict]:
        # Extract gas_fee via object attribute lookup safely using getattr()
        return [{
            "sender": t.sender.identity[:20] + "..." if hasattr(t.sender, 'identity') else str(t.sender),
            "recipient": t.recipient.identity[:20] + "..." if hasattr(t.recipient, 'identity') else str(t.recipient),
            "value": t.value,
            "gas_fee": getattr(t, 'gas_fee', 0.0),
            "time": t.time
        } for t in self.pending_transactions]
    
    def reset(self) -> dict:
        self.clients.clear()
        self.balances.clear()
        self.transactions.clear()
        self.blockchain.clear()
        self.pending_transactions.clear()
        return {"message": "Blockchain reset successfully"}