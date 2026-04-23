import logging
import os
import redis.asyncio as redis

# Configurar logger con formato que incluye timestamp
logging.basicConfig(format="%(asctime)s %(message)s", level=logging.INFO)
logger = logging.getLogger("api_cache")

# Lee REDIS_URL del entorno (docker-compose.yml la inyecta).
# Fallback a localhost para desarrollo sin Docker.
_redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
redis_client = redis.from_url(_redis_url, decode_responses=False)

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
