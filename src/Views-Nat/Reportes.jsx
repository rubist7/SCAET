import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, FileArchive, Pencil, X } from "lucide-react";

const FIELD_OPTIONS = ["Tag", "Tipo", "Marca", "Modelo", "Serie", "Estado", "Gar.Tipo", "Gar.Fin", "Ubicacion", "Costo", "Asignado", "Proveedor"];
const RESGUARDO_FIELDS = ["Tipo de documento", "Colaborador", "N\u00famero de colaborador", "Fecha", "Equipo", "Identificador", "Cantidad de equipos", "Tipo de asignaci\u00f3n", "Estado"];
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

function escapeHtml(value) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exportFileName(source) {
  const safeSource = String(source || "reporte").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  return `reporte_${safeSource || "reporte"}_${date}.xls`;
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

function mapResguardo(item) {
  const equipos = Array.isArray(item.equipos) ? item.equipos : [];
  const primerEquipo = equipos[0];
  const equiposAdicionales = Math.max(equipos.length - 1, 0);
  return {
    id: String(item.id_resguardo),
    "Tipo de documento": item.tipo_documento || "-",
    Colaborador: item.nombre_colaborador_snapshot || "-",
    "N\u00famero de colaborador": item.num_colaborador_snapshot || "-",
    Fecha: fechaCorta(item.fecha_documento),
    Equipo: (primerEquipo?.nombre_equipo || "-") + (equiposAdicionales ? ` + ${equiposAdicionales} m\u00e1s` : ""),
    Identificador: primerEquipo?.codigo_equipo || "-",
    "Cantidad de equipos": Number(item.cantidad_equipos || 0),
    "Tipo de asignaci\u00f3n": item.tipo_asignacion || "-",
    Estado: item.estado || "-",
    _title: "Detalle del resguardo",
    _tipoDocumento: item.tipo_documento,
    _equipos: equipos,
    _source: "Resguardos",
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
            <h2 className="mt-2 text-lg font-black text-[#21192c] dark:text-white">{record._title || record.Tag}</h2></div>
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
          {record._source === "Resguardos" ? <div className="mt-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#9e95aa]">Equipos</p>
            <div className="space-y-2">
              {record._equipos.map((equipo) => <div key={equipo.id_detalle}
                className="rounded-[10px] border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
                <p className="text-sm font-black text-[#21192c] dark:text-white">{equipo.nombre_equipo || "Equipo"}</p>
                <p className="mt-1 text-xs text-[#6f6584] dark:text-gray-300">{equipo.codigo_equipo || "Sin identificador"}</p>
                <p className="mt-2 text-xs text-[#887e96]">{[equipo.tipo_equipo, equipo.marca, equipo.modelo].filter(Boolean).join(" · ") || "-"}</p>
                <p className="mt-1 text-xs text-[#887e96]">Serie: {equipo.numero_serie || "-"} · {equipo.tipo_asignacion || "-"}</p>
              </div>)}
              {!record._equipos.length ? <p className="text-sm text-[#9e95aa]">No hay equipos asociados.</p> : null}
            </div>
          </div> : null}
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
  const [detailRecord, setDetailRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState("");

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [equiposData, proveedoresData, mantenimientoData, resguardosData] = await Promise.all([
        apiRequest("/equipos?estado=todos"),
        apiRequest("/proveedores?estado=todos"),
        apiRequest("/mantenimientos"),
        apiRequest("/resguardos"),
      ]);
      setRowsBySource({
        Inventario: (equiposData.equipos || []).map(mapEquipo),
        Proveedores: (proveedoresData.proveedores || []).map(mapProveedor),
        Mantenimiento: (mantenimientoData.mantenimientos || []).map(mapMantenimiento),
        Resguardos: (resguardosData.resguardos || []).map(mapResguardo),
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
    if (source === "Inventario") {
      if (filter === "Ocultos / Bajas") return sourceRows.filter((row) => !row._activo || row._estado === "baja");
      if (filter === "Todos") return sourceRows.filter((row) => row._activo && row._estado !== "baja");
      const expected = { Asignado: "asignado", Disponible: "disponible", Mantenimiento: "mantenimiento" }[filter];
      return sourceRows.filter((row) => row._activo && row._estado === expected);
    }
    if (source === "Proveedores") {
      return sourceRows.filter((row) => filter === "Ocultos" ? !row._activo : row._activo);
    }
    if (source === "Resguardos") {
      if (filter === "Todos") return sourceRows;
      const expected = { "Asignación": "asignacion", "Devolución": "devolucion" }[filter];
      return sourceRows.filter((row) => row._tipoDocumento === expected);
    }
    if (filter === "Todos") return sourceRows;
    if (source === "Mantenimiento") {
      const expected = { "En proceso": "en_proceso", Resueltos: "resuelto", Cancelados: "cancelado" }[filter];
      return sourceRows.filter((row) => row._estado === expected);
    }
    return sourceRows;
  }, [filter, rowsBySource, source]);

  const toggleField = (field) => setActiveFields((current) =>
    current.includes(field) ? current.filter((item) => item !== field) : [...current, field]);
  const fieldOptions = source === "Resguardos" ? RESGUARDO_FIELDS : FIELD_OPTIONS;
  const selectedColumns = activeFields.length ? activeFields : source === "Resguardos" ? RESGUARDO_FIELDS : ["Tag", "Tipo", "Marca", "Modelo", "Estado"];
  const allFieldsSelected = activeFields.length === fieldOptions.length;
  const exportTitle = `Reporte de ${source}`;
  const exportSubtitle = `Filtro: ${filter} · Registros: ${rows.length}`;

  const handlePrint = () => {
    window.print();
  };

  const handleExcelExport = () => {
    const tableRows = rows.map((row) => `<tr>${selectedColumns.map((column) =>
      `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("");
    const headerRow = selectedColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <style>body{font-family:Arial,sans-serif;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #d9d9d9;padding:8px;text-align:left;}th{background:#eaf4ff;font-weight:700;}h1{font-size:20px;margin-bottom:4px;}p{margin-top:0;color:#555;}</style>
      </head><body><h1>${escapeHtml(exportTitle)}</h1><p>${escapeHtml(exportSubtitle)}</p><table><thead><tr>${headerRow}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(source);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

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

  return <div className="space-y-4">
    <style>{`
      .reportes-printable { display: none; }
      @page {
        size: letter landscape;
        margin: 12mm;
      }
      @media print {
        body * { visibility: hidden; }
        .reportes-screen { display: none !important; }
        .reportes-printable, .reportes-printable * { visibility: visible; }
        .reportes-printable { display: block; position: static; width: 100%; color: #111827; background: #ffffff; font-family: Arial, sans-serif; }
        .reportes-printable table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 9px; line-height: 1.25; }
        .reportes-printable th, .reportes-printable td { border: 1px solid #d1d5db; padding: 3px 4px; text-align: left; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
        .reportes-printable th { background: #eaf4ff; font-weight: 700; }
        .reportes-printable h1 { margin: 0 0 3px; font-size: 16px; }
        .reportes-printable p { margin: 0 0 8px; color: #4b5563; font-size: 10px; }
      }
    `}</style>
    <div className="reportes-printable" aria-hidden="true">
      <h1>{exportTitle}</h1>
      <p>{exportSubtitle}</p>
      <table>
        <thead><tr>{selectedColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => <tr key={source + "-print-" + row.id}>
            {selectedColumns.map((column) => <td key={column}>{row[column] ?? "-"}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
    <section className="reportes-screen rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">{"Generador din\u00e1mico de consultas"}</p>
      <h2 className="mt-3 text-lg font-black text-[#21192c] dark:text-white sm:text-xl">Reportes</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PillSelect label="Fuente" value={source} onChange={(value) => { setSource(value); setFilter("Todos"); setActiveFields([]); }}
          options={Object.keys(SOURCE_CONFIG)} />
        <PillSelect label="Filtro" value={filter} onChange={setFilter} options={SOURCE_CONFIG[source].filters} />
      </div>
      <div className="mt-5">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">Campos</p>
          <label className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold text-[#6f6584]">
            <input type="checkbox" checked={allFieldsSelected}
              onChange={() => setActiveFields(allFieldsSelected ? [] : fieldOptions)}
              className="h-4 w-4 accent-blue-600" />Seleccionar todos
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {fieldOptions.map((field) => {
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

    <div className="reportes-screen flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-mono text-xs font-bold text-[#887e96]">{rows.length} reg.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handlePrint}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-blue-600 px-4 text-xs font-black text-white">
          <FileArchive size={15} />PDF imprimible
        </button>
        <button type="button" onClick={handleExcelExport}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-cyan-600 px-4 text-xs font-black text-white">
          <FileArchive size={15} />Exportar Excel (.xls)
        </button>
      </div>
    </div>

    <section className="reportes-screen rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-5">
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.26em] text-blue-300">Resultados</p>
      {loading ? <div className="px-4 py-10 text-center text-sm font-semibold text-[#9e95aa]">Cargando datos...</div> :
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
              {!["Mantenimiento", "Resguardos"].includes(source) ? <button type="button" onClick={() => handleEdit(row)}
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
    </section>
    <div className="reportes-screen"><DetailModal record={detailRecord} onClose={() => setDetailRecord(null)} /></div>
  </div>;
}
