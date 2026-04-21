from fastapi import Header, HTTPException
import base64
from typing import Optional, Tuple

def get_current_user_data(authorization: str = Header(...)) -> Tuple[str, Optional[int]]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Formato de token inválido")
    
    token = authorization.split(" ")[1]
    try:
        decoded = base64.b64decode(token).decode('utf-8')
        parts = decoded.split(':')
        if len(parts) >= 3:
            db_user = parts[0]
            vet_id = int(parts[2]) if parts[2] != "" else None
            return db_user, vet_id
        else:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=401, detail="Token malformado")
