import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../assets/logo_final.png'
import { getUserInitials, loadUserProfile } from '../utils/userProfile'

// Links principales del sistema.
// Cambia los href cuando ya existan las pantallas reales de cada modulo.
const mainLinks = [
  { label: 'Dashboard', href: '/dashboard', icon: 'grid' },
  { label: 'Proveedores', href: '/proveedores', icon: 'briefcase' },
  { label: 'Colaboradores', href: '/colaboradores', icon: 'users' },
  { label: 'Equipos', href: '/equipos', icon: 'monitor' },
  { label: 'Asignación', href: '/asignacion', icon: 'clipboard' },
  { label: 'Mantenimiento', href: '/asignacion/mantenimiento', icon: 'tool' },
]

// Links del apartado de sistema.
const systemLinks = [
  { label: 'Logs', href: '/asignacion/logs', icon: 'file' },
  { label: 'Auditoría', href: '/asignacion/auditoria', icon: 'check' },
]

export function AppIcon({ name, className = 'h-4 w-4' }) {
  const baseProps = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: '1.8',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  const paths = {
    grid: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
    briefcase: (
      <>
        <path d="M9 7V6.5A2.5 2.5 0 0 1 11.5 4h3A2.5 2.5 0 0 1 17 6.5V7" />
        <rect x="4" y="7" width="18" height="14" rx="2" />
        <path d="M4 12h18" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M17 10a2.5 2.5 0 0 1 0 5" />
        <path d="M18.5 17.5A4.5 4.5 0 0 1 21 20" />
      </>
    ),
    monitor: (
      <>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
    laptop: (
      <>
        <path d="M5 6h14v10H5z" />
        <path d="M3 18h18" />
      </>
    ),
    keyboard: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M7 11h.01M10 11h.01M13 11h.01M16 11h.01M8 14h8" />
      </>
    ),
    mouse: (
      <>
        <rect x="8" y="3" width="8" height="18" rx="4" />
        <path d="M12 7v4" />
      </>
    ),
    tablet: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 17h2" />
      </>
    ),
    clipboard: (
      <>
        <path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" />
        <path d="M9 13l2 2 4-5" />
      </>
    ),
    tool: (
      <path d="M14.7 6.3a4 4 0 0 0-5.1 5.1L4 17l3 3 5.6-5.6a4 4 0 0 0 5.1-5.1l-2.8 2.8-2-2 2.8-2.8Z" />
    ),
    file: (
      <>
        <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v6h6M9 14h6M9 18h4" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9" />
      </>
    ),
    menu: (
      <>
        <path d="M5 7h14M5 12h14M5 17h14" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    filter: (
      <>
        <path d="M4 7h16" />
        <path d="M7 12h10" />
        <path d="M10 17h4" />
      </>
    ),
    scan: (
      <>
        <path d="M4 8V5a1 1 0 0 1 1-1h3" />
        <path d="M16 4h3a1 1 0 0 1 1 1v3" />
        <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
        <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
        <path d="M7 12h10" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
        <path d="M9.5 5.5A9.4 9.4 0 0 1 12 5c6 0 9.5 7 9.5 7a16.3 16.3 0 0 1-2.2 3.1" />
        <path d="M6.1 6.8C3.8 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.5 9.5 0 0 0 4.1-.9" />
      </>
    ),
    camera: (
      <>
        <path d="M8 7h1.5L11 5h2l1.5 2H16a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3Z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    image: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m7 17 3.5-4 2.5 3 2-2 2 3" />
      </>
    ),
    edit: (
      <>
        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
        <path d="m14 8 2 2" />
      </>
    ),
    trash: (
      <>
        <path d="M5 7h14M10 11v6M14 11v6" />
        <path d="M9 7V5h6v2M7 7l1 13h8l1-13" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    x: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
  }

  return <svg {...baseProps}>{paths[name]}</svg>
}

function SidebarLink({ item, active }) {
  return (
    <Link
      to={item.href}
      className={`
        flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors
        ${active ? 'bg-violet-50 text-violet-500' : 'text-[#6f6a85] hover:bg-violet-50/70 hover:text-violet-500'}
      `}
    >
      <AppIcon name={item.icon} />
      <span>{item.label}</span>
    </Link>
  )
}

function AppSidebar({ isOpen, activePage = 'Dashboard' }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(() => loadUserProfile())

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      setProfile(event.detail ?? loadUserProfile())
    }

    window.addEventListener('scaet-user-profile-updated', handleProfileUpdate)
    window.addEventListener('storage', handleProfileUpdate)

    return () => {
      window.removeEventListener('scaet-user-profile-updated', handleProfileUpdate)
      window.removeEventListener('storage', handleProfileUpdate)
    }
  }, [])

  const handleLogout = () => {
    // Aqui puedes agregar signOut(auth) cuando quieras cerrar sesion con Firebase.
    navigate('/login')
  }

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#ece7df] bg-white transition-transform duration-300
      lg:sticky lg:top-0 lg:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Logo y marca de la app: Archivo Black para SCAET. */}
      <div className="flex h-24 items-center border-b border-[#ece7df] px-6">
        <img src={logo} alt="SCAET" className="h-10 w-10 object-contain" />
        <div className="leading-none">
          <p className="font-logo text-base tracking-wide text-violet-500">SCAET</p>
          <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.22em] text-violet-300">Breathless</p>
        </div>
      </div>

      {/* Navegacion principal del sistema. */}
      <nav className="flex-1 space-y-7 px-4 py-7">
        <div>
          <p className="mb-3 px-2 text-[10px] font-extrabold uppercase tracking-[0.32em] text-[#c7c1d6]">Principal</p>
          <div className="space-y-1">
            {mainLinks.map((item) => (
              <SidebarLink key={item.label} item={item} active={item.label === activePage} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 px-2 text-[10px] font-extrabold uppercase tracking-[0.32em] text-[#c7c1d6]">Sistema</p>
          <div className="space-y-1">
            {systemLinks.map((item) => (
              <SidebarLink key={item.label} item={item} active={item.label === activePage} />
            ))}
          </div>
        </div>
      </nav>

      {/* Usuario actual: sustituir por datos de auth cuando ya esten listos. */}
      <div className="border-t border-[#f0edf6] p-5">
        <div className="mb-4">
          <SidebarLink
            item={{ label: 'Configuracion', href: '/configuracion', icon: 'settings' }}
            active={activePage === 'Configuracion'}
          />
        </div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-violet-300 bg-violet-50 text-xs font-extrabold text-violet-500">
            {getUserInitials(profile.name)}
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#201d31]">{profile.name}</p>
            <p className="text-xs font-bold text-[#8d88a2]">{profile.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-xl bg-violet-50 py-3 text-sm font-extrabold text-[#8d88a2] transition-colors hover:bg-violet-100 hover:text-violet-500"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

export default AppSidebar
