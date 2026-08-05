import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Layout from "./Layout";
import NuevaAsignacion from "./Views-Nat/AsignacionNueva";
import AuditoriaList from "./Views-Nat/AuditoriaList";
import DevolucionFirma from "./Views-Nat/DevolucionFirma";
import LogsActividad from "./Views-Nat/LogsActividad";
import MantenimientoBitacora from "./Views-Nat/MantenimientoBitacora";
import MantenimientoEquipos from "./Views-Nat/MantenimientoEquipos";
import Reportes from "./Views-Nat/Reportes";
import ResguardoFirma from "./Views-Nat/ResguardoFirma";
import Login from "./Views-Rubi/Login";
import Dashboard from "./Views-Rubi/Dashboard";
import Proveedores from "./Views-Rubi/Proveedores";
import Colaboradores from "./Views-Rubi/Colaboradores";
import ListadoEquipos from "./Views-Rubi/ListadoEquipos";
import EquipoAlta from "./Views-Rubi/EquipoAlta";
import EquipoFichaTecnica from "./Views-Rubi/EquipoFichaTecnica";
import Configuracion from "./Views-Rubi/Configuracion";
import ConfiguracionSistema from "./Views-Rubi/ConfiguracionSistema";
import { loadStoredUser } from "./utils/userProfile";

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
  ConfiguracionSistema: "/configuracion/sistema",
};

function activeNavFromPath(pathname) {
  if (pathname.startsWith("/proveedores")) return "Proveedores";
  if (pathname.startsWith("/colaboradores")) return "Colaboradores";
  if (pathname.startsWith("/equipos")) return "Equipos";
  if (pathname.startsWith("/configuracion/sistema")) return "ConfiguracionSistema";
  if (pathname.startsWith("/configuracion")) return "Configuracion";
  return "Dashboard";
}

function AppLayoutRoute({ children }) {
  const location = useLocation();

  return (
    <Layout activeNav={activeNavFromPath(location.pathname)}>
      <div className="rubi-content min-w-0 max-w-full">
        {children}
      </div>
    </Layout>
  );
}

function AdminRoute({ children }) {
  return loadStoredUser()?.rol === "admin"
    ? children
    : <Navigate to="/dashboard" replace />;
}

