from fastapi import APIRouter, Depends
from typing import Optional
from api.db import get_connection
from api.dependencies import get_current_user_data

router = APIRouter()

@router.get("")
async def buscar_mascotas(q: Optional[str] = "", user_data: tuple = Depends(get_current_user_data)):
    db_user, vet_id = user_data
    
    async with get_connection(db_user, vet_id) as conn:
        query = """
            SELECT m.id, m.nombre, m.especie, d.nombre AS dueno 
            FROM mascotas m 
            JOIN duenos d ON d.id = m.dueno_id
            WHERE m.nombre ILIKE $1 OR m.especie ILIKE $1
        """
        # HARDENED: input parametrizado
        records = await conn.fetch(query, f"%{q}%")
        return [dict(r) for r in records]

@router.get("/{id}")
async def obtener_mascota_por_id(id: int, user_data: tuple = Depends(get_current_user_data)):
    db_user, vet_id = user_data
    
    async with get_connection(db_user, vet_id) as conn:
        query = "SELECT * FROM mascotas WHERE id = $1"
        # HARDENED: input parametrizado
        record = await conn.fetchrow(query, id)
        return dict(record) if record else None
