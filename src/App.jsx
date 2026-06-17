import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./views-rubi/Login";
import Register from "./views-rubi/Register";
import Dashboard from "./views-rubi/Dashboard";
import Proveedores from "./views-rubi/Proveedores";
import Colaboradores from "./views-rubi/Colaboradores";
import ListadoEquipos from "./views-rubi/ListadoEquipos";
import EquipoAlta from "./views-rubi/EquipoAlta";
import EquipoFichaTecnica from "./views-rubi/EquipoFichaTecnica";
import Configuracion from "./views-rubi/Configuracion";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="/colaboradores" element={<Colaboradores />} />
        <Route path="/equipos" element={<ListadoEquipos />} />
        <Route path="/equipos/alta" element={<EquipoAlta />} />
        <Route path="/equipos/alta/:equipmentId" element={<EquipoAlta />} />
        <Route path="/equipos/ficha/:equipmentId" element={<EquipoFichaTecnica />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
