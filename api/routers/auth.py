import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class LoginRequest(BaseModel):
    usuario: str
    rol: str
    vet_id: Optional[int] = None

@router.post("/login")
async def login(req: LoginRequest):
    # Verificación estática de usuarios admitidos a nivel backend
    allowed_users = {'vet_lopez', 'vet_garcia', 'vet_mendez', 'recep_ana', 'admin_clinica'}
    if req.usuario not in allowed_users:
        raise HTTPException(status_code=401, detail="Usuario no autorizado")

    db_user = req.usuario
    vet_id_str = str(req.vet_id) if req.vet_id is not None else ""
    
    raw_token = f"{db_user}:{req.rol}:{vet_id_str}"
    token = base64.b64encode(raw_token.encode('utf-8')).decode('utf-8')
    
    return {
        "token": token,
        "rol": req.rol,
        "vet_id": req.vet_id
    }
