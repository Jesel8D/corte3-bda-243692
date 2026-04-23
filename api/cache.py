import logging
import redis.asyncio as redis

# Configurar logger con formato que incluye timestamp
logging.basicConfig(format="%(asctime)s %(message)s", level=logging.INFO)
logger = logging.getLogger("api_cache")

import os

# Instancia del cliente de Redis (conectado a localhost o REDIS_URL)
redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
redis_client = redis.from_url(redis_url, decode_responses=False)

async def get_redis():
    """Dependency para inyectar el cliente Redis en FastAPI"""
    return redis_client

CACHE_KEY = "vacunacion_pendiente"

# 300s porque la consulta tarda ~200ms y se ejecuta ~50x/hora.
# Con 5min de TTL se sirven ~250 requests por query real.
# Demasiado bajo (<30s): no amortiza. 
# Demasiado alto (>30min): datos médicos desactualizados,
# riesgo clínico si se vacunó a una mascota recién.
CACHE_TTL = 300
