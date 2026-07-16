import {
  CalendarClock,
  ClipboardSignature,
  PackageMinus,
  PackageSearch,
  RotateCcw,
  Wrench,
} from "lucide-react";

// Contrato que deberá conservar la API real: { id, type, title, description,
// createdAt, read, priority, route, entityLabel }.
const mockNotifications = [
  {
    id: "maintenance-overdue-017",
    type: "maintenance",
    title: "Mantenimiento vencido",
    description: "La laptop Dell Latitude 5420 superó su fecha programada.",
    entityLabel: "SCAET-017",
    createdAt: "2026-07-14T08:35:00-05:00",
    read: false,
    priority: "critical",
    route: "/asignacion/mantenimiento",
  },
  {
    id: "return-pending-042",
    type: "return",
    title: "Equipo pendiente de devolución",
    description: "El préstamo asignado a Andrea López vence hoy.",
    entityLabel: "SCAET-042",
    createdAt: "2026-07-14T07:10:00-05:00",
    read: false,
    priority: "warning",
    route: "/asignacion",
  },
  {
    id: "assignment-new-088",
    type: "assignment",
    title: "Nueva asignación registrada",
    description: "Se asignó un monitor Samsung de 24” a Carlos Méndez.",
    entityLabel: "SCAET-088",
    createdAt: "2026-07-13T16:42:00-05:00",
    read: false,
    priority: "info",
    route: "/asignacion",
  },
  {
    id: "maintenance-active-031",
    type: "inMaintenance",
    title: "Equipo ingresó a mantenimiento",
    description: "MacBook Pro enviada a diagnóstico por falla de batería.",
    entityLabel: "SCAET-031",
    createdAt: "2026-07-13T12:20:00-05:00",
    read: true,
    priority: "info",
    route: "/asignacion/mantenimiento",
  },
  {
    id: "safekeeping-pending-106",
    type: "safekeeping",
    title: "Resguardo pendiente de firma",
    description: "Falta completar la firma del resguardo de Fernanda Ruiz.",
    entityLabel: "SCAET-106",
    createdAt: "2026-07-12T10:05:00-05:00",
    read: true,
    priority: "warning",
    route: "/asignacion",
  },
  {
    id: "low-stock-hdmi",
    type: "stock",
    title: "Stock bajo de accesorios",
    description: "Quedan 3 adaptadores USB-C a HDMI disponibles.",
    entityLabel: "Mínimo: 5",
    createdAt: "2026-07-11T09:15:00-05:00",
    read: true,
    priority: "warning",
    route: "/equipos",
  },
];

export const notificationTypeMeta = {
  maintenance: { icon: CalendarClock, color: "red" },
  return: { icon: RotateCcw, color: "amber" },
  assignment: { icon: PackageSearch, color: "blue" },
  inMaintenance: { icon: Wrench, color: "violet" },
  safekeeping: { icon: ClipboardSignature, color: "amber" },
  stock: { icon: PackageMinus, color: "red" },
};

export async function getNotifications() {
  // Sustituir el cuerpo por fetch('/api/notifications') cuando exista el endpoint.
  return mockNotifications.map((notification) => ({ ...notification }));
}
