export const equipmentStorageKey = 'scaet_equipments'

export const typeOptions = ['Laptop', 'iPad', 'Tablet', 'Celular', 'Computadora', 'Monitor', 'Impresora', 'Teclado', 'Mouse', 'YubiKey', 'Tarjeta', 'Cargador', 'Teléfono', 'Otro']


export const statusOptions = ['Disponible', 'Asignado', 'Mantenimiento', 'Baja']

export function loadEquipments() {
  try {
    const storedEquipments = globalThis.localStorage?.getItem(equipmentStorageKey)
    return storedEquipments ? JSON.parse(storedEquipments) : []
  } catch {
    return []
  }
}

export function saveEquipments(equipments) {
  globalThis.localStorage?.setItem(equipmentStorageKey, JSON.stringify(equipments))
}

export function getEquipmentById(id) {
  return loadEquipments().find((equipment) => equipment.id === id)
}

export function getEquipmentByQrValue(qrValue) {
  const equipments = loadEquipments()
  const equipmentId = getEquipmentIdFromQrValue(qrValue)

  return equipments.find((equipment) => (
    equipment.id === equipmentId
    || equipment.qrValue === qrValue
    || equipment.qrCode === qrValue
  ))
}

export function createEquipmentId() {
  return globalThis.crypto?.randomUUID?.() ?? `equipment-${Date.now()}`
}

export function createPublicId(equipments) {
  return `#${String(equipments.length + 1).padStart(3, '0')}`
}

export function createQrCode(equipment) {
  const cleanPublicId = equipment.publicId.replace('#', '')
  return `SCAET-${cleanPublicId}-${equipment.serialNumber || 'SIN-SERIE'}`
}

export function createQrValue(equipmentId) {
  const origin = globalThis.location?.origin ?? ''
  return `${origin}/equipos/ficha/${equipmentId}`
}

export function getEquipmentQrValue(equipment) {
  return equipment.qrValue || createQrValue(equipment.id)
}

export function getEquipmentIdFromQrValue(qrValue) {
  if (!qrValue) {
    return ''
  }

  try {
    const parsedUrl = new URL(qrValue)
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean)
    return pathParts[0] === 'equipos' && pathParts[1] === 'ficha' ? pathParts[2] : qrValue
  } catch {
    const pathParts = qrValue.split('/').filter(Boolean)
    const fichaIndex = pathParts.indexOf('ficha')
    return fichaIndex >= 0 ? pathParts[fichaIndex + 1] : qrValue
  }
}

export function normalizeText(value) {
  return (value ?? '').toString().trim().toLowerCase()
}

export function formatDate(value) {
  if (!value || value === '-') {
    return value || '-'
  }

  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export function formatShortDate(value) {
  if (!value || value === '-') {
    return value || '-'
  }

  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export function calculateWarrantyEnd(purchaseDate, warrantyMonths) {
  if (!purchaseDate || !warrantyMonths) {
    return ''
  }

  const date = new Date(`${purchaseDate}T00:00:00`)
  date.setMonth(date.getMonth() + Number(warrantyMonths))
  return date.toISOString().slice(0, 10)
}

export function statusClass(status) {
  const classes = {
    Disponible: 'bg-blue-50 text-blue-500 dark:bg-blue-400/15 dark:text-blue-300',
    Asignado: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-400/15 dark:text-emerald-300',
    Mantenimiento: 'bg-amber-50 text-amber-500 dark:bg-amber-400/15 dark:text-amber-300',
    Baja: 'bg-rose-50 text-rose-500 dark:bg-rose-400/15 dark:text-rose-300',
  }

  return classes[status] ?? 'bg-blue-50 text-blue-500 dark:bg-blue-400/15 dark:text-blue-300'
}

export function warrantyClass(warrantyEnd) {
  if (!warrantyEnd || warrantyEnd === '-') {
    return 'bg-[#f2ece0] text-[#8d88a2] dark:bg-[#f4efe6]/10 dark:text-[#c9bdd5]'
  }

  const today = new Date()
  const end = new Date(`${warrantyEnd}T00:00:00`)

  return end >= today
    ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-400/15 dark:text-emerald-300'
    : 'bg-amber-50 text-amber-500 dark:bg-amber-400/15 dark:text-amber-300'
}

export function warrantyLabel(warrantyMonths) {
  if (!warrantyMonths) {
    return '-'
  }

  return `${warrantyMonths} meses`
}
