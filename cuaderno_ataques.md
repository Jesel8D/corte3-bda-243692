## Sección 1: Ataques SQL injection que fallan

### Ataque 1 — Quote-escape clásico
Input exacto: `' OR '1'='1`
Pantalla: MascotasPage, campo de búsqueda
[INSERTAR SCREENSHOT del frontend mostrando el input]
[INSERTAR LOG o screenshot del error/respuesta vacía]
Línea que defendió: `api/routers/mascotas.py` línea 20
```python
await conn.fetch(query, f"%{q}%")  # HARDENED
```

### Ataque 2 — Stacked query
Input exacto: `'; DROP TABLE mascotas; --`
[INSERTAR SCREENSHOT]
[INSERTAR LOG]
Línea que defendió: `api/routers/mascotas.py` línea 20
```python
await conn.fetch(query, f"%{q}%")  # HARDENED
```

### Ataque 3 — Union-based
Input exacto: `' UNION SELECT id,nombre,email,dueno_id FROM duenos; --`
[INSERTAR SCREENSHOT]
[INSERTAR LOG]
Línea que defendió: `api/routers/mascotas.py` línea 20
```python
await conn.fetch(query, f"%{q}%")  # HARDENED
```

## Sección 2: RLS en acción

Setup: Dr. López (vet_id=1) y Dra. García (vet_id=2) logueados 
en sesiones separadas.

Veterinario 1 — Dr. López busca "":
  Espera ver: Firulais, Toby, Max (3 mascotas)
  [INSERTAR SCREENSHOT de la tabla]

Veterinario 2 — Dra. García busca "":
  Espera ver: Misifú, Luna, Dante (3 mascotas)
  [INSERTAR SCREENSHOT de la tabla]

Política que produce este comportamiento:
"pol_vet_mascotas filtra por vet_atiende_mascota.vet_id = current_setting('app.current_vet_id')::INT, entonces cada vet solo accede a las filas donde aparece su id."

## Sección 3: Caché Redis

[INSERTAR LOG con timestamps — formato esperado:]
2026-04-XX HH:MM:SS [CACHE MISS] vacunacion_pendiente | consultando BD
2026-04-XX HH:MM:SS [CACHE SET]  vacunacion_pendiente | 187ms
2026-04-XX HH:MM:SS [CACHE HIT]  vacunacion_pendiente
[POST /vacunas aplicando vacuna a mascota_id=5]
2026-04-XX HH:MM:SS [CACHE INVALIDATED] vacunacion_pendiente
2026-04-XX HH:MM:SS [CACHE MISS] vacunacion_pendiente | consultando BD

Key usada: "vacunacion_pendiente"
TTL: 300 segundos (5 minutos)
Justificación: Se implementaron 300 segundos porque la consulta a la base de datos toma ~200ms por cada operación individual (con JOIN complexes sobre la View) y se está solicitando aproximadamente ~50x por hora bajo carga. Un TTL de 5 minutos permite reciclar en crudo hasta 250 requests sirviendo el buffer instantáneo sin abrumar a las máquinas. Si asignas un valor diminuto (<30s) dejas a la función incapaz de amortizarse contra la Base de Datos al recalcular muy repetido los tiempos de latencia nativa, pero un valor demasiado alto (>30 mins) expone deudas clínicas y datos críticos del paciente para intervenciones que requieren sincronología severa, exponiendo a animales a una sobredosis de inyecciones por lectura antigua.
