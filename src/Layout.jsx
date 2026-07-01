import { useEffect, useState } from "react";
import {
  Activity,
  Boxes,
  ClipboardList,
  FileText,
  Gauge,
  HardDrive,
  LogOut,
  Menu,
  Moon,
  PenTool,
  Settings,
  Sun,
  Users,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import scaetLogo from "./assets/logo_final.png";
import { getUserInitials, loadUserProfile } from "./utils/userProfile";

const navItems = [
  { label: "Dashboard", icon: Gauge },
  { label: "Proveedores", icon: ClipboardList },
  { label: "Colaboradores", icon: Users },
  { label: "Equipos", icon: HardDrive },
  { label: "Asignacion", icon: PenTool },
  { label: "Mantenimiento", icon: Wrench },
  { label: "Reportes", icon: FileText },
];

const systemItems = [
  { label: "Logs", icon: Boxes },
  { label: "Auditoria", icon: Activity },
];

const routesByLabel = {
  Dashboard: "/dashboard",
  Proveedores: "/proveedores",
  Colaboradores: "/colaboradores",
  Equipos: "/equipos",
  Asignacion: "/asignacion",
  Mantenimiento: "/asignacion/mantenimiento",
  Reportes: "/asignacion/reportes",
  Logs: "/asignacion/logs",
  Auditoria: "/asignacion/auditoria",
  Configuracion: "/configuracion",
};

const headerTitles = {
  Dashboard: "Inventario de equipos",
  Proveedores: "Inventario de proveedores",
  Colaboradores: "Inventario de colaboradores",
  Equipos: "Inventario de equipos",
  Asignacion: "Inventario de equipos",
  Mantenimiento: "Mantenimiento de equipos",
  Reportes: "Reportes",
  Logs: "Logs de actividad",
  Auditoria: "Auditoria",
  Configuracion: "Configuracion de cuenta",
};

function Logo({ compact = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-0 text-left transition hover:opacity-80 ${compact ? "shrink-0" : "px-4 py-4"}`}
      aria-label="Ir al dashboard"
      title="Ir al dashboard"
    >
      <div
        className={`${
          compact
            ? "h-9 w-9 sm:h-10 sm:w-10 md:h-14 md:w-14"
            : "h-10 w-10 md:h-14 md:w-14"
        } flex shrink-0 items-center justify-center overflow-hidden`}
      >
        <img src={scaetLogo} alt="SCAET" className="h-full w-full object-contain" />
      </div>

      <div className="-ml-1 shrink-0">
        <p
          className={`${
            compact
              ? "text-[18px] sm:text-xl md:text-lg lg:text-xl tracking-[0.02em]"
              : "text-xs md:text-sm tracking-[0.12em]"
          } whitespace-nowrap font-logo font-black text-[#0F83F0]`}
        >
          SCAET
        </p>

        {!compact && (
          <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.14em] md:tracking-[0.16em] text-[#a9a0b8]">
            Gerencia de Sistemas
          </p>
        )}
      </div>
    </button>
  );
}

function NavList({ title, items, activeNav, onNavigate }) {
  return (
    <div className="px-4">
      {title && <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#c7bfcd]">{title}</p>}
      <div className="space-y-1">
        {items.map(({ label, icon: Icon }) => {
          const active = label === activeNav;

          return (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate?.(label)}
              className={`flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left text-base font-bold transition lg:h-10 lg:rounded-[8px] lg:text-sm ${active ? "bg-blue-50 text-[#0F83F0]" : "text-[#554c62] hover:bg-blue-50/70 hover:text-blue-600"
                }`}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UserBlock({ activeNav, onNavigate }) {
  const [profile, setProfile] = useState(() => loadUserProfile());

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      setProfile(event.detail ?? loadUserProfile());
    };

    window.addEventListener("scaet-user-profile-updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);

    return () => {
      window.removeEventListener("scaet-user-profile-updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  return (
    <div className="border-t border-[#f0ebe3] p-4">
      <button
        type="button"
        onClick={() => onNavigate?.("Configuracion")}
        className={`mb-4 flex h-10 w-full items-center gap-3 rounded-[8px] px-3 text-left text-sm font-bold transition ${
          activeNav === "Configuracion"
            ? "bg-blue-50 text-[#0F83F0]"
            : "text-[#554c62] hover:bg-blue-50/70 hover:text-blue-600"
        }`}
      >
        <Settings size={17} />
        Configuracion
      </button>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-xs font-black text-blue-600 dark:text-blue-300">
          {getUserInitials(profile.name)}
        </div>
        <div>
          <p className="text-sm font-black">{profile.name}</p>
          <p className="text-xs font-semibold text-[#9e95aa]">{profile.role}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onNavigate?.("Cerrar Sesion")}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-blue-50 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
      >
        <LogOut size={14} />
        Cerrar Sesion
      </button>
    </div>
  );
}

export default function Layout({ children, activeNav, onNavigate }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("scaet-theme") === "dark");
  const [profile, setProfile] = useState(() => loadUserProfile());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("scaet-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      setProfile(event.detail ?? loadUserProfile());
    };

    window.addEventListener("scaet-user-profile-updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);

    return () => {
      window.removeEventListener("scaet-user-profile-updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const handleNavigate = (label) => {
    if (label === "Cerrar Sesion") {
      navigate("/login");
      setMenuOpen(false);
      return;
    }

    if (onNavigate) {
      onNavigate(label);
    } else if (routesByLabel[label]) {
      navigate(routesByLabel[label]);
    }

    setMenuOpen(false);
  };

  const handleLogoClick = () => {
    navigate("/dashboard");
    setMenuOpen(false);
  };

  const headerTitle = headerTitles[activeNav] ?? "Inventario de equipos";

  return (
    <div className="min-h-screen bg-[#f4f1ec] text-[#241d2f]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-[#ebe5db] bg-white shadow-sm lg:flex lg:flex-col">
          <Logo onClick={handleLogoClick} />
          <NavList title="Principal" items={navItems} activeNav={activeNav} onNavigate={handleNavigate} />
          <div className="mt-6">
            <NavList title="Sistema" items={systemItems} activeNav={activeNav} onNavigate={handleNavigate} />
          </div>
          <div className="mt-auto">
            <UserBlock activeNav={activeNav} onNavigate={handleNavigate} />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between gap-3 border-b border-[#ebe5db] bg-white px-4 shadow-sm sm:px-5">
           <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-[#554c62] lg:hidden"
                aria-label="Abrir menu">
                <Menu size={22} />
              </button>
              <div className="lg:hidden">
                <Logo compact onClick={handleLogoClick} />
              </div>
              <p className="hidden truncate text-[11px] font-black uppercase tracking-[0.24em] text-[#887e96] lg:block">
                {headerTitle}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setDarkMode((current) => !current)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 dark:text-blue-300 transition hover:bg-blue-100"
                aria-label={darkMode ? "Modo oscuro" : "Modo claro"}
                title={darkMode ? "Modo oscuro" : "Modo claro"} >
                {darkMode ? <Moon size={15} /> : <Sun size={15} />}
              </button>
              <button type="button" className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-600 dark:text-blue-300 sm:block">
                <span className="hidden sm:inline">{profile.role}</span>
                <span className="sm:hidden">Admin</span>
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-xs font-black text-blue-600 dark:text-blue-300">
                {getUserInitials(profile.name)}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-3 sm:p-5 md:p-7">{children}</div>
        </main>
      </div>

      <div className={`fixed inset-0 z-40 lg:hidden ${menuOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!menuOpen}>
        <button
          type="button"
          className={`absolute inset-0 bg-transparent transition ${menuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMenuOpen(false)}
          aria-label="Cerrar menu"
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[min(78vw,390px)] flex-col border-r border-[#ebe5db] bg-white shadow-2xl transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="flex h-16 items-center gap-3 border-b border-[#f0ebe3] px-4">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-[#554c62]"
              aria-label="Cerrar menu"
            >
              <Menu size={22} />
            </button>
            <Logo compact onClick={handleLogoClick} />
          </div>

          <div className="flex-1 overflow-y-auto py-5">
            <NavList title="Principal" items={navItems} activeNav={activeNav} onNavigate={handleNavigate} />
            <div className="mt-6">
              <NavList title="Sistema" items={systemItems} activeNav={activeNav} onNavigate={handleNavigate} />
            </div>
          </div>

          <UserBlock activeNav={activeNav} onNavigate={handleNavigate} />
        </aside>
      </div>
    </div>
  );
}
