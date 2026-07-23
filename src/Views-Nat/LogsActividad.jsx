import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FileSpreadsheet, KeyRound, LogIn, PenLine, Plus, Search, Wrench } from "lucide-react";
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

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeLog = (log, index) => {
  const accion = log.accion || log.tipo_accion || log.tipo || "";
  const style =
    Object.entries(actionStyles).find(([key]) =>
      accion.toString().toLowerCase().includes(key.toLowerCase()),
    )?.[1] || actionStyles.Edicion;
  const rawDate =
    log.fecha_creacion || log.fecha || log.created_at || log.createdAt || log.fecha_hora || "";
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
          {log.rol}: {log.usuario} /{" "}
          {log.fecha ? `${formatDate(log.fecha)} - ${log.hora || "-"}` : "-"}
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
  const [search, setSearch] = useState("");

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
    const token = localStorage.getItem("scaet-token");
    if (!token) {
      setLogs([]);
      return undefined;
    }

    const params = new URLSearchParams();

    if (fecha) params.set("fecha", fecha);
    if (accion !== "Todas las acciones") params.set("accion", accion);
    if (usuario !== "Todos los usuarios") params.set("usuario", usuario);

    const query = params.toString();
    const headers = { Authorization: `Bearer ${token}` };
    let controller;

    const cargarLogs = () => {
      controller?.abort();
      controller = new AbortController();

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
    };

    cargarLogs();
    const interval = setInterval(cargarLogs, 10000);

    return () => {
      clearInterval(interval);
      controller?.abort();
    };
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

  const visibleLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((log) =>
      [
        log.usuario,
        log.rol,
        log.accion,
        log.modulo,
        log.detalle,
        log.fecha,
        log.fecha ? formatDate(log.fecha) : "",
        log.hora,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [logs, search]);

  const handleExportarLogs = () => {
    if (!visibleLogs.length) {
      alert("No hay logs para exportar");
      return;
    }

    const ahora = new Date();
    const fechaArchivo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(
      ahora.getDate(),
    ).padStart(2, "0")}`;
    const usuarioSeleccionado =
      userOptions.find((option) => option.value === usuario)?.label || usuario;
    const filas = visibleLogs
      .map(
        (log, index) => `
          <tr style="background:${index % 2 === 0 ? "#ffffff" : "#f7f4ee"};">
            <td style="border:1px solid #c8c1b5;padding:7px;text-align:center;">${escapeHtml(log.fecha ? formatDate(log.fecha) : "-")}</td>
            <td style="border:1px solid #c8c1b5;padding:7px;text-align:center;">${escapeHtml(log.hora || "-")}</td>
            <td style="border:1px solid #c8c1b5;padding:7px;mso-number-format:'\\@';">${escapeHtml(log.usuario)}</td>
            <td style="border:1px solid #c8c1b5;padding:7px;">${escapeHtml(log.rol)}</td>
            <td style="border:1px solid #c8c1b5;padding:7px;">${escapeHtml(log.accion)}</td>
            <td style="border:1px solid #c8c1b5;padding:7px;">${escapeHtml(log.modulo)}</td>
            <td style="border:1px solid #c8c1b5;padding:7px;white-space:normal;vertical-align:top;mso-number-format:'\\@';">${escapeHtml(log.detalle)}</td>
          </tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table style="border-collapse:collapse;font-family:Arial,sans-serif;color:#21192c;">
            <colgroup>
              <col style="width:110px"><col style="width:85px"><col style="width:190px">
              <col style="width:115px"><col style="width:120px"><col style="width:140px">
              <col style="width:420px">
            </colgroup>
            <tr><th colspan="7" style="background:#3c3445;color:#fff;font-size:20px;padding:14px;text-align:center;">SCAET - Logs de actividad</th></tr>
            <tr><td colspan="7" style="padding:8px 10px;"><strong>Fecha de exportación:</strong> ${escapeHtml(ahora.toLocaleString("es-MX"))}</td></tr>
            <tr><td colspan="7" style="padding:4px 10px;"><strong>Filtros aplicados</strong></td></tr>
            <tr><td colspan="7" style="padding:4px 10px;">Fecha: ${escapeHtml(fecha ? formatDate(fecha) : "Todas")} | Acción: ${escapeHtml(accion)} | Usuario: ${escapeHtml(usuarioSeleccionado)}</td></tr>
            <tr><td colspan="7" style="padding:4px 10px 12px;"><strong>Total de registros:</strong> ${visibleLogs.length}</td></tr>
            <tr>
              ${["Fecha", "Hora", "Usuario", "Rol", "Acción", "Módulo", "Descripción"]
                .map(
                  (titulo) =>
                    `<th style="border:1px solid #9e95aa;background:#6f6584;color:#fff;font-weight:bold;padding:8px;text-align:center;">${titulo}</th>`,
                )
                .join("")}
            </tr>
            ${filas}
          </table>
        </body>
      </html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = `logs_actividad_${fechaArchivo}.xls`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="space-y-4">

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#21192c] sm:text-xl">Auditoría del sistema</h2>
            <p className="mt-1 text-sm font-semibold text-[#9e95aa]">
              Consulta y exporta los registros de actividad generados dentro del sistema.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="relative w-full sm:min-w-56 sm:flex-1">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8f879b]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar en los registros..."
                  className="h-10 w-full rounded-full border border-[#ded6c8] bg-[#eee8dc] pl-11 pr-4 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
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
            onClick={handleExportarLogs}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] bg-[#eee8dc] px-4 text-xs font-black text-[#6f6584] transition hover:bg-[#e4dccf] sm:w-auto"
          >
            <FileSpreadsheet size={14} />
            Exportar Excel
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#f0ebe3]">
          {visibleLogs.length ? (
            visibleLogs.map((log) => <LogRow key={log.id} log={log} />)
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
