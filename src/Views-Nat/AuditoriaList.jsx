import { useMemo, useState } from "react";
import { ChevronDown, FileDown, FileSpreadsheet, Search } from "lucide-react";

const auditorias = [
  {
    fecha: "08/05/2026",
    usuario: "Admin",
    accion: "Login",
    modulo: "Dashboard",
    depto: "-",
    tipo: "Acceso",
    equipo: "Sistema",
  },
  {
    fecha: "07/05/2026",
    usuario: "Admin",
    accion: "Firma digital",
    modulo: "Asignaciones",
    depto: "Recepcion",
    tipo: "Firma digital",
    equipo: "Dell XPS 15",
  },
  {
    fecha: "06/05/2026",
    usuario: "Admin",
    accion: "Firma digital",
    modulo: "Asignaciones",
    depto: "Restaurante",
    tipo: "Firma digital",
    equipo: "HP EliteDesk 800",
  },
  {
    fecha: "01/05/2026",
    usuario: "Admin",
    accion: "Nuevo registro",
    modulo: "Proveedores",
    depto: "Restaurante",
    tipo: "Registro",
    equipo: "Sistema",
  },
  {
    fecha: "15/04/2026",
    usuario: "Admin",
    accion: "Asignar",
    modulo: "Colaboradores",
    depto: "Administracion",
    tipo: "Asignacion",
    equipo: "Samsung Tab A8",
  },
];

function ExportButton({ children, icon: Icon, tone }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <button type="button" className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border px-4 text-xs font-black sm:w-auto ${tones[tone]}`}>
      <Icon size={14} />
      {children}
    </button>
  );
}

function SoftSelect({ value, onChange, options }) {
  return (
    <div className="relative w-full lg:w-auto">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-full border border-[#ded6c8] bg-[#eee8dc] px-4 pr-9 text-xs font-black text-[#3c3445] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 lg:min-w-44"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6f6584]" />
    </div>
  );
}

export default function AuditoriaList() {
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("Todos los tipos");
  const [equipo, setEquipo] = useState("Todos los equipos");

  const filtered = useMemo(
    () =>
      auditorias.filter((row) => {
        const query = `${row.usuario} ${row.accion} ${row.modulo} ${row.depto} ${row.equipo}`.toLowerCase();
        const matchesSearch = query.includes(search.toLowerCase());
        const matchesTipo = tipo === "Todos los tipos" || row.tipo === tipo;
        const matchesEquipo = equipo === "Todos los equipos" || row.equipo === equipo;

        return matchesSearch && matchesTipo && matchesEquipo;
      }),
    [equipo, search, tipo],
  );

  return (
    <div className="space-y-4">
     
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#21192c] sm:text-xl">Auditoria</h2>
            <p className="mt-1 text-sm font-semibold text-[#9e95aa]">Revisa movimientos y estado actual del sistema</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
            <ExportButton icon={FileSpreadsheet} tone="green">
              Exportar Excel
            </ExportButton>
            <ExportButton icon={FileDown} tone="red">
              Exportar PDF
            </ExportButton>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8f879b]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar..."
              className="h-10 w-full rounded-full border border-[#ded6c8] bg-[#eee8dc] pl-11 pr-4 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <SoftSelect
            value={tipo}
            onChange={setTipo}
            options={["Todos los tipos", "Acceso", "Firma digital", "Registro", "Asignacion"]}
          />
          <SoftSelect
            value={equipo}
            onChange={setEquipo}
            options={["Todos los equipos", "Sistema", "Dell XPS 15", "HP EliteDesk 800", "Samsung Tab A8"]}
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-[#e9e0cf] text-left text-[11px] font-black uppercase tracking-[0.22em] text-[#9c91aa]">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Accion</th>
                <th className="px-4 py-3">Modulo</th>
                <th className="px-4 py-3">Depto.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.fecha}-${row.accion}-${row.modulo}`} className="border-b border-[#eee8f6] last:border-0">
                  <td className="px-4 py-4 font-semibold text-blue-300">{row.fecha}</td>
                  <td className="px-4 py-4 font-black text-[#21192c]">{row.usuario}</td>
                  <td className="px-4 py-4 font-semibold text-[#3c3445]">{row.accion}</td>
                  <td className="px-4 py-4 font-semibold text-[#6f6584]">{row.modulo}</td>
                  <td className="px-4 py-4 font-semibold text-[#6f6584]">{row.depto}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="border-t border-[#eee8f6] px-4 py-10 text-center text-sm font-semibold text-[#9e95aa]">
              No hay movimientos para los filtros seleccionados.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
