import asyncpg
from contextlib import asynccontextmanager
import os

pool = None

async def create_pool():
    global pool
    # Conectamos con un usuario genérico de la app o postgres, 
    # la db será clinica_vet
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
                # HARDENED: input parametrizado usando set_config en vez de SET LOCAL para soportar $1
                await conn.execute("SELECT set_config('app.current_vet_id', $1, true)", str(vet_id))
            
            try:
                yield conn
            finally:
                pass # Al estar en transacción local, la limpieza se hace sola, aunque un pool acquire limpia en asyncpg a menos que sea a nivel sesión
