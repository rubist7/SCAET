import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, Eye, FileArchive, Pencil, Trash2, X } from "lucide-react";
import { loadEquipments, normalizeText } from "../Views-Rubi/equiposData";

const FIELD_OPTIONS = ["Tag", "Tipo", "Marca", "Modelo", "Serie", "Estado", "Gar.Tipo", "Gar.Fin", "Ubicacion", "Costo", "Asignado", "Proveedor"];

const SOURCE_CONFIG = {
  Inventario: {
    filters: ["Todos", "Asignado", "Disponible", "Mantenimiento", "Baja"],
    rows: [
      {
        id: "EQ-001",
        Tag: "#001",
        Tipo: "Laptop",
        Marca: "Dell",
        Modelo: "XPS 15",
        Serie: "SN-4829Y047",
        Estado: "Asignado",
        "Gar.Tipo": "Extendida",
        "Gar.Fin": "10/01/2028",
        Ubicacion: "Recepcion",
        Costo: {
          equipo: "$28,900",
          mantenimientos: [
            { fecha: "12/03/2026", tipo: "Preventivo", costo: "$0" },
            { fecha: "28/04/2026", tipo: "Cambio de teclado", costo: "$1,250" },
          ],
          total: "$30,150",
        },
        Asignado: "Ana Lopez Garcia",
        Proveedor: "Dell Solutions",
      },
      {
        id: "EQ-002",
        Tag: "#002",
        Tipo: "Tablet",
        Marca: "Samsung",
        Modelo: "Tab A8",
        Serie: "SN-20184790",
        Estado: "Disponible",
        "Gar.Tipo": "Basica",
        "Gar.Fin": "18/11/2027",
        Ubicacion: "Almacen",
        Costo: {
          equipo: "$5,800",
          mantenimientos: [],
          total: "$5,800",
        },
        Asignado: "-",
        Proveedor: "TechSolutions SA",
      },
      {
        id: "EQ-003",
        Tag: "#003",
        Tipo: "Computadora",
        Marca: "HP",
        Modelo: "EliteDesk 800",
        Serie: "SN-77432180",
        Estado: "Mantenimiento",
        "Gar.Tipo": "Basica",
        "Gar.Fin": "05/06/2026",
        Ubicacion: "Restaurante",
        Costo: {
          equipo: "$18,400",
          mantenimientos: [
            { fecha: "04/05/2026", tipo: "Diagnostico disco duro", costo: "$600" },
            { fecha: "06/05/2026", tipo: "Reemplazo SSD", costo: "$2,500" },
          ],
          total: "$21,500",
        },
        Asignado: "Restaurante",
        Proveedor: "TechSolutions SA",
      },
      {
        id: "EQ-004",
        Tag: "#004",
        Tipo: "Celular",
        Marca: "Samsung",
        Modelo: "Galaxy A16",
        Serie: "RF8Y70HEQ0K",
        Estado: "Asignado",
        "Gar.Tipo": "Fabricante",
        "Gar.Fin": "12/12/2026",
        Ubicacion: "Compras",
        Costo: {
          equipo: "$6,900",
          mantenimientos: [
            { fecha: "18/05/2026", tipo: "Cambio de mica", costo: "$350" },
          ],
          total: "$7,250",
        },
        Asignado: "Daniela Rodriguez",
        Proveedor: "Puente Calinda",
      },
    ],
  },
  Resguardos: {
    filters: ["Todos", "Equipo tecnologico", "Tarjeta comedor", "Yubikey"],
    rows: [
      { id: "RSG-001", Tag: "RSG-001", Tipo: "Equipo tecnologico", Marca: "Dell", Modelo: "XPS 15", Serie: "SN-4829Y047", Estado: "Firmado", "Gar.Tipo": "-", "Gar.Fin": "-", Ubicacion: "Recepcion", Costo: "-", Asignado: "Ana Lopez Garcia", Proveedor: "Sistemas" },
      { id: "RSG-002", Tag: "RSG-002", Tipo: "Yubikey", Marca: "Yubico", Modelo: "5 NFC", Serie: "YK-8821", Estado: "Pendiente", "Gar.Tipo": "-", "Gar.Fin": "-", Ubicacion: "RH", Costo: "-", Asignado: "Mayuri del Valle", Proveedor: "Sistemas" },
    ],
  },
  Mantenimiento: {
    filters: ["Todos", "En proceso", "Resuelto", "Preventivo"],
    rows: [
      { id: "MTTO-001", Tag: "MTTO-001", Tipo: "Falla", Marca: "HP", Modelo: "EliteDesk 800", Serie: "SN-77432180", Estado: "En proceso", "Gar.Tipo": "-", "Gar.Fin": "-", Ubicacion: "Restaurante", Costo: "$2,500", Asignado: "Restaurante", Proveedor: "Rosario" },
      { id: "MTTO-002", Tag: "MTTO-002", Tipo: "Preventivo", Marca: "Dell", Modelo: "XPS 15", Serie: "SN-4829Y047", Estado: "Resuelto", "Gar.Tipo": "-", "Gar.Fin": "-", Ubicacion: "Recepcion", Costo: "$0", Asignado: "Ana Lopez Garcia", Proveedor: "Sistemas" },
    ],
  },
  Proveedores: {
    filters: ["Todos", "Activo", "Pendiente", "Inactivo"],
    rows: [
      { id: "PRV-001", Tag: "PRV-001", Tipo: "Hardware", Marca: "Dell", Modelo: "Solutions", Serie: "-", Estado: "Activo", "Gar.Tipo": "-", "Gar.Fin": "-", Ubicacion: "Cancun", Costo: "$120,000", Asignado: "-", Proveedor: "Dell Solutions" },
      { id: "PRV-002", Tag: "PRV-002", Tipo: "Soporte", Marca: "Tech", Modelo: "Solutions", Serie: "-", Estado: "Activo", "Gar.Tipo": "-", "Gar.Fin": "-", Ubicacion: "Cancun", Costo: "$85,000", Asignado: "-", Proveedor: "TechSolutions SA" },
    ],
  },
};

