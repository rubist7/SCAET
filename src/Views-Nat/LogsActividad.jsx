import { useMemo, useState } from "react";
import { ChevronDown, Download, KeyRound, LogIn, PenLine, Plus, Wrench } from "lucide-react";
import DateInput from "./DateInput";
import { formatDate } from "./dateUtils";

const logs = [
  {
    id: 1,
    tipo: "Alta de equipo",
    detalle: "Samsung Tab A8 (#007)",
    usuario: "Ing. Garcia",
    fecha: "2026-05-08",
    hora: "08:16 am",
    accion: "Alta",
    icon: Plus,
    iconStyle: "bg-emerald-100 text-emerald-500",
  },
  {
    id: 2,
    tipo: "Asignacion",
    detalle: "Dell XPS 15 -> Ana Lopez Garcia (Recepcion)",
    usuario: "Nat.Rubi",
    fecha: "2026-05-07",
    hora: "11:24 am",
    accion: "Asignacion",
    icon: KeyRound,
    iconStyle: "bg-blue-100 text-blue-600",
  },
  {
    id: 3,
    tipo: "Entrada de mantenimiento",
    detalle: "HP EliteDesk - Falla de disco duro",
    usuario: "Rosario",
    fecha: "2026-05-06",
    hora: "09:06 am",
    accion: "Mantenimiento",
    icon: Wrench,
    iconStyle: "bg-amber-100 text-amber-500",
  },
  {
    id: 4,
    tipo: "Inicio de sesion",
    detalle: "Ing. Ramirez",
    usuario: "Ing. Ramirez",
    fecha: "2026-05-05",
    hora: "08:02 pm",
    accion: "Sesion",
    icon: LogIn,
    iconStyle: "bg-blue-100 text-blue-500",
  },
  {
    id: 5,
    tipo: "Edicion de proveedor",
    detalle: "TechSolutions SA - calificacion actualizada",
    usuario: "Garcia",
    fecha: "2026-05-05",
    hora: "11:20 am",
    accion: "Edicion",
    icon: PenLine,
    iconStyle: "bg-blue-100 text-blue-600",
  },
];

function SoftSelect({ value, onChange, options }) {
  return (
    <div className="relative w-full sm:w-auto">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-full border border-[#ded6c8] bg-[#eee8dc] px-4 pr-9 text-xs font-black text-[#3c3445] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:min-w-44"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6f6584]" />
    </div>
  );
}

function DateFilter({ value, onChange }) {
  return (
    <div className="relative w-full sm:w-auto">
      <DateInput
        value={value}
        onChange={onChange}
        className="h-10 w-full rounded-full border border-[#ded6c8] bg-[#eee8dc] px-4 pr-10 text-xs font-black text-[#3c3445] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function LogRow({ log }) {
  const Icon = log.icon;

  return (
    <article className="flex items-start gap-3 border-b border-[#eee8f6] px-3 py-4 last:border-0 sm:items-center sm:gap-4 sm:px-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${log.iconStyle}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#6f6584]">
          {log.tipo}: <span className="font-black text-[#21192c]">{log.detalle}</span>
        </p>
        <p className="mt-1 text-[11px] font-bold text-[#b1a58f]">
          {log.usuario} / {formatDate(log.fecha)} - {log.hora}
        </p>
      </div>
    </article>
  );
}

export default function LogsActividad() {
  const [fecha, setFecha] = useState("2026-05-08");
  const [accion, setAccion] = useState("Todas las acciones");
  const [usuario, setUsuario] = useState("Todos los usuarios");

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const matchesAccion = accion === "Todas las acciones" || log.accion === accion;
        const matchesUsuario = usuario === "Todos los usuarios" || log.usuario === usuario;
        const matchesFecha = !fecha || log.fecha === fecha;

        return matchesAccion && matchesUsuario && matchesFecha;
      }),
    [accion, fecha, usuario],
  );

  return (
    <div className="space-y-4">

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#21192c] sm:text-xl">Registro de actividad</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <DateFilter value={fecha} onChange={setFecha} />
              <SoftSelect
                value={accion}
                onChange={setAccion}
                options={["Todas las acciones", "Alta", "Asignacion", "Mantenimiento", "Sesion", "Edicion"]}
              />
              <SoftSelect
                value={usuario}
                onChange={setUsuario}
                options={["Todos los usuarios", "Ing. Echeverria", "Ing. Sanchez", "nat", "rubi"]}
              />
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] bg-[#eee8dc] px-4 text-xs font-black text-[#6f6584] transition hover:bg-[#e4dccf] sm:w-auto"
          >
            <Download size={14} />
            Exportar
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#f0ebe3]">
          {filteredLogs.length ? (
            filteredLogs.map((log) => <LogRow key={log.id} log={log} />)
          ) : (
            <div className="px-4 py-10 text-center text-sm font-semibold text-[#9e95aa]">
              No hay actividad para los filtros seleccionados.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
