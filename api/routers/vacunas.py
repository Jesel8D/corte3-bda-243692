import time
import json
import logging
from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel

from api.db import get_connection
from api.dependencies import get_current_user_data
from api.cache import get_redis, CACHE_KEY, CACHE_TTL, logger

router = APIRouter()

class VacunaCreate(BaseModel):
    mascota_id: int
    vacuna_id: int
    veterinario_id: int
    costo_cobrado: float

@router.get("/vacunacion-pendiente")
async def get_vacunacion_pendiente(
    response: Response,
    user_data: tuple = Depends(get_current_user_data),
    redis_client = Depends(get_redis)
):
    # Intentar traer datos de la caché (Paso 1 y 2)
    cached = await redis_client.get(CACHE_KEY)
    if cached:
        logger.info("[CACHE HIT] vacunacion_pendiente")
        response.headers["X-Cache-Status"] = "HIT"
        return json.loads(cached)

    # Si entra aquí es un CACHE MISS (Paso 3)
    db_user, vet_id = user_data
    t0 = time.time()
    logger.info("[CACHE MISS] vacunacion_pendiente | consultando BD")

    async with get_connection(db_user, vet_id) as conn:
        rows = await conn.fetch("SELECT * FROM v_mascotas_vacunacion_pendiente")
        data = [dict(r) for r in rows]

    # Insertar en Redis
    await redis_client.setex(CACHE_KEY, CACHE_TTL, json.dumps(data, default=str))

    latencia = (time.time() - t0) * 1000
    logger.info(f"[CACHE SET] vacunacion_pendiente | {latencia:.0f}ms")
    
    response.headers["X-Cache-Status"] = "MISS"
    return data

@router.post("")
async def aplicar_vacuna(
    vac: VacunaCreate, 
    user_data: tuple = Depends(get_current_user_data),
    redis_client = Depends(get_redis)
):
    db_user, vet_id = user_data
    
    async with get_connection(db_user, vet_id) as conn:
        query = """
            INSERT INTO vacunas_aplicadas (mascota_id, vacuna_id, veterinario_id, costo_cobrado)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        """
        # HARDENED: input parametrizado
        row = await conn.fetchrow(query, vac.mascota_id, vac.vacuna_id, vac.veterinario_id, vac.costo_cobrado)
        
    # Invalida la Caché para forzar la actualización inmediata en el siguiente GET
    await redis_client.delete(CACHE_KEY)
    logger.info("[CACHE INVALIDATED] vacunacion_pendiente")
    # Estrategia: delete-on-write. Se invalida inmediatamente
    # porque la vacuna recién aplicada debe reflejarse en la 
    # próxima consulta. No esperamos expiración natural (TTL)
    # porque los datos médicos deben ser consistentes.
        
    return {"id": dict(row)["id"] if row else None}
