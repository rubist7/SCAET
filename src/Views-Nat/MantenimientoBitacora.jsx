import { useState } from "react";
import { ChevronDown } from "lucide-react";
import DateInput from "./DateInput";
import { formatCurrency, parseCurrencyValue } from "./currency";
import { formatDate, todayIsoDate } from "./dateUtils";
import { historialUsuariosPorEquipo, mantenimientoEquipos } from "./mantenimientoData";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-violet-300">{label}</span>
      {children}
    </label>
  );
}

function SoftInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    />
  );
}

function MoneyInput({ value, onChange }) {
  const handleKeyDown = (event) => {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      onChange(value * 10 + Number(event.key));
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      if (event.currentTarget.selectionStart !== event.currentTarget.selectionEnd) {
        onChange(0);
        return;
      }

      onChange(Math.floor(value / 10));
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "");
    onChange(digits ? Number(digits) : 0);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatCurrency(value)}
      onChange={() => {}}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder="$0.00"
      className="h-10 w-full rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    />
  );
}

function SoftSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 pr-9 text-sm font-semibold text-[#3c3445] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6f6584]" />
    </div>
  );
}

function UserHistoryCard({ record }) {
  const total = record.mantenimientos.reduce((sum, item) => sum + parseCurrencyValue(item.costo), 0);

  return (
    <article className="rounded-[8px] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#eee8f6] pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#21192c]">{record.usuario}</p>
          <p className="mt-1 text-xs font-semibold text-[#8f879b]">
            #{record.numero} - {record.puesto} - {record.departamento}
          </p>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-violet-300">{record.periodo}</p>
        </div>
        <div className="shrink-0 sm:text-right">
          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-600">{record.estadoEntrega}</span>
          <p className="mt-2 text-sm font-black text-[#21192c]">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {record.mantenimientos.map((item) => (
          <div key={`${item.fecha}-${item.descripcion}`} className="rounded-[8px] border border-[#eee8f6] bg-[#fbfaf8] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#eee8dc] px-2.5 py-0.5 text-[10px] font-black text-[#6f6584]">{item.tipo}</span>
                  <span className="text-[11px] font-bold text-violet-300">{formatDate(item.fecha)}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-[#6f6584]">{item.descripcion}</p>
                <p className="mt-1 text-[11px] font-bold text-[#b1a58f]">Tec. {item.tecnico}</p>
              </div>
              <p className="shrink-0 text-sm font-black text-[#21192c]">{formatCurrency(item.costo)}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function UserHistory({ records }) {
  const total = records.reduce(
    (sum, record) => sum + record.mantenimientos.reduce((subtotal, item) => subtotal + parseCurrencyValue(item.costo), 0),
    0,
  );
  const maintenanceCount = records.reduce((sum, record) => sum + record.mantenimientos.length, 0);

  return (
    <div className="mt-5">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[8px] bg-violet-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Usuarios</p>
          <p className="mt-1 text-lg font-black text-[#21192c]">{records.length}</p>
        </div>
        <div className="rounded-[8px] bg-violet-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Mantenimientos</p>
          <p className="mt-1 text-lg font-black text-[#21192c]">{maintenanceCount}</p>
        </div>
        <div className="rounded-[8px] bg-violet-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Costo total</p>
          <p className="mt-1 text-lg font-black text-[#21192c]">{formatCurrency(total)}</p>
        </div>
      </div>

      {records.length ? (
        <div className="space-y-3">
          {records.map((record) => <UserHistoryCard key={record.id} record={record} />)}
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-[#ded6c8] px-4 py-8 text-center text-sm font-semibold text-[#9e95aa]">
          Este equipo aun no tiene historial de usuarios registrado.
        </div>
      )}
    </div>
  );
}

export default function MantenimientoBitacora({ equipo, onBack, onAddEntry }) {
  const selected = equipo || mantenimientoEquipos[0];
  const [activeTab, setActiveTab] = useState("bitacora");
  const [fecha, setFecha] = useState("");
  const [tipo, setTipo] = useState("Falla reportada");
  const [descripcion, setDescripcion] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [estado, setEstado] = useState("En proceso");
  const [costo, setCosto] = useState(0);
  const [proveedor, setProveedor] = useState("");

  const userHistory = historialUsuariosPorEquipo[selected.codigo] || [];

  const handleSave = () => {
    if (!descripcion.trim()) return;

    const newEntry = {
      id: Date.now(),
      categoria: tipo.includes("Preventivo") ? "Preventivo" : tipo.includes("Correctivo") ? "Correctivo" : "Falla",
      titulo: tipo,
      descripcion,
      tecnico: tecnico || "Nombre del tecnico",
      estado,
      fecha: fecha || todayIsoDate(),
      costo,
      proveedor,
      equipoCodigo: selected.codigo,
      equipoNombre: selected.nombre,
      equipoSerie: selected.serie,
      equipoTipo: selected.tipo,
    };

    onAddEntry?.(newEntry);
    setDescripcion("");
    setTecnico("");
    setCosto(0);
    setProveedor("");
  };

  return (
    <div className="space-y-4">

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-violet-200">
              Mantenimiento / {selected.nombre} / Bitacora
            </p>
            <h2 className="mt-3 flex flex-col gap-2 text-lg font-black text-[#21192c] sm:block sm:text-xl">
              {selected.nombre}
              <span className="w-fit rounded-full bg-amber-100 px-3 py-1 align-middle text-xs font-black text-amber-600 sm:ml-3">En mantenimiento</span>
            </h2>
          </div>
        </div>

        <button type="button" onClick={onBack} className="mt-3 text-xs font-black text-violet-600 hover:underline">
          Volver a seleccionar equipo
        </button>

        <div className="mt-4 flex overflow-x-auto border-b border-violet-500">
          <button
            type="button"
            onClick={() => setActiveTab("bitacora")}
            className={`rounded-t-[8px] px-5 py-3 text-xs ${activeTab === "bitacora" ? "bg-violet-50 font-black text-violet-600" : "font-bold text-[#8f879b]"}`}
          >
            Bitacora de fallas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("usuarios")}
            className={`shrink-0 rounded-t-[8px] px-5 py-3 text-xs ${activeTab === "usuarios" ? "bg-violet-50 font-black text-violet-600" : "font-bold text-[#8f879b]"}`}
          >
            Historial de usuarios
          </button>
        </div>

        {activeTab === "bitacora" ? <div className="mt-5">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.26em] text-violet-200">Nueva entrada</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fecha">
              <DateInput value={fecha} onChange={setFecha} />
            </Field>
            <Field label="Tipo">
              <SoftSelect value={tipo} onChange={setTipo} options={["Falla reportada", "Preventivo", "Correctivo"]} />
            </Field>
          </div>

          <Field label="Descripcion">
            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Describe el problema o el mantenimiento realizado..."
              className="mt-1 h-20 w-full resize-none rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 py-3 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tecnico responsable">
              <SoftInput value={tecnico} onChange={setTecnico} placeholder="Nombre del tecnico" />
            </Field>
            <Field label="Estado tras mantenimiento">
              <SoftSelect value={estado} onChange={setEstado} options={["En proceso", "Resuelto", "Pendiente"]} />
            </Field>
            <Field label="Costo de la reparacion ($)">
              <MoneyInput value={costo} onChange={setCosto} />
            </Field>
            <Field label="Proveedor del servicio (opcional)">
              <SoftInput value={proveedor} onChange={setProveedor} placeholder="Empresa o tecnico externo" />
            </Field>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="h-9 w-full rounded-[8px] bg-[#91C6F8] px-5 text-xs font-black text-[#0F5FAF] transition hover:bg-[#79B8F4] sm:w-auto"
            >
              Guardar entrada
            </button>
          </div>
        </div> : <UserHistory records={userHistory} />}
      </section>

    </div>
  );
}
