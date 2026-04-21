-- 02_triggers.sql

-- =========================================================================
-- Función del Trigger: trg_fn_historial_cita
-- =========================================================================
CREATE OR REPLACE FUNCTION trg_fn_historial_cita()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO historial_movimientos (tipo, referencia_id, descripcion, fecha)
    VALUES (
        'CITA_AGENDADA',
        NEW.id,
        'Cita agendada para mascota ' || NEW.mascota_id || 
        ' con vet ' || NEW.veterinario_id || 
        ' el ' || NEW.fecha_hora,
        NOW()
    );
    
    RETURN NEW;
END;
$$;

-- =========================================================================
-- Trigger: trg_historial_cita
-- =========================================================================
CREATE TRIGGER trg_historial_cita
AFTER INSERT ON citas
FOR EACH ROW
EXECUTE FUNCTION trg_fn_historial_cita();
