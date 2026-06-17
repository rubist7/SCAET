import { Fragment, useState } from "react";
import { Check, CreditCard, FileText, KeyRound, Laptop, RotateCcw, Search } from "lucide-react";
import DateInput from "./DateInput";
import { formatDate } from "./dateUtils";
import { colaboradores, equipos, tarjetasComedor, yubikeys } from "./asignacionData";

const steps = ["Colaborador", "Activo", "Tipo y fecha", "Confirmar"];

const assetTypes = [
  { value: "equipo", label: "Equipo tecnologico", shortLabel: "Equipo", icon: Laptop },
  { value: "tarjeta", label: "Tarjeta comedor", shortLabel: "Tarjeta", icon: CreditCard },
  { value: "yubikey", label: "Yubikey", shortLabel: "Yubikey", icon: KeyRound },
];

const assetsByType = {
  equipo: equipos,
  tarjeta: tarjetasComedor,
  yubikey: yubikeys,
};

function assetLabel(type) {
  return assetTypes.find((option) => option.value === type)?.label || "Activo";
}

function StepIndicator({ current }) {
  return (
    <div className="mb-7 flex overflow-x-auto pb-2">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <div key={label} className="flex min-w-[150px] flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-violet-600 text-white"
                    : "bg-gray-200 text-gray-400 dark:bg-gray-700"
                  }`}
              >
                {done ? <Check size={12} strokeWidth={3} /> : index + 1}
              </div>
              <span
                className={`whitespace-nowrap text-xs font-semibold ${active
                  ? "text-violet-600 dark:text-violet-300"
                  : done
                    ? "text-emerald-500"
                    : "text-gray-400"
                  }`}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-3 h-px flex-1 ${done ? "bg-emerald-300" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SearchInput({ placeholder, value, onChange }) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 transition placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
      />
    </div>
  );
}

function SelectableRow({ item, selected, onSelect, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`mb-1.5 w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${selected?.id === item.id
        ? "border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-900/20"
        : "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/60 dark:border-gray-700 dark:bg-gray-800/40"
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100">{title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
        </div>
        {selected?.id === item.id && <Check size={14} className="shrink-0 text-violet-600 dark:text-violet-300" />}
      </div>
    </button>
  );
}

function Step1({ selected, onSelect }) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.toLowerCase();
  const filtered = colaboradores.filter((colaborador) => {
    const query = [
      colaborador.nombre,
      colaborador.puesto,
      colaborador.departamento,
      colaborador.area,
      colaborador.numero,
    ].join(" ").toLowerCase();

    return query.includes(normalizedSearch);
  });

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Busca un colaborador
        </p>
        <SearchInput placeholder="Buscar nombre, puesto, departamento o numero..." value={search} onChange={setSearch} />
        <div className="mt-2 max-h-44 overflow-y-auto pr-0.5">
          {filtered.map((colaborador) => (
            <SelectableRow
              key={colaborador.id}
              item={colaborador}
              selected={selected}
              onSelect={onSelect}
              title={colaborador.nombre}
              subtitle={`${colaborador.puesto} - ${colaborador.departamento}`}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Colaborador seleccionado
        </p>
        {selected ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-700 dark:bg-violet-900/20">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{selected.nombre}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {selected.numero} - {selected.puesto} - {selected.area}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400 dark:border-gray-700">
            Selecciona un colaborador
          </div>
        )}
      </div>
    </div>
  );
}

