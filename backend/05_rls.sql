-- 05_rls.sql

-- =========================================================================
-- Habilitación de Row Level Security (RLS)
-- =========================================================================
-- El comando FORCE ROW LEVEL SECURITY asegura que la política aplique incluso
-- para el Table Owner y roles superusuario (que por defecto bypassan el RLS),
-- garantizando que la configuración se pruebe fielmente durante el desarrollo.
ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mascotas FORCE ROW LEVEL SECURITY;

ALTER TABLE vacunas_aplicadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacunas_aplicadas FORCE ROW LEVEL SECURITY;

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas FORCE ROW LEVEL SECURITY;

-- =========================================================================
-- Comentario sobre el uso de missing_ok (true) en current_setting
-- =========================================================================
-- El uso de current_setting('app.current_vet_id', true) con el segundo 
-- argumento en "true" es el parámetro "missing_ok". Permite que, en caso de que 
-- la sesión actual no haya definido esa variable (SET LOCAL ...), PostgreSQL 
-- retorne NULL en vez de lanzar una excepción que detendría la ejecución del query.
-- Esto hace que la Policy de seguridad sea robusta y devuelva vacío sin caerse.
-- =========================================================================


-- =========================================================================
-- Políticas RLS: mascotas
-- =========================================================================
CREATE POLICY pol_vet_mascotas ON mascotas
FOR SELECT TO rol_veterinario
USING (
    id IN (
        SELECT mascota_id FROM vet_atiende_mascota
        WHERE vet_id = current_setting('app.current_vet_id', true)::INT
          AND activa = TRUE
    )
);

CREATE POLICY pol_recep_mascotas ON mascotas
FOR SELECT TO rol_recepcion
USING (true);

CREATE POLICY pol_admin_mascotas ON mascotas
FOR ALL TO rol_administrador
USING (true)
WITH CHECK (true);


-- =========================================================================
-- Políticas RLS: vacunas_aplicadas
-- =========================================================================
CREATE POLICY pol_vet_vacunas ON vacunas_aplicadas
FOR ALL TO rol_veterinario
USING (
    mascota_id IN (
        SELECT mascota_id FROM vet_atiende_mascota
        WHERE vet_id = current_setting('app.current_vet_id', true)::INT
          AND activa = TRUE
    )
)
WITH CHECK (
    mascota_id IN (
        SELECT mascota_id FROM vet_atiende_mascota
        WHERE vet_id = current_setting('app.current_vet_id', true)::INT
          AND activa = TRUE
    )
);

CREATE POLICY pol_admin_vacunas ON vacunas_aplicadas
FOR ALL TO rol_administrador
USING (true)
WITH CHECK (true);


-- =========================================================================
-- Políticas RLS: citas
-- =========================================================================
CREATE POLICY pol_vet_citas ON citas
FOR ALL TO rol_veterinario
USING (
    veterinario_id = current_setting('app.current_vet_id', true)::INT
)
WITH CHECK (
    veterinario_id = current_setting('app.current_vet_id', true)::INT
);

CREATE POLICY pol_recep_citas_select ON citas
FOR SELECT TO rol_recepcion
USING (true);

CREATE POLICY pol_recep_citas_insert ON citas
FOR INSERT TO rol_recepcion
WITH CHECK (true);

CREATE POLICY pol_admin_citas ON citas
FOR ALL TO rol_administrador
USING (true)
WITH CHECK (true);