const INITIAL_ROWS_BY_SOURCE = Object.fromEntries(
  Object.entries(SOURCE_CONFIG).map(([source, config]) => [source, config.rows]),
);

function PillSelect({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-[8px] border border-gray-200 bg-gray-50 px-3 text-sm font-normal text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200 dark:focus:ring-blue-900/30"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ReportValue({ field, value }) {
  if (field === "Costo" && value && typeof value === "object") {
    return (
      <div className="mt-1 space-y-1.5 text-sm font-normal text-[#21192c] dark:text-gray-100">
        <p>
          Equipo: <span className="font-black">{value.equipo}</span>
        </p>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9e95aa] dark:text-gray-400">Reparaciones</p>
          {value.mantenimientos.length ? (
            <div className="mt-1 space-y-1">
              {value.mantenimientos.map((item) => (
                <p key={`${item.fecha}-${item.tipo}`} className="text-xs leading-snug text-[#6f6584] dark:text-gray-300">
                  {item.fecha} / {item.tipo}: <span className="font-black text-[#21192c] dark:text-gray-100">{item.costo}</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-[#6f6584] dark:text-gray-400">Sin costos de mantenimiento.</p>
          )}
        </div>
        <p className="border-t border-gray-100 pt-1 text-xs font-black text-blue-600 dark:border-gray-700 dark:text-blue-300">
          Total: {value.total}
        </p>
      </div>
    );
  }

  return <p className="mt-1 break-words text-sm font-normal text-[#21192c] dark:text-gray-100">{value}</p>;
}

function DetailModal({ record, onClose }) {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-4 sm:p-4">
      <div className="mx-auto flex min-h-full w-full max-w-2xl items-start sm:items-center">
        <div className="max-h-[calc(100dvh-2rem)] w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#16131F]">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white/95 p-4 backdrop-blur dark:border-gray-800 dark:bg-[#16131F]/95 sm:p-5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">Ficha tecnica completa</p>
              <h2 className="mt-2 truncate text-lg font-black text-[#21192c] dark:text-white sm:text-xl">{record.Marca} {record.Modelo}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/25 dark:text-blue-300 dark:hover:bg-blue-900/40"
              aria-label="Cerrar detalle"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-4 pt-3 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(record).map(([key, value]) => (
                <div key={key} className="min-w-0 rounded-[10px] border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9e95aa] dark:text-gray-400">{key}</p>
                  <ReportValue field={key} value={value} />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[8px] bg-blue-50 p-3 text-xs text-[#6f6584] dark:bg-blue-900/20 dark:text-gray-400">
              Historial de fallas, mantenimientos, vales firmados y proveedor quedaran conectados a base de datos en la siguiente fase.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ record, reason, setReason, onCancel, onConfirm }) {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-[#16131F]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#21192c] dark:text-white">Confirmar baja logica</h2>
            <p className="mt-1 text-sm font-normal text-[#6f6584] dark:text-gray-400">
              El activo {record.Tag} cambiara su estatus a Baja / Desechado y se enviara una traza a Auditoria.
            </p>
          </div>
        </div>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Motivo de la baja..."
          className="mt-4 h-24 w-full resize-none rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#3c3445] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="h-10 rounded-[8px] bg-gray-100 px-5 text-xs font-black text-[#6f6584] transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cancelar</button>
          <button type="button" onClick={onConfirm} className="h-10 rounded-[8px] bg-red-500 px-5 text-xs font-black text-white">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

export default function Reportes() {
  const navigate = useNavigate();
  const [source, setSource] = useState("Inventario");
  const [rowsBySource, setRowsBySource] = useState(INITIAL_ROWS_BY_SOURCE);
  const [filter, setFilter] = useState("Todos");
  const [activeFields, setActiveFields] = useState([]);
  const [auditMode, setAuditMode] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

  const config = SOURCE_CONFIG[source];

  const rows = useMemo(() => {
    const sourceRows = rowsBySource[source] || [];
    if (filter === "Todos") return sourceRows;
    return sourceRows.filter((row) => row.Estado === filter || row.Tipo === filter);
  }, [filter, rowsBySource, source]);

  const toggleField = (field) => {
    setActiveFields((current) => (current.includes(field) ? current.filter((item) => item !== field) : [...current, field]));
  };

  const allFieldsSelected = activeFields.length === FIELD_OPTIONS.length;

  const handleToggleAllFields = () => {
    setActiveFields((current) => (current.length === FIELD_OPTIONS.length ? [] : FIELD_OPTIONS));
  };

  const selectedColumns = activeFields.length ? activeFields : ["Tag", "Tipo", "Marca", "Modelo", "Estado"];

  const getEquipmentEditRoute = (row) => {
    const equipments = loadEquipments();
    const cleanTag = row.Tag?.replace("#", "");
    const matchingEquipment = equipments.find((equipment) => (
      equipment.id === row.id
      || equipment.publicId === row.Tag
      || normalizeText(equipment.serialNumber) === normalizeText(row.Serie)
      || normalizeText(equipment.model) === normalizeText(row.Modelo)
      || normalizeText(equipment.title) === normalizeText(`${row.Marca} ${row.Modelo}`)
      || equipment.publicId?.replace("#", "") === cleanTag
    ));

    return matchingEquipment ? `/equipos/editar/${matchingEquipment.id}` : `/equipos/editar/${row.id}`;
  };

  const handleEdit = (row) => {
    if (source === "Inventario") {
      navigate(getEquipmentEditRoute(row), {
        state: {
          returnTo: "/asignacion/reportes",
          returnLabel: "Reportes",
          reportDraft: row,
        },
      });
      return;
    }

    const sourceRoutes = {
      Resguardos: "/asignacion",
      Mantenimiento: "/asignacion/mantenimiento",
      Proveedores: "/proveedores",
    };

    navigate(sourceRoutes[source] || "/asignacion/reportes");
  };

  const handleConfirmDelete = () => {
    if (!deleteRecord || !deleteReason.trim()) return;

    setRowsBySource((current) => ({
      ...current,
      [source]: (current[source] || []).filter((row) => row.id !== deleteRecord.id),
    }));
    setDeleteRecord(null);
    setDeleteReason("");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">Generador dinamico de consultas</p>
          <h2 className="mt-3 text-lg font-black text-[#21192c] dark:text-white sm:text-xl">Reportes</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <PillSelect
            label="Fuente"
            value={source}
            onChange={(value) => {
              setSource(value);
              setFilter("Todos");
            }}
            options={Object.keys(SOURCE_CONFIG)}
          />
          <PillSelect label="Filtro" value={filter} onChange={setFilter} options={config.filters} />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">Campos</p>
            <label className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold text-[#6f6584] transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/20">
              <input
                type="checkbox"
                checked={allFieldsSelected}
                onChange={handleToggleAllFields}
                className="h-4 w-4 accent-blue-600"
              />
              Seleccionar todos
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {FIELD_OPTIONS.map((field) => {
              const active = activeFields.includes(field);
              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => toggleField(field)}
                  className={`h-9 rounded-full border px-4 text-xs font-black transition ${
                    active
                      ? "border-[#3A9AF2] bg-[#3A9AF2] text-[#FFFFFF] shadow-sm"
                      : "border-gray-200 bg-gray-50 text-[#6f6584] hover:border-blue-300 hover:bg-blue-50/60 dark:border-gray-700 dark:bg-gray-800/40 dark:text-blue-200 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
                  }`}
                >
                  {field}
                </button>
              );
            })}
          </div>
        </div>

      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs font-bold text-[#887e96]">{rows.length} reg.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => alert("Exportacion PDF pendiente de conectar")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-cyan-600 px-4 text-xs font-black text-white"
          >
            <FileArchive size={15} />
            Exportar
          </button>
          <button
            type="button"
            onClick={() => setAuditMode((value) => !value)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-emerald-50 px-4 text-xs font-black text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35"
          >
            <BarChart3 size={15} />
            Analisis
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-5">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.26em] text-blue-300">Resultados</p>
        <div className="space-y-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/30 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-blue-700 dark:hover:bg-blue-900/10">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {selectedColumns.map((column) => (
                    <div key={column}>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9e95aa] dark:text-gray-400">{column}</p>
                      <ReportValue field={column} value={row[column]} />
                    </div>
                  ))}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setDetailRecord(row)} className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/45">
                    <Eye size={13} />
                    Ver
                  </button>
                  <button type="button" onClick={() => handleEdit(row)} className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/25 dark:text-blue-300 dark:hover:bg-blue-900/40">
                    <Pencil size={13} />
                    Editar
                  </button>
                  <button type="button" onClick={() => setDeleteRecord(row)} className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-red-50 px-3 text-xs font-black text-red-500 transition hover:bg-red-100 dark:bg-red-950/25 dark:text-red-300 dark:hover:bg-red-950/40">
                    <Trash2 size={13} />
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {auditMode && <p className="mt-4 rounded-[8px] bg-emerald-50 p-3 text-xs font-normal text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Analisis adicional activo: se incluiran datos de auditoria al procesar la consulta.</p>}
      </section>

      <DetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      <DeleteModal
        record={deleteRecord}
        reason={deleteReason}
        setReason={setDeleteReason}
        onCancel={() => {
          setDeleteRecord(null);
          setDeleteReason("");
        }}
        onConfirm={() => {
          handleConfirmDelete();
        }}
      />
    </div>
  );
}
