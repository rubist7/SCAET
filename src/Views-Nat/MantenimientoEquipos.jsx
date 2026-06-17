import { useMemo, useState } from "react";
import { ChevronDown, EyeOff, RotateCcw, Search } from "lucide-react";
import { formatCurrency, parseCurrencyValue } from "./currency";
import { formatDate } from "./dateUtils";
import { mantenimientoEquipos } from "./mantenimientoData";

const statusStyles = {
    Asignado: "bg-emerald-100 text-emerald-600",
    Disponible: "bg-blue-100 text-blue-600",
    Mantenimiento: "bg-amber-100 text-amber-600",
};

const maintenanceStatusStyles = {
    "En proceso": "bg-amber-100 text-amber-600",
    Resuelto: "bg-emerald-100 text-emerald-600",
    Pendiente: "bg-red-100 text-red-500",
};

const categoriaStyles = {
    Falla: "border-red-400 bg-red-50 text-red-500",
    Preventivo: "border-emerald-400 bg-emerald-50 text-emerald-600",
    Correctivo: "border-blue-400 bg-blue-50 text-blue-600",
};

function SelectFilter({ value, onChange, options }) {
    return (
        <div className="relative w-full lg:w-auto">
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-10 w-full appearance-none rounded-full border border-[#ded6c8] bg-white px-4 pr-9 text-xs font-bold text-[#3c3445] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 lg:w-auto"
            >
                {options.map((option) => (
                    <option key={option}>{option}</option>
                ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6f6584]" />
        </div>
    );
}

function StatusBadge({ value }) {
    return <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusStyles[value]}`}>{value}</span>;
}

function MaintenanceStatusBadge({ value }) {
    return <span className={`rounded-full px-3 py-1 text-[11px] font-black ${maintenanceStatusStyles[value] || "bg-violet-50 text-violet-600"}`}>{value}</span>;
}

function MaintenanceEntryCard({ entry, isHidden = false, onHide, onRestore }) {
    const categoryStyle = categoriaStyles[entry.categoria] || "border-violet-400 bg-violet-50 text-violet-600";
    const canHide = entry.estado === "Resuelto";

    return (
        <article className={`rounded-[8px] border-l-4 bg-white p-4 shadow-sm ${categoryStyle.split(" ")[0]} ${isHidden ? "opacity-75" : ""}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${categoryStyle.replace(categoryStyle.split(" ")[0], "")}`}>
                            {entry.categoria}
                        </span>
                        <h3 className="text-sm font-black text-[#21192c]">{entry.titulo}</h3>
                    </div>
                    <p className="mt-2 text-xs font-black text-violet-500">
                        {entry.equipoNombre || "Equipo sin nombre"}
                        {entry.equipoSerie ? <span className="font-semibold text-[#9e95aa]"> - {entry.equipoSerie}</span> : null}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-[#6f6584]">{entry.descripcion}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#b1a58f]">
                        <span>Tec. {entry.tecnico}</span>
                        <span>En</span>
                        <MaintenanceStatusBadge value={entry.estado} />
                    </div>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                    <p className="text-xs font-bold text-violet-300">{formatDate(entry.fecha)}</p>
                    <p className="mt-8 text-sm font-black text-[#21192c]">{formatCurrency(entry.costo)}</p>
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                {isHidden ? (
                    <button
                        type="button"
                        onClick={() => onRestore?.(entry.id)}
                        className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-violet-50 px-3 text-xs font-black text-violet-600 transition hover:bg-violet-100"
                    >
                        <RotateCcw size={14} />
                        Restaurar
                    </button>
                ) : canHide ? (
                    <button
                        type="button"
                        onClick={() => onHide?.(entry.id)}
                        className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-[#eee8dc] px-3 text-xs font-black text-[#6f6584] transition hover:bg-[#e4dccd]"
                    >
                        <EyeOff size={14} />
                    </button>
                ) : null}
            </div>
        </article>
    );
}

export default function MantenimientoEquipos({ entries = [], onOpenBitacora }) {
    const [search, setSearch] = useState("");
    const [tipo, setTipo] = useState("Todos los tipos");
    const [marca, setMarca] = useState("Todas las marcas");
    const [hiddenEntryIds, setHiddenEntryIds] = useState([]);
    const [showHiddenEntries, setShowHiddenEntries] = useState(false);

    const filtered = useMemo(
        () =>
            mantenimientoEquipos.filter((equipo) => {
                const query = `${equipo.nombre} ${equipo.serie} ${equipo.modelo}`.toLowerCase();
                const matchesSearch = query.includes(search.toLowerCase());
                const matchesTipo = tipo === "Todos los tipos" || equipo.tipo === tipo;
                const matchesMarca = marca === "Todas las marcas" || equipo.marca === marca;

                return matchesSearch && matchesTipo && matchesMarca;
            }),
        [marca, search, tipo],
    );

    const hiddenEntries = useMemo(
        () => entries.filter((entry) => hiddenEntryIds.includes(entry.id)),
        [entries, hiddenEntryIds],
    );
    const visibleEntries = useMemo(
        () => entries.filter((entry) => !hiddenEntryIds.includes(entry.id)),
        [entries, hiddenEntryIds],
    );

    const totalCost = useMemo(
        () => visibleEntries.reduce((total, entry) => total + parseCurrencyValue(entry.costo), 0),
        [visibleEntries],
    );

    const handleHideEntry = (entryId) => {
        setHiddenEntryIds((current) => (current.includes(entryId) ? current : [...current, entryId]));
    };

    const handleRestoreEntry = (entryId) => {
        setHiddenEntryIds((current) => current.filter((id) => id !== entryId));
    };

    return (
        <div className="space-y-4">

            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="mt-3 text-lg font-black text-[#21192c] sm:text-xl">¿A que equipo registraras mantenimiento?</h2>
                        <p className="mt-1 text-sm font-semibold text-[#9e95aa]">Busca y selecciona el equipo para abrir su bitacora</p>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8f879b]" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nombre o serie..."
                            className="h-10 w-full rounded-full border border-[#ded6c8] bg-[#eee8dc] pl-11 pr-4 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                    </div>
                    <SelectFilter value={tipo} onChange={setTipo} options={["Todos los tipos", "Laptop", "Tablet", "Computadora"]} />
                    <SelectFilter value={marca} onChange={setMarca} options={["Todas las marcas", "Dell", "Samsung", "HP"]} />
                </div>

                <div className="mt-3 overflow-x-auto rounded-b-2xl">
                    <table className="w-full min-w-[920px] text-sm">
                        <thead>
                            <tr className="bg-[#e9e0cf] text-left text-[11px] font-black uppercase tracking-[0.22em] text-[#9c91aa]">
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Marca / Modelo</th>
                                <th className="px-4 py-3">Serie</th>
                                <th className="px-4 py-3">Area</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Ultimo mant.</th>
                                <th className="px-4 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((equipo) => (
                                <tr key={equipo.id} className="border-b border-[#eee8f6] last:border-0">
                                    <td className="px-4 py-4 font-normal text-violet-300">#{equipo.codigo}</td>
                                    <td className="px-4 py-4 font-normal text-[#3c3445]">{equipo.tipo}</td>
                                    <td className="px-4 py-4">
                                        <p className="font-black text-[#21192c]">{equipo.nombre}</p>
                                    </td>
                                    <td className="px-4 py-4 font-normal text-[#9e95aa]">{equipo.serie}</td>
                                    <td className="px-4 py-4 font-normal text-[#6f6584]">{equipo.area}</td>
                                    <td className="px-4 py-4">
                                        <StatusBadge value={equipo.estado} />
                                    </td>
                                    <td className={`px-4 py-4 font-normal ${equipo.estado === "Mantenimiento" ? "text-amber-500" : "text-[#b1a58f]"}`}>
                                        {equipo.ultimoMant}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => onOpenBitacora(equipo)}
                                            className="inline-flex h-8 min-w-[112px] items-center justify-center whitespace-nowrap rounded-[8px] bg-violet-600 px-3 text-xs font-black text-white transition hover:bg-violet-700"
                                        >
                                            Abrir bitacora
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-[#21192c] sm:text-xl">Entradas guardadas</h2>
                        <p className="mt-1 text-sm font-semibold text-[#9e95aa]">Registros generales de mantenimiento por equipo.</p>
                    </div>
                    <div className="flex items-start gap-5 self-end sm:self-start">
                        {hiddenEntries.length ? (
                            <button
                                type="button"
                                onClick={() => setShowHiddenEntries((current) => !current)}
                                className="inline-flex h-7 items-center gap-1.5 rounded-[6px] bg-[#eee8dc] px-3 text-[11px] font-bold text-[#6f6584] transition hover:bg-[#e4dccd]"
                            >
                                <EyeOff size={13} />
                            </button>
                        ) : null}
                        <div className="text-right">
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-300">{visibleEntries.length} entradas</p>
                            <p className="text-sm font-black text-[#21192c]">
                                {formatCurrency(totalCost)}
                            </p>
                        </div>
                    </div>
                </div>

                {showHiddenEntries && hiddenEntries.length ? (
                    <div className="mt-4 space-y-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Ocultos</p>
                        {hiddenEntries.map((entry) => (
                            <MaintenanceEntryCard key={entry.id} entry={entry} isHidden onRestore={handleRestoreEntry} />
                        ))}
                    </div>
                ) : null}

                {!showHiddenEntries && visibleEntries.length ? (
                    <div className="mt-4 space-y-3">
                        {visibleEntries.map((entry) => (
                            <MaintenanceEntryCard key={entry.id} entry={entry} onHide={handleHideEntry} />
                        ))}
                    </div>
                ) : null}

                {!showHiddenEntries && !visibleEntries.length ? (
                    <div className="mt-4 rounded-[8px] border border-dashed border-[#ded6c8] px-4 py-8 text-center text-sm font-semibold text-[#9e95aa]">
                        Aun no hay entradas de mantenimiento guardadas.
                    </div>
                ) : null}

                {showHiddenEntries && !hiddenEntries.length ? (
                    <div className="mt-4 rounded-[8px] border border-dashed border-[#ded6c8] px-4 py-8 text-center text-sm font-semibold text-[#9e95aa]">
                        No hay entradas ocultas.
                    </div>
                ) : null}
            </section>
        </div>
    );
}
