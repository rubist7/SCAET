import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, EyeOff, RotateCcw, Search } from "lucide-react";
import { formatCurrency, parseCurrencyValue } from "./currency";
import { formatDate } from "./dateUtils";

const authHeaders = () => ({
  Authorization: "Bearer " + localStorage.getItem("scaet-token"),
});

const tiposPermitidos = [
  "Laptop", "iPad", "Tablet", "Celular", "Computadora",
  "Monitor", "Impresora", "Teléfono", "Otro",
];

const estadoEquipoLabel = {
  disponible: "Disponible",
  asignado: "Asignado",
  mantenimiento: "Mantenimiento",
  baja: "Baja",
};

const estadoMantenimientoLabel = {
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cancelado: "Cancelado",
};

const tipoMantenimientoLabel = {
  falla: "Falla",
  correctivo: "Correctivo",
  preventivo: "Preventivo",
};

const statusStyles = {
  Asignado: "bg-emerald-100 text-emerald-600",
  Disponible: "bg-blue-100 text-blue-600",
  Mantenimiento: "bg-amber-100 text-amber-600",
  Baja: "bg-red-100 text-red-500",
};

const maintenanceStatusStyles = {
  "En proceso": "bg-amber-100 text-amber-600",
  Resuelto: "bg-emerald-100 text-emerald-600",
  Cancelado: "bg-red-100 text-red-500",
};

const categoriaStyles = {
  Falla: "border-red-400 bg-red-50 text-red-500",
  Preventivo: "border-emerald-400 bg-emerald-50 text-emerald-600",
  Correctivo: "border-blue-400 bg-blue-50 text-blue-600",
};

function mapEquipo(equipo) {
  return {
    ...equipo,
    id: String(equipo.id_equipo),
    codigo: equipo.codigo_equipo,
    nombre: equipo.nombre_equipo || "-",
    tipo: equipo.tipo_equipo || "-",
    marca: equipo.marca || "-",
    modelo: equipo.modelo || "-",
    serie: equipo.numero_serie || "-",
    area: equipo.area_asignada || "-",
    estado: estadoEquipoLabel[equipo.estado] || equipo.estado || "-",
    ultimoMant: equipo.ultimo_mantenimiento_fecha
      ? formatDate(String(equipo.ultimo_mantenimiento_fecha).slice(0, 10)) +
        (equipo.ultimo_mantenimiento_estado
          ? " · " + (estadoMantenimientoLabel[equipo.ultimo_mantenimiento_estado] || equipo.ultimo_mantenimiento_estado)
          : "")
      : "-",
  };
}

function mapEntrada(entrada) {
  return {
    id: entrada.id_mantenimiento,
    categoria: tipoMantenimientoLabel[entrada.tipo_mantenimiento] || entrada.tipo_mantenimiento,
    titulo: entrada.titulo,
    descripcion: entrada.descripcion,
    tecnico: entrada.tecnico_responsable || "-",
    estado: estadoMantenimientoLabel[entrada.estado_mantenimiento] || entrada.estado_mantenimiento,
    fecha: entrada.fecha_mantenimiento ? String(entrada.fecha_mantenimiento).slice(0, 10) : "",
    costo: Number(entrada.costo || 0),
    equipoNombre: entrada.nombre_equipo || entrada.codigo_equipo || "Equipo sin nombre",
    equipoSerie: entrada.numero_serie || "",
  };
}

