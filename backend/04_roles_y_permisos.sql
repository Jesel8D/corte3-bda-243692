-- 04_roles_y_permisos.sql

-- =========================================================================
-- 1. Creación de Roles de Grupo
-- =========================================================================
-- Borrar roles si existen (útil para pruebas)
DROP ROLE IF EXISTS rol_veterinario;
DROP ROLE IF EXISTS rol_recepcion;
DROP ROLE IF EXISTS rol_administrador;

CREATE ROLE rol_veterinario;
CREATE ROLE rol_recepcion;
CREATE ROLE rol_administrador;

-- =========================================================================
-- 2. Creación de Usuarios y Asignación de Roles
-- =========================================================================
-- Veterinarios
DROP USER IF EXISTS vet_lopez;
DROP USER IF EXISTS vet_garcia;
DROP USER IF EXISTS vet_mendez;

CREATE USER vet_lopez WITH PASSWORD 'pass123';
CREATE USER vet_garcia WITH PASSWORD 'pass123';
CREATE USER vet_mendez WITH PASSWORD 'pass123';

GRANT rol_veterinario TO vet_lopez;
GRANT rol_veterinario TO vet_garcia;
GRANT rol_veterinario TO vet_mendez;

-- Recepción
DROP USER IF EXISTS recep_ana;
CREATE USER recep_ana WITH PASSWORD 'pass123';
GRANT rol_recepcion TO recep_ana;

-- Administrador
DROP USER IF EXISTS admin_clinica;
CREATE USER admin_clinica WITH PASSWORD 'pass123';
GRANT rol_administrador TO admin_clinica;


-- =========================================================================
-- 3. Permisos Mínimos (Least Privilege)
-- =========================================================================

-- Permisos globales para el administrador
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rol_administrador;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rol_administrador;

-- Tabla: mascotas
GRANT SELECT ON mascotas TO rol_veterinario;
GRANT SELECT ON mascotas TO rol_recepcion;

-- Tabla: duenos
GRANT SELECT ON duenos TO rol_veterinario;
GRANT SELECT, UPDATE ON duenos TO rol_recepcion;

-- Tabla: citas
GRANT SELECT, INSERT ON citas TO rol_veterinario;
GRANT SELECT, INSERT ON citas TO rol_recepcion;
-- Concesión en las secuencias correspondientes para INSERT
GRANT USAGE, SELECT ON SEQUENCE citas_id_seq TO rol_veterinario;
GRANT USAGE, SELECT ON SEQUENCE citas_id_seq TO rol_recepcion;

-- Tabla: vacunas_aplicadas
GRANT SELECT, INSERT ON vacunas_aplicadas TO rol_veterinario;
-- Concesión en la secuencia
GRANT USAGE, SELECT ON SEQUENCE vacunas_aplicadas_id_seq TO rol_veterinario;

-- Tabla: inventario_vacunas
GRANT SELECT ON inventario_vacunas TO rol_veterinario;
GRANT SELECT ON inventario_vacunas TO rol_recepcion;

-- Tabla: vet_atiende_mascota
GRANT SELECT ON vet_atiende_mascota TO rol_veterinario;
GRANT SELECT ON vet_atiende_mascota TO rol_recepcion;

-- Tabla: historial_movimientos
GRANT SELECT ON historial_movimientos TO rol_veterinario;

-- Notas adicionales: 
-- rol_recepcion no tiene permisos sobre vacunas_aplicadas ni historial_movimientos.
-- Se asume el uso de secuencias estandar de tipo SERIAL.

-- Vistas
GRANT SELECT ON v_mascotas_vacunacion_pendiente TO rol_veterinario;
GRANT SELECT ON v_mascotas_vacunacion_pendiente TO rol_recepcion;
