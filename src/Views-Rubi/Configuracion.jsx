import { useState } from 'react'
import { AppIcon } from '../components/Sidebar'
import { getUserInitials, loadUserProfile, saveUserProfile } from '../utils/userProfile'

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

function SettingsField({ label, name, value, onChange, type = 'text', placeholder, autoComplete, required = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition placeholder:text-[#9b95ac] focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
    </label>
  )
}

function StatusMessage({ status }) {
  if (!status.text) {
    return null
  }

  const toneClass = status.type === 'error'
    ? 'bg-rose-50 text-rose-600'
    : 'bg-emerald-50 text-emerald-600'

  return (
    <p className={`rounded-xl px-4 py-3 text-sm font-bold ${toneClass}`} aria-live="polite">
      {status.text}
    </p>
  )
}

function Configuracion() {
  const [profile, setProfile] = useState(() => loadUserProfile())
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [showPasswords, setShowPasswords] = useState(false)
  const [profileStatus, setProfileStatus] = useState({ type: '', text: '' })
  const [passwordStatus, setPasswordStatus] = useState({ type: '', text: '' })

  const handleProfileChange = (event) => {
    const { name, value } = event.target

    setProfile((currentProfile) => ({
      ...currentProfile,
      [name]: value,
    }))
    setProfileStatus({ type: '', text: '' })
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target

    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
    setPasswordStatus({ type: '', text: '' })
  }

  const handleProfileSubmit = (event) => {
    event.preventDefault()

    const nextProfile = saveUserProfile({
      ...profile,
      name: profile.name.trim(),
      email: profile.email.trim(),
    })

    setProfile(nextProfile)
    setProfileStatus({ type: 'success', text: 'Perfil actualizado.' })
  }

  const handlePasswordSubmit = (event) => {
    event.preventDefault()

    if (passwordForm.newPassword.length < 8) {
      setPasswordStatus({ type: 'error', text: 'La nueva contrasena debe tener al menos 8 caracteres.' })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'La confirmacion no coincide.' })
      return
    }

    setPasswordForm(emptyPasswordForm)
    setPasswordStatus({ type: 'success', text: 'Contrasena actualizada.' })
  }

  const passwordInputType = showPasswords ? 'text' : 'password'

  return (
    <div className="space-y-6">
            <section>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-blue-300">Cuenta</p>
              <h1 className="mt-3 text-2xl font-extrabold text-[#201d31] sm:text-3xl">Configuración</h1>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
              <form onSubmit={handleProfileSubmit} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[#f1edf5] pb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-[#201d31]">Datos del Perfil</h2>
                    <p className="mt-1 text-xs font-bold text-[#8d88a2]">{profile.email}</p>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-blue-300 bg-blue-50 text-sm font-extrabold text-blue-500">
                    {getUserInitials(profile.name)}
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <SettingsField
                    label="Nombre completo"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    autoComplete="name"
                    required
                  />
                  <SettingsField
                    label="Correo electronico"
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    autoComplete="email"
                    required
                  />
                </div>

                <StatusMessage status={profileStatus} />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3A9AF2] px-5 text-sm font-extrabold text-[#FFFFFF] shadow-sm transition hover:bg-[#238BEA]"
                  >
                    <AppIcon name="check" />
                    Guardar Perfil
                  </button>
                </div>
              </form>

              <form onSubmit={handlePasswordSubmit} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[#f1edf5] pb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-[#201d31]">Contrasena</h2>
                    <p className="mt-1 text-xs font-bold text-[#8d88a2]">Seguridad de la cuenta</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswords((currentValue) => !currentValue)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2ece0] text-[#5d5870] transition hover:bg-[#e9dfd0]"
                    aria-label={showPasswords ? 'Ocultar contrasenas' : 'Mostrar contrasenas'}
                    title={showPasswords ? 'Ocultar contrasenas' : 'Mostrar contrasenas'}
                  >
                    <AppIcon name={showPasswords ? 'eyeOff' : 'eye'} />
                  </button>
                </div>

                <div className="space-y-4">
                  <SettingsField
                    label="Contrasena actual"
                    name="currentPassword"
                    type={passwordInputType}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    required
                  />
                  <SettingsField
                    label="Nueva contrasena"
                    name="newPassword"
                    type={passwordInputType}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    required
                  />
                  <SettingsField
                    label="Confirmar contrasena"
                    name="confirmPassword"
                    type={passwordInputType}
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <StatusMessage status={passwordStatus} />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#201d31] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#332d4b]"
                  >
                    <AppIcon name="check" />
                    Actualizar
                  </button>
                </div>
              </form>
            </section>
          </div>
  )
}

export default Configuracion
