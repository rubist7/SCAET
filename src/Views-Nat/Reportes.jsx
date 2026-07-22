import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Eye, EyeOff, FileArchive, Pencil, X } from "lucide-react";

const FIELD_OPTIONS = ["Tag", "Tipo", "Marca", "Modelo", "Serie", "Estado", "Gar.Tipo", "Gar.Fin", "Ubicacion", "Costo", "Asignado", "Proveedor"];
const SOURCE_CONFIG = {
  Inventario: { filters: ["Todos", "Asignado", "Disponible", "Mantenimiento", "Ocultos / Bajas"] },
  Resguardos: { filters: ["Todos", "Asignaci\u00f3n", "Devoluci\u00f3n"] },
  Mantenimiento: { filters: ["Todos", "En proceso", "Resueltos", "Cancelados"] },
  Proveedores: { filters: ["Todos", "Activos", "Ocultos"] },
};

const authHeaders = (json = false) => ({
  Authorization: "Bearer " + localStorage.getItem("scaet-token"),
  ...(json ? { "Content-Type": "application/json" } : {}),
});

const estadoEquipo = {
  asignado: "Asignado",
  disponible: "Disponible",
  mantenimiento: "Mantenimiento",
  baja: "Baja",
};

const estadoMantenimiento = {
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cancelado: "Cancelado",
};

const tipoMantenimiento = {
  falla: "Falla",
  correctivo: "Correctivo",
  preventivo: "Preventivo",
};

