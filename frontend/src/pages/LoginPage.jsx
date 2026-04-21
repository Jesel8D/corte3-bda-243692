import { useState } from "react";
import { useNavigate } from "react-router-dom";

const USUARIOS = [
  { usuario: "vet_lopez", rol: "veterinario", vet_id: 1 },
  { usuario: "vet_garcia", rol: "veterinario", vet_id: 2 },
  { usuario: "vet_mendez", rol: "veterinario", vet_id: 3 },
  { usuario: "recep_ana", rol: "recepcion", vet_id: null },
  { usuario: "admin_clinica", rol: "administrador", vet_id: null }
];

export default function LoginPage() {
  const [selectedUser, setSelectedUser] = useState(USUARIOS[0]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const user = USUARIOS.find(u => u.usuario === e.target.value);
    setSelectedUser(user);
    setError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedUser)
      });
      
      if (!res.ok) throw new Error("Fallo al iniciar sesión / No autorizado");
      
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("rol", data.rol);
      // Validamos que sea numérico o que quede vacío para no grabar string nulos si es null
      if (data.vet_id) {
          localStorage.setItem("vet_id", data.vet_id);
      } else {
          localStorage.removeItem("vet_id");
      }
      
      navigate("/mascotas");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ background: "var(--amarillo)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <h1 style={{ fontSize: "48px", textAlign: "center", margin: 0 }}>🐾 VetSystem</h1>
        
        {error && (
          <div style={{ border: "2px solid var(--coral)", padding: "10px", background: "#FFF0F0", color: "var(--coral)", fontWeight: "bold" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <label style={{ fontWeight: 700, display: "block", marginBottom: 5 }}>Seleccionar Usuario:</label>
            <select value={selectedUser.usuario} onChange={handleChange} style={{ width: "100%", padding: "10px", fontSize: "16px" }}>
              {USUARIOS.map(u => (
                <option key={u.usuario} value={u.usuario}>
                  {u.usuario} ({u.rol})
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ background: "var(--gris)", padding: "10px", border: "2px solid var(--negro)" }}>
            <p style={{ margin: "5px 0" }}><strong>Rol auto-rellenado:</strong> {selectedUser.rol}</p>
            <p style={{ margin: "5px 0" }}><strong>Vet ID:</strong> {selectedUser.vet_id || 'N/A'}</p>
          </div>
          
          <button type="submit" style={{ fontSize: "18px", marginTop: "10px", width: "100%" }}>LOGIN</button>
        </form>
      </div>
    </div>
  );
}
