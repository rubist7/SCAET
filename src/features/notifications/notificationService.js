import {
  CalendarClock,
  ClipboardSignature,
  PackageMinus,
  PackageSearch,
  RotateCcw,
  Wrench,
} from "lucide-react";

const READ_NOTIFICATIONS_KEY_PREFIX = "scaet:notifications:read";

export const notificationTypeMeta = {
  maintenance: { icon: CalendarClock, color: "red" },
  return: { icon: RotateCcw, color: "amber" },
  assignment: { icon: PackageSearch, color: "blue" },
  inMaintenance: { icon: Wrench, color: "violet" },
  safekeeping: { icon: ClipboardSignature, color: "amber" },
  stock: { icon: PackageMinus, color: "red" },
};

function notificationUserIdentity(user) {
  const accountValues = [
    user?.id_usuario,
    user?.id,
    user?.correo,
    user?.email,
    user?.identificador,
    user?.username,
  ];
  const stableId = accountValues
    .map((value) => String(value ?? "").trim())
    .find(Boolean);
  const fallbackName = String(user?.name ?? "sin-nombre").trim() || "sin-nombre";
  const fallbackRole = String(user?.roleKey ?? user?.role ?? "sin-rol").trim() || "sin-rol";
  const identity = stableId || `${fallbackName}:${fallbackRole}`;

  return encodeURIComponent(identity.toLowerCase());
}

function readNotificationsKey(user) {
  return `${READ_NOTIFICATIONS_KEY_PREFIX}:${notificationUserIdentity(user)}:${localDateKey()}`;
}

function cleanOldReadNotificationKeys(user) {
  const userKey = `${READ_NOTIFICATIONS_KEY_PREFIX}:${notificationUserIdentity(user)}`;
  const currentKey = readNotificationsKey(user);

  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (
        key !== currentKey &&
        (key === userKey || key?.startsWith(`${userKey}:`))
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // La limpieza es opcional y no debe impedir la carga de notificaciones.
  }
}

function getReadNotificationIds(user) {
  cleanOldReadNotificationKeys(user);

  try {
    const storedIds = JSON.parse(localStorage.getItem(readNotificationsKey(user)) || "[]");
    return new Set(Array.isArray(storedIds) ? storedIds.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function markNotificationsAsRead(ids, user) {
  const readIds = getReadNotificationIds(user);
  ids.forEach((id) => {
    if (typeof id === "string" && id) readIds.add(id);
  });

  try {
    localStorage.setItem(readNotificationsKey(user), JSON.stringify([...readIds]));
  } catch {
    // La campanita conserva su estado en memoria si el navegador bloquea localStorage.
  }
}

export function markNotificationAsRead(id, user) {
  markNotificationsAsRead([id], user);
}

export function sortNotifications(notifications) {
  const priorityOrder = { critical: 0, warning: 1 };

  return [...notifications].sort((left, right) => {
    if (left.read !== right.read) return left.read ? 1 : -1;

    const priorityDifference =
      (priorityOrder[left.priority] ?? 2) -
      (priorityOrder[right.priority] ?? 2);
    if (priorityDifference) return priorityDifference;

    const dateDifference =
      new Date(right.createdAt).getTime() -
      new Date(left.createdAt).getTime();
    if (dateDifference) return dateDifference;

    return left.id.localeCompare(right.id);
  });
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeDateKey(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) return null;

  return `${year}-${month}-${day}`;
}

function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

function notificationCreatedAt(...values) {
  for (const value of values) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime()) && date.getTime() <= Date.now()) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

async function fetchJson(path, token) {
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.mensaje || `No se pudo consultar ${path}`);
  }
  return payload;
}

function maintenanceNotifications(equipos) {
  const active = [];
  const notifiedEquipmentIds = new Set();

  for (const equipo of equipos) {
    if (normalizeStatus(equipo.estado) !== "mantenimiento") continue;

    const equipmentId = equipo.id_equipo;
    if (equipmentId == null || notifiedEquipmentIds.has(String(equipmentId))) continue;
    notifiedEquipmentIds.add(String(equipmentId));

    const equipmentLabel =
      equipo.codigo_equipo ||
      equipo.nombre_equipo ||
      "Equipo";
    const equipmentName =
      equipo.nombre_equipo ||
      equipo.codigo_equipo ||
      "el equipo";
    active.push({
      id: `maintenance-active-${equipmentId}`,
      type: "inMaintenance",
      title: "Equipo en mantenimiento",
      description: `${equipmentName} se encuentra en proceso de mantenimiento.`,
      createdAt: notificationCreatedAt(
        equipo.fecha_actualizacion,
        equipo.fecha_creacion,
        equipo.fecha_mantenimiento,
        equipo.ultimo_mantenimiento_fecha,
      ),
      read: false,
      priority: "warning",
      route: "/asignacion/mantenimiento",
      entityLabel: equipmentLabel,
      statusLabel: "Estado: En proceso",
    });
  }

  return { active };
}

