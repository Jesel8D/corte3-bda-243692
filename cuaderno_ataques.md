# Cuaderno de Ataques — Clínica Veterinaria
**Corte 3 BDA · Matrícula: 243692**

---

## Sección 1: Tres ataques de SQL Injection que fallan

### Ataque 1 — Quote-escape clásico

**Input exacto probado:** `' OR '1'='1`

**Pantalla:** `MascotasPage` — campo de búsqueda libre (buscador de mascotas)

**¿Qué intentaba hacer el ataque?**
Inyectar una condición siempre verdadera (`'1'='1`) para que la cláusula `WHERE` se saltara y la query devolviera TODAS las mascotas de la base de datos, ignorando los filtros RLS del rol actual.

**¿Qué pasó al intentarlo?**
La API devolvió una lista vacía o solo las mascotas que el rol tiene permiso de ver (filtradas por RLS), NO todas las mascotas de la BD. El input fue tratado como texto literal de búsqueda por nombre/especie.

![Ataque 1](./capturas/Ataque%201.png)

**Línea exacta que defendió el ataque:**

```python
# api/routers/mascotas.py — línea 20
records = await conn.fetch(query, f"%{q}%")
```

El driver `asyncpg` separa estructuralmente el SQL del valor del parámetro. El texto `' OR '1'='1` se envía como el valor del parámetro posicional `$1` en formato binario de protocolo PostgreSQL, nunca se interpola dentro del string SQL. PostgreSQL lo recibe como un valor literal de texto a comparar con `ILIKE`, no como código SQL ejecutable.

---

### Ataque 2 — Stacked query (multi-sentencia)

**Input exacto probado:** `'; DROP TABLE mascotas; --`

**Pantalla:** `MascotasPage` — campo de búsqueda libre

**¿Qué intentaba hacer el ataque?**
Cerrar el string actual con `'`, terminar la sentencia con `;`, e inyectar una segunda sentencia `DROP TABLE mascotas` para destruir la tabla completa. El `--` comenta el resto del SQL original para evitar errores de sintaxis.

**¿Qué pasó al intentarlo?**
La API retornó una lista vacía (ninguna mascota se llama `'; DROP TABLE mascotas; --`). La tabla `mascotas` NO fue borrada. La segunda sentencia nunca se ejecutó.

![Ataque 2](./capturas/Ataque%202.png)

**Línea exacta que defendió el ataque:**

```python
# api/routers/mascotas.py — línea 20
records = await conn.fetch(query, f"%{q}%")
```

`asyncpg` usa el protocolo extendido de PostgreSQL, que envía la query y los parámetros en mensajes separados. PostgreSQL parsea el SQL **antes** de conocer los valores de los parámetros — es literalmente imposible que un valor de parámetro introduzca nueva sintaxis SQL o sentencias adicionales. El driver además no soporta múltiples sentencias en una sola llamada a `fetch()`.

---

### Ataque 3 — Union-based injection

**Input exacto probado:** `' UNION SELECT id, nombre, especie, dueno_id FROM mascotas; --`

**Pantalla:** `MascotasPage` — campo de búsqueda libre

**¿Qué intentaba hacer el ataque?**
Agregar un `UNION SELECT` al query original para extraer todas las columnas de `mascotas` (o cualquier otra tabla sensible), saltando los filtros RLS y obteniendo más datos de los permitidos.

**¿Qué pasó al intentarlo?**
La API devolvió lista vacía. El `UNION SELECT...` fue tratado como texto literal de búsqueda ILIKE, no como SQL. La query resultante para PostgreSQL fue: buscar mascotas cuyo nombre o especie contenga literalmente el string `' UNION SELECT...`.

![Ataque 3](./capturas/Ataque%203.png)

**Línea exacta que defendió el ataque:**

```python
# api/routers/mascotas.py — línea 20
records = await conn.fetch(query, f"%{q}%")
```

Misma defensa que los ataques anteriores: parametrización mediante `asyncpg`. El valor del parámetro `$1` nunca puede ampliar el `SELECT` con un `UNION` porque el plan de ejecución ya está fijado cuando PostgreSQL recibe el valor.

---

## Sección 2: Demostración de RLS en acción

