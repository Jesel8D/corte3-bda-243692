import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function MascotasPage() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const navigate = useNavigate();
  
  const token = localStorage.getItem("token");
  const rol = localStorage.getItem("rol");
  // Extraemos el username aproximado del token simulado
  const username = token ? atob(token).split(":")[0] : "Desconocido";
  
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleBuscar = async () => {
    try {
      // IMPORTANTE: Dejando esta inyección vulnerable en frontend de forma intencional 
      // (sin url-encode ni sanitización) para probar el hardening en el Backend
      const res = await fetch(`http://localhost:8000/mascotas?q=${query}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResultados(data);
      }
    } catch (e) {
      console.error("Error buscando mascotas:", e);
    }
  };

  const getBadgeColor = () => {
    if (rol === "veterinario") return "var(--azul)";
    if (rol === "recepcion") return "var(--amarillo)";
    if (rol === "administrador") return "var(--coral)";
    return "var(--gris)";
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <header className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Buscar Mascotas</h2>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <span style={{ 
            background: getBadgeColor(), 
            color: rol === "veterinario" ? "white" : "var(--negro)", 
            padding: "8px 16px", 
            border: "3px solid var(--negro)",
            fontWeight: "bold",
            display: "inline-block"
          }}>
            {username.toUpperCase()} | ROL: {rol?.toUpperCase()}
          </span>
          <Link to="/vacunacion" style={{
            background: "var(--blanco)",
            color: "var(--negro)",
            textDecoration: "none",
            border: "3px solid var(--negro)",
            padding: "8px 16px",
            fontWeight: "bold",
            boxShadow: "4px 4px 0 var(--negro)"
          }}>
            Ver Vacunación
          </Link>
          <button onClick={handleLogout} style={{ padding: "8px 16px", fontSize: "14px", background: "var(--coral)", color: "white" }}>
            CERRAR SESIÓN
          </button>
        </div>
      </header>

      <div className="card" style={{ display: "flex", gap: "10px" }}>
        <input 
          type="text" 
          placeholder="Buscar mascota por nombre o especie..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flexGrow: 1, fontSize: "18px" }}
        />
        <button onClick={handleBuscar} style={{ background: "var(--azul)", color: "white" }}>BUSCAR</button>
      </div>

      <div className="card">
        <p style={{ fontWeight: "bold", marginBottom: "15px", borderLeft: "5px solid var(--amarillo)", paddingLeft: "10px", lineHeight: "1.5" }}>
          Los resultados se filtran según tu rol (RLS activo).
        </p>
        
        {resultados.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Especie</th>
                <th>Dueño</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map(m => (
                <tr key={m.id}>
                  <td><strong>#{m.id}</strong></td>
                  <td>{m.nombre}</td>
                  <td>{m.especie}</td>
                  <td>{m.dueno}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ marginTop: "10px" }}>No hay resultados que mostrar. Intenta buscar de nuevo.</p>
        )}
      </div>
    </div>
  );
}
