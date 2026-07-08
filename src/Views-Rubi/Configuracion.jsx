import { useEffect, useState } from 'react'
import { AppIcon } from '../components/Sidebar'
import { getUserInitials, loadUserProfile, roleLabels, updateStoredUser } from '../utils/userProfile'

const apiUrl = 'http://localhost:3000/api'

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const emptyUserForm = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  role: 'usuario',
}

const emptyResetForm = {
  userId: '',
  password: '',
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('scaet-token')
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.mensaje || 'No se pudo completar la solicitud.')
  }

  return data
}

function SettingsField({ label, name, value, onChange, type = 'text', placeholder, autoComplete, required = false, readOnly = false }) {
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
        readOnly={readOnly}
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
  const [userForm, setUserForm] = useState(emptyUserForm)
  const [resetForm, setResetForm] = useState(emptyResetForm)
  const [users, setUsers] = useState([])
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState({ type: '', text: '' })
  const [managementStatus, setManagementStatus] = useState({ type: '', text: '' })

  const canManageUsers = profile.roleKey === 'admin' || profile.roleKey === 'capturista'

  useEffect(() => {
    if (!canManageUsers) {
      return undefined
    }

    let ignore = false

    apiRequest('/usuarios')
      .then((data) => {
        if (!ignore) {
          setUsers(data.usuarios)
        }
      })
      .catch((error) => {
        if (!ignore) {
          setManagementStatus({ type: 'error', text: error.message })
        }
      })

    return () => {
      ignore = true
    }
  }, [canManageUsers])

  const handlePasswordChange = (event) => {
    const { name, value } = event.target

    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
    setPasswordStatus({ type: '', text: '' })
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()

    if (passwordForm.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'La confirmacion no coincide.' })
      return
    }

    try {
      const data = await apiRequest('/usuarios/me/password', {
        method: 'PUT',
        body: JSON.stringify({
          contrasena_actual: passwordForm.currentPassword,
          nueva_contrasena: passwordForm.newPassword,
        }),
      })
      setProfile(updateStoredUser({ debe_cambiar_contrasena: 0 }))
      setPasswordForm(emptyPasswordForm)
      setPasswordStatus({ type: 'success', text: data.mensaje })
    } catch (error) {
      setPasswordStatus({ type: 'error', text: error.message })
    }
  }

  const handleUserFormChange = (event) => {
    const { name, value } = event.target
    setUserForm((current) => ({ ...current, [name]: value }))
    setManagementStatus({ type: '', text: '' })
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()

    if (userForm.password.length < 6) {
      setManagementStatus({
        type: 'error',
        text: 'La contraseña debe tener al menos 6 caracteres.',
      })
      return
    }

    try {
      const data = await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          nombre_completo: userForm.fullName,
          nombre_usuario: userForm.username,
          correo: userForm.email,
          contrasena: userForm.password,
          rol: userForm.role,
        }),
      })
      setUsers((current) => [...current, data.usuario])
      setUserForm(emptyUserForm)
      setManagementStatus({ type: 'success', text: data.mensaje })
    } catch (error) {
      setManagementStatus({ type: 'error', text: error.message })
    }
  }

  const handleRoleChange = async (userId, role) => {
    setManagementStatus({ type: '', text: '' })

    try {
      const data = await apiRequest(`/usuarios/${userId}/rol`, {
        method: 'PUT',
        body: JSON.stringify({ rol: role }),
      })
      setUsers((current) =>
        current.map((user) =>
          user.id_usuario === userId ? { ...user, rol: role } : user
        )
      )
      if (userId === profile.id) {
        setProfile(updateStoredUser({ rol: role }))
      }
      setManagementStatus({ type: 'success', text: data.mensaje })
    } catch (error) {
      setManagementStatus({ type: 'error', text: error.message })
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()

    if (!resetForm.userId) {
      setManagementStatus({ type: 'error', text: 'Selecciona un usuario.' })
      return
    }

    if (resetForm.password.length < 6) {
      setManagementStatus({
        type: 'error',
        text: 'La nueva contraseña debe tener al menos 6 caracteres.',
      })
      return
    }

    try {
      const data = await apiRequest(`/usuarios/${resetForm.userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ nueva_contrasena: resetForm.password }),
      })
      setUsers((current) =>
        current.map((user) =>
          String(user.id_usuario) === resetForm.userId
            ? { ...user, debe_cambiar_contrasena: 1 }
            : user
        )
      )
      setResetForm(emptyResetForm)
      setManagementStatus({ type: 'success', text: data.mensaje })
    } catch (error) {
      setManagementStatus({ type: 'error', text: error.message })
    }
  }

  const passwordInputType = showPasswords ? 'text' : 'password'

  return (
    <div className="space-y-6">
            <section>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-blue-300">Cuenta</p>
              <h1 className="mt-3 text-2xl font-extrabold text-[#201d31] sm:text-3xl">Configuración</h1>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
              <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[#f1edf5] pb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-[#201d31]">Datos del Perfil</h2>
                    <p className="mt-1 text-xs font-bold text-[#8d88a2]">{profile.role}</p>
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
                    autoComplete="name"
                    readOnly
                  />
                  <SettingsField
                    label="Nombre de usuario"
                    name="username"
                    value={profile.username}
                    readOnly
                  />
                  <SettingsField
                    label="Correo electronico"
                    name="email"
                    type="email"
                    value={profile.email}
                    autoComplete="email"
                    readOnly
                  />
                </div>

                {profile.mustChangePassword && (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                    Debes cambiar tu contraseña temporal.
                  </p>
                )}
              </section>

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

            {profile.roleKey === 'admin' && (
              <form onSubmit={handleCreateUser} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="border-b border-[#f1edf5] pb-4">
                  <h2 className="text-base font-extrabold text-[#201d31]">Crear usuario</h2>
                  <p className="mt-1 text-xs font-bold text-[#8d88a2]">
                    El usuario deberá cambiar su contraseña al ingresar.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SettingsField
                    label="Nombre completo"
                    name="fullName"
                    value={userForm.fullName}
                    onChange={handleUserFormChange}
                    required
                  />
                  <SettingsField
                    label="Nombre de usuario"
                    name="username"
                    value={userForm.username}
                    onChange={handleUserFormChange}
                    required
                  />
                  <SettingsField
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    value={userForm.email}
                    onChange={handleUserFormChange}
                    required
                  />
                  <SettingsField
                    label="Contraseña temporal"
                    name="password"
                    type="password"
                    value={userForm.password}
                    onChange={handleUserFormChange}
                    required
                  />
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Rol</span>
                    <select
                      name="role"
                      value={userForm.role}
                      onChange={handleUserFormChange}
                      className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    >
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3A9AF2] px-5 text-sm font-extrabold text-[#FFFFFF] shadow-sm transition hover:bg-[#238BEA]"
                  >
                    <AppIcon name="check" />
                    Crear usuario
                  </button>
                </div>
              </form>
            )}

            {profile.roleKey === 'admin' && (
              <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="border-b border-[#f1edf5] pb-4">
                  <h2 className="text-base font-extrabold text-[#201d31]">Roles de usuarios</h2>
                  <p className="mt-1 text-xs font-bold text-[#8d88a2]">
                    Selecciona el rol que tendrá cada usuario.
                  </p>
                </div>

                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id_usuario}
                      className="grid gap-3 rounded-xl border border-[#f1edf5] p-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-extrabold text-[#201d31]">{user.nombre_completo}</p>
                        <p className="mt-1 text-xs font-bold text-[#8d88a2]">
                          {user.nombre_usuario} · {user.correo}
                        </p>
                      </div>
                      <select
                        value={user.rol}
                        onChange={(event) => handleRoleChange(user.id_usuario, event.target.value)}
                        className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      >
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {canManageUsers && (
              <form onSubmit={handleResetPassword} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="border-b border-[#f1edf5] pb-4">
                  <h2 className="text-base font-extrabold text-[#201d31]">Restablecer contraseña</h2>
                  <p className="mt-1 text-xs font-bold text-[#8d88a2]">
                    Se solicitará al usuario cambiarla en su siguiente acceso.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Usuario</span>
                    <select
                      value={resetForm.userId}
                      onChange={(event) => {
                        setResetForm((current) => ({ ...current, userId: event.target.value }))
                        setManagementStatus({ type: '', text: '' })
                      }}
                      required
                      className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Selecciona un usuario</option>
                      {users.map((user) => (
                        <option key={user.id_usuario} value={user.id_usuario}>
                          {user.nombre_completo} ({user.nombre_usuario})
                        </option>
                      ))}
                    </select>
                  </label>
                  <SettingsField
                    label="Nueva contraseña"
                    name="resetPassword"
                    type="password"
                    value={resetForm.password}
                    onChange={(event) => {
                      setResetForm((current) => ({ ...current, password: event.target.value }))
                      setManagementStatus({ type: '', text: '' })
                    }}
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#201d31] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#332d4b]"
                  >
                    <AppIcon name="check" />
                    Restablecer
                  </button>
                </div>
              </form>
            )}

            {canManageUsers && <StatusMessage status={managementStatus} />}
          </div>
  )
}

export default Configuracion
