import { Fragment, useEffect, useState } from "react";
import { Check, FileText, RotateCcw, Search } from "lucide-react";
import BackButton from "../components/BackButton";
import DateInput from "./DateInput";
import { formatDate, formatIsoDate } from "./dateUtils";
import { typeOptions } from "../Views-Rubi/equiposData";

const steps = ["Colaborador", "Activo", "Tipo y fecha", "Confirmar"];

const assetLabels = {
  equipo: "Equipo tecnologico",
  tarjeta: "Tarjeta comedor",
  yubikey: "YubiKey",
};

function assetLabel(type) {
  return assetLabels[type] || "Activo";
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
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-400 dark:bg-gray-700"
                  }`}
              >
                {done ? <Check size={12} strokeWidth={3} /> : index + 1}
              </div>
              <span
                className={`whitespace-nowrap text-xs font-semibold ${active
                  ? "text-blue-600 dark:text-blue-300"
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
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 transition placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
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
        ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/60 dark:border-gray-700 dark:bg-gray-800/40"
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100">{title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
        </div>
        {selected?.id === item.id && <Check size={14} className="shrink-0 text-blue-600 dark:text-blue-300" />}
      </div>
    </button>
  );
}

function Step1({ colaboradores, selected, onSelect }) {
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
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-900/20">
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

function Step2({ assets, setTipoActivo, selected, onSelect, selectedIds }) {
  const [search, setSearch] = useState("");
  const [equipmentType, setEquipmentType] = useState("all");
  const filtered = assets.filter((asset) => {
    const typeMatches = equipmentType === "all" || asset.tipo === equipmentType;
    const query = `${asset.codigo} ${asset.nombre} ${asset.marca} ${asset.modelo} ${asset.serie} ${asset.tipo}`.toLowerCase();
    return typeMatches && !selectedIds.has(asset.id) && query.includes(search.toLowerCase());
  });

  const selectAsset = (asset) => {
    const normalizedType = asset?.tipo?.toLowerCase();
    setTipoActivo(normalizedType === "tarjeta" ? "tarjeta" : normalizedType === "yubikey" ? "yubikey" : "equipo");
    onSelect(asset);
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <div className="space-y-2">
          <SearchInput placeholder="Buscar nombre, codigo, marca, modelo, serie o tipo..." value={search} onChange={setSearch} />
          <select value={equipmentType} onChange={(event) => { setEquipmentType(event.target.value); onSelect(null); }} className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
            <option value="all">Todos los tipos</option>
            {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="mt-2 max-h-44 overflow-y-auto">
          {filtered.map((asset) => (
            <SelectableRow key={asset.id} item={asset} selected={selected} onSelect={selectAsset} title={`${asset.nombre} (#${asset.codigo})`} subtitle={`${asset.marca} ${asset.modelo} - ${asset.serie}`} />
          ))}
          {filtered.length === 0 && <div className="rounded-lg border border-dashed border-gray-200 px-3 py-5 text-center text-xs text-gray-400 dark:border-gray-700">Sin activos disponibles para los filtros seleccionados.</div>}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Activo seleccionado</p>
        {selected ? (
          <div className="space-y-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-900/20">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{selected.nombre} #{selected.codigo}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{selected.tipo} - {selected.marca} {selected.modelo} - Disponible</p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400 dark:border-gray-700">Selecciona un activo</div>
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
                ? "border-[#3A9AF2] bg-[#3A9AF2] text-[#FFFFFF] shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300"
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
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 pr-10 text-sm text-gray-700 transition focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
        />
        {tipo === "Permanente" && <p className="mt-1.5 text-xs text-gray-400">No aplica para asignaciones permanentes.</p>}
      </div>
    </div>
  );
}

function Step4({ colaborador, items }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="bg-blue-600 px-4 py-2.5">
        <p className="text-sm font-bold text-white">Resumen de asignacion</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {[
          ["Colaborador", colaborador?.nombre],
          ["Numero", colaborador?.numero],
          ["Puesto", colaborador?.puesto],
          ["Departamento / Area", colaborador?.departamento || colaborador?.area],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-right font-semibold text-gray-800 dark:text-gray-100">{value || "-"}</span>
          </div>
        ))}
        {items.map((item) => (
          <div key={item.key} className="px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-gray-800 dark:text-gray-100">{item.nombre} #{item.codigo}</span>
              <Badge estado={item.tipoAsignacion} />
            </div>
            <p className="mt-1 text-xs text-gray-400">{item.tipoActivo} - {item.marca} {item.modelo} - {item.serie || "Sin serie"}</p>
            <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-300">Devolucion: {item.fechaDev ? formatDate(item.fechaDev) : "Permanente"}</p>
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

function groupAssignmentsByCollaborator(assignments) {
  const groups = new Map();

  assignments.forEach((assignment, assignmentIndex) => {
    const collaboratorId = Number(assignment.colaborador?.id);
    const collaboratorKey = Number.isFinite(collaboratorId)
      ? collaboratorId
      : assignment.colaborador?.numero || `sin-colaborador-${assignmentIndex}`;
    const existing = groups.get(String(collaboratorKey));
    const items = (assignment.items || []).map((item) => ({
      ...item,
      idAsignacion: assignment.idAsignacion,
      idResguardo: assignment.idResguardo,
    }));

    if (existing) {
      const knownItemKeys = new Set(existing.items.map((item) => item.key));
      existing.assignments.push(assignment);
      items.forEach((item) => {
        if (!knownItemKeys.has(item.key)) {
          existing.items.push(item);
          knownItemKeys.add(item.key);
        }
      });
      return;
    }

    groups.set(String(collaboratorKey), {
      ...assignment,
      groupKey: `colaborador-${collaboratorKey}`,
      assignments: [assignment],
      items,
    });
  });

  return [...groups.values()];
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
    <div className="min-w-0 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-6">
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
        <span className="text-xs font-semibold text-blue-500 lg:pt-3">{totalAssets} activos</span>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
          {rows.length === 0 ? "Aun no hay activos asignados." : "No se encontraron asignaciones con esa busqueda."}
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
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
                const rowKey = resguardo.groupKey || resguardo.idAsignacion || resguardo.folio || resguardo.colaborador?.id || resguardo.colaborador?.numero;
                const items = resguardo.items || [];
                const expanded = expandedKey === rowKey;
                const tipos = [...new Set(items.map((item) => item.nombre || item.tipoLabel).filter(Boolean))].join(", ");
                const asignaciones = [...new Set(items.map((item) => item.tipoAsignacion || resguardo.tipo))];
                const firstStart = items[0]?.fechaAsignacion || resguardo.fecha;
                const devoluciones = [...new Set(items.map((item) => (
                  item.fechaDev ? formatIsoDate(item.fechaDev) : "Permanente"
                )))];

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
                      <td className="whitespace-nowrap px-2 py-3 text-gray-500 dark:text-gray-400">
                        {formatIsoDate(firstStart)}
                      </td>
                      <td className="px-2 py-3 text-gray-500 dark:text-gray-400">
                        {devoluciones.join(", ")}
                      </td>
                      <td className="py-3 pl-2 pr-0">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedKey(expanded ? null : rowKey)}
                            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-gray-50 px-3 text-xs font-black text-gray-600 transition hover:bg-gray-100 dark:bg-[#f4efe6]/10 dark:text-[#ddd4e7] dark:hover:bg-[#f4efe6]/15"
                          >
                            Ver asignaciones
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenResguardo?.(resguardo)}
                            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100"
                          >
                            <FileText size={13} />
                            Resguardo
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDevolucion?.(resguardo, items.map((item) => item.key))}
                            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-emerald-50 px-3 text-xs font-black text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-400/15 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
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

export default function NuevaAsignacion({ addMode = false, initialColaborador, initialStep = 0, initialItems = [], onOpenResguardo, onOpenDevolucion, onCreateResguardo, onBack }) {
  const [step, setStep] = useState(initialStep);
  const [colaborador, setColaborador] = useState(addMode ? initialColaborador || null : null);
  const [tipoActivo, setTipoActivo] = useState("equipo");
  const [activo, setActivo] = useState(null);
  const [tipo, setTipo] = useState("Temporal");
  const [fechaDev, setFechaDev] = useState("");
  const [colaboradores, setColaboradores] = useState([]);
  const [assets, setAssets] = useState([]);
  const [asignacionesActivas, setAsignacionesActivas] = useState([]);
  const [message, setMessage] = useState("");
  const addingToExistingResguardo = addMode && !!initialColaborador;
  const contextItems = addMode ? initialItems : [];
  const selectedIds = new Set(contextItems.map((item) => Number(item.id)));

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("scaet-token")}` };
    Promise.all([
      fetch("/api/colaboradores?estado=activos", { headers }),
      fetch("/api/equipos?estado=activos&estado_equipo=disponible", { headers }),
      fetch("/api/asignaciones/activas", { headers }),
    ]).then(async (responses) => {
      const payloads = await Promise.all(responses.map((response) => response.json().then((data) => ({ response, data }))));
      const failed = payloads.find(({ response }) => !response.ok);
      if (failed) throw new Error(failed.data.mensaje || "No se pudieron cargar los datos de asignacion");

      setColaboradores((payloads[0].data.colaboradores || []).map((item) => ({
        id: Number(item.id_colaborador), numero: item.num_colaborador, nombre: item.nombre_completo,
        area: item.area, departamento: item.departamento, puesto: item.puesto, correo: item.correo,
      })));
      setAssets((payloads[1].data.equipos || []).map((item) => ({
        id: Number(item.id_equipo), codigo: item.codigo_equipo, nombre: item.nombre_equipo,
        tipo: item.tipo_equipo, marca: item.marca, modelo: item.modelo, serie: item.numero_serie,
        estado: item.estado, proveedor: item.nombre_proveedor || "-",
      })));
      const mappedAssignments = (payloads[2].data.asignaciones || []).map((assignment) => ({
        idAsignacion: assignment.id_asignacion,
        idResguardo: assignment.resguardo?.id_resguardo,
        folio: assignment.resguardo?.folio,
        fecha: assignment.fecha_resguardo,
        tipo: assignment.tipo_asignacion_general === "mixto" ? "Mixto" : `${assignment.tipo_asignacion_general?.[0]?.toUpperCase() || ""}${assignment.tipo_asignacion_general?.slice(1) || ""}`,
        colaborador: {
          id: Number(assignment.colaborador.id_colaborador), numero: assignment.colaborador.num_colaborador,
          nombre: assignment.colaborador.nombre_completo, area: assignment.colaborador.area,
          departamento: assignment.colaborador.departamento, puesto: assignment.colaborador.puesto,
          correo: assignment.colaborador.correo,
        },
        items: (assignment.activos || []).map((item) => ({
          key: `detalle-${item.id_detalle}`, id: Number(item.id_equipo), idDetalle: item.id_detalle,
          tipoResguardo: item.tipo_equipo === "Tarjeta" ? "tarjeta" : item.tipo_equipo === "YubiKey" ? "yubikey" : "equipo",
          tipoLabel: item.tipo_equipo, codigo: item.codigo_equipo, nombre: item.nombre_equipo,
          tipoActivo: item.tipo_equipo, marca: item.marca, modelo: item.modelo, serie: item.numero_serie,
          fechaAsignacion: item.fecha_asignacion,
          tipoAsignacion: `${item.tipo_asignacion[0].toUpperCase()}${item.tipo_asignacion.slice(1)}`,
          fechaDev: item.fecha_devolucion_programada || "",
          accesorios: item.accesorios_entregados || "",
          estadoEntrega: item.estado_fisico_entrega,
          observaciones: item.observaciones || "",
        })),
      }));
      setAsignacionesActivas(groupAssignmentsByCollaborator(mappedAssignments));
    }).catch((error) => setMessage(error.message));
  }, []);

  const canNext = [!!colaborador, !!activo, tipo === "Permanente" || !!fechaDev, true];

  const reset = () => {
    setStep(0);
    setColaborador(null);
    setTipoActivo("equipo");
    setActivo(null);
    setTipo("Temporal");
    setFechaDev("");
  };

  const handleSelectCollaborator = (nextCollaborator) => {
    if (!addMode && nextCollaborator?.id !== colaborador?.id) {
      setActivo(null);
      setTipoActivo("equipo");
      setTipo("Temporal");
      setFechaDev("");
    }
    setColaborador(nextCollaborator);
  };

  const currentItem = activo ? {
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
    fechaAsignacion: new Date().toISOString().slice(0, 10),
    tipoAsignacion: tipo,
    fechaDev: tipo === "Permanente" ? "" : fechaDev,
    estadoEntrega: "Buen estado",
    accesorios: "",
    observaciones: "",
  } : null;
  const confirmationItems = currentItem ? [...contextItems, currentItem] : contextItems;
  const hasUnsavedChanges = step !== initialStep
    || colaborador?.id !== (addMode ? initialColaborador?.id : undefined)
    || Boolean(activo)
    || tipo !== "Temporal"
    || Boolean(fechaDev);

  const handleConfirm = () => {
    if (!currentItem) return;
    onCreateResguardo?.({
      fecha: currentItem.fechaAsignacion,
      colaborador,
      equipo: activo,
      item: currentItem,
      tipoResguardo: tipoActivo,
      tipo,
      fechaDev: currentItem.fechaDev,
      numeroEmpleado: colaborador.numero,
      activoInventario: activo.codigo,
      accesorios: "",
      estadoFisico: "Buen estado",
      ubicacionTrabajo: colaborador.area || colaborador.departamento || "-",
      responsableEntrega: "Responsable de entrega",
      observaciones: "",
    });
    reset();
  };

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      {addingToExistingResguardo && (
        <BackButton onBack={onBack} hasUnsavedChanges={hasUnsavedChanges} label="Volver al resguardo" />
      )}
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

      {message && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
          {message}
        </p>
      )}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#16131F] sm:p-6">
        <StepIndicator current={step} />
        <div className="min-h-[180px]">
          {step === 0 && <Step1 colaboradores={colaboradores} selected={colaborador} onSelect={handleSelectCollaborator} />}
          {step === 1 && <Step2 assets={assets} tipoActivo={tipoActivo} setTipoActivo={setTipoActivo} selected={activo} onSelect={setActivo} selectedIds={selectedIds} />}
          {step === 2 && <Step3 tipo={tipo} setTipo={(value) => { setTipo(value); if (value === "Permanente") setFechaDev(""); }} fechaDev={fechaDev} setFechaDev={setFechaDev} />}
          {step === 3 && <Step4 colaborador={colaborador} items={confirmationItems} />}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-end">
          {!(addingToExistingResguardo && step === 0) && (
            <button type="button" onClick={() => (step === 0 ? reset() : setStep((value) => value - 1))} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              {step === 0 ? "Cancelar" : "Regresar"}
            </button>
          )}
          {step < 3 ? (
            <button type="button" onClick={() => setStep((value) => value + 1)} disabled={!canNext[step]} className="rounded-lg bg-[#3A9AF2] px-5 py-2 text-sm font-semibold text-[#FFFFFF] shadow-sm transition hover:bg-[#238BEA] disabled:cursor-not-allowed disabled:opacity-40">Continuar</button>
          ) : (
            <button type="button" onClick={handleConfirm} className="rounded-lg bg-[#3A9AF2] px-5 py-2 text-sm font-semibold text-[#FFFFFF] shadow-sm transition hover:bg-[#238BEA]">Confirmar y generar resguardo</button>
          )}
        </div>
      </div>
      <ActiveAssignments rows={asignacionesActivas} onOpenResguardo={onOpenResguardo} onOpenDevolucion={onOpenDevolucion} />
    </div>
  );
}
