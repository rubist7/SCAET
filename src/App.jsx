import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Layout from "./Layout";
import NuevaAsignacion from "./Views-Nat/AsignacionNueva";
import AuditoriaList from "./Views-Nat/AuditoriaList";
import DevolucionFirma from "./Views-Nat/DevolucionFirma";
import LogsActividad from "./Views-Nat/LogsActividad";
import MantenimientoBitacora from "./Views-Nat/MantenimientoBitacora";
import MantenimientoEquipos from "./Views-Nat/MantenimientoEquipos";
import { bitacoraInicial } from "./Views-Nat/mantenimientoData";
import Reportes from "./Views-Nat/Reportes";
import ResguardoFirma from "./Views-Nat/ResguardoFirma";
import Login from "./Views-Rubi/Login";
import Register from "./Views-Rubi/Register";
import Dashboard from "./Views-Rubi/Dashboard";
import Proveedores from "./Views-Rubi/Proveedores";
import Colaboradores from "./Views-Rubi/Colaboradores";
import ListadoEquipos from "./Views-Rubi/ListadoEquipos";
import EquipoAlta from "./Views-Rubi/EquipoAlta";
import EquipoFichaTecnica from "./Views-Rubi/EquipoFichaTecnica";
import Configuracion from "./Views-Rubi/Configuracion";

const natRoutes = {
  Asignacion: "/asignacion",
  Mantenimiento: "/asignacion/mantenimiento",
  Reportes: "/asignacion/reportes",
  Logs: "/asignacion/logs",
  Auditoria: "/asignacion/auditoria",
};

const appRoutes = {
  Dashboard: "/dashboard",
  Proveedores: "/proveedores",
  Colaboradores: "/colaboradores",
  Equipos: "/equipos",
  Configuracion: "/configuracion",
};

function activeNavFromPath(pathname) {
  if (pathname.startsWith("/proveedores")) return "Proveedores";
  if (pathname.startsWith("/colaboradores")) return "Colaboradores";
  if (pathname.startsWith("/equipos")) return "Equipos";
  if (pathname.startsWith("/configuracion")) return "Configuracion";
  return "Dashboard";
}

function AppLayoutRoute({ children }) {
  const location = useLocation();

  return (
    <Layout activeNav={activeNavFromPath(location.pathname)}>
      <div className="rubi-content">
        {children}
      </div>
    </Layout>
  );
}

