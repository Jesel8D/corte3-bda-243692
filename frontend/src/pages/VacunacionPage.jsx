import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

export default function VacunacionPage() {
  const [mascotas, setMascotas] = useState([]);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [form, setForm] = useState({ mascota_id: "", vacuna_id: "", costo: "" });
  
  const token = localStorage.getItem("token");
  const vet_id = localStorage.getItem("vet_id");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8000/vacunas/vacunacion-pendiente", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setCacheStatus(res.headers.get("X-Cache-Status"));
        const data = await res.json();
        setMascotas(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAplicar = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        mascota_id: parseInt(form.mascota_id),
        vacuna_id: parseInt(form.vacuna_id),
        // Proveemos fallback 1 si el usuario logueado es recepcionista y no tiene vet_id
        veterinario_id: vet_id ? parseInt(vet_id) : 1, 
        costo_cobrado: parseFloat(form.costo)
      };

      const res = await fetch("http://localhost:8000/vacunas", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setForm({ mascota_id: "", vacuna_id: "", costo: "" });
        loadData(); // Recarga automáticamente y debe marcar CACHE MISS según lógica backend
      } else {
        const errorData = await res.json();
        alert(`❌ ALERTA DE SEGURIDAD ❌\n\n${errorData.detail || "Error interno de servidor"}`);
      }
    } catch (err) {
      console.error("Fallo al aplicar vacuna:", err);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <header className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Vacunación Pendiente</h2>
        <Link to="/mascotas" style={{
            background: "var(--blanco)",
            color: "var(--negro)",
            textDecoration: "none",
            border: "3px solid var(--negro)",
            padding: "8px 16px",
            fontWeight: "bold",
            boxShadow: "4px 4px 0 var(--negro)"
        }}>
            Volver a Mascotas
        </Link>
      </header>

      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--blanco)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <h3>Estado de Caché:</h3>
          {cacheStatus === "HIT" && (
            <span style={{ background: "#4CAF50", color: "var(--blanco)", padding: "8px 16px", border: "3px solid var(--negro)", fontWeight: "bold" }}>
              ⚡ CACHE HIT
            </span>
          )}
          {cacheStatus === "MISS" && (
            <span style={{ background: "var(--coral)", color: "var(--negro)", padding: "8px 16px", border: "3px solid var(--negro)", fontWeight: "bold" }}>
              🔄 CACHE MISS
            </span>
          )}
        </div>
        <button onClick={loadData}>CARGAR / REFRESCAR LISTA</button>
      </div>

      <div className="card" style={{ background: "var(--gris)" }}>
        <h3>Aplicar Vacuna</h3>
        <p style={{ margin: "10px 0 20px" }}>
          Al enviar, se invalidará la caché inmediatamente (Delete-on-write).
        </p>
        <form onSubmit={handleAplicar} style={{ display: "flex", gap: "15px", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontWeight: 700 }}>Mascota ID</label>
            <input type="number" required value={form.mascota_id} onChange={e => setForm({...form, mascota_id: e.target.value})} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontWeight: 700 }}>Vacuna ID (1-6)</label>
            <input type="number" min="1" max="6" required value={form.vacuna_id} onChange={e => setForm({...form, vacuna_id: e.target.value})} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", flexGrow: 1 }}>
            <label style={{ fontWeight: 700 }}>Costo ($)</label>
            <input type="number" step="0.01" required value={form.costo} onChange={e => setForm({...form, costo: e.target.value})} />
          </div>
          <button type="submit" style={{ background: "var(--azul)", color: "var(--blanco)" }}>APLICAR VACUNA</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Mascota</th>
              <th>Especie</th>
              <th>Dueño</th>
              <th>Última Vacuna</th>
              <th>Días sin vacunar</th>
            </tr>
          </thead>
          <tbody>
            {mascotas.map(m => (
              <tr key={m.id}>
                <td><strong>#{m.id}</strong> {m.nombre}</td>
                <td>{m.especie}</td>
                <td>{m.dueno}</td>
                <td>{m.ultima_vacuna ? new Date(m.ultima_vacuna).toLocaleDateString() : <span style={{color: 'var(--coral)', fontWeight: 'bold'}}>NUNCA</span>}</td>
                <td>
                  {m.dias_sin_vacuna !== null && m.dias_sin_vacuna !== undefined 
                    ? <strong>{m.dias_sin_vacuna}</strong> 
                    : 'N/A'
                  }
                </td>
              </tr>
            ))}
            {mascotas.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>No hay registros de vacunación pendientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
