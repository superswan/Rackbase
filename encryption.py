import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Get encryption key from environment or generate one
# In production, this should be set via environment variable
MASTER_KEY = os.getenv('CREDENTIAL_MASTER_KEY', 'default-master-key-change-in-production')

def _get_fernet():
    """Get Fernet instance for encryption/decryption"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'inventory-system-salt',  # In production, use a random salt stored in DB
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(MASTER_KEY.encode()))
    return Fernet(key)

def encrypt_credential(value: str) -> str:
    """Encrypt a credential value"""
    if not value:
        return value
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()

def decrypt_credential(encrypted_value: str) -> str:
    """Decrypt a credential value"""
    if not encrypted_value:
        return encrypted_value
    try:
        f = _get_fernet()
        return f.decrypt(encrypted_value.encode()).decode()
    except Exception:
        return None
