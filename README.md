# README — Decisiones de diseño
## Clínica Veterinaria · Corte 3 BDA · Matrícula: [INSERTAR MATRÍCULA AQUÍ]

### 1. Política RLS en tabla mascotas
Cláusula exacta:
```sql
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
Explicación: Esta política hace que cuando un veterinario ejecuta SELECT en mascotas, PostgreSQL filtra automáticamente las filas donde el id de la mascota NO aparece en vet_atiende_mascota para el vet_id actual de sesión. El `current_setting(..., true)` devuelve NULL en vez de error si la variable no está seteada.

### 2. Vector de ataque de la estrategia de identificación
La estrategia usada es `SET LOCAL app.current_vet_id`. El vector posible es que un usuario malicioso ejecute directamente en la BD `SET app.current_vet_id = '1'` para suplantar al Dr. López.
Mi sistema lo previene porque: Los roles de la base de datos están limitados en la exposición cruda en el frontend gracias a la arquitectura API. El endpoint se encarga de interceptar y validar si la Identity es válida y pertenece al usuario inyectado del listado original, sin brindar conexión de red psql al exterior asilando a PostgreSQL del exterior de la red privada inter-docker.

### 3. SECURITY DEFINER y search_path
En `sp_agendar_cita` usé `SECURITY DEFINER` con `SET search_path = public` para prevenir que un atacante cree objetos falsos en un schema con mayor prioridad en el search_path (trojan horse execution) y secuestre la ejecución del procedure asumiendo privilegios elevados de quien corrió el proc. 

### 4. TTL del caché Redis
Valor: 300 segundos (5 minutos).
Si fuera demasiado bajo (<30s): se anularía el beneficio del caché, la BD recibiría casi el mismo número de queries restando eficiencia asíncrona sobre requests pesados que ya habían sido decantados.
Si fuera demasiado alto (>30min): una mascota recién vacunada seguiría apareciendo como "pendiente" por media hora, generando errores graves al intentar agendamientos o dobles inyecciones irresponsables (riesgo clínico adverso).

### 5. Endpoint crítico y línea de defensa
Endpoint: `GET /mascotas?q={texto}`
Archivo: `api/routers/mascotas.py`, línea 20
Código: `await conn.fetch(query, f"%{q}%")`
Esta línea entrega el valor del usuario como parámetro `$1` al driver asyncpg, que lo envuelve y envía estrictamente separado de la estructura ejecutable del SQL en formato paramétrico. Protege contra quote-escape, stacked queries y union-based injection.

### 6. Si revoco todos los permisos del veterinario excepto SELECT mascotas
Tres operaciones que se romperían:
1. `POST /citas` fallaría: `sp_agendar_cita` hace `INSERT` en citas (en caso de que el constraint necesite validar localmente sobre invocación), que requiere acceso previo explícito a esa tabla base y secuencias (aun si usa Definer para rebasabilidad total de write, se romperia por permisos de las secuencias seriales del entorno al ser negadas globalmente).
2. `POST /vacunas` fallaría: requiere `INSERT` sobre la tabla `vacunas_aplicadas` globalmente limitando el permiso al usuario logeado.
3. `GET /vacunacion-pendiente` fallaría: la vista accede a las tablas de `duenos` y `vacunas_aplicadas`, lo que detonaría una infracción de dependencias al intentar cargar el LEFT JOIN si carece de `SELECT` para estas tablas contiguas.
