import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import {
  getNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
  notificationTypeMeta,
  sortNotifications,
} from "./notificationService";

const iconStyles = {
  red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
};

export default function NotificationCenter({ currentUser, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const containerRef = useRef(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const refreshNotifications = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const items = await getNotifications(currentUser);
      if (mountedRef.current) setNotifications(items);
    } finally {
      loadingRef.current = false;
    }
  }, [currentUser]);

  useEffect(() => {
    mountedRef.current = true;
    refreshNotifications();
    const intervalId = window.setInterval(refreshNotifications, 10000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshNotifications();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = useMemo(
    () => notifications.filter((item) => filter === "all" || !item.read),
    [filter, notifications],
  );

  const markAsRead = (id) => {
    markNotificationAsRead(id, currentUser);
    setNotifications((items) => sortNotifications(
      items.map((item) => item.id === id ? { ...item, read: true } : item),
    ));
  };

  const markAllAsRead = () => {
    setNotifications((items) => {
      markNotificationsAsRead(items.map((item) => item.id), currentUser);
      return sortNotifications(items.map((item) => ({ ...item, read: true })));
    });
  };

  const openNotification = (notification) => {
    markAsRead(notification.id);
    setOpen(false);
    onNavigate(notification.route);
  };

  const toggleNotifications = () => {
    if (!open) refreshNotifications();
    setOpen((current) => !current);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleNotifications}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#e7e0d6] bg-white text-[#554c62] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-[#393141]"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`}
        aria-expanded={open}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white ring-2 ring-white dark:ring-[#191521]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="fixed inset-x-2 top-[4.5rem] z-50 flex max-h-[calc(100vh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-[#e8e1d8] bg-white shadow-2xl dark:border-[#393141] sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:h-[min(640px,calc(100vh-5rem))] sm:w-[390px]" aria-label="Panel de notificaciones">
          <div className="flex items-start justify-between border-b border-[#f0ebe3] px-5 py-4">
            <div>
              <h2 className="text-base font-black text-[#241d2f]">Notificaciones</h2>
              <p className="mt-0.5 text-xs font-medium text-[#887e96]">{unreadCount ? `${unreadCount} pendientes por revisar` : "Todo está al día"}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#887e96] hover:bg-[#f4f1ec]" aria-label="Cerrar notificaciones"><X size={17} /></button>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-[#f0ebe3] px-4 py-3">
            <div className="flex rounded-lg bg-[#f4f1ec] p-1 dark:bg-[#282331]">
              {[["all", "Todas"], ["unread", "No leídas"]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-md px-3 py-1.5 text-xs font-black transition ${filter === value ? "bg-white text-blue-600 shadow-sm" : "text-[#887e96]"}`}>{label}</button>
              ))}
            </div>
            {unreadCount > 0 && <button type="button" onClick={markAllAsRead} className="flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-700"><CheckCheck size={15} /> <span className="hidden min-[380px]:inline">Marcar leídas</span></button>}
          </div>

          <div className="flex-1 overflow-y-auto">
            {visibleNotifications.length ? visibleNotifications.map((notification) => {
              const meta = notificationTypeMeta[notification.type] ?? notificationTypeMeta.assignment;
              const Icon = meta.icon;
              return (
                <button key={notification.id} type="button" onClick={() => openNotification(notification)} className={`relative flex w-full gap-3 border-b border-[#f0ebe3] px-4 py-4 text-left transition hover:bg-blue-50/40 ${notification.read ? "bg-white" : "bg-blue-50/30"}`}>
                  {!notification.read && <span className="absolute left-1.5 top-6 h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyles[meta.color]}`}><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-[#241d2f]">{notification.title}</span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-[#6f6584]">{notification.description}</span>
                    <span className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-[#9e95aa]"><span className="truncate">{notification.entityLabel}</span><span className="shrink-0">{notification.statusLabel}</span></span>
                  </span>
                </button>
              );
            }) : (
              <div className="flex h-64 flex-col items-center justify-center px-6 text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500"><Inbox size={22} /></span><p className="text-sm font-black">No hay notificaciones sin leer</p><p className="mt-1 text-xs text-[#887e96]">Cuando aparezca algo importante lo verás aquí.</p></div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
