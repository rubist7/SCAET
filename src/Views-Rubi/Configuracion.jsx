import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '../components/Sidebar'
import { getUserInitials, loadUserProfile, roleLabels, updateStoredUser } from '../utils/userProfile'

const apiUrl = '/api'

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

const emptyManagedUserForm = {
  fullName: '',
  username: '',
  email: '',
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

function SettingsField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  required = false,
  readOnly = false,
  passwordVisible = false,
  onTogglePassword,
}) {
  const hasPasswordToggle = typeof onTogglePassword === 'function'

  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          readOnly={readOnly}
          className={`h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition placeholder:text-[#9b95ac] focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 ${hasPasswordToggle ? 'pr-11' : ''}`}
        />
        {hasPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#5d5870] transition hover:bg-[#e9dfd0]"
            aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            title={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <AppIcon name={passwordVisible ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </div>
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
  const [profileForm, setProfileForm] = useState(() => ({
    fullName: profile.name,
    username: profile.username,
    email: profile.email,
  }))
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [userForm, setUserForm] = useState(emptyUserForm)
  const [resetForm, setResetForm] = useState(emptyResetForm)
  const [users, setUsers] = useState([])
  const [showPasswords, setShowPasswords] = useState(false)
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showHiddenUsers, setShowHiddenUsers] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [managedUserForm, setManagedUserForm] = useState(emptyManagedUserForm)
  const [roleForm, setRoleForm] = useState('usuario')
  const [profileStatus, setProfileStatus] = useState({ type: '', text: '' })
  const [passwordStatus, setPasswordStatus] = useState({ type: '', text: '' })
  const [managementStatus, setManagementStatus] = useState({ type: '', text: '' })
  const managementFormRef = useRef(null)

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

  useEffect(() => {
    if (!selectedAction || !selectedUserId) {
      return undefined
    }

    const animationFrame = window.requestAnimationFrame(() => {
      managementFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [selectedAction, selectedUserId])

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileForm((current) => ({ ...current, [name]: value }))
    setProfileStatus({ type: '', text: '' })
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()

    try {
      const data = await apiRequest('/usuarios/me/perfil', {
        method: 'PUT',
        body: JSON.stringify({
          nombre_completo: profileForm.fullName,
          nombre_usuario: profileForm.username,
          correo: profileForm.email,
        }),
      })
      const updatedProfile = updateStoredUser(data.usuario)
      setProfile(updatedProfile)
      setProfileForm({
        fullName: updatedProfile.name,
        username: updatedProfile.username,
        email: updatedProfile.email,
      })
      setProfileStatus({ type: 'success', text: data.mensaje })
    } catch (error) {
      setProfileStatus({ type: 'error', text: error.message })
    }
  }

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
      setShowPasswords(false)
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
      setShowUserPassword(false)
      setManagementStatus({ type: 'success', text: data.mensaje })
    } catch (error) {
      setManagementStatus({ type: 'error', text: error.message })
    }
  }

  const handleUserSearchChange = (event) => {
    setUserSearch(event.target.value)
  }

  const handleToggleHiddenUsers = () => {
    setShowHiddenUsers((current) => !current)
    setSelectedAction('')
    setSelectedUserId('')
    setResetForm(emptyResetForm)
    setManagementStatus({ type: '', text: '' })
  }

  const handleSelectedUserAction = (user, action) => {
    setSelectedUserId(String(user.id_usuario))
    setSelectedAction(action)
    setManagementStatus({ type: '', text: '' })

    if (action === 'edit') {
      setManagedUserForm({
        fullName: user.nombre_completo || '',
        username: user.nombre_usuario || '',
        email: user.correo || '',
      })
      return
    }

    if (action === 'role') {
      setRoleForm(user.rol)
      return
    }

    if (action === 'reset') {
      setResetForm({
        userId: String(user.id_usuario),
        password: '',
      })
      setShowResetPassword(false)
    }
  }

  const handleManagedUserChange = (event) => {
    const { name, value } = event.target
    setManagedUserForm((current) => ({ ...current, [name]: value }))
    setManagementStatus({ type: '', text: '' })
  }

  const handleUpdateUser = async (event) => {
    event.preventDefault()

    if (!selectedUserId) {
      setManagementStatus({ type: 'error', text: 'Selecciona un usuario.' })
      return
    }

    try {
      const data = await apiRequest(`/usuarios/${selectedUserId}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre_completo: managedUserForm.fullName,
          nombre_usuario: managedUserForm.username,
          correo: managedUserForm.email,
        }),
      })
      setUsers((current) =>
        current.map((currentUser) =>
          String(currentUser.id_usuario) === String(selectedUserId) ? data.usuario : currentUser
        )
      )
      setManagedUserForm({
        fullName: data.usuario.nombre_completo || '',
        username: data.usuario.nombre_usuario || '',
        email: data.usuario.correo || '',
      })
      if (String(selectedUserId) === String(profile.id)) {
        const updatedProfile = updateStoredUser(data.usuario)
        setProfile(updatedProfile)
        setProfileForm({
          fullName: updatedProfile.name,
          username: updatedProfile.username,
          email: updatedProfile.email,
        })
      }
      setManagementStatus({ type: 'success', text: data.mensaje })
    } catch (error) {
      setManagementStatus({ type: 'error', text: error.message })
    }
  }

  const handleRoleSubmit = async (event) => {
    event.preventDefault()

    if (!selectedUserId) {
      setManagementStatus({ type: 'error', text: 'Selecciona un usuario.' })
      return
    }

    await handleRoleChange(selectedUserId, roleForm)
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
          String(user.id_usuario) === String(userId) ? { ...user, rol: role } : user
        )
      )
      if (String(userId) === String(profile.id)) {
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
      setShowResetPassword(false)
      if (selectedAction === 'reset') {
        setSelectedAction('')
        setSelectedUserId('')
      }
      setManagementStatus({ type: 'success', text: data.mensaje })
    } catch (error) {
      setManagementStatus({ type: 'error', text: error.message })
    }
  }

  const handleUserStateChange = async (user, activo) => {
    if (activo === 0 && String(user.id_usuario) === String(profile.id)) {
      setManagementStatus({ type: 'error', text: 'No puedes ocultar tu propia cuenta.' })
      return
    }

    try {
      const data = await apiRequest(`/usuarios/${user.id_usuario}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ activo }),
      })
      setUsers((current) =>
        current.map((currentUser) =>
          String(currentUser.id_usuario) === String(user.id_usuario) ? data.usuario : currentUser
        )
      )
      if (String(selectedUserId) === String(user.id_usuario)) {
        setSelectedAction('')
        setSelectedUserId('')
        setResetForm(emptyResetForm)
        setShowResetPassword(false)
      }
      setManagementStatus({ type: 'success', text: data.mensaje })
    } catch (error) {
      setManagementStatus({ type: 'error', text: error.message })
    }
  }

  const passwordInputType = showPasswords ? 'text' : 'password'
  const userPasswordInputType = showUserPassword ? 'text' : 'password'
  const resetPasswordInputType = showResetPassword ? 'text' : 'password'
  const resettableUsers = profile.roleKey === 'capturista'
    ? users.filter(
      (user) =>
        user.rol !== 'admin' &&
        String(user.id_usuario) !== String(profile.id) &&
        Number(user.activo) === 1
    )
    : users
  const selectedUser = users.find((user) => String(user.id_usuario) === String(selectedUserId))
  const normalizedUserSearch = userSearch.trim().toLowerCase()
  const visibleUsers = users.filter((user) => Number(user.activo) === (showHiddenUsers ? 0 : 1))
  const filteredUsers = normalizedUserSearch
    ? visibleUsers.filter((user) => {
      const searchableText = [
        user.nombre_completo,
        user.nombre_usuario,
        user.correo,
        user.rol,
        roleLabels[user.rol],
      ].join(' ').toLowerCase()

      return searchableText.includes(normalizedUserSearch)
    })
    : visibleUsers
  const userListTitle = showHiddenUsers ? 'Usuarios ocultos' : 'Usuarios activos'
  const userListDescription = showHiddenUsers
    ? 'Usuarios desactivados que se conservan para auditoría y consulta.'
    : 'Usuarios visibles y con acceso al sistema.'
  const emptyUsersMessage = showHiddenUsers
    ? 'No se encontraron usuarios ocultos.'
    : 'No se encontraron usuarios activos.'

  return (
    <div className="space-y-6">
            {profile.roleKey === 'admin' && managementStatus.text && (
              <div className="fixed right-4 top-4 z-50 w-[min(24rem,calc(100vw-2rem))] shadow-lg" role="status">
                <StatusMessage status={managementStatus} />
              </div>
            )}
            <section>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-blue-300">Cuenta</p>
              <h1 className="mt-3 text-2xl font-extrabold text-[#201d31] sm:text-3xl">Configuración</h1>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
              <form onSubmit={handleProfileSubmit} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
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
                    name="fullName"
                    value={profileForm.fullName}
                    onChange={handleProfileChange}
                    autoComplete="name"
                    required={profile.roleKey === 'admin'}
                    readOnly={profile.roleKey !== 'admin'}
                  />
                  <SettingsField
                    label="Nombre de usuario"
                    name="username"
                    value={profileForm.username}
                    onChange={handleProfileChange}
                    required={profile.roleKey === 'admin'}
                    readOnly={profile.roleKey !== 'admin'}
                  />
                  <SettingsField
                    label="Correo electronico"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    autoComplete="email"
                    required={profile.roleKey === 'admin'}
                    readOnly={profile.roleKey !== 'admin'}
                  />
                </div>

                {profile.mustChangePassword && (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                    Debes cambiar tu contraseña temporal.
                  </p>
                )}

                {profile.roleKey === 'admin' && (
                  <>
                    <StatusMessage status={profileStatus} />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#201d31] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#332d4b]"
                      >
                        <AppIcon name="check" />
                        Actualizar
                      </button>
                    </div>
                  </>
                )}
              </form>

              <form onSubmit={handlePasswordSubmit} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[#f1edf5] pb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-[#201d31]">Contraseña</h2>
                    <p className="mt-1 text-xs font-bold text-[#8d88a2]">Seguridad de la cuenta</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswords((currentValue) => !currentValue)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2ece0] text-[#5d5870] transition hover:bg-[#e9dfd0]"
                    aria-label={showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                    title={showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                  >
                    <AppIcon name={showPasswords ? 'eyeOff' : 'eye'} />
                  </button>
                </div>

                <div className="space-y-4">
                  <SettingsField
                    label="Contraseña actual"
                    name="currentPassword"
                    type={passwordInputType}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    passwordVisible={showPasswords}
                    onTogglePassword={() => setShowPasswords((currentValue) => !currentValue)}
                    required
                  />
                  <SettingsField
                    label="Nueva contraseña"
                    name="newPassword"
                    type={passwordInputType}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    passwordVisible={showPasswords}
                    onTogglePassword={() => setShowPasswords((currentValue) => !currentValue)}
                    required
                  />
                  <SettingsField
                    label="Confirmar contraseña"
                    name="confirmPassword"
                    type={passwordInputType}
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    passwordVisible={showPasswords}
                    onTogglePassword={() => setShowPasswords((currentValue) => !currentValue)}
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
                    type={userPasswordInputType}
                    value={userForm.password}
                    onChange={handleUserFormChange}
                    passwordVisible={showUserPassword}
                    onTogglePassword={() => setShowUserPassword((currentValue) => !currentValue)}
                    required
                  />
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Rol</span>
                    <select
                      name="role"
                      value={userForm.role}
                      onChange={handleUserFormChange}
                      className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
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
              <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-[#16131F]">
                <div className="border-b border-[#f1edf5] pb-4 dark:border-[#30273b]">
                  <h2 className="text-base font-extrabold text-[#201d31]">Gestión de usuarios</h2>
                  <p className="mt-1 text-xs font-bold text-[#8d88a2]">
                    Busca un usuario y elige una acción para editar datos, cambiar rol o restablecer contraseña.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <SettingsField
                    label="Buscar usuario"
                    name="userSearch"
                    value={userSearch}
                    onChange={handleUserSearchChange}
                    placeholder="Nombre, usuario, correo o rol"
                  />
                  <button
                    type="button"
                    onClick={handleToggleHiddenUsers}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#e2d9c9] bg-[#fbf7ef] px-3 text-xs font-extrabold text-[#5d5870] shadow-sm transition hover:bg-[#f2ece0] hover:text-[#2a263a] dark:border-[#30273b] dark:bg-[#241c2d] dark:text-[#c9bdd5] dark:hover:border-[#493a59] dark:hover:bg-[#2c2236]"
                    aria-label={showHiddenUsers ? 'Ver usuarios activos' : 'Ver usuarios ocultos'}
                    title={showHiddenUsers ? 'Ver usuarios activos' : 'Ver usuarios ocultos'}
                  >
                    <AppIcon name={showHiddenUsers ? 'eye' : 'eyeOff'} />
                    {showHiddenUsers ? 'Activos' : 'Ocultos'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#201d31]">{userListTitle}</h3>
                    <p className="mt-1 text-xs font-bold text-[#8d88a2]">{userListDescription}</p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#f1edf5] dark:border-[#30273b]">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#f7f4ec] text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#8d88a2] dark:bg-[#241c2d] dark:text-[#c9bdd5]">
                        <tr>
                          <th className="px-4 py-3">Nombre completo</th>
                          <th className="px-4 py-3">Nombre de usuario</th>
                          <th className="px-4 py-3">Correo</th>
                          <th className="px-4 py-3">Rol</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1edf5] dark:divide-[#30273b]">
                        {filteredUsers.map((user) => (
                          <tr key={user.id_usuario} className="align-top">
                            <td className="px-4 py-3 font-extrabold text-[#201d31]">{user.nombre_completo}</td>
                            <td className="px-4 py-3 font-bold text-[#5d5870]">{user.nombre_usuario}</td>
                            <td className="px-4 py-3 font-bold text-[#5d5870]">{user.correo}</td>
                            <td className="px-4 py-3 font-bold text-[#5d5870]">{roleLabels[user.rol] || user.rol}</td>
                            <td className={`px-4 py-3 font-bold ${Number(user.activo) === 1 ? 'text-emerald-600' : 'text-[#8d88a2]'}`}>
                              {Number(user.activo) === 1 ? 'Activo' : 'Oculto'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSelectedUserAction(user, 'edit')}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 px-2.5 text-[11px] font-extrabold text-sky-700 transition hover:bg-sky-100 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300 dark:hover:bg-sky-400/20"
                                >
                                  Editar datos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectedUserAction(user, 'role')}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 px-2.5 text-[11px] font-extrabold text-violet-700 transition hover:bg-violet-100 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300 dark:hover:bg-violet-400/20"
                                >
                                  Cambiar rol
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectedUserAction(user, 'reset')}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 px-2.5 text-[11px] font-extrabold text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20"
                                >
                                  Restablecer contraseña
                                </button>
                                {Number(user.activo) === 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUserStateChange(user, 0)}
                                    disabled={String(user.id_usuario) === String(profile.id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8dfd1] bg-[#f2ece0] text-[#756d82] transition hover:bg-[#e9dfd0] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#30273b] dark:bg-[#241c2d] dark:text-[#9f94ae] dark:hover:bg-[#2c2236]"
                                    aria-label={`Ocultar ${user.nombre_completo}`}
                                    title="Ocultar"
                                  >
                                    <AppIcon name="eyeOff" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUserStateChange(user, 1)}
                                    className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 text-[11px] font-extrabold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
                                  >
                                    Activar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredUsers.length === 0 && (
                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                      {emptyUsersMessage}
                    </p>
                  )}
                </div>

                {selectedAction === 'edit' && selectedUser && (
                  <form ref={managementFormRef} onSubmit={handleUpdateUser} className="scroll-mt-6 space-y-4 rounded-xl border border-[#f1edf5] p-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#201d31]">Editar datos</h3>
                      <p className="mt-1 text-xs font-bold text-[#8d88a2]">{selectedUser.nombre_completo}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <SettingsField
                        label="Nombre completo"
                        name="fullName"
                        value={managedUserForm.fullName}
                        onChange={handleManagedUserChange}
                        required
                      />
                      <SettingsField
                        label="Nombre de usuario"
                        name="username"
                        value={managedUserForm.username}
                        onChange={handleManagedUserChange}
                        required
                      />
                      <SettingsField
                        label="Correo electrónico"
                        name="email"
                        type="email"
                        value={managedUserForm.email}
                        onChange={handleManagedUserChange}
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#201d31] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#332d4b]"
                      >
                        <AppIcon name="check" />
                        Guardar datos
                      </button>
                    </div>
                  </form>
                )}

                {selectedAction === 'role' && selectedUser && (
                  <form ref={managementFormRef} onSubmit={handleRoleSubmit} className="scroll-mt-6 space-y-4 rounded-xl border border-[#f1edf5] p-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#201d31]">Cambiar rol</h3>
                      <p className="mt-1 text-xs font-bold text-[#8d88a2]">{selectedUser.nombre_completo}</p>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Rol</span>
                      <select
                        value={roleForm}
                        onChange={(event) => {
                          setRoleForm(event.target.value)
                          setManagementStatus({ type: '', text: '' })
                        }}
                        className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      >
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#201d31] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#332d4b]"
                      >
                        <AppIcon name="check" />
                        Guardar rol
                      </button>
                    </div>
                  </form>
                )}

                {selectedAction === 'reset' && selectedUser && (
                  <form ref={managementFormRef} onSubmit={handleResetPassword} className="scroll-mt-6 space-y-4 rounded-xl border border-[#f1edf5] p-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#201d31]">Restablecer contraseña</h3>
                      <p className="mt-1 text-xs font-bold text-[#8d88a2]">{selectedUser.nombre_completo}</p>
                    </div>
                    <SettingsField
                      label="Nueva contraseña"
                      name="resetPassword"
                      type={resetPasswordInputType}
                      value={resetForm.password}
                      passwordVisible={showResetPassword}
                      onTogglePassword={() => setShowResetPassword((currentValue) => !currentValue)}
                      onChange={(event) => {
                        setResetForm((current) => ({
                          ...current,
                          userId: String(selectedUser.id_usuario),
                          password: event.target.value,
                        }))
                        setManagementStatus({ type: '', text: '' })
                      }}
                      required
                    />
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
              </section>
            )}

            {profile.roleKey === 'capturista' && (
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
                      className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Selecciona un usuario</option>
                      {resettableUsers.map((user) => (
                        <option key={user.id_usuario} value={user.id_usuario}>
                          {user.nombre_completo} ({user.nombre_usuario})
                        </option>
                      ))}
                    </select>
                  </label>
                  <SettingsField
                    label="Nueva contraseña"
                    name="resetPassword"
                    type={resetPasswordInputType}
                    value={resetForm.password}
                    passwordVisible={showResetPassword}
                    onTogglePassword={() => setShowResetPassword((currentValue) => !currentValue)}
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

            {profile.roleKey === 'capturista' && <StatusMessage status={managementStatus} />}
          </div>
  )
}

export default Configuracion
