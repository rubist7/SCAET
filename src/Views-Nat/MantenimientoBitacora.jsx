import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import DateInput from "./DateInput";
import { formatCurrency } from "./currency";
import { formatDate, todayIsoDate } from "./dateUtils";

const authHeaders = (json = false) => ({
  Authorization: "Bearer " + localStorage.getItem("scaet-token"),
  ...(json ? { "Content-Type": "application/json" } : {}),
});

const tipoBackend = {
  "Falla reportada": "falla",
  "Mantenimiento correctivo": "correctivo",
  Preventivo: "preventivo",
};

const estadoBackend = {
  "En proceso": "en_proceso",
  Resuelto: "resuelto",
  Cancelado: "cancelado",
};

const tipoVisual = {
  falla: "Falla reportada",
  correctivo: "Mantenimiento correctivo",
  preventivo: "Preventivo",
};

const estadoVisual = {
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cancelado: "Cancelado",
};

const equipoEstadoVisual = {
  disponible: "Disponible",
  asignado: "Asignado",
  mantenimiento: "Mantenimiento",
  baja: "Baja",
};

function Field({ label, children }) {
  return <label className="block">
    <span className="mb-1.5 block text-[11px] font-semibold text-blue-300">{label}</span>
    {children}
  </label>;
}

function SoftInput({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className="h-10 w-full rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />;
}

function MoneyInput({ value, onChange }) {
  const handleKeyDown = (event) => {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      onChange(value * 10 + Number(event.key));
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      onChange(event.currentTarget.selectionStart !== event.currentTarget.selectionEnd ? 0 : Math.floor(value / 10));
    }
  };
  return <input type="text" inputMode="numeric" value={formatCurrency(value)} onChange={() => {}}
    onKeyDown={handleKeyDown}
    onPaste={(event) => {
      event.preventDefault();
      const digits = event.clipboardData.getData("text").replace(/\D/g, "");
      onChange(digits ? Number(digits) : 0);
    }}
    placeholder="$0.00"
    className="h-10 w-full rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />;
}