**Setup:** Dos veterinarios distintos con mascotas asignadas diferentes (datos del `schema_corte3.sql`):
- **Dr. López** → `vet_id = 1` → tiene asignadas: Firulais, Toby, Max (u otras según schema)
- **Dra. García** → `vet_id = 2` → tiene asignadas: Misifú, Luna, Dante (u otras según schema)

Ambos ejecutaron la misma acción: iniciar sesión en su respectivo usuario y buscar mascotas con el campo vacío (traer todas).

---

**Veterinario 1 — Dr. López (`vet_lopez`) busca todas las mascotas:**

![Vet 1 — vet_lopez](./capturas/Vet%201%20—%20vet_lopez.png)

---

**Veterinario 2 — Dra. García (`vet_garcia`) busca todas las mascotas:**

![Vet 2 — vet_garcia](./capturas/Vet%202%20—%20vet_garcia.png)

---

**Política RLS que produce este comportamiento:**

```sql
-- backend/05_rls.sql
CREATE POLICY pol_vet_mascotas ON mascotas
FOR SELECT TO rol_veterinario
USING (
    id IN (
        SELECT mascota_id FROM vet_atiende_mascota
        WHERE vet_id = current_setting('app.current_vet_id', true)::INT
          AND activa = TRUE
    )
);
```

Cuando un veterinario ejecuta `SELECT` sobre `mascotas`, PostgreSQL evalúa automáticamente esta política por cada fila. Solo devuelve las filas donde el `id` de la mascota aparece en `vet_atiende_mascota` para el `vet_id` configurado en la variable de sesión `app.current_vet_id`. Como esa variable se configura en el backend al inicio de cada conexión (`SET LOCAL app.current_vet_id = $1` en `api/db.py` línea 34), cada veterinario queda aislado a sus propias mascotas sin importar qué query ejecute.

---

## Sección 3: Demostración de caché Redis funcionando

**Key utilizada:** `vacunacion_pendiente`

**TTL:** `300` segundos (5 minutos)

**Justificación del TTL:** La consulta a `v_mascotas_vacunacion_pendiente` tarda aproximadamente 150–300ms (LEFT JOIN entre mascotas, duenos y vacunas_aplicadas con agregación). Bajo carga normal (~50 requests/hora), un TTL de 5 minutos permite atender ~250 requests sirviendo el resultado cacheado, reduciendo la carga real a la BD a ~12 queries/hora. Valor demasiado bajo (<30s): el caché no llega a amortizarse. Valor demasiado alto (>30min): una mascota recién vacunada seguiría apareciendo como "pendiente" por media hora, generando riesgo clínico de doble vacunación.

**Estrategia de invalidación:** Delete-on-write. Cuando se registra una vacuna nueva (`POST /vacunas`), el backend elimina inmediatamente la key del caché (línea 68 de `api/routers/vacunas.py`). La próxima consulta forzará un MISS y reconstruirá el caché desde BD con datos actualizados.

---

**Logs con timestamps del ciclo completo:**

### 1. Primera consulta — CACHE MISS (la key no existe aún)
![Sección 3.1 Front](./capturas/SECCION%203.1-FRONT.png)
![Sección 3.1 Logs](./capturas/SECCION%203.1-LOGS.png)

### 2. Segunda consulta inmediata — CACHE HIT (≤20ms de latencia)
![Sección 3.2](./capturas/SECCION%203.2.png)

### 3. POST /vacunas y Tercera consulta — CACHE MISS de nuevo
![Sección 3.3 Front](./capturas/SECCION%203.3-FRONT.png)
![Sección 3.3 Logs](./capturas/SECCION%203.3-LOGS.png)

**Logs terminal completos:**
```log
2026-04-23 05:03:06,371 [CACHE INVALIDATED] vacunacion_pendiente
INFO:     172.23.0.1:41954 - "POST /vacunas HTTP/1.1" 200 OK
2026-04-23 05:03:06,376 [CACHE MISS] vacunacion_pendiente | consultando BD
2026-04-23 05:03:06,379 [CACHE SET] vacunacion_pendiente | 3ms
INFO:     172.23.0.1:41954 - "GET /vacunas/vacunacion-pendiente HTTP/1.1" 200 OK
```

