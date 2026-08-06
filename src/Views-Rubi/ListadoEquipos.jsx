import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppIcon } from '../components/Sidebar'
import {
  EquipmentPhoto,
  EquipmentShell,
  QrCode,
  StatusBadge,
  WarrantyBadge,
} from './equiposShared'
import {
  formatDate,
  customTypeOption,
  normalizeText,
  buildEquipmentTypeOptions,
  statusOptions,
} from './equiposData'

const apiUrl = '/api'
const qrImageMaxSize = 10 * 1024 * 1024
const qrImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('scaet-token')}`, 'Content-Type': 'application/json' })
const mapEquipment = (e) => ({
  id: String(e.id_equipo), publicId: e.codigo_equipo, title: e.nombre_equipo,
  type: e.tipo_equipo, brand: e.marca, model: e.modelo, serialNumber: e.numero_serie,
  provider: e.nombre_proveedor || '-', company: e.empresa || '-', sellerName: e.nombre_vendedor || '-',
  purchaseDate: e.fecha_compra ? String(e.fecha_compra).slice(0, 10) : '',
  warrantyMonths: e.garantia_meses, warrantyEnd: e.vence_garantia ? String(e.vence_garantia).slice(0, 10) : '',
  status: e.estado ? e.estado[0].toUpperCase() + e.estado.slice(1) : 'Disponible',
  area: e.area_actual || '-', specs: e.especificaciones_tecnicas || '-', photoUrl: e.foto_url || '',
  qrValue: e.qr_url || `/equipos/qr/${e.qr_token}`, qrToken: e.qr_token, active: Number(e.activo) === 1,
})

function isValidImageFile(file) {
  return file instanceof File
    && file.size > 0
    && file.size <= qrImageMaxSize
    && qrImageTypes.has(file.type)
}
function EquipmentCard({ equipment, showHidden, onToggleHidden, canChangeState }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <EquipmentPhoto equipment={equipment} size="sm" />
        <StatusBadge status={equipment.status} />
      </div>

      <div className="mt-4 min-w-0">
        <h2 className="truncate text-lg font-extrabold text-[#201d31]">{equipment.title}</h2>
        <div className="mt-3 space-y-1 text-xs font-bold text-[#8d88a2]">
          <p className="break-words">{equipment.type} - {equipment.serialNumber}</p>
          <p className="break-words">Area: {equipment.area}</p>
          <p className="break-words">Empresa: {equipment.company}</p>
          <p>F. compra: {formatDate(equipment.purchaseDate)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[#f1edf5] pt-3 min-[430px]:flex-row min-[430px]:items-end min-[430px]:justify-between">
        <div className="rounded-xl bg-[#f2ece0] p-2">
          <QrCode equipment={equipment} />
        </div>
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 min-[430px]:w-auto">
          {canChangeState && <button
            type="button"
            onClick={() => onToggleHidden(equipment.id, !showHidden)}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#f2ece0] px-3 text-[#5d5870] transition hover:bg-[#e9dfd0]"
            aria-label={`${showHidden ? 'Restaurar' : 'Ocultar'} ${equipment.title}`}
            title={showHidden ? 'Restaurar' : 'Ocultar'}
          >
            <AppIcon name={showHidden ? 'eye' : 'eyeOff'} />
          </button>}
          <Link
            to={`/equipos/ficha/${equipment.id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#f2ece0] px-5 text-sm font-extrabold text-[#5d5870] transition hover:bg-[#e9dfd0]"
          >
            Ver ficha
          </Link>
        </div>
      </div>
    </article>
  )
}