function SelectFilter({ value, onChange, options }) {
  return (
    <div className="relative w-full lg:w-auto">
      <select value={value} onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-full border border-[#ded6c8] bg-white px-4 pr-9 text-xs font-bold text-[#3c3445] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 lg:w-auto">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6f6584]" />
    </div>
  );
}

function StatusBadge({ value }) {
  return <span className={"rounded-full px-3 py-1 text-[11px] font-medium " + (statusStyles[value] || "bg-blue-50 text-blue-600")}>{value}</span>;
}

function MaintenanceStatusBadge({ value }) {
  return <span className={"rounded-full px-3 py-1 text-[11px] font-black " + (maintenanceStatusStyles[value] || "bg-blue-50 text-blue-600")}>{value}</span>;
}

function MaintenanceEntryCard({ entry, isHidden = false, onHide, onRestore }) {
  const categoryStyle = categoriaStyles[entry.categoria] || "border-blue-400 bg-blue-50 text-blue-600";
  const borderStyle = categoryStyle.split(" ")[0];
  return (
    <article className={"rounded-[8px] border-l-4 bg-white p-4 shadow-sm " + borderStyle + (isHidden ? " opacity-75" : "")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={"rounded-full px-3 py-1 text-[11px] font-black " + categoryStyle.replace(borderStyle, "")}>{entry.categoria}</span>
            <h3 className="text-sm font-black text-[#21192c]">{entry.titulo}</h3>
          </div>
          <p className="mt-2 text-xs font-black text-blue-500">
            {entry.equipoNombre}
            {entry.equipoSerie ? <span className="font-semibold text-[#9e95aa]"> - {entry.equipoSerie}</span> : null}
          </p>
          <p className="mt-2 text-xs font-semibold text-[#6f6584]">{entry.descripcion}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#b1a58f]">
            <span>Tec. {entry.tecnico}</span><span>En</span><MaintenanceStatusBadge value={entry.estado} />
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs font-bold text-blue-300">{formatDate(entry.fecha)}</p>
          <p className="mt-8 text-sm font-black text-[#21192c]">{formatCurrency(entry.costo)}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        {isHidden ? (
          <button type="button" onClick={() => onRestore?.(entry.id)}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100">
            <RotateCcw size={14} />Restaurar
          </button>
        ) : entry.estado === "Resuelto" ? (
          <button type="button" onClick={() => onHide?.(entry.id)}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-[#eee8dc] px-3 text-xs font-black text-[#6f6584] transition hover:bg-[#e4dccd]">
            <EyeOff size={14} />
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function MantenimientoEquipos({ onOpenBitacora }) {
  const [equipos, setEquipos] = useState([]);
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("Todos los tipos");
  const [marca, setMarca] = useState("Todas las marcas");
  const [hiddenEntryIds, setHiddenEntryIds] = useState([]);
  const [showHiddenEntries, setShowHiddenEntries] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [equiposResponse, entradasResponse] = await Promise.all([
        fetch("/api/mantenimientos/equipos", { headers: authHeaders() }),
        fetch("/api/mantenimientos", { headers: authHeaders() }),
      ]);
      const [equiposData, entradasData] = await Promise.all([
        equiposResponse.json(), entradasResponse.json(),
      ]);
      if (!equiposResponse.ok) throw new Error(equiposData.mensaje || "No se pudieron cargar los equipos");
      if (!entradasResponse.ok) throw new Error(entradasData.mensaje || "No se pudieron cargar los mantenimientos");
      setEquipos((equiposData.equipos || []).map(mapEquipo));
      setEntries((entradasData.mantenimientos || []).map(mapEntrada));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(cargarDatos, 0);
    return () => window.clearTimeout(timer);
  }, [cargarDatos]);

  const marcas = useMemo(() => [
    "Todas las marcas",
    ...Array.from(new Set(equipos.map((equipo) => equipo.marca).filter((value) => value && value !== "-"))).sort(),
  ], [equipos]);

  const filtered = useMemo(() => equipos.filter((equipo) => {
    const query = [
      equipo.codigo, equipo.nombre, equipo.marca, equipo.modelo, equipo.serie,
    ].join(" ").toLowerCase();
    return query.includes(search.trim().toLowerCase())
      && (tipo === "Todos los tipos" || equipo.tipo === tipo)
      && (marca === "Todas las marcas" || equipo.marca === marca);
  }), [equipos, marca, search, tipo]);

  const hiddenEntries = useMemo(() => entries.filter((entry) => hiddenEntryIds.includes(entry.id)), [entries, hiddenEntryIds]);
  const visibleEntries = useMemo(() => entries.filter((entry) => !hiddenEntryIds.includes(entry.id)), [entries, hiddenEntryIds]);
  const totalCost = useMemo(() => entries.reduce((total, entry) => total + parseCurrencyValue(entry.costo), 0), [entries]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="mt-3 text-lg font-black text-[#21192c] sm:text-xl">¿A qué equipo registrarás mantenimiento?</h2>
            <p className="mt-1 text-sm font-semibold text-[#9e95aa]">Busca y selecciona el equipo para abrir su bitácora</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8f879b]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código, nombre, marca, modelo o serie..."
              className="h-10 w-full rounded-full border border-[#ded6c8] bg-[#eee8dc] pl-11 pr-4 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>
          <SelectFilter value={tipo} onChange={setTipo} options={["Todos los tipos", ...tiposPermitidos]} />
          <SelectFilter value={marca} onChange={setMarca} options={marcas} />
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-500">{error}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-b-2xl">
          <table className="w-full min-w-[920px] text-sm">
            <thead><tr className="bg-[#e9e0cf] text-left text-[11px] font-black uppercase tracking-[0.22em] text-[#9c91aa]">
              <th className="px-4 py-3">ID</th><th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Marca / Modelo</th><th className="px-4 py-3">Serie</th>
              <th className="px-4 py-3">Área</th><th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Último mant.</th><th className="px-4 py-3 text-right"></th>
            </tr></thead>
            <tbody>
              {filtered.map((equipo) => (
                <tr key={equipo.id} className="border-b border-[#eee8f6] last:border-0">
                  <td className="px-4 py-4 font-normal text-blue-300">{equipo.codigo}</td>
                  <td className="px-4 py-4 font-normal text-[#3c3445]">{equipo.tipo}</td>
                  <td className="px-4 py-4"><p className="font-black text-[#21192c]">{equipo.marca} / {equipo.modelo}</p></td>
                  <td className="px-4 py-4 font-normal text-[#9e95aa]">{equipo.serie}</td>
                  <td className="px-4 py-4 font-normal text-[#6f6584]">{equipo.area}</td>
                  <td className="px-4 py-4"><StatusBadge value={equipo.estado} /></td>
                  <td className={"px-4 py-4 font-normal " + (equipo.estado === "Mantenimiento" ? "text-amber-500" : "text-[#b1a58f]")}>{equipo.ultimoMant}</td>
                  <td className="px-4 py-4 text-right">
                    <button type="button" onClick={() => onOpenBitacora(equipo)}
                      className="inline-flex h-8 min-w-[112px] items-center justify-center whitespace-nowrap rounded-[8px] bg-[#3A9AF2] px-3 text-xs font-black text-[#FFFFFF] transition hover:bg-[#238BEA]">
                      Abrir bitácora
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !filtered.length ? <div className="px-4 py-8 text-center text-sm font-semibold text-[#9e95aa]">No se encontraron equipos.</div> : null}
          {loading ? <div className="px-4 py-8 text-center text-sm font-semibold text-[#9e95aa]">Cargando equipos...</div> : null}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-lg font-black text-[#21192c] sm:text-xl">Entradas guardadas</h2>
            <p className="mt-1 text-sm font-semibold text-[#9e95aa]">Registros generales de mantenimiento por equipo.</p></div>
          <div className="flex items-start gap-5 self-end sm:self-start">
            {hiddenEntries.length ? <button type="button" onClick={() => setShowHiddenEntries((current) => !current)}
              className="inline-flex h-7 items-center gap-1.5 rounded-[6px] bg-[#eee8dc] px-3 text-[11px] font-bold text-[#6f6584] transition hover:bg-[#e4dccd]"><EyeOff size={13} /></button> : null}
            <div className="text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-300">{entries.length} entradas</p>
              <p className="text-sm font-black text-[#21192c]">{formatCurrency(totalCost)}</p>
            </div>
          </div>
        </div>
        {showHiddenEntries && hiddenEntries.length ? <div className="mt-4 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">Ocultos</p>
          {hiddenEntries.map((entry) => <MaintenanceEntryCard key={entry.id} entry={entry} isHidden onRestore={(id) => { setHiddenEntryIds((current) => current.filter((item) => item !== id)); setShowHiddenEntries(false); }} />)}
        </div> : null}
        {!showHiddenEntries && visibleEntries.length ? <div className="mt-4 space-y-3">
          {visibleEntries.map((entry) => <MaintenanceEntryCard key={entry.id} entry={entry} onHide={(id) => setHiddenEntryIds((current) => current.includes(id) ? current : [...current, id])} />)}
        </div> : null}
        {!loading && !showHiddenEntries && !visibleEntries.length ? <div className="mt-4 rounded-[8px] border border-dashed border-[#ded6c8] px-4 py-8 text-center text-sm font-semibold text-[#9e95aa]">Aún no hay entradas de mantenimiento guardadas.</div> : null}
      </section>
    </div>
  );
}
