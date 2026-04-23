-- 01_procedures.sql

-- =========================================================================
-- 1. sp_agendar_cita
-- =========================================================================
-- Comentario sobre SECURITY DEFINER:
-- Se utiliza SECURITY DEFINER para que el procedure se ejecute con los privilegios
-- del usuario que lo creó (por ejemplo, un administrador o un rol con mayores permisos). 
-- Esto permite que usuarios o roles con menores privilegios puedan ejecutar el procedure 
-- y agendar citas, pero sin necesidad de tener el permiso INSERT directo sobre la 
-- tabla 'citas', lo que refuerza la seguridad y el encapsulamiento de la lógica.
-- Adicionalmente, se usa SET search_path = public de manera obligatoria con 
-- SECURITY DEFINER para prevenir vulnerabilidades (por ejemplo, que un usuario 
-- malicioso cambie el search_path local para sobreescribir funciones llamadas).
-- =========================================================================
CREATE OR REPLACE PROCEDURE sp_agendar_cita(
    p_mascota_id     INT,
    p_veterinario_id INT,
    p_fecha_hora     TIMESTAMP,
    p_motivo         TEXT,
    OUT p_cita_id    INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_mascota_exists BOOLEAN;
    v_vet_activo BOOLEAN;
    v_conflicto BOOLEAN;
BEGIN
    -- Validar existencia de la mascota
    SELECT EXISTS (SELECT 1 FROM mascotas WHERE id = p_mascota_id) 
    INTO v_mascota_exists;
    
    IF NOT v_mascota_exists THEN
        RAISE EXCEPTION 'Mascota con ID % no existe.', p_mascota_id;
    END IF;

    -- Validar que el veterinario existe y esté activo
    SELECT activo INTO v_vet_activo 
    FROM veterinarios 
    WHERE id = p_veterinario_id;

    IF v_vet_activo IS NULL OR NOT v_vet_activo THEN
        RAISE EXCEPTION 'El veterinario con ID % no existe o no está activo.', p_veterinario_id;
    END IF;

    -- Verificar que no haya una cita AGENDADA del mismo veterinario a la misma hora exacta
    SELECT EXISTS (
        SELECT 1 FROM citas 
        WHERE veterinario_id = p_veterinario_id 
          AND fecha_hora = p_fecha_hora 
          AND estado = 'AGENDADA'
    ) INTO v_conflicto;

    IF v_conflicto THEN
        RAISE EXCEPTION 'Conflicto: El veterinario ya tiene una cita AGENDADA para la fecha y hora proporcionadas.';
    END IF;

    -- Insertar la nueva cita
    INSERT INTO citas (mascota_id, veterinario_id, fecha_hora, motivo, estado)
    VALUES (p_mascota_id, p_veterinario_id, p_fecha_hora, p_motivo, 'AGENDADA')
    RETURNING id INTO p_cita_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Relanzar cualquier otra excepción no manejada
        RAISE;
END;
$$;


-- =========================================================================
-- 2. fn_total_facturado
-- =========================================================================
-- Comentario sobre el manejo de NULL:
-- Se utiliza la función COALESCE(..., 0) porque si no existen citas con
-- estado 'COMPLETADA' para la mascota y el año evaluados, la función agregada
-- SUM() retornará NULL. Usando COALESCE transformamos ese posible NULL en 0, 
-- garantizando que siempre se retorne un monto total consistente de forma numérica.
-- =========================================================================
CREATE OR REPLACE FUNCTION fn_total_facturado(p_mascota_id INT, p_anio INT) 
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(costo), 0)
    INTO v_total
    FROM citas
    WHERE mascota_id = p_mascota_id
      AND EXTRACT(YEAR FROM fecha_hora) = p_anio
      AND estado = 'COMPLETADA';

    RETURN v_total;
END;
$$;
