import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import logo from '../assets/logo_final.png'

function Login() {
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(() => localStorage.getItem('scaet-theme') === 'dark')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('scaet-theme', isDark ? 'dark' : 'light')
    localStorage.removeItem('scaet-auth-theme')
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((current) => !current)
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

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo: email,
          contrasena: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.mensaje)
        return
      }

      localStorage.setItem('scaet-token', data.token)
      localStorage.setItem('scaet-user', JSON.stringify(data.usuario))
      navigate('/dashboard')
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 py-5 sm:px-6 sm:py-8 lg:px-8 transition-colors duration-300 ${isDark ? 'bg-[#07050d]' : 'bg-[#f8fbff]'}`}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Modo oscuro' : 'Modo claro'}
        title={isDark ? 'Modo oscuro' : 'Modo claro'}
        className={`
          absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center
          rounded-full border transition-all duration-200 active:scale-95
          ${isDark
            ? 'border-blue-400/25 bg-[#171321] text-blue-200 shadow-[0_0_24px_rgba(58,154,242,0.18)] hover:bg-[#211a31]'
            : 'border-blue-100 bg-white text-blue-500 shadow-md hover:bg-blue-50'}
        `}
      >
        {isDark ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <div className={`absolute top-[13%] left-[-44px] h-32 w-32 rounded-full sm:h-44 sm:w-44 ${isDark ? 'bg-blue-950/35' : 'bg-blue-200/40'} pointer-events-none`} />
      <div className={`absolute bottom-[-56px] right-[-44px] h-48 w-48 rounded-full sm:h-72 sm:w-72 ${isDark ? 'bg-blue-900/30' : 'bg-blue-100/50'} pointer-events-none`} />
      <div className={`absolute inset-x-0 bottom-0 h-24 ${isDark ? 'bg-gradient-to-t from-blue-950/10 to-transparent' : 'bg-transparent'} pointer-events-none`} />

      <div className={`
        relative z-10 flex min-h-[calc(100vh-2.5rem)] w-full items-center justify-center
        rounded-2xl border px-4 py-10 sm:min-h-[calc(100vh-4rem)] sm:px-6
        ${isDark ? 'border-white/8 bg-[#09060f]/75 shadow-[0_24px_70px_rgba(0,0,0,0.55)]' : 'border-blue-100/80 bg-white/80 shadow-lg shadow-blue-100/50'}
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
              <p className={`text-[12px] sm:text-[16px] leading-relaxed mt-9 ${isDark ? 'text-blue-400/80' : 'text-gray-400'}`}>
                Sistema de Control y Administración<br />de Equipos Tecnológicos </p>
            </div>
          </div>

          <form noValidate onSubmit={handleLogin} className={`w-full flex flex-col gap-3 sm:gap-4 rounded-2xl border px-4 py-5 sm:px-6 sm:py-6 ${isDark ? 'border-blue-300/10 bg-[#15101f] shadow-[0_18px_50px_rgba(0,0,0,0.35)]' : 'border-blue-100 bg-white shadow-lg shadow-blue-100/60'}`}>
            <div className="flex flex-col gap-1">
              <label className={`text-[14px] sm:text-[17px] font-medium ${isDark ? 'text-blue-300/55' : 'text-gray-500'}`}>
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
                  border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                  transition-shadow
                  ${isDark ? 'border-blue-300/10 bg-[#221b30] text-blue-50 placeholder:text-blue-200/25' : 'border-blue-100 bg-[#f8fbff] text-gray-700 placeholder:text-gray-300'}
                `}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={`text-[14px] sm:text-[17px] font-medium ${isDark ? 'text-blue-300/55' : 'text-gray-500'}`}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className={`
                  w-full px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl
                  border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                  transition-shadow
                  ${isDark ? 'border-blue-300/10 bg-[#221b30] text-blue-50 placeholder:text-blue-200/25' : 'border-blue-100 bg-[#f8fbff] text-gray-700 placeholder:text-gray-300'}
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
                bg-[#3A9AF2] hover:bg-[#238BEA]
                text-[#FFFFFF] text-sm font-semibold tracking-wide
                transition-colors disabled:opacity-60
                active:scale-[0.98]
              "
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <p className={`text-center text-[11px] sm:text-[13px] tracking-widest uppercase ${isDark ? 'text-blue-300/25' : 'text-gray-300'}`}>
              Acceso exclusivo - Depto. Sistemas
            </p>
          </form>

          <p className={`text-[13px] sm:text-[15px] ${isDark ? 'text-blue-200/45' : 'text-gray-400'}`}>
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className={`${isDark ? 'text-blue-300' : 'text-blue-500'} font-semibold hover:underline`}
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