function SoftSelect({ value, onChange, options }) {
  return <div className="relative">
    <select value={value} onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full appearance-none rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 pr-9 text-sm font-semibold text-[#3c3445] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6f6584]" />
  </div>;
}

function MaintenanceList({ records }) {
  if (!records.length) {
    return <div className="mt-4 rounded-[8px] border border-dashed border-[#ded6c8] px-4 py-8 text-center text-sm font-semibold text-[#9e95aa]">
      Este equipo aún no tiene mantenimientos registrados.
    </div>;
  }

  return <div className="mt-5 space-y-3">
    <p className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">Entradas guardadas</p>
    {records.map((item) => <article key={item.id_mantenimiento} className="rounded-[8px] border border-[#eee8f6] bg-[#fbfaf8] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#eee8dc] px-2.5 py-0.5 text-[10px] font-black text-[#6f6584]">
              {tipoVisual[item.tipo_mantenimiento] || item.tipo_mantenimiento}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black text-blue-600">
              {estadoVisual[item.estado_mantenimiento] || item.estado_mantenimiento}
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-[#21192c]">{item.titulo}</p>
          <p className="mt-1 text-xs font-semibold text-[#6f6584]">{item.descripcion}</p>
          <p className="mt-2 text-[11px] font-bold text-[#b1a58f]">Tec. {item.tecnico_responsable || "-"}</p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-xs font-bold text-blue-300">{formatDate(item.fecha_mantenimiento ? String(item.fecha_mantenimiento).slice(0, 10) : "")}</p>
          <p className="mt-2 text-sm font-black text-[#21192c]">{formatCurrency(Number(item.costo || 0))}</p>
        </div>
      </div>
    </article>)}
  </div>;
}

function UserHistoryCard({ record }) {
  const mantenimientos = record.mantenimientos || [];
  const total = mantenimientos.reduce((sum, item) => sum + Number(item.costo || 0), 0);
  const inicio = record.fecha_inicio ? formatDate(String(record.fecha_inicio).slice(0, 10)) : "-";
  const fin = record.fecha_devolucion_real ? formatDate(String(record.fecha_devolucion_real).slice(0, 10)) : "Actual";

  return <article className="rounded-[8px] bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 border-b border-[#eee8f6] pb-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-black text-[#21192c]">{record.nombre_completo || "Sin usuario asignado"}</p>
        <p className="mt-1 text-xs font-semibold text-[#8f879b]">
          #{record.num_colaborador || "-"} - {record.puesto || "-"} - {record.departamento || record.area || "-"}
        </p>
        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-blue-300">{inicio} - {fin}</p>
      </div>
      <div className="shrink-0 sm:text-right">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-600">
          {record.estado_asignacion === "asignado" ? "Asignado" : "Devuelto"}
        </span>
        <p className="mt-2 text-sm font-black text-[#21192c]">{formatCurrency(total)}</p>
      </div>
    </div>
    <div className="mt-3 space-y-2">
      {mantenimientos.map((item) => <div key={item.id_mantenimiento} className="rounded-[8px] border border-[#eee8f6] bg-[#fbfaf8] p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eee8dc] px-2.5 py-0.5 text-[10px] font-black text-[#6f6584]">{tipoVisual[item.tipo_mantenimiento] || item.tipo_mantenimiento}</span>
              <span className="text-[11px] font-bold text-blue-300">{formatDate(item.fecha_mantenimiento ? String(item.fecha_mantenimiento).slice(0, 10) : "")}</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-[#6f6584]">{item.descripcion}</p>
            <p className="mt-1 text-[11px] font-bold text-[#b1a58f]">Tec. {item.tecnico_responsable || "-"}</p>
          </div>
          <p className="shrink-0 text-sm font-black text-[#21192c]">{formatCurrency(Number(item.costo || 0))}</p>
        </div>
      </div>)}
      {!mantenimientos.length ? <p className="text-xs font-semibold text-[#9e95aa]">Sin mantenimientos relacionados.</p> : null}
    </div>
  </article>;
}

function UserHistory({ records, resumen }) {
  return <div className="mt-5">
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-[8px] bg-blue-50 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Usuarios</p>
        <p className="mt-1 text-lg font-black text-[#21192c]">{resumen.total_usuarios || 0}</p>
      </div>
      <div className="rounded-[8px] bg-blue-50 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Mantenimientos</p>
        <p className="mt-1 text-lg font-black text-[#21192c]">{resumen.total_mantenimientos || 0}</p>
      </div>
      <div className="rounded-[8px] bg-blue-50 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Costo total</p>
        <p className="mt-1 text-lg font-black text-[#21192c]">{formatCurrency(Number(resumen.costo_total || 0))}</p>
      </div>
    </div>
    {records.length ? <div className="space-y-3">{records.map((record) =>
      <UserHistoryCard key={record.id_detalle || "sin-usuario"} record={record} />)}
    </div> : <div className="rounded-[8px] border border-dashed border-[#ded6c8] px-4 py-8 text-center text-sm font-semibold text-[#9e95aa]">
      Este equipo aún no tiene historial de usuarios registrado.
    </div>}
  </div>;
}

export default function MantenimientoBitacora({ equipo, onBack }) {
  const [activeTab, setActiveTab] = useState("bitacora");
  const [data, setData] = useState({ equipo: null, mantenimientos: [], historial_usuarios: [], resumen: {} });
  const [fecha, setFecha] = useState(todayIsoDate());
  const [tipo, setTipo] = useState("Falla reportada");
  const [descripcion, setDescripcion] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [estado, setEstado] = useState("En proceso");
  const [costo, setCosto] = useState(0);
  const [proveedor, setProveedor] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const idEquipo = equipo?.id_equipo || equipo?.id;

  const cargarBitacora = useCallback(async () => {
    if (!idEquipo) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/mantenimientos/equipo/" + encodeURIComponent(idEquipo), { headers: authHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.mensaje || "No se pudo cargar la bitácora");
      setData({
        equipo: payload.equipo || null,
        mantenimientos: payload.mantenimientos || [],
        historial_usuarios: payload.historial_usuarios || [],
        resumen: payload.resumen || {},
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [idEquipo]);

  useEffect(() => {
    const timer = window.setTimeout(cargarBitacora, 0);
    return () => window.clearTimeout(timer);
  }, [cargarBitacora]);

  const handleSave = async () => {
    if (!fecha || !descripcion.trim() || !idEquipo) {
      setError("Fecha y descripción son obligatorias.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const tipoNormalizado = tipoBackend[tipo];
      const response = await fetch("/api/mantenimientos", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          id_equipo: Number(idEquipo),
          fecha_mantenimiento: fecha,
          tipo_mantenimiento: tipoNormalizado,
          titulo: tipoVisual[tipoNormalizado],
          descripcion: descripcion.trim(),
          tecnico_responsable: tecnico.trim() || null,
          estado_mantenimiento: estadoBackend[estado],
          costo: Number(costo || 0),
          proveedor_servicio: proveedor.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.mensaje || "No se pudo guardar el mantenimiento");
      setDescripcion("");
      setTecnico("");
      setCosto(0);
      setProveedor("");
      await cargarBitacora();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const selected = data.equipo || equipo || {};
  const estadoActual = equipoEstadoVisual[selected.estado] || selected.estado || "-";

  return <div className="space-y-4">
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">
            Mantenimiento / {selected.nombre_equipo || selected.nombre || "Equipo"} / Bitácora
          </p>
          <h2 className="mt-3 flex flex-col gap-2 text-lg font-black text-[#21192c] sm:block sm:text-xl">
            {selected.nombre_equipo || selected.nombre || "Equipo"}
            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 align-middle text-xs font-black text-amber-600 sm:ml-3">{estadoActual}</span>
          </h2>
        </div>
      </div>

      <button type="button" onClick={onBack} className="mt-3 text-xs font-black text-blue-600 hover:underline">Volver a seleccionar equipo</button>
      {error ? <p className="mt-3 text-sm font-semibold text-red-500">{error}</p> : null}

      <div className="mt-4 flex overflow-x-auto border-b border-blue-500">
        <button type="button" onClick={() => setActiveTab("bitacora")}
          className={"rounded-t-[8px] px-5 py-3 text-xs " + (activeTab === "bitacora" ? "bg-blue-50 font-black text-blue-600" : "font-bold text-[#8f879b]")}>Bitácora de fallas</button>
        <button type="button" onClick={() => setActiveTab("usuarios")}
          className={"shrink-0 rounded-t-[8px] px-5 py-3 text-xs " + (activeTab === "usuarios" ? "bg-blue-50 font-black text-blue-600" : "font-bold text-[#8f879b]")}>Historial de usuarios</button>
      </div>

      {loading ? <div className="px-4 py-8 text-center text-sm font-semibold text-[#9e95aa]">Cargando bitácora...</div> : activeTab === "bitacora" ? <div className="mt-5">
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">Nueva entrada</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Fecha"><DateInput value={fecha} onChange={setFecha} /></Field>
          <Field label="Tipo"><SoftSelect value={tipo} onChange={setTipo} options={["Falla reportada", "Mantenimiento correctivo", "Preventivo"]} /></Field>
        </div>
        <Field label="Descripción">
          <textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Describe el problema o el mantenimiento realizado..."
            className="mt-1 h-20 w-full resize-none rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 py-3 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Técnico responsable"><SoftInput value={tecnico} onChange={setTecnico} placeholder="Nombre del técnico" /></Field>
          <Field label="Estado tras mantenimiento"><SoftSelect value={estado} onChange={setEstado} options={["En proceso", "Resuelto", "Cancelado"]} /></Field>
          <Field label="Costo de la reparación ($)"><MoneyInput value={costo} onChange={setCosto} /></Field>
          <Field label="Proveedor del servicio (opcional)"><SoftInput value={proveedor} onChange={setProveedor} placeholder="Empresa o técnico externo" /></Field>
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={handleSave} disabled={saving}
            className="h-9 w-full rounded-[8px] bg-[#3A9AF2] px-5 text-xs font-black text-[#FFFFFF] transition hover:bg-[#238BEA] disabled:opacity-60 sm:w-auto">
            {saving ? "Guardando..." : "Guardar entrada"}
          </button>
        </div>
        <MaintenanceList records={data.mantenimientos} />
      </div> : <UserHistory records={data.historial_usuarios} resumen={data.resumen} />}
    </section>
  </div>;
}
