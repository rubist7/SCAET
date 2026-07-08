export const userStorageKey = 'scaet-user'

export const roleLabels = {
  admin: 'Administrador',
  capturista: 'Capturista',
  usuario: 'Usuario',
}

export const defaultUserProfile = {
  id: null,
  name: 'Usuario',
  username: '',
  email: '',
  role: 'Usuario',
  roleKey: 'usuario',
  mustChangePassword: false,
}

export function getUserInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'US'
}

export function loadStoredUser() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedUser = window.localStorage.getItem(userStorageKey)
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

export function loadUserProfile() {
  const user = loadStoredUser()

  if (!user) {
    return defaultUserProfile
  }

  return {
    id: user.id_usuario,
    name: user.nombre_completo || defaultUserProfile.name,
    username: user.nombre_usuario || '',
    email: user.correo || '',
    role: roleLabels[user.rol] || defaultUserProfile.role,
    roleKey: user.rol || defaultUserProfile.roleKey,
    mustChangePassword: Number(user.debe_cambiar_contrasena) === 1,
  }
}

export function updateStoredUser(changes) {
  const currentUser = loadStoredUser()

  if (!currentUser) {
    return loadUserProfile()
  }

  const nextUser = { ...currentUser, ...changes }
  window.localStorage.setItem(userStorageKey, JSON.stringify(nextUser))

  const nextProfile = loadUserProfile()
  window.dispatchEvent(new CustomEvent('scaet-user-profile-updated', { detail: nextProfile }))

  return nextProfile
}