function temporaryAssignmentNotifications(asignaciones, today, tomorrow) {
  const active = [];
  const notifiedDetailIds = new Set();

  for (const asignacion of asignaciones) {
    if (
      asignacion.estado_asignacion &&
      normalizeStatus(asignacion.estado_asignacion) !== "activa"
    ) continue;

    for (const activo of asignacion.activos || []) {
      if (normalizeStatus(activo.tipo_asignacion) !== "temporal") continue;
      if (!activo.fecha_devolucion_programada || activo.fecha_devolucion_real) continue;
      if (activo.estado_detalle && normalizeStatus(activo.estado_detalle) !== "activo") continue;

      const detailId = activo.id_detalle;
      if (detailId == null || notifiedDetailIds.has(String(detailId))) continue;

      const dateKey = normalizeDateKey(activo.fecha_devolucion_programada);
      if (!dateKey) continue;
      notifiedDetailIds.add(String(detailId));

      const isOverdue = dateKey < today;
      const isDueToday = dateKey === today;
      const isDueTomorrow = dateKey === tomorrow;
      const equipmentLabel =
        activo.codigo_equipo ||
        activo.nombre_equipo ||
        "Equipo";
      const equipmentName =
        activo.nombre_equipo ||
        activo.codigo_equipo ||
        "El equipo";
      const collaboratorName =
        asignacion.colaborador?.nombre_completo ||
        "el colaborador asignado";
      const notification = {
        id: `temporary-assignment-${detailId}`,
        type: "return",
        title: isOverdue
          ? "Asignación temporal vencida"
          : isDueToday
            ? "Asignación temporal vence hoy"
            : isDueTomorrow
              ? "Asignación temporal por vencer"
              : "Asignación temporal activa",
        description: isOverdue
          ? `${equipmentName}, asignado a ${collaboratorName}, superó su fecha de devolución.`
          : isDueToday
            ? `${equipmentName}, asignado a ${collaboratorName}, debe devolverse hoy.`
            : isDueTomorrow
              ? `${equipmentName}, asignado a ${collaboratorName}, vence mañana.`
              : `${equipmentName} está asignado temporalmente a ${collaboratorName}.`,
        createdAt: notificationCreatedAt(
          activo.fecha_asignacion,
          asignacion.fecha_resguardo,
        ),
        read: false,
        priority: isOverdue ? "critical" : "warning",
        route: "/asignacion",
        entityLabel: equipmentLabel,
        statusLabel: `Fecha límite: ${formatDateKey(dateKey)}`,
      };

      active.push(notification);
    }
  }

  return { active };
}

export async function getNotifications(user) {
  const token = localStorage.getItem("scaet-token");
  if (!token) return [];

  const [maintenanceResult, assignmentResult] = await Promise.allSettled([
    fetchJson("/api/mantenimientos/equipos", token),
    fetchJson("/api/asignaciones/activas", token),
  ]);
  const today = localDateKey();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);
  const maintenance = maintenanceResult.status === "fulfilled"
    ? maintenanceNotifications(maintenanceResult.value.equipos || [])
    : { active: [] };
  const assignments = assignmentResult.status === "fulfilled"
    ? temporaryAssignmentNotifications(assignmentResult.value.asignaciones || [], today, tomorrow)
    : { active: [] };
  const readIds = getReadNotificationIds(user);
  const uniqueNotifications = new Map();

  [
    ...maintenance.active,
    ...assignments.active,
  ].forEach((notification) => {
    if (!uniqueNotifications.has(notification.id)) {
      uniqueNotifications.set(notification.id, notification);
    }
  });

  return sortNotifications([...uniqueNotifications.values()].map((notification) => ({
    ...notification,
    read: readIds.has(notification.id),
  })));
}
