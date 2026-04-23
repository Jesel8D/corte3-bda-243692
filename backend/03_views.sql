-- 03_views.sql

-- =========================================================================
-- Vista: v_mascotas_vacunacion_pendiente
-- =========================================================================
-- Explicación del manejo de NULL en esta vista:
-- 1. En la condición de filtrado (HAVING): Se añadió `MAX(va.fecha_aplicacion) IS NULL`.
--    Debido a que utilizamos un LEFT JOIN entre 'mascotas' y 'vacunas_aplicadas',
--    aquellas mascotas que nunca han recibido una vacuna no tendrán registros en la 
--    tabla de aplicadas, y por lo tanto `MAX(va.fecha_aplicacion)` retornará NULL. 
--    Esta validación se asegura de incluirlas como prioritarias para vacunación.
-- 2. En el ordenamiento (ORDER BY): Se empleó `NULLS FIRST`. Porque cuando la
--    última vacuna es NULL, el cálculo de `CURRENT_DATE - MAX(va.fecha_aplicacion)`
--    también resulta en NULL. Usando `NULLS FIRST` forzamos a que estos registros 
--    (mascotas nunca vacunadas) aparezcan en la parte superior de la lista, ya que
--    son los casos de mayor prioridad o urgencia.
-- =========================================================================
CREATE OR REPLACE VIEW v_mascotas_vacunacion_pendiente AS
SELECT 
    m.id, 
    m.nombre, 
    m.especie,
    d.nombre AS dueno,
    MAX(va.fecha_aplicacion) AS ultima_vacuna,
    CURRENT_DATE - MAX(va.fecha_aplicacion) AS dias_sin_vacuna
FROM mascotas m
JOIN duenos d ON d.id = m.dueno_id
LEFT JOIN vacunas_aplicadas va ON va.mascota_id = m.id
GROUP BY m.id, m.nombre, m.especie, d.nombre
HAVING MAX(va.fecha_aplicacion) < CURRENT_DATE - INTERVAL '1 year'
    OR MAX(va.fecha_aplicacion) IS NULL
ORDER BY dias_sin_vacuna DESC NULLS FIRST;