function fechaCorta(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function moneda(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function mapEquipo(item) {
  return {
    id: String(item.id_equipo),
    Tag: item.codigo_equipo || "-",
    Tipo: item.tipo_equipo || "-",
    Marca: item.marca || "-",
    Modelo: item.modelo || item.nombre_equipo || "-",
    Serie: item.numero_serie || "-",
    Estado: estadoEquipo[item.estado] || item.estado || "-",
    "Gar.Tipo": item.garantia_meses != null ? String(item.garantia_meses) + " meses" : "-",
    "Gar.Fin": fechaCorta(item.vence_garantia),
    Ubicacion: "-",
    Costo: "-",
    Asignado: "-",
    Proveedor: item.nombre_proveedor || item.empresa || "-",
    _activo: Number(item.activo) === 1,
    _estado: item.estado,
    _source: "Inventario",
  };
}

function mapProveedor(item) {
  return {
    id: String(item.id_proveedor),
    Tag: "PRV-" + String(item.id_proveedor).padStart(4, "0"),
    Tipo: "Proveedor",
    Marca: item.empresa || "-",
    Modelo: item.nombre_proveedor || "-",
    Serie: item.rfc_empresa || "-",
    Estado: Number(item.activo) === 1 ? "Activo" : "Oculto",
    "Gar.Tipo": "-",
    "Gar.Fin": "-",
    Ubicacion: item.direccion || "-",
    Costo: "-",
    Asignado: item.nombre_vendedor || "-",
    Proveedor: item.nombre_proveedor || "-",
    _activo: Number(item.activo) === 1,
    _source: "Proveedores",
  };
}

function mapMantenimiento(item) {
  return {
    id: String(item.id_mantenimiento),
    Tag: "MTTO-" + String(item.id_mantenimiento).padStart(4, "0"),
    Tipo: tipoMantenimiento[item.tipo_mantenimiento] || item.tipo_mantenimiento || "-",
    Marca: item.marca || "-",
    Modelo: item.modelo || item.nombre_equipo || "-",
    Serie: item.numero_serie || "-",
    Estado: estadoMantenimiento[item.estado_mantenimiento] || item.estado_mantenimiento || "-",
    "Gar.Tipo": "-",
    "Gar.Fin": fechaCorta(item.fecha_mantenimiento),
    Ubicacion: item.nombre_colaborador_snapshot || "Sin usuario asignado",
    Costo: moneda(item.costo),
    Asignado: item.nombre_colaborador_snapshot || "-",
    Proveedor: item.proveedor_servicio || "-",
    _estado: item.estado_mantenimiento,
    _source: "Mantenimiento",
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch("/api" + path, {
    ...options,
    headers: { ...authHeaders(Boolean(options.body)), ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.mensaje || "No se pudo completar la solicitud");
  return data;
}

function PillSelect({ label, value, onChange, options }) {
  return <label className="block min-w-0">
    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-[8px] border border-gray-200 bg-gray-50 px-3 text-sm font-normal text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200 dark:focus:ring-blue-900/30">
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  </label>;
}

function ReportValue({ value }) {
  return <p className="mt-1 break-words text-sm font-normal text-[#21192c] dark:text-gray-100">{value ?? "-"}</p>;
}

function DetailModal({ record, onClose }) {
  if (!record) return null;
  const fields = Object.entries(record).filter(([key]) => key !== "id" && !key.startsWith("_"));
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-4 sm:p-4">
    <div className="mx-auto flex min-h-full w-full max-w-2xl items-start sm:items-center">
      <div className="max-h-[calc(100dvh-2rem)] w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#16131F]">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-800 sm:p-5">
          <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">Detalle del registro</p>
            <h2 className="mt-2 text-lg font-black text-[#21192c] dark:text-white">{record.Tag}</h2></div>
          <button type="button" onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"
            aria-label="Cerrar detalle"><X size={18} /></button>
        </div>
        <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([key, value]) => <div key={key} className="rounded-[10px] border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9e95aa]">{key}</p>
              <ReportValue value={value} />
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

export default function Reportes() {
  const navigate = useNavigate();
  const [source, setSource] = useState("Inventario");
  const [filter, setFilter] = useState("Todos");
  const [rowsBySource, setRowsBySource] = useState({ Inventario: [], Proveedores: [], Mantenimiento: [], Resguardos: [] });
  const [activeFields, setActiveFields] = useState([]);
  const [auditMode, setAuditMode] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState("");

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [equiposData, proveedoresData, mantenimientoData] = await Promise.all([
        apiRequest("/equipos?estado=todos"),
        apiRequest("/proveedores?estado=todos"),
        apiRequest("/mantenimientos"),
      ]);
      setRowsBySource({
        Inventario: (equiposData.equipos || []).map(mapEquipo),
        Proveedores: (proveedoresData.proveedores || []).map(mapProveedor),
        Mantenimiento: (mantenimientoData.mantenimientos || []).map(mapMantenimiento),
        Resguardos: [],
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(cargarDatos, 0);
    return () => window.clearTimeout(timer);
  }, [cargarDatos]);

  const rows = useMemo(() => {
    const sourceRows = rowsBySource[source] || [];
    if (filter === "Todos") return sourceRows;
    if (source === "Inventario") {
      if (filter === "Ocultos / Bajas") return sourceRows.filter((row) => !row._activo || row._estado === "baja");
      return sourceRows.filter((row) => row.Estado === filter);
    }
    if (source === "Proveedores") {
      return sourceRows.filter((row) => filter === "Activos" ? row._activo : !row._activo);
    }
    if (source === "Mantenimiento") {
      const expected = { "En proceso": "en_proceso", Resueltos: "resuelto", Cancelados: "cancelado" }[filter];
      return sourceRows.filter((row) => row._estado === expected);
    }
    return sourceRows;
  }, [filter, rowsBySource, source]);

  const toggleField = (field) => setActiveFields((current) =>
    current.includes(field) ? current.filter((item) => item !== field) : [...current, field]);
  const selectedColumns = activeFields.length ? activeFields : ["Tag", "Tipo", "Marca", "Modelo", "Estado"];
  const allFieldsSelected = activeFields.length === FIELD_OPTIONS.length;

  const handleEdit = (row) => {
    if (source === "Inventario") navigate("/equipos/editar/" + row.id, { state: { returnTo: "/asignacion/reportes", returnLabel: "Reportes" } });
    if (source === "Proveedores") navigate("/proveedores");
    if (source === "Mantenimiento") navigate("/asignacion/mantenimiento");
  };

  const handleVisibility = async (row) => {
    if (!["Inventario", "Proveedores"].includes(source)) return;
    setChangingId(row.id);
    setMessage("");
    try {
      const endpoint = source === "Inventario"
        ? "/equipos/" + row.id + "/estado"
        : "/proveedores/" + row.id + "/estado";
      await apiRequest(endpoint, {
        method: "PUT",
        body: JSON.stringify({ activo: row._activo ? 0 : 1 }),
      });
      await cargarDatos();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setChangingId(null);
    }
  };

  const pendingResguardos = source === "Resguardos";

  return <div className="space-y-4">
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">{"Generador din\u00e1mico de consultas"}</p>
      <h2 className="mt-3 text-lg font-black text-[#21192c] dark:text-white sm:text-xl">Reportes</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PillSelect label="Fuente" value={source} onChange={(value) => { setSource(value); setFilter("Todos"); }}
          options={Object.keys(SOURCE_CONFIG)} />
        <PillSelect label="Filtro" value={filter} onChange={setFilter} options={SOURCE_CONFIG[source].filters} />
      </div>
      <div className="mt-5">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">Campos</p>
          <label className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold text-[#6f6584]">
            <input type="checkbox" checked={allFieldsSelected}
              onChange={() => setActiveFields(allFieldsSelected ? [] : FIELD_OPTIONS)}
              className="h-4 w-4 accent-blue-600" />Seleccionar todos
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {FIELD_OPTIONS.map((field) => {
            const active = activeFields.includes(field);
            return <button key={field} type="button" onClick={() => toggleField(field)}
              className={"h-9 rounded-full border px-4 text-xs font-black transition " + (active
                ? "border-[#3A9AF2] bg-[#3A9AF2] text-[#FFFFFF] shadow-sm"
                : "border-gray-200 bg-gray-50 text-[#6f6584] hover:border-blue-300 hover:bg-blue-50/60")}>{field}</button>;
          })}
        </div>
      </div>
      {message ? <p className="mt-4 rounded-[8px] bg-red-50 p-3 text-sm font-bold text-red-500">{message}</p> : null}
    </section>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-mono text-xs font-bold text-[#887e96]">{rows.length} reg.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => window.alert("Exportaci\u00f3n pendiente de conectar")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-cyan-600 px-4 text-xs font-black text-white">
          <FileArchive size={15} />Exportar
        </button>
        <button type="button" onClick={() => setAuditMode((value) => !value)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-emerald-50 px-4 text-xs font-black text-emerald-600">
          <BarChart3 size={15} />{"An\u00e1lisis"}
        </button>
      </div>
    </div>

    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-5">
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.26em] text-blue-300">Resultados</p>
      {pendingResguardos ? <div className="rounded-[8px] border border-dashed border-[#ded6c8] px-4 py-10 text-center text-sm font-semibold text-[#9e95aa]">
        {"Reporte de resguardos pendiente de conexi\u00f3n."}
      </div> : loading ? <div className="px-4 py-10 text-center text-sm font-semibold text-[#9e95aa]">Cargando datos...</div> :
      <div className="space-y-2">
        {rows.map((row) => <article key={source + "-" + row.id}
          className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/30 dark:border-gray-700 dark:bg-gray-800/40">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {selectedColumns.map((column) => <div key={column}>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9e95aa]">{column}</p>
                <ReportValue value={row[column]} />
              </div>)}
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => setDetailRecord(row)}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-blue-50 px-3 text-xs font-black text-blue-600">
                <Eye size={13} />Ver
              </button>
              {source !== "Mantenimiento" ? <button type="button" onClick={() => handleEdit(row)}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-blue-50 px-3 text-xs font-black text-blue-600">
                <Pencil size={13} />Editar
              </button> : null}
              {["Inventario", "Proveedores"].includes(source) ? <button type="button"
                disabled={changingId === row.id} onClick={() => handleVisibility(row)}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-[#eee8dc] px-3 text-xs font-black text-[#6f6584] disabled:opacity-60">
                {row._activo ? <EyeOff size={13} /> : <Eye size={13} />}
                {row._activo ? "Ocultar" : "Restaurar"}
              </button> : null}
            </div>
          </div>
        </article>)}
        {!rows.length ? <div className="rounded-[8px] border border-dashed border-[#ded6c8] px-4 py-10 text-center text-sm font-semibold text-[#9e95aa]">
          No hay registros para este filtro.
        </div> : null}
      </div>}
      {auditMode ? <p className="mt-4 rounded-[8px] bg-emerald-50 p-3 text-xs font-normal text-emerald-700">{"An\u00e1lisis adicional activo."}</p> : null}
    </section>
    <DetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
  </div>;
}
