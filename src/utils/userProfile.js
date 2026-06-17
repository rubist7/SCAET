export const userProfileStorageKey = 'scaet-user-profile'

export const defaultUserProfile = {
  name: 'Ing. Javier E.',
  email: 'javier.escalante@scaet.com',
  role: 'Administrador',
}

export function getUserInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'US'
}

export function loadUserProfile() {
  if (typeof window === 'undefined') {
    return defaultUserProfile
  }

  try {
    const storedProfile = window.localStorage.getItem(userProfileStorageKey)

    if (!storedProfile) {
      return defaultUserProfile
    }

    return { ...defaultUserProfile, ...JSON.parse(storedProfile) }
  } catch {
    return defaultUserProfile
  }
}

export function saveUserProfile(profile) {
  const nextProfile = { ...defaultUserProfile, ...profile }

  window.localStorage.setItem(userProfileStorageKey, JSON.stringify(nextProfile))
  window.dispatchEvent(new CustomEvent('scaet-user-profile-updated', { detail: nextProfile }))

  return nextProfile
}