function NataliaFlow({ initialScreen = "asignacion" }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(initialScreen);
  const [resguardo, setResguardo] = useState(null);
  const [resguardosPorColaborador, setResguardosPorColaborador] = useState({});
  const [asignacionInicial, setAsignacionInicial] = useState(null);
  const [devolucionInicial, setDevolucionInicial] = useState(null);
  const [maintenanceEquipo, setMaintenanceEquipo] = useState(null);
  const [maintenanceEntries, setMaintenanceEntries] = useState(bitacoraInicial);

  const handleCreateResguardo = (payload) => {
    const colaboradorId = payload.colaborador?.id || payload.colaborador?.numero || "sin-colaborador";
    const existing = resguardosPorColaborador[colaboradorId];
    const currentItem = payload.item || {
      key: `${payload.tipoResguardo || "equipo"}-${payload.activoInventario || payload.equipo?.codigo || "actual"}`,
      tipoResguardo: payload.tipoResguardo || "equipo",
      tipoLabel: payload.tipoResguardo || "Equipo tecnologico",
      codigo: payload.activoInventario || payload.equipo?.codigo,
      nombre: payload.equipo?.nombre || "Activo asignado",
      tipoActivo: payload.equipo?.tipo,
      marca: payload.equipo?.marca,
      modelo: payload.equipo?.modelo,
      serie: payload.equipo?.serie,
      fechaAsignacion: payload.fecha,
      tipoAsignacion: payload.tipo,
      fechaDev: payload.fechaDev,
    };
    const previousItems = existing?.items || [];
    const hasItem = previousItems.some((item) => item.key === currentItem.key);
    const items = hasItem ? previousItems : [...previousItems, currentItem];
    const nextResguardo = {
      ...existing,
      ...payload,
      items,
    };

    setResguardosPorColaborador((previous) => ({
      ...previous,
      [colaboradorId]: nextResguardo,
    }));
    setAsignacionInicial(null);
    setDevolucionInicial(null);
    setResguardo(nextResguardo);
    setScreen("resguardo");
  };

  const asignacionesActivas = Object.values(resguardosPorColaborador);

  const resguardoFromSingleItem = (current, item) => ({
    ...current,
    tipoResguardo: item.tipoResguardo,
    tipo: item.tipoAsignacion || current.tipo,
    fechaDev: item.fechaDev || "",
    activoInventario: item.codigo || "",
    equipo: {
      ...(current.equipo || {}),
      codigo: item.codigo || current.equipo?.codigo,
      nombre: item.nombre || current.equipo?.nombre,
      tipo: item.tipoActivo || current.equipo?.tipo,
      marca: item.marca || current.equipo?.marca,
      modelo: item.modelo || current.equipo?.modelo,
      serie: item.serie || current.equipo?.serie,
      proveedor: item.proveedor || current.equipo?.proveedor,
    },
    idTarjeta: item.tipoResguardo === "tarjeta" ? item.codigo : current.idTarjeta,
    fechaEntregaTarjeta: item.tipoResguardo === "tarjeta" ? item.fechaAsignacion : current.fechaEntregaTarjeta,
    yubikey: item.tipoResguardo === "yubikey" ? item.nombre : current.yubikey,
    serieYubikey: item.tipoResguardo === "yubikey" ? item.serie : current.serieYubikey,
    modeloYubikey: item.tipoResguardo === "yubikey" ? item.modelo : current.modeloYubikey,
  });

  const handleAddResguardoItem = () => {
    setAsignacionInicial({
      colaborador: resguardo?.colaborador || null,
      step: resguardo?.colaborador ? 1 : 0,
    });
    setScreen("asignacion");
    navigate(natRoutes.Asignacion);
  };

  const handleOpenResguardoActivo = (nextResguardo) => {
    setResguardo(nextResguardo);
    setDevolucionInicial(null);
    setScreen("resguardo");
  };

  const handleOpenDevolucionActivo = (nextResguardo, itemKeys) => {
    setResguardo(nextResguardo);
    setDevolucionInicial({ selectedItemKeys: itemKeys || nextResguardo.items?.map((item) => item.key) });
    setScreen("devolucion");
  };

  const handleRemoveResguardoItem = (itemKey) => {
    if (!resguardo) return;

    const colaboradorId = resguardo.colaborador?.id || resguardo.colaborador?.numero || "sin-colaborador";
    const nextItems = (resguardo.items || []).filter((item) => item.key !== itemKey);

    if (nextItems.length === 0) {
      setResguardosPorColaborador((previous) => {
        const next = { ...previous };
        delete next[colaboradorId];
        return next;
      });
      setResguardo(null);
      setAsignacionInicial(null);
      setScreen("asignacion");
      navigate(natRoutes.Asignacion);
      return;
    }

    const nextResguardo =
      nextItems.length === 1
        ? resguardoFromSingleItem({ ...resguardo, items: nextItems }, nextItems[0])
        : { ...resguardo, items: nextItems };

    setResguardosPorColaborador((previous) => ({
      ...previous,
      [colaboradorId]: nextResguardo,
    }));
    setResguardo(nextResguardo);
  };

  const handleNavigate = (label) => {
    if (appRoutes[label]) {
      navigate(appRoutes[label]);
      return;
    }

    if (label === "Asignacion") {
      setAsignacionInicial(null);
      setScreen("asignacion");
    }
    if (label === "Mantenimiento") setScreen("mantenimiento");
    if (label === "Reportes") setScreen("reportes");
    if (label === "Logs") setScreen("logs");
    if (label === "Auditoria") setScreen("auditoria");

    if (natRoutes[label]) {
      navigate(natRoutes[label]);
    }
  };

  const handleOpenBitacora = (equipo) => {
    setMaintenanceEquipo(equipo);
    setScreen("mantenimiento-bitacora");
  };

  const handleAddMaintenanceEntry = (entry) => {
    setMaintenanceEntries((current) => [entry, ...current]);
  };

  const activeNav =
    screen === "logs"
      ? "Logs"
      : screen === "auditoria"
        ? "Auditoria"
        : screen === "reportes"
          ? "Reportes"
          : screen.startsWith("mantenimiento")
            ? "Mantenimiento"
            : "Asignacion";

  const renderScreen = () => {
    if (screen === "asignacion") {
      return (
        <NuevaAsignacion
          initialColaborador={asignacionInicial?.colaborador}
          initialStep={asignacionInicial?.step}
          asignacionesActivas={asignacionesActivas}
          onOpenResguardo={handleOpenResguardoActivo}
          onOpenDevolucion={handleOpenDevolucionActivo}
          onCreateResguardo={handleCreateResguardo}
        />
      );
    }

    if (screen === "resguardo") {
      return (
        <ResguardoFirma
          resguardo={resguardo}
          onBack={() => setScreen("asignacion")}
          onGoDevolucion={() => setScreen("devolucion")}
          onAddItem={handleAddResguardoItem}
          onRemoveItem={handleRemoveResguardoItem}
        />
      );
    }

    if (screen === "devolucion") {
      return (
        <DevolucionFirma
          devolucion={resguardo}
          initialSelectedItemKeys={devolucionInicial?.selectedItemKeys}
          onBack={() => setScreen("asignacion")}
          onGoResguardo={() => setScreen("resguardo")}
        />
      );
    }

    if (screen === "mantenimiento") {
      return <MantenimientoEquipos entries={maintenanceEntries} onOpenBitacora={handleOpenBitacora} />;
    }

    if (screen === "reportes") {
      return <Reportes />;
    }

    if (screen === "logs") {
      return <LogsActividad />;
    }

    if (screen === "auditoria") {
      return <AuditoriaList />;
    }

    return (
      <MantenimientoBitacora
        equipo={maintenanceEquipo}
        onBack={() => setScreen("mantenimiento")}
        onAddEntry={handleAddMaintenanceEntry}
      />
    );
  };

  return (
    <Layout activeNav={activeNav} onNavigate={handleNavigate}>
      {renderScreen()}
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<AppLayoutRoute><Dashboard /></AppLayoutRoute>} />
        <Route path="/proveedores" element={<AppLayoutRoute><Proveedores /></AppLayoutRoute>} />
        <Route path="/colaboradores" element={<AppLayoutRoute><Colaboradores /></AppLayoutRoute>} />
        <Route path="/equipos" element={<AppLayoutRoute><ListadoEquipos /></AppLayoutRoute>} />
        <Route path="/equipos/alta" element={<AppLayoutRoute><EquipoAlta /></AppLayoutRoute>} />
        <Route path="/equipos/alta/:equipmentId" element={<AppLayoutRoute><EquipoAlta /></AppLayoutRoute>} />
        <Route path="/equipos/editar/:equipmentId" element={<AppLayoutRoute><EquipoAlta /></AppLayoutRoute>} />
        <Route path="/equipos/ficha/:equipmentId" element={<AppLayoutRoute><EquipoFichaTecnica /></AppLayoutRoute>} />
        <Route path="/configuracion" element={<AppLayoutRoute><Configuracion /></AppLayoutRoute>} />
        <Route path="/asignacion" element={<NataliaFlow initialScreen="asignacion" />} />
        <Route path="/asignacion/mantenimiento" element={<NataliaFlow initialScreen="mantenimiento" />} />
        <Route path="/asignacion/reportes" element={<NataliaFlow initialScreen="reportes" />} />
        <Route path="/asignacion/logs" element={<NataliaFlow initialScreen="logs" />} />
        <Route path="/asignacion/auditoria" element={<NataliaFlow initialScreen="auditoria" />} />
        <Route path="/mantenimiento" element={<Navigate to="/asignacion/mantenimiento" replace />} />
        <Route path="/reportes" element={<Navigate to="/asignacion/reportes" replace />} />
        <Route path="/logs" element={<Navigate to="/asignacion/logs" replace />} />
        <Route path="/auditoria" element={<Navigate to="/asignacion/auditoria" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
