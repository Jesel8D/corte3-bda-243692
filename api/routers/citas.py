from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime
from api.db import get_connection
from api.dependencies import get_current_user_data

router = APIRouter()

class CitaCreate(BaseModel):
    mascota_id: int
    veterinario_id: int
    fecha_hora: datetime
    motivo: str

@router.post("")
async def agendar_cita(cita: CitaCreate, user_data: tuple = Depends(get_current_user_data)):
    db_user, vet_id = user_data
    
    async with get_connection(db_user, vet_id) as conn:
        # sp_agendar_cita es un PROCEDURE (no función), se invoca con CALL.
        # El NULL es el placeholder del parámetro OUT p_cita_id.
        # asyncpg retorna las columnas OUT como resultado de fetchrow.
        # HARDENED: todos los parámetros son posicionales ($1-$4), nunca concatenados.
        query = "CALL sp_agendar_cita($1, $2, $3, $4, NULL)"
        row = await conn.fetchrow(query, cita.mascota_id, cita.veterinario_id, cita.fecha_hora, cita.motivo)
        
        return {"cita_id": dict(row)["p_cita_id"] if row else None}