function EquipmentTable({ equipments, showHidden, onToggleHidden, canChangeState }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full min-w-[1180px] table-fixed text-left">
        <thead className="bg-[#eee7d9] text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300">
          <tr>
            <th className="w-24 px-5 py-3">ID</th>
            <th className="px-5 py-3">Tipo</th>
            <th className="px-5 py-3">Marca / Modelo</th>
            <th className="px-5 py-3">Num. serie</th>
            <th className="px-5 py-3">Empresa</th>
            <th className="px-5 py-3">F. compra</th>
            <th className="px-5 py-3">Garantia</th>
            <th className="px-5 py-3">Area</th>
            <th className="w-36 px-5 py-3">Estado</th>
            <th className="w-44 px-5 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1edf5] text-sm">
          {equipments.map((equipment) => (
            <tr key={equipment.id} className="transition hover:bg-blue-50/40">
              <td className="px-5 py-4 font-bold text-[#8d88a2]">{equipment.publicId}</td>
              <td className="px-5 py-4 font-bold text-[#5d5870]">{equipment.type}</td>
              <td className="px-5 py-4">
                <p className="font-extrabold text-[#201d31]">{equipment.title}</p>
                <p className="mt-1 truncate text-xs font-bold text-[#8d88a2]">{equipment.model}</p>
              </td>
              <td className="px-5 py-4 font-bold text-[#8d88a2]">{equipment.serialNumber}</td>
              <td className="px-5 py-4 font-bold text-[#5d5870]">{equipment.company}</td>
              <td className="px-5 py-4 font-bold text-[#5d5870]">{formatDate(equipment.purchaseDate)}</td>
              <td className="px-5 py-4">
                <WarrantyBadge warrantyEnd={equipment.warrantyEnd} />
              </td>
              <td className="px-5 py-4 font-bold text-[#5d5870]">{equipment.area}</td>
              <td className="px-5 py-4">
                <StatusBadge status={equipment.status} />
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex justify-end gap-2">
                  {canChangeState && <button
                    type="button"
                    onClick={() => onToggleHidden(equipment.id, !showHidden)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2ece0] text-[#5d5870] transition hover:bg-[#e9dfd0]"
                    aria-label={`${showHidden ? 'Restaurar' : 'Ocultar'} ${equipment.title}`}
                    title={showHidden ? 'Restaurar' : 'Ocultar'}
                  >
                    <AppIcon name={showHidden ? 'eye' : 'eyeOff'} />
                  </button>}
                  <Link
                    to={`/equipos/ficha/${equipment.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-[#f2ece0] px-4 text-xs font-extrabold text-[#5d5870] transition hover:bg-[#e9dfd0]"
                  >
                    Ver ficha
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListadoEquipos() {
  const navigate = useNavigate()
  const location = useLocation()
  const [equipments, setEquipments] = useState([])
  const [allLoadedEquipments, setAllLoadedEquipments] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('cards')
  const [showHidden, setShowHidden] = useState(false)
  const [hiddenEquipmentsCount, setHiddenEquipmentsCount] = useState(0)
  const [qrError, setQrError] = useState('')
  const [isQrScanLoading, setIsQrScanLoading] = useState(false)
  const photoInputRef = useRef(null)
  const photoScanInProgressRef = useRef(false)
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('scaet-user') || '{}') } catch { return {} } }, [])
  const canCreate = ['admin', 'capturista'].includes(user.rol)
  const canChangeState = user.rol === 'admin'

  const loadEquipmentList = useCallback(async () => {
    const [activeResponse, hiddenResponse] = await Promise.all([
      fetch(`${apiUrl}/equipos?estado=activos`, { headers: authHeaders() }),
      fetch(`${apiUrl}/equipos?estado=ocultos`, { headers: authHeaders() }),
    ])
    const [activeData, hiddenData] = await Promise.all([activeResponse.json(), hiddenResponse.json()])
    if (!activeResponse.ok) throw new Error(activeData.mensaje || 'No se pudieron cargar los equipos')
    if (!hiddenResponse.ok) throw new Error(hiddenData.mensaje || 'No se pudieron cargar los equipos ocultos')
    const activeEquipments = activeData.equipos || []
    const hiddenEquipments = hiddenData.equipos || []
    const mappedActiveEquipments = activeEquipments.map(mapEquipment)
    const mappedHiddenEquipments = hiddenEquipments.map(mapEquipment)
    setAllLoadedEquipments([...mappedActiveEquipments, ...mappedHiddenEquipments])
    setEquipments(showHidden ? mappedHiddenEquipments : mappedActiveEquipments)
    setHiddenEquipmentsCount(hiddenEquipments.length)
  }, [showHidden])

  useEffect(() => {
    let isCurrent = true

    const load = async () => {
      try {
        await loadEquipmentList()
      } catch (error) {
        if (isCurrent) {
          setQrError(error.message)
        }
      }
    }

    void load()
    return () => { isCurrent = false }
  }, [loadEquipmentList, location.state?.refreshEquipmentList])

  const navigateFromQrValue = useCallback(async (qrValue) => {
    const token = qrValue.split('/').filter(Boolean).at(-1)

    try {
      const response = await fetch(`${apiUrl}/equipos/qr/${encodeURIComponent(token)}`, { headers: authHeaders() })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(response.status === 404 ? 'El código QR no corresponde a un equipo registrado.' : (data.mensaje || 'QR no reconocido'))
      }

      navigate(`/equipos/ficha/${data.equipo.id_equipo}`)
      return true
    } catch (error) {
      setQrError(error.message)
      return false
    }
  }, [navigate])

  const handlePhotoPicker = () => {
    if (isQrScanLoading) {
      return
    }

    try {
      if (!photoInputRef.current) {
        throw new Error('Photo input unavailable')
      }

      setQrError('')
      photoInputRef.current.click()
    } catch {
      setQrError('No fue posible procesar la imagen seleccionada.')
    }
  }

  const handlePhotoScan = async (event) => {
    const imageFile = event.target.files?.[0]

    if (!imageFile) {
      return
    }

    if (photoScanInProgressRef.current) {
      event.target.value = ''
      return
    }

    photoScanInProgressRef.current = true
    setQrError('')
    setIsQrScanLoading(true)

    try {
      if (!isValidImageFile(imageFile)) {
        setQrError('No fue posible procesar la imagen seleccionada.')
        return
      }

      const formData = new FormData()
      formData.append('image', imageFile)
      const response = await fetch(`${apiUrl}/equipos/qr/decode-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('scaet-token')}` },
        body: formData,
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setQrError(data.message || data.mensaje || 'No fue posible procesar la imagen seleccionada.')
        return
      }

      if (typeof data.decodedText !== 'string' || !data.decodedText.trim()) {
        setQrError('No fue posible procesar la imagen seleccionada.')
        return
      }

      await navigateFromQrValue(data.decodedText)
    } catch {
      setQrError('No fue posible procesar la imagen seleccionada.')
    } finally {
      event.target.value = ''
      photoScanInProgressRef.current = false
      setIsQrScanLoading(false)
    }
  }

  const visibleEquipments = equipments
  const typeFilterOptions = useMemo(() => buildEquipmentTypeOptions(allLoadedEquipments).filter((type) => type !== customTypeOption), [allLoadedEquipments])

  const brandOptions = useMemo(() => {
    const brandsByName = new Map()

    visibleEquipments.forEach((equipment) => {
      const brand = equipment.brand?.trim()

      if (brand) {
        brandsByName.set(brand.toLocaleLowerCase('es'), brand)
      }
    })

    return [...brandsByName.values()].sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }))
  }, [visibleEquipments])

  const handleToggleHidden = async (equipmentId, shouldHide) => {
    try {
      const response = await fetch(`${apiUrl}/equipos/${equipmentId}/estado`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ activo: shouldHide ? 0 : 1 }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.mensaje)
      await loadEquipmentList()
    } catch (error) { setQrError(error.message) }
  }

  const filteredEquipments = useMemo(() => {
    const term = normalizeText(search)

    return visibleEquipments.filter((equipment) => {
      const matchesType = typeFilter === 'all' || normalizeText(equipment.type) === normalizeText(typeFilter)
      const matchesBrand = brandFilter === 'all' || equipment.brand === brandFilter
      const matchesStatus = statusFilter === 'all' || equipment.status === statusFilter

      if (!matchesType || !matchesBrand || !matchesStatus) {
        return false
      }

      if (!term) {
        return true
      }

      return [
        equipment.publicId,
        equipment.title,
        equipment.type,
        equipment.brand,
        equipment.model,
        equipment.serialNumber,
        equipment.company,
        equipment.area,
      ].some((value) => normalizeText(value).includes(term))
    })
  }, [brandFilter, search, statusFilter, typeFilter, visibleEquipments])

  return (
    <EquipmentShell>
      <div className="min-w-0 space-y-6 px-0 py-2 sm:px-1 sm:py-4 lg:px-2">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="mt-3 text-2xl font-extrabold text-[#201d31] sm:text-3xl">Selecciona un equipo</h1>
            <p className="mt-2 text-sm font-bold text-[#8d88a2]">
              Haz clic en Ver ficha para acceder al detalle completo
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto xl:justify-end">
            <button
              type="button"
              onClick={() => setShowHidden((currentValue) => !currentValue)}
              className="inline-flex h-11 min-w-16 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#f2ece0] px-3 text-xs font-extrabold text-[#5d5870] shadow-sm transition hover:bg-[#e9dfd0]"
              aria-label={showHidden ? 'Ver equipos visibles' : 'Ver equipos ocultos'}
              title={showHidden ? 'Ver equipos visibles' : 'Ver equipos ocultos'}
            >
              <AppIcon name={showHidden ? 'eye' : 'eyeOff'} />
              <span>({hiddenEquipmentsCount})</span>
            </button>
            <button
              type="button"
              onClick={handlePhotoPicker}
              disabled={isQrScanLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f2ece0] px-5 text-sm font-extrabold text-[#5d5870] shadow-sm transition hover:bg-[#e9dfd0]"
            >
              <AppIcon name="scan" />
              Escanear QR
            </button>
            {canCreate && <Link
              to="/equipos/alta"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3A9AF2] px-5 text-sm font-extrabold text-[#FFFFFF] shadow-sm transition hover:bg-[#238BEA]"
            >
              <AppIcon name="plus" />
              Dar de alta
            </Link>}
          </div>
        </section>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoScan}
          disabled={isQrScanLoading}
          className="sr-only"
          tabIndex={-1}
        />
        {isQrScanLoading && (
          <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-600">
            Leyendo código QR…
          </p>
        )}
        {qrError && (
          <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-600">
            {qrError}
          </p>
        )}

        <section className="space-y-4">
          <div className="grid gap-3 2xl:grid-cols-[1fr_190px_190px_190px_auto]">
            <label className="relative block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9b95ac]">
                <AppIcon name="search" />
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, código, serie o marca..."
                className="h-12 w-full rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] pl-11 pr-4 text-sm font-bold text-[#2a263a] outline-none transition placeholder:text-[#9b95ac] focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-12 rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] px-4 text-sm font-extrabold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Todos los tipos</option>
              {typeFilterOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
              className="h-12 rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] px-4 text-sm font-extrabold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Todas las marcas</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] px-4 text-sm font-extrabold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Todos los estados</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <div className="grid h-12 grid-cols-2 rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] p-1">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`rounded-xl px-4 text-xs font-extrabold transition ${viewMode === 'cards' ? 'bg-[#3A9AF2] text-[#FFFFFF]' : 'text-[#6f6a85]'}`}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-xl px-4 text-xs font-extrabold transition ${viewMode === 'table' ? 'bg-[#3A9AF2] text-[#FFFFFF]' : 'text-[#6f6a85]'}`}
              >
                Tabla
              </button>
            </div>
          </div>

          <p className="text-[11px] font-bold text-blue-300">
            {filteredEquipments.length} equipos {showHidden ? 'ocultos' : 'visibles'}
          </p>

          {filteredEquipments.length > 0 ? (
            viewMode === 'cards' ? (
              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredEquipments.map((equipment) => (
                  <EquipmentCard
                    key={equipment.id}
                    equipment={equipment}
                    showHidden={showHidden}
                    onToggleHidden={handleToggleHidden}
                    canChangeState={canChangeState}
                  />
                ))}
              </div>
            ) : (
              <div className="hidden lg:block">
                <EquipmentTable
                  equipments={filteredEquipments}
                  showHidden={showHidden}
                  onToggleHidden={handleToggleHidden}
                  canChangeState={canChangeState}
                />
              </div>
            )
          ) : (
            <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-white px-5 py-10 text-center shadow-sm">
              <p className="max-w-md text-sm font-bold text-[#8d88a2]">
                {visibleEquipments.length > 0
                  ? 'No se encontraron equipos con esos filtros.'
                  : showHidden
                    ? 'No hay equipos ocultos por ahora.'
                    : 'Aun no hay equipos registrados. Presiona Dar de alta para agregar el primero.'}
              </p>
            </div>
          )}

          {viewMode === 'table' && filteredEquipments.length > 0 && (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm lg:hidden">
              <p className="text-sm font-bold text-[#8d88a2]">La vista tabla esta disponible en pantallas grandes.</p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-bold text-blue-300">
              Mostrando {filteredEquipments.length} de {visibleEquipments.length}
            </p>
          </div>
        </section>
      </div>

    </EquipmentShell>
  )
}

export default ListadoEquipos