function Step2({ tipoActivo, setTipoActivo, selected, onSelect }) {
  const [search, setSearch] = useState("");
  const selectedType = assetTypes.find((option) => option.value === tipoActivo);
  const filtered = assetsByType[tipoActivo].filter((asset) =>
    `${asset.nombre} ${asset.codigo} ${asset.serie} ${asset.modelo}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {assetTypes.map((option) => {
            const Icon = option.icon;
            const active = tipoActivo === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTipoActivo(option.value);
                  onSelect(null);
                  setSearch("");
                }}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold transition ${active
                    ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-500 hover:border-violet-300 hover:bg-violet-50 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300"
                  }`}
              >
                <Icon size={17} />
                <span className="text-center leading-tight">{option.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Busca {selectedType?.label.toLowerCase()}
        </p>
        <SearchInput placeholder="Buscar nombre, codigo, serie o modelo..." value={search} onChange={setSearch} />
        <div className="mt-2 max-h-44 overflow-y-auto">
          {filtered.map((asset) => (
            <SelectableRow
              key={`${tipoActivo}-${asset.id}`}
              item={asset}
              selected={selected}
              onSelect={onSelect}
              title={`${asset.nombre} (#${asset.codigo})`}
              subtitle={`${asset.marca} ${asset.modelo} - ${asset.serie}`}
            />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-5 text-center text-xs text-gray-400 dark:border-gray-700">
              Sin resultados para este tipo de activo.
            </div>
          )}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {selectedType?.shortLabel} seleccionado
        </p>
        {selected ? (
          <div className="space-y-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-700 dark:bg-violet-900/20">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {selected.nombre} #{selected.codigo}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selected.tipo} - {selected.marca} {selected.modelo} - Disponible
            </p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400 dark:border-gray-700">
            Selecciona {selectedType?.label.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
}

function Step3({ tipo, setTipo, fechaDev, setFechaDev }) {
  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Tipo de asignacion
        </p>
        <div className="flex flex-wrap gap-3">
          {["Temporal", "Permanente"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTipo(option)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${tipo === option
                ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-violet-300 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300"
                }`}
            >
              <span className={`h-3 w-3 rounded-full border-2 ${tipo === option ? "border-white bg-white" : "border-gray-400"}`} />
              {option}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Fecha de devolucion
        </p>
        <DateInput
          value={fechaDev}
          onChange={setFechaDev}
          disabled={tipo === "Permanente"}
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 pr-10 text-sm text-gray-700 transition focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
        />
        {tipo === "Permanente" && <p className="mt-1.5 text-xs text-gray-400">No aplica para asignaciones permanentes.</p>}
      </div>
    </div>
  );
}

function Step4({ colaborador, tipoActivo, activo, tipo, fechaDev }) {
  const rows = [
    ["Colaborador", colaborador?.nombre],
    ["Tipo de resguardo", assetLabel(tipoActivo)],
    ["Activo", activo ? `${activo.nombre} #${activo.codigo}` : ""],
    ["Marca / Modelo", activo ? `${activo.marca} ${activo.modelo}` : ""],
    ["Numero de serie", activo?.serie],
    ["Tipo de asignacion", tipo],
    ["Fecha de devolucion", tipo === "Permanente" ? "Permanente" : formatDate(fechaDev) || "-"],
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="bg-violet-600 px-4 py-2.5">
        <p className="text-sm font-bold text-white">Resumen de asignacion</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-right font-semibold text-gray-800 dark:text-gray-100">{value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ estado }) {
  const colors = {
    Temporal: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
    Permanente: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[estado]}`}>{estado}</span>;
}

function ActiveAssignments({ rows, onOpenResguardo, onOpenDevolucion }) {
  const [expandedKey, setExpandedKey] = useState(null);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.toLowerCase();
  const filteredRows = rows.filter((row) => {
    const colaborador = row.colaborador || {};
    const items = row.items || [];
    const query = [
      colaborador.nombre,
      colaborador.puesto,
      colaborador.departamento,
      colaborador.area,
      colaborador.numero,
      ...items.flatMap((item) => [item.nombre, item.codigo, item.tipoLabel, item.marca, item.modelo, item.serie]),
    ].join(" ").toLowerCase();

    return query.includes(normalizedSearch);
  });
  const totalAssets = filteredRows.reduce((count, row) => count + (row.items?.length || 0), 0);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-6">
      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,430px)_auto] lg:items-start">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">Asignaciones activas</h2>
          <p className="mt-1 text-xs text-gray-400">Activos enlazados a resguardos y devoluciones.</p>
        </div>
        <SearchInput
          placeholder="Buscar nombre, puesto, departamento o numero..."
          value={search}
          onChange={setSearch}
        />
        <span className="text-xs font-semibold text-violet-500 lg:pt-3">{totalAssets} activos</span>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
          {rows.length === 0 ? "Aun no hay activos asignados." : "No se encontraron asignaciones con esa busqueda."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Colaborador", "Asignaciones", "Tipos", "Asignacion", "Inicio", "Devolucion", "Acciones"].map((heading) => (
                  <th key={heading} className="px-2 pb-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 first:pl-0 last:pr-0">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((resguardo) => {
                const rowKey = resguardo.colaborador?.id || resguardo.colaborador?.numero || resguardo.folio;
                const items = resguardo.items || [];
                const expanded = expandedKey === rowKey;
                const tipos = [...new Set(items.map((item) => item.tipoLabel))].join(", ");
                const asignaciones = [...new Set(items.map((item) => item.tipoAsignacion || resguardo.tipo))];
                const firstStart = items[0]?.fechaAsignacion || resguardo.fecha;
                const hasPermanent = items.some((item) => !item.fechaDev);

                return (
                  <Fragment key={rowKey}>
                    <tr className="border-b border-gray-50 dark:border-gray-800/70">
                      <td className="py-3 pl-0 pr-2 font-medium text-gray-800 dark:text-gray-100">
                        <p>{resguardo.colaborador?.nombre}</p>
                        <p className="text-xs font-normal text-gray-400">#{resguardo.colaborador?.numero}</p>
                      </td>
                      <td className="px-2 py-3 text-gray-600 dark:text-gray-300">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{items.length} {items.length === 1 ? "activo" : "activos"}</p>
                      </td>
                      <td className="px-2 py-3 text-gray-500 dark:text-gray-400">{tipos || "-"}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {asignaciones.map((asignacion) => <Badge key={asignacion} estado={asignacion} />)}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-gray-500 dark:text-gray-400">{formatDate(firstStart)}</td>
                      <td className="px-2 py-3 text-gray-500 dark:text-gray-400">{hasPermanent ? "Permanente" : "Programada"}</td>
                      <td className="py-3 pl-2 pr-0">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedKey(expanded ? null : rowKey)}
                            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-gray-50 px-3 text-xs font-black text-gray-600 transition hover:bg-gray-100"
                          >
                            Ver asignaciones
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenResguardo?.(resguardo)}
                            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-violet-50 px-3 text-xs font-black text-violet-600 transition hover:bg-violet-100"
                          >
                            <FileText size={13} />
                            Resguardo
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDevolucion?.(resguardo, items.map((item) => item.key))}
                            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-emerald-50 px-3 text-xs font-black text-emerald-600 transition hover:bg-emerald-100"
                          >
                            <RotateCcw size={13} />
                            Devolver
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-gray-50 dark:border-gray-800/70">
                        <td colSpan={7} className="px-0 py-3">
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
                            <div className="grid gap-2 md:grid-cols-2">
                              {items.map((item) => (
                                <div key={item.key} className="rounded-[8px] bg-white p-3 text-xs dark:bg-[#16131F]">
                                  <p className="font-black text-gray-800 dark:text-gray-100">{item.nombre} {item.codigo ? `#${item.codigo}` : ""}</p>
                                  <p className="mt-1 text-gray-400">{item.tipoLabel} - {item.marca || "-"} {item.modelo || ""} - {item.serie || "Sin serie"}</p>
                                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                                    {item.tipoAsignacion || resguardo.tipo} - {formatDate(item.fechaAsignacion || resguardo.fecha)}
                                    {item.fechaDev ? ` - Dev. ${formatDate(item.fechaDev)}` : " - Permanente"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function NuevaAsignacion({ initialColaborador, initialStep = 0, asignacionesActivas = [], onOpenResguardo, onOpenDevolucion, onCreateResguardo }) {
  const [step, setStep] = useState(initialStep);
  const [colaborador, setColaborador] = useState(initialColaborador || null);
  const [tipoActivo, setTipoActivo] = useState("equipo");
  const [activo, setActivo] = useState(null);
  const [tipo, setTipo] = useState("Temporal");
  const [fechaDev, setFechaDev] = useState("");
  const addingToExistingResguardo = !!initialColaborador;

  const canNext = [!!colaborador, !!activo, tipo === "Permanente" || !!fechaDev, true];

  const reset = () => {
    setStep(0);
    setColaborador(null);
    setTipoActivo("equipo");
    setActivo(null);
    setTipo("Temporal");
    setFechaDev("");
  };

  const handleConfirm = () => {
    const today = new Date();
    const folioDate = today.toISOString().slice(0, 10).replaceAll("-", "");
    const fechaAsignacion = today.toISOString().slice(0, 10);
    const item = {
      key: `${tipoActivo}-${activo.id}`,
      id: activo.id,
      tipoResguardo: tipoActivo,
      tipoLabel: assetLabel(tipoActivo),
      codigo: activo.codigo,
      nombre: activo.nombre,
      tipoActivo: activo.tipo,
      marca: activo.marca,
      modelo: activo.modelo,
      serie: activo.serie,
      proveedor: activo.proveedor,
      fechaAsignacion,
      tipoAsignacion: tipo,
      fechaDev: tipo === "Permanente" ? "" : fechaDev,
      estadoEntrega: activo.estadoEntrega || "Nueva / Buen estado",
    };

    onCreateResguardo?.({
      folio: `RSG-${folioDate}-${tipoActivo.toUpperCase()}-${String(activo.id).padStart(3, "0")}`,
      fecha: fechaAsignacion,
      colaborador,
      equipo: tipoActivo === "equipo" ? activo : equipos[0],
      item,
      tipoResguardo: tipoActivo,
      tipo,
      fechaDev: tipo === "Permanente" ? "" : fechaDev,
      numeroEmpleado: colaborador.numero,
      activoInventario: activo.codigo,
      idTarjeta: tipoActivo === "tarjeta" ? activo.codigo : "",
      estadoEntrega: tipoActivo === "tarjeta" ? activo.estadoEntrega : "Nueva / Buen estado",
      departamentoTarjeta: colaborador.departamento,
      puestoTarjeta: colaborador.puesto,
      fechaEntregaTarjeta: today.toISOString().slice(0, 10),
      yubikey: tipoActivo === "yubikey" ? activo.nombre : "YubiKey 5 NFC",
      serieYubikey: tipoActivo === "yubikey" ? activo.serie : "",
      modeloYubikey: tipoActivo === "yubikey" ? activo.modelo : "YubiKey 5 NFC",
      userId: colaborador.nombre.toLowerCase().split(" ").slice(0, 2).join("."),
      observaciones: "",
    });

    reset();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
          {addingToExistingResguardo ? "Agregar activo al resguardo" : "Nueva asignacion"}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {addingToExistingResguardo
            ? `Selecciona otro activo para ${initialColaborador.nombre}.`
            : "Selecciona colaborador y activo para generar el resguardo de firma."}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-6">
        <StepIndicator current={step} />

        <div className="min-h-[180px]">
          {step === 0 && <Step1 selected={colaborador} onSelect={setColaborador} />}
          {step === 1 && <Step2 tipoActivo={tipoActivo} setTipoActivo={setTipoActivo} selected={activo} onSelect={setActivo} />}
          {step === 2 && <Step3 tipo={tipo} setTipo={setTipo} fechaDev={fechaDev} setFechaDev={setFechaDev} />}
          {step === 3 && <Step4 colaborador={colaborador} tipoActivo={tipoActivo} activo={activo} tipo={tipo} fechaDev={fechaDev} />}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => (step === 0 ? reset() : setStep((value) => value - 1))}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {step === 0 ? "Cancelar" : "Regresar"}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((value) => value + 1)}
              disabled={!canNext[step]}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
              Confirmar y generar resguardo
            </button>
          )}
        </div>
      </div>

      <ActiveAssignments rows={asignacionesActivas} onOpenResguardo={onOpenResguardo} onOpenDevolucion={onOpenDevolucion} />
    </div>
  );
}
