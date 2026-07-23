import { useEffect, useState } from "react";
import { ChevronDown, Download, KeyRound, LogIn, PenLine, Plus, Wrench } from "lucide-react";
import DateInput from "./DateInput";
import { formatDate } from "./dateUtils";

const actionStyles = {
  Alta: { icon: Plus, iconStyle: "bg-emerald-100 text-emerald-500" },
  Asignacion: { icon: KeyRound, iconStyle: "bg-blue-100 text-blue-600" },
  Mantenimiento: { icon: Wrench, iconStyle: "bg-amber-100 text-amber-500" },
  Sesion: { icon: LogIn, iconStyle: "bg-blue-100 text-blue-500" },
  Edicion: { icon: PenLine, iconStyle: "bg-blue-100 text-blue-600" },
};

const normalizeRole = (role = "") => {
  const normalizedRole = role.toString().trim().toLowerCase();

  if (normalizedRole === "admin" || normalizedRole === "administrador") return "Administrador";
  if (normalizedRole === "capturista") return "Capturista";
  if (normalizedRole === "usuario") return "Usuario";
  return role || "Usuario";
};

const getResponseList = (data, keys) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
};

const normalizeLog = (log, index) => {
  const accion = log.accion || log.tipo_accion || log.tipo || "";
  const style =
    Object.entries(actionStyles).find(([key]) =>
      accion.toString().toLowerCase().includes(key.toLowerCase()),
    )?.[1] || actionStyles.Edicion;
  const rawDate = log.fecha || log.created_at || log.createdAt || log.fecha_hora || "";
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const fecha =
    log.fecha?.toString().slice(0, 10) ||
    (parsedDate && !Number.isNaN(parsedDate.getTime())
      ? `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(
          parsedDate.getDate(),
        ).padStart(2, "0")}`
      : "");
  const hora =
    log.hora ||
    (parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
      : "");

  return {
    ...log,
    id: log.id || log._id || `${fecha}-${index}`,
    tipo: log.tipo || log.tipo_accion || accion || "Actividad",
    detalle: log.detalle || log.descripcion || log.mensaje || "",
    usuario:
      log.nombre_usuario ||
      log.usuario_nombre ||
      log.usuario?.nombre ||
      log.usuario?.nombre_completo ||
      log.usuario ||
      "Usuario",
    rol: normalizeRole(log.rol || log.usuario_rol || log.usuario?.rol),
    fecha,
    hora,
    accion,
    ...style,
  };
};

function SoftSelect({ value, onChange, options }) {
  return (
    <div className="relative w-full sm:w-auto">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-full border border-[#ded6c8] bg-[#eee8dc] px-4 pr-9 text-xs font-black text-[#3c3445] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:min-w-44"
      >
        {options.map((option) => {
          const optionValue = typeof option === "object" ? option.value : option;
          const optionLabel = typeof option === "object" ? option.label : option;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
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
          {log.rol}: {log.usuario} / {formatDate(log.fecha)} - {log.hora}
        </p>
      </div>
    </article>
  );
}

export default function LogsActividad() {
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [fecha, setFecha] = useState("");
  const [accion, setAccion] = useState("Todas las acciones");
  const [usuario, setUsuario] = useState("Todos los usuarios");

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("scaet-token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch("/api/logs-actividad/usuarios", { headers, signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("No fue posible cargar los usuarios");
        return response.json();
      })
      .then((data) => setUsuarios(getResponseList(data, ["usuarios", "data"])))
      .catch((error) => {
        if (error.name !== "AbortError") setUsuarios([]);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("scaet-token");
    const params = new URLSearchParams();

    if (fecha) params.set("fecha", fecha);
    if (accion !== "Todas las acciones") params.set("accion", accion);
    if (usuario !== "Todos los usuarios") params.set("usuario", usuario);

    const query = params.toString();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/logs-actividad${query ? `?${query}` : ""}`, {
      headers,
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("No fue posible cargar la actividad");
        return response.json();
      })
      .then((data) =>
        setLogs(getResponseList(data, ["logs", "actividad", "data"]).map(normalizeLog)),
      )
      .catch((error) => {
        if (error.name !== "AbortError") setLogs([]);
      });

    return () => controller.abort();
  }, [accion, fecha, usuario]);

  const userOptions = [
    { value: "Todos los usuarios", label: "Todos los usuarios" },
    ...usuarios.map((item) => {
      const name =
        item.nombre || item.nombre_completo || item.usuario || item.username || item.email || "";
      const value = item.id || item._id || item.usuario_id || name;

      return {
        value: String(value),
        label: `${normalizeRole(item.rol)}: ${name}`,
      };
    }),
  ];

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
                options={userOptions}
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
          {logs.length ? (
            logs.map((log) => <LogRow key={log.id} log={log} />)
          ) : (
            <div className="px-4 py-10 text-center text-sm font-semibold text-[#9e95aa]">
              No hay actividad registrada
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
