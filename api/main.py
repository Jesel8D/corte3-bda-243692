from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.db import create_pool, close_pool

from api.routers import auth, mascotas, citas, vacunas

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializar pool asyncpg al arrancar
    await create_pool()
    yield
    # Limpieza general
    await close_pool()

app = FastAPI(lifespan=lifespan)

# Configuración de CORS permitiendo React app (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # expose_headers es necesario para que el browser permita que JS lea
    # headers de respuesta personalizados (X-Cache-Status).
    # Sin esto, res.headers.get("X-Cache-Status") retorna null aunque
    # el header esté presente en la respuesta HTTP.
    expose_headers=["X-Cache-Status"],
)

# Inclusión dinámica de Enrutadores
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(mascotas.router, prefix="/mascotas", tags=["mascotas"])
app.include_router(citas.router, prefix="/citas", tags=["citas"])
app.include_router(vacunas.router, prefix="/vacunas", tags=["vacunas"])