function NataliaFlow({ initialScreen = "asignacion" }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(initialScreen);
  const [resguardo, setResguardo] = useState(null);
  const [resguardosPorColaborador, setResguardosPorColaborador] = useState({});
  const [asignacionInicial, setAsignacionInicial] = useState(null);
  const [assignmentSessionKey, setAssignmentSessionKey] = useState(0);
  const [devolucionInicial, setDevolucionInicial] = useState(null);
  const [maintenanceEquipo, setMaintenanceEquipo] = useState(null);

  const handleCreateResguardo = (payload) => {
    const colaboradorId = payload.colaborador?.id || payload.colaborador?.numero || "sin-colaborador";
    const currentResguardoId = resguardo?.colaborador?.id || resguardo?.colaborador?.numero;
    const existing =
      resguardosPorColaborador[colaboradorId] ||
      (String(currentResguardoId) === String(colaboradorId) ? resguardo : null);
    const currentItem = {
      ...(payload.item || {
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
      }),
      isOriginal: false,
      isNew: true,
    };
    const previousItems = existing?.items || [];
    const hasItem = previousItems.some((item) => (
      item.key === currentItem.key ||
      (Number.isFinite(Number(item.id)) && Number(item.id) === Number(currentItem.id))
    ));
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

  const handleAddResguardoItem = (currentResguardo = resguardo) => {
    if (currentResguardo) {
      const colaboradorId =
        currentResguardo.colaborador?.id || currentResguardo.colaborador?.numero || "sin-colaborador";
      setResguardo(currentResguardo);
      setResguardosPorColaborador((previous) => ({
        ...previous,
        [colaboradorId]: currentResguardo,
      }));
    }
    setAsignacionInicial({
      mode: "add",
      colaborador: currentResguardo?.colaborador || null,
      step: currentResguardo?.colaborador ? 1 : 0,
    });
    setAssignmentSessionKey((current) => current + 1);
    setScreen("asignacion");
    navigate(natRoutes.Asignacion);
  };

  const handleBackFromAddAssignment = () => {
    setAsignacionInicial(null);
    setScreen("resguardo");
  };

  const handleOpenResguardoActivo = (nextResguardo) => {
    setResguardo({
      ...nextResguardo,
      persisted: true,
      items: (nextResguardo.items || []).map((item) => ({
        ...item,
        isOriginal: true,
        isNew: false,
      })),
    });
    setDevolucionInicial(null);
    setScreen("resguardo");
  };

  const handleOpenDevolucionActivo = async (nextResguardo, itemKeys) => {
    try {
      let idAsignacion = nextResguardo?.idAsignacion;
      let idResguardo = nextResguardo?.idResguardo || resguardo?.idResguardo;
      if (!idAsignacion && idResguardo) {
        const response = await fetch(`/api/resguardos/${idResguardo}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("scaet-token")}` },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.mensaje || "No se pudo abrir la devolucion");
        idAsignacion = payload.asignacion.id_asignacion;
      }
      if (!idAsignacion) throw new Error("No se encontro la asignacion para devolver");
      const groupedItems = nextResguardo?.items || [];
      const idAsignaciones = [...new Set([
        idAsignacion,
        ...(nextResguardo?.assignments || []).map((assignment) => assignment.idAsignacion),
        ...groupedItems.map((item) => item.idAsignacion),
      ].filter(Boolean))];
      if (nextResguardo?.idResguardo) setResguardo({ idResguardo: nextResguardo.idResguardo, persisted: true });
      setDevolucionInicial({
        idAsignacion,
        idAsignaciones,
        idResguardo,
        items: groupedItems,
        selectedItemKeys: itemKeys || groupedItems.map((item) => item.key),
      });
      setScreen("devolucion");
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleDevolucionSaved = () => {
    setDevolucionInicial(null);
    setResguardo(null);
    setScreen("asignacion");
  };

  const handleGenerateResguardo = async (data) => {
    const itemsToSave = data.persisted
      ? data.items.filter((item) => item.isNew || item.isOriginal === false)
      : data.items;

    if (data.persisted && itemsToSave.length === 0) {
      throw new Error("Agrega al menos un activo nuevo antes de generar el resguardo");
    }

    const response = await fetch("/api/asignaciones", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("scaet-token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_colaborador: data.colaborador.id,
        observaciones_generales: data.observaciones || "",
        activos: itemsToSave.map((item) => ({
          id_equipo: item.id,
          tipo_asignacion: item.tipoAsignacion.toLowerCase(),
          fecha_devolucion_programada: item.fechaDev || null,
          accesorios_entregados: item.accesorios || "",
          estado_fisico_entrega: item.estadoEntrega || "Buen estado",
          observaciones: item.observaciones || "",
        })),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.mensaje || "No se pudo generar el resguardo");
    setResguardosPorColaborador({});
    setAsignacionInicial(null);
    return result;
  };

  const handleBackFromResguardo = () => {
    setResguardo(null);
    setResguardosPorColaborador({});
    setAsignacionInicial(null);
    setScreen("asignacion");
  };
  const handleRemoveResguardoItem = (itemKey) => {
    if (!resguardo) return;

    const itemToRemove = (resguardo.items || []).find((item) => item.key === itemKey);
    if (!itemToRemove || itemToRemove.isOriginal || !itemToRemove.isNew) return;

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
      setResguardo(null);
      setResguardosPorColaborador({});
      setAsignacionInicial(null);
      setDevolucionInicial(null);
      setAssignmentSessionKey((current) => current + 1);
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
          key={assignmentSessionKey}
          addMode={asignacionInicial?.mode === "add"}
          initialColaborador={asignacionInicial?.colaborador}
          initialStep={asignacionInicial?.step}
          initialItems={asignacionInicial?.mode === "add" ? resguardo?.items || [] : []}
          asignacionesActivas={asignacionesActivas}
          onOpenResguardo={handleOpenResguardoActivo}
          onOpenDevolucion={handleOpenDevolucionActivo}
          onCreateResguardo={handleCreateResguardo}
          onBack={asignacionInicial ? handleBackFromAddAssignment : undefined}
        />
      );
    }

    if (screen === "resguardo") {
      return (
        <ResguardoFirma
          resguardo={resguardo}
          onBack={handleBackFromResguardo}
          onGoDevolucion={handleOpenDevolucionActivo}
          onAddItem={handleAddResguardoItem}
          onRemoveItem={handleRemoveResguardoItem}
          onGenerate={handleGenerateResguardo}
        />
      );
    }

    if (screen === "devolucion") {
      return (
        <DevolucionFirma
          devolucion={devolucionInicial}
          initialSelectedItemKeys={devolucionInicial?.selectedItemKeys}
          onBack={handleDevolucionSaved}
          onGoResguardo={() => setScreen("resguardo")}
          onSaved={handleDevolucionSaved}
        />
      );
    }

    if (screen === "mantenimiento") {
      return <MantenimientoEquipos onOpenBitacora={handleOpenBitacora} />;
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
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<AppLayoutRoute><Dashboard /></AppLayoutRoute>} />
        <Route path="/proveedores" element={<AppLayoutRoute><Proveedores /></AppLayoutRoute>} />
        <Route path="/colaboradores" element={<AppLayoutRoute><Colaboradores /></AppLayoutRoute>} />
        <Route path="/equipos" element={<AppLayoutRoute><ListadoEquipos /></AppLayoutRoute>} />
        <Route path="/equipos/alta" element={<AppLayoutRoute><EquipoAlta /></AppLayoutRoute>} />
        <Route path="/equipos/alta/:equipmentId" element={<AppLayoutRoute><EquipoAlta /></AppLayoutRoute>} />
        <Route path="/equipos/editar/:equipmentId" element={<AppLayoutRoute><EquipoAlta /></AppLayoutRoute>} />
        <Route path="/equipos/ficha/:equipmentId" element={<AppLayoutRoute><EquipoFichaTecnica /></AppLayoutRoute>} />
        <Route path="/equipos/qr/:qrToken" element={<AppLayoutRoute><EquipoFichaTecnica /></AppLayoutRoute>} />
        <Route path="/configuracion" element={<AppLayoutRoute><Configuracion /></AppLayoutRoute>} />
        <Route path="/configuracion/sistema" element={<AdminRoute><AppLayoutRoute><ConfiguracionSistema /></AppLayoutRoute></AdminRoute>} />
        <Route path="/asignacion" element={<NataliaFlow initialScreen="asignacion" />} />
        <Route path="/asignacion/mantenimiento" element={<NataliaFlow initialScreen="mantenimiento" />} />
        <Route path="/asignacion/reportes" element={<NataliaFlow initialScreen="reportes" />} />
        <Route path="/asignacion/logs" element={<AdminRoute><NataliaFlow initialScreen="logs" /></AdminRoute>} />
        <Route path="/asignacion/auditoria" element={<AdminRoute><NataliaFlow initialScreen="auditoria" /></AdminRoute>} />
        <Route path="/mantenimiento" element={<Navigate to="/asignacion/mantenimiento" replace />} />
        <Route path="/reportes" element={<Navigate to="/asignacion/reportes" replace />} />
        <Route path="/logs" element={<Navigate to="/asignacion/logs" replace />} />
        <Route path="/auditoria" element={<Navigate to="/asignacion/auditoria" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
