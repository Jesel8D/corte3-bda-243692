FROM python:3.11-slim

# El contexto de build es ./api (ver docker-compose.yml build: ./api)
# Los archivos se copian directamente en /app/
# Para que "from api.db import ..." funcione, subimos un nivel y copiamos
# el directorio api/ completo dentro de /app/
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código dentro de una carpeta "api/" para que el paquete sea importable
COPY . ./api/

EXPOSE 8000
# Ahora uvicorn puede encontrar api.main:app y los imports from api.XXX funcionan
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
