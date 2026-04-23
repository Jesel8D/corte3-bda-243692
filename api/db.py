import asyncpg
from contextlib import asynccontextmanager
import os

pool = None

async def create_pool():
    global pool
    # Lee DATABASE_URL del entorno (docker-compose.yml la inyecta).
    # Fallback a localhost para desarrollo sin Docker.
    db_url = os.environ.get("DATABASE_URL", "postgresql://localhost/clinica_vet")
    pool = await asyncpg.create_pool(db_url)

async def close_pool():
    global pool
    if pool:
        await pool.close()

allowed_users = {'vet_lopez', 'vet_garcia', 'vet_mendez', 'recep_ana', 'admin_clinica'}

@asynccontextmanager
async def get_connection(db_user: str, vet_id: int | None = None):
    # Validamos que db_user sea de los permitidos para evitar SQLi en SET ROLE
    if db_user not in allowed_users:
        raise ValueError("Rol de base de datos no permitido")
        
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Cambiamos al rol mapeado (para que apliquen las políticas RLS)
            # HARDENED: db_user está estrictamente validado localmente arriba
            await conn.execute(f'SET LOCAL ROLE "{db_user}"')
            
            if vet_id is not None:
                # SET LOCAL no soporta parámetros $1 en PostgreSQL (no pasa por
                # el protocolo de prepared statements). Solución segura: forzar
                # cast a int() antes de formatear — si vet_id no es un entero
                # válido, int() lanza ValueError y la request falla limpiamente.
                # El vet_id ya fue validado como int en dependencies.py línea 15.
                await conn.execute(f"SET LOCAL \"app.current_vet_id\" = '{int(vet_id)}'")
            
            try:
                yield conn
            finally:
                pass # Al estar en transacción local, la limpieza se hace sola, aunque un pool acquire limpia en asyncpg a menos que sea a nivel sesión
