import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import logo from '../assets/logo_final.png'

function Login() {
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(() => localStorage.getItem('scaet-auth-theme') === 'dark')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleTheme = () => {
    setIsDark((current) => {
      const next = !current
      localStorage.setItem('scaet-auth-theme', next ? 'dark' : 'light')
      return next
    })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Ingresa tu correo y contraseña.')
      return
    }
    if (!email.includes('@')) {
      setError('El correo debe incluir @.')
      return
    }
    if (!password.trim()) {
      setError('Ingresa tu contraseña.')
      return
    }

    setLoading(true)

    // Acceso temporal: se salta Firebase mientras aun no hay usuarios en la BD.
    // Cuando conectes usuarios reales, aqui vuelve a llamar signInWithEmailAndPassword.
    navigate('/dashboard')
    setLoading(false)
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 py-5 sm:px-6 sm:py-8 lg:px-8 transition-colors duration-300 ${isDark ? 'bg-[#07050d]' : 'bg-sand-50'}`}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={isDark ? 'Modo claro' : 'Modo oscuro'}
        className={`
          absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center
          rounded-full border transition-all duration-200 active:scale-95
          ${isDark
            ? 'border-violet-400/25 bg-[#171321] text-violet-200 shadow-[0_0_24px_rgba(139,92,246,0.18)] hover:bg-[#211a31]'
            : 'border-violet-100 bg-white text-violet-500 shadow-md hover:bg-violet-50'}
        `}
      >
        {isDark ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M12 3v2.2M12 18.8V21M4.22 4.22l1.56 1.56M18.22 18.22l1.56 1.56M3 12h2.2M18.8 12H21M4.22 19.78l1.56-1.56M18.22 5.78l1.56-1.56"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M20.4 14.2A7.6 7.6 0 0 1 9.8 3.6 8.6 8.6 0 1 0 20.4 14.2Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        )}
      </button>

      <div className={`absolute top-[13%] left-[-44px] h-32 w-32 rounded-full sm:h-44 sm:w-44 ${isDark ? 'bg-violet-950/35' : 'bg-violet-200/40'} pointer-events-none`} />
      <div className={`absolute bottom-[-56px] right-[-44px] h-48 w-48 rounded-full sm:h-72 sm:w-72 ${isDark ? 'bg-violet-900/30' : 'bg-violet-100/50'} pointer-events-none`} />
      <div className={`absolute inset-x-0 bottom-0 h-24 ${isDark ? 'bg-gradient-to-t from-violet-950/10 to-transparent' : 'bg-transparent'} pointer-events-none`} />

      <div className={`
        relative z-10 flex min-h-[calc(100vh-2.5rem)] w-full items-center justify-center
        rounded-2xl border px-4 py-10 sm:min-h-[calc(100vh-4rem)] sm:px-6
        ${isDark ? 'border-white/8 bg-[#09060f]/75 shadow-[0_24px_70px_rgba(0,0,0,0.55)]' : 'border-violet-100/80 bg-white/55 shadow-lg'}
      `}>
        <div className="w-full max-w-[320px] sm:max-w-sm md:max-w-md flex flex-col items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-center gap-0">
            <img
              src={logo}
              alt="SCAET"
              className="w-35 h-35 sm:w-50 sm:h-50 object-contain"
            />
            <div className="text-center">
              <h1 className="text-lg sm:text-3xl font-logo tracking-widest -m-7 text-[#0F83F0]">
                SCAET
              </h1>
              <p className={`text-[12px] sm:text-[16px] leading-relaxed mt-9 ${isDark ? 'text-violet-400/80' : 'text-gray-400'}`}>
                Sistema de Control y Administración<br />de Equipos Tecnológicos </p>
            </div>
          </div>

          <form noValidate onSubmit={handleLogin} className={`w-full flex flex-col gap-3 sm:gap-4 rounded-2xl border px-4 py-5 sm:px-6 sm:py-6 ${isDark ? 'border-violet-300/10 bg-[#15101f] shadow-[0_18px_50px_rgba(0,0,0,0.35)]' : 'border-transparent bg-white shadow-lg'}`}>
            <div className="flex flex-col gap-1">
              <label className={`text-[14px] sm:text-[17px] font-medium ${isDark ? 'text-violet-300/55' : 'text-gray-500'}`}>
                Correo 
              </label>
              <input
                type="text"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@breathlessresorts.com"
                className={`
                  w-full px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl
                  border text-sm focus:outline-none focus:ring-2 focus:ring-violet-400
                  transition-shadow
                  ${isDark ? 'border-violet-300/10 bg-[#221b30] text-violet-50 placeholder:text-violet-200/25' : 'border-gray-200 bg-sand-50 text-gray-700 placeholder:text-gray-300'}
                `}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={`text-[14px] sm:text-[17px] font-medium ${isDark ? 'text-violet-300/55' : 'text-gray-500'}`}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className={`
                  w-full px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl
                  border text-sm focus:outline-none focus:ring-2 focus:ring-violet-400
                  transition-shadow
                  ${isDark ? 'border-violet-300/10 bg-[#221b30] text-violet-50 placeholder:text-violet-200/25' : 'border-gray-200 bg-sand-50 text-gray-700 placeholder:text-gray-300'}
                `}
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center -mt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-2.5 sm:py-3 mt-1 rounded-lg sm:rounded-xl
                bg-[#91C6F8] hover:bg-[#79B8F4]
                text-[#0F5FAF] text-sm font-semibold tracking-wide
                transition-colors disabled:opacity-60
                active:scale-[0.98]
              "
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <p className={`text-center text-[11px] sm:text-[13px] tracking-widest uppercase ${isDark ? 'text-violet-300/25' : 'text-gray-300'}`}>
              Acceso exclusivo - Depto. Sistemas
            </p>
          </form>

          <p className={`text-[13px] sm:text-[15px] ${isDark ? 'text-violet-200/45' : 'text-gray-400'}`}>
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className={`${isDark ? 'text-violet-300' : 'text-violet-500'} font-semibold hover:underline`}
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
