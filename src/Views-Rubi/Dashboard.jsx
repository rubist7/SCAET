import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const authHeaders = () => ({
  Authorization: "Bearer " + localStorage.getItem("scaet-token"),
});

const cardStyles = [
  { key: "total", label: "Total equipos", color: "text-blue-500", bubble: "bg-blue-100" },
  { key: "asignado", label: "Asignados", color: "text-emerald-400", bubble: "bg-emerald-100" },
  { key: "disponible", label: "Disponibles", color: "text-blue-400", bubble: "bg-blue-100" },
  { key: "mantenimiento", label: "Mantenimiento", color: "text-amber-400", bubble: "bg-amber-100" },
  { key: "baja", label: "Bajas / Ocultos", color: "text-rose-400", bubble: "bg-rose-100" },
];

function fechaCorta(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function diasRestantes(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(String(value).slice(0, 10) + "T00:00:00");
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

async function apiRequest(path) {
  const response = await fetch("/api" + path, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.mensaje || "No se pudieron cargar los datos");
  return data;
}

function Dashboard() {
  const navigate = useNavigate();
  const [equipos, setEquipos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const cargarDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [equiposData, asignacionesData] = await Promise.all([
        apiRequest("/equipos?estado=todos"),
        apiRequest("/asignaciones/activas"),
      ]);
      setEquipos(equiposData.equipos || []);
      setAsignaciones(asignacionesData.asignaciones || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(cargarDashboard, 0);
    return () => window.clearTimeout(timer);
  }, [cargarDashboard]);

  const resumen = useMemo(() => ({
    total: equipos.length,
    asignado: equipos.filter((equipo) => Number(equipo.activo) === 1 && equipo.estado === "asignado").length,
    disponible: equipos.filter((equipo) => Number(equipo.activo) === 1 && equipo.estado === "disponible").length,
    mantenimiento: equipos.filter((equipo) => Number(equipo.activo) === 1 && equipo.estado === "mantenimiento").length,
    baja: equipos.filter((equipo) => Number(equipo.activo) === 0 || equipo.estado === "baja").length,
  }), [equipos]);

  const areaPorEquipoAsignado = useMemo(() => {
    const areas = new Map();
    asignaciones.forEach((asignacion) => {
      const areaReal = asignacion.colaborador?.area || asignacion.colaborador?.departamento || "";
      if (!areaReal) return;
      (asignacion.activos || []).forEach((activo) => {
        if (activo.id_equipo) areas.set(Number(activo.id_equipo), areaReal);
      });
    });
    return areas;
  }, [asignaciones]);

  const areaActualAsignada = (equipo) => {
    if (equipo.estado !== "asignado") return "-";
    return areaPorEquipoAsignado.get(Number(equipo.id_equipo)) || "-";
  };

  const ultimosEquipos = useMemo(() => [...equipos]
    .sort((a, b) => {
      const first = new Date(a.fecha_creacion || 0).getTime();
      const second = new Date(b.fecha_creacion || 0).getTime();
      return second - first;
    })
    .slice(0, 5), [equipos]);

  const temporales = useMemo(() => asignaciones.flatMap((asignacion) =>
    (asignacion.activos || [])
      .filter((activo) => activo.tipo_asignacion === "temporal" && activo.fecha_devolucion_programada)
      .map((activo) => ({
        id: activo.id_detalle,
        equipo: activo.nombre_equipo || activo.codigo_equipo || "-",
        colaborador: asignacion.colaborador?.nombre_completo || "-",
        vence: fechaCorta(activo.fecha_devolucion_programada),
        dias: diasRestantes(activo.fecha_devolucion_programada),
      }))
  ).filter((item) => item.dias !== null)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5), [asignaciones]);

  return <div className="space-y-8">
    <section className="space-y-5">
      <h1 className="text-2xl font-extrabold text-[#201d31] sm:text-3xl">Resumen General</h1>
      {message ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">{message}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cardStyles.map((card) => <article key={card.key}
          className="relative overflow-hidden rounded-[1.35rem] bg-white px-6 py-5 shadow-sm">
          <div className={"absolute -bottom-5 -right-5 h-20 w-20 rounded-full " + card.bubble} />
          <p className="text-xs font-extrabold text-blue-300">{card.label}</p>
          <p className={"mt-1 text-4xl font-extrabold leading-none " + card.color}>
            {loading ? "..." : resumen[card.key]}
          </p>
        </article>)}
      </div>
    </section>

    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-[#201d31]">{"\u00daltimos equipos registrados"}</h2>
        <button type="button" onClick={() => navigate("/equipos")}
          className="text-sm font-extrabold text-blue-500 hover:text-blue-600">Ver todos +</button>
      </div>
      <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-sm">
        <div className="hidden grid-cols-4 bg-[#eee7d9] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300 sm:grid">
          <span>Equipo</span><span>Marca / Modelo</span><span>{"\u00c1rea"}</span><span>Estado</span>
        </div>
        {ultimosEquipos.length ? <div className="divide-y divide-[#f1edf5]">
          {ultimosEquipos.map((equipo) => <div key={equipo.id_equipo}
            className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-4 sm:items-center">
            <div><p className="font-extrabold text-[#201d31]">{equipo.nombre_equipo || equipo.codigo_equipo}</p>
              <p className="text-xs font-bold text-[#8d88a2]">{equipo.codigo_equipo}</p></div>
            <p className="font-bold text-[#5d5870]">{equipo.marca || "-"} / {equipo.modelo || "-"}</p>
            <p className="font-bold text-[#8d88a2]">{areaActualAsignada(equipo)}</p>
            <p className="font-extrabold capitalize text-blue-500">{equipo.estado || "-"}</p>
          </div>)}
        </div> : <div className="flex min-h-28 items-center justify-center px-5 py-8 text-center">
          <p className="max-w-md text-sm font-bold text-[#8d88a2]">
            {loading ? "Cargando equipos..." : "A\u00fan no hay equipos registrados."}
          </p>
        </div>}
      </div>
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-extrabold text-[#201d31]">{"Asignaciones temporales pr\u00f3ximas a vencer"}</h2>
      <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-sm">
        <div className="hidden grid-cols-4 bg-[#eee7d9] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300 sm:grid">
          <span>Equipo</span><span>Colaborador</span><span>Vence</span><span>{"D\u00edas restantes"}</span>
        </div>
        {temporales.length ? <div className="divide-y divide-[#f1edf5]">
          {temporales.map((item) => <div key={item.id}
            className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-4 sm:items-center">
            <p className="font-extrabold text-[#201d31]">{item.equipo}</p>
            <p className="font-bold text-[#5d5870]">{item.colaborador}</p>
            <p className="font-bold text-[#8d88a2]">{item.vence}</p>
            <p className={"font-extrabold " + (item.dias < 0 ? "text-rose-500" : item.dias <= 7 ? "text-amber-500" : "text-blue-500")}>
              {item.dias < 0 ? "Vencida" : item.dias}
            </p>
          </div>)}
        </div> : <div className="flex min-h-28 items-center justify-center px-5 py-8 text-center">
          <p className="max-w-md text-sm font-bold text-[#8d88a2]">
            {loading ? "Cargando asignaciones..." : "No hay asignaciones temporales pr\u00f3ximas a vencer por ahora."}
          </p>
        </div>}
      </div>
    </section>
  </div>;
}

export default Dashboard;
