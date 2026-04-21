import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MascotasPage from "./pages/MascotasPage";
import VacunacionPage from "./pages/VacunacionPage";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/mascotas" 
          element={
            <PrivateRoute>
              <MascotasPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/vacunacion" 
          element={
            <PrivateRoute>
              <VacunacionPage />
            </PrivateRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
