import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { AppIcon } from '../components/Sidebar'
import {
  EquipmentPhoto,
  EquipmentShell,
  QrCode,
  StatusBadge,
  WarrantyBadge,
} from './equiposShared'
import {
  brandOptions,
  formatDate,
  getEquipmentByQrValue,
  loadEquipments,
  normalizeText,
  saveEquipments,
  statusOptions,
  typeOptions,
} from './equiposData'

const qrReaderId = 'equipment-qr-reader'
const qrScannerConfig = {
  fps: 10,
  qrbox: { width: 220, height: 220 },
  experimentalFeatures: {
    useBarCodeDetectorIfSupported: false,
  },
}

const ultraWideCameraPattern = /ultra[\s-]?wide|0[.,]5x?|gran angular|super wide/i
const backCameraPattern = /back|rear|environment|trasera|posterior|facing back/i
const frontCameraPattern = /front|user|frontal|delantera|selfie|facing front/i

function getFacingMode(cameraMode) {
  return cameraMode === 'front' ? 'user' : 'environment'
}

function getCameraForMode(cameras, cameraMode) {
  if (!cameras.length) {
    return null
  }

  const modePattern = cameraMode === 'front' ? frontCameraPattern : backCameraPattern
  const modeCameras = cameras.filter((camera) => modePattern.test(camera.label || ''))
  const normalModeCameras = modeCameras.filter((camera) => !ultraWideCameraPattern.test(camera.label || ''))

  if (normalModeCameras.length) {
    return normalModeCameras[0]
  }

  if (modeCameras.length) {
    return modeCameras[0]
  }

  if (cameraMode === 'back') {
    return cameras.find((camera) => (
      !frontCameraPattern.test(camera.label || '')
      && !ultraWideCameraPattern.test(camera.label || '')
    )) ?? cameras[0]
  }

  return null
}

async function startScanner(scanner, onSuccess, cameraMode) {
  const cameras = await Html5Qrcode.getCameras().catch(() => [])
  const preferredCamera = getCameraForMode(cameras, cameraMode)

  if (preferredCamera?.id) {
    try {
      await scanner.start(preferredCamera.id, qrScannerConfig, onSuccess)
      return
    } catch {
      // Some browsers expose camera ids that later fail; fall back to facingMode.
    }
  }

  await scanner.start(
    { facingMode: getFacingMode(cameraMode) },
    qrScannerConfig,
    onSuccess,
  )
}

function getScannerErrorMessage() {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)

  if (!window.isSecureContext && !isLocalhost) {
    return 'La camara del navegador requiere HTTPS o localhost. Abre el sistema en una URL segura o prueba desde localhost.'
  }

  return 'No pude abrir la camara. Puedes pegar el codigo o URL del QR abajo.'
}

function getNormalizedZoomValue(value, min, max, step) {
  const safeStep = step > 0 ? step : 0.1
  const clampedValue = Math.min(Math.max(value, min), max)
  const steppedValue = min + Math.round((clampedValue - min) / safeStep) * safeStep

  return Number(Math.min(Math.max(steppedValue, min), max).toFixed(2))
}

async function applyScannerZoom(scanner, preferredZoom = 1.6) {
  try {
    const capabilities = scanner.getRunningTrackCapabilities()
    const settings = scanner.getRunningTrackSettings()
    const zoomCapability = capabilities.zoom

    if (!zoomCapability || typeof zoomCapability !== 'object') {
      return null
    }

    const min = Number(zoomCapability.min ?? 1)
    const max = Number(zoomCapability.max ?? min)
    const step = Number(zoomCapability.step ?? 0.1)

    if (max <= min) {
      return null
    }

    const currentZoom = Number(settings.zoom ?? min)
    const nextZoom = getNormalizedZoomValue(Math.max(currentZoom, preferredZoom), min, max, step)

    await scanner.applyVideoConstraints({ advanced: [{ zoom: nextZoom }] })

    return { min, max, step: step > 0 ? step : 0.1, value: nextZoom }
  } catch {
    return null
  }
}

function stopScanner(scanner, shouldClear = true) {
  scanner
    .stop()
    .catch(() => undefined)
    .then(() => {
      if (!shouldClear) {
        return
      }

      try {
        scanner.clear()
      } catch {
        // html5-qrcode can already be clear during StrictMode cleanup.
      }
    })
}

function EquipmentCard({ equipment, showHidden, onToggleHidden }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <EquipmentPhoto equipment={equipment} size="sm" />
        <StatusBadge status={equipment.status} />
      </div>

      <div className="mt-4">
        <h2 className="truncate text-lg font-extrabold text-[#201d31]">{equipment.title}</h2>
        <div className="mt-3 space-y-1 text-xs font-bold text-[#8d88a2]">
          <p>{equipment.type} - {equipment.serialNumber}</p>
          <p>Area: {equipment.area}</p>
          <p>Empresa: {equipment.company}</p>
          <p>F. compra: {formatDate(equipment.purchaseDate)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#f1edf5] pt-3">
        <div className="rounded-xl bg-[#f2ece0] p-2">
          <QrCode equipment={equipment} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleHidden(equipment.id, !showHidden)}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#f2ece0] px-3 text-[#5d5870] transition hover:bg-[#e9dfd0]"
            aria-label={`${showHidden ? 'Restaurar' : 'Ocultar'} ${equipment.title}`}
            title={showHidden ? 'Restaurar' : 'Ocultar'}
          >
            <AppIcon name={showHidden ? 'eye' : 'eyeOff'} />
          </button>
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

function EquipmentTable({ equipments, showHidden, onToggleHidden }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <table className="w-full table-fixed text-left">
        <thead className="bg-[#eee7d9] text-[10px] font-extrabold uppercase tracking-[0.28em] text-violet-300">
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
            <tr key={equipment.id} className="transition hover:bg-violet-50/40">
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
                  <button
                    type="button"
                    onClick={() => onToggleHidden(equipment.id, !showHidden)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2ece0] text-[#5d5870] transition hover:bg-[#e9dfd0]"
                    aria-label={`${showHidden ? 'Restaurar' : 'Ocultar'} ${equipment.title}`}
                    title={showHidden ? 'Restaurar' : 'Ocultar'}
                  >
                    <AppIcon name={showHidden ? 'eye' : 'eyeOff'} />
                  </button>
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
  const [equipments, setEquipments] = useState(() => loadEquipments())
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('cards')
  const [showHidden, setShowHidden] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [cameraMode, setCameraMode] = useState('back')
  const [zoomControl, setZoomControl] = useState(null)
  const [manualQrValue, setManualQrValue] = useState('')
  const scannerRef = useRef(null)

  const navigateFromQrValue = useCallback((qrValue) => {
    const equipment = getEquipmentByQrValue(qrValue)

    if (!equipment) {
      setScannerError('No encontre un equipo local para ese QR.')
      return
    }

    setScannerOpen(false)
    navigate(`/equipos/ficha/${equipment.id}`)
  }, [navigate])

  useEffect(() => {
    if (!scannerOpen) {
      return undefined
    }

    let cancelled = false
    let started = false
    let scanner = null
    const startTimer = window.setTimeout(() => {
      if (cancelled) {
        return
      }

      scanner = new Html5Qrcode(qrReaderId)
      scannerRef.current = scanner

      startScanner(scanner, (decodedText) => {
        if (!cancelled) {
          navigateFromQrValue(decodedText)
        }
      }, cameraMode)
      .then(async () => {
        started = true

        if (cancelled) {
          stopScanner(scanner, scannerRef.current === scanner)
          return
        }

        const nextZoomControl = await applyScannerZoom(scanner)

        if (!cancelled) {
          setZoomControl(nextZoomControl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (scannerRef.current === scanner) {
            scannerRef.current = null
          }

          try {
            scanner.clear()
          } catch {
            // The reader may already be empty after a failed camera start.
          }

          setScannerError(getScannerErrorMessage())
        }
      })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(startTimer)

      if (!scanner) {
        return
      }

      const shouldClear = scannerRef.current === scanner

      if (shouldClear) {
        scannerRef.current = null
      }

      if (started) {
        stopScanner(scanner, shouldClear)
      }
    }
  }, [cameraMode, navigateFromQrValue, scannerOpen])

  const handleCameraModeChange = (nextCameraMode) => {
    if (nextCameraMode === cameraMode) {
      return
    }

    setScannerError('')
    setZoomControl(null)
    setCameraMode(nextCameraMode)
  }

  const handleZoomChange = (event) => {
    const nextZoom = Number(event.target.value)

    setZoomControl((currentControl) => (
      currentControl ? { ...currentControl, value: nextZoom } : currentControl
    ))

    scannerRef.current
      ?.applyVideoConstraints({ advanced: [{ zoom: nextZoom }] })
      .catch(() => setScannerError('No pude ajustar el zoom de esta camara.'))
  }

  const handleManualScan = (event) => {
    event.preventDefault()
    navigateFromQrValue(manualQrValue.trim())
  }

  const visibleEquipments = useMemo(() => (
    equipments.filter((equipment) => Boolean(equipment.hidden) === showHidden)
  ), [equipments, showHidden])

  const hiddenEquipmentsCount = equipments.filter((equipment) => equipment.hidden).length

  const handleToggleHidden = (equipmentId, shouldHide) => {
    setEquipments((currentEquipments) => {
      const nextEquipments = currentEquipments.map((equipment) => (
        equipment.id === equipmentId
          ? { ...equipment, hidden: shouldHide, hiddenAt: shouldHide ? new Date().toISOString() : '' }
          : equipment
      ))

      saveEquipments(nextEquipments)
      return nextEquipments
    })
  }

  const filteredEquipments = useMemo(() => {
    const term = normalizeText(search)

    return visibleEquipments.filter((equipment) => {
      const matchesType = typeFilter === 'all' || equipment.type === typeFilter
      const matchesBrand = brandFilter === 'all' || equipment.brand === brandFilter
      const matchesStatus = statusFilter === 'all' || equipment.status === statusFilter

      if (!matchesType || !matchesBrand || !matchesStatus) {
        return false
      }

      if (!term) {
        return true
      }

      return [
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
      <div className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-violet-300">Equipos - listado completo</p>
            <h1 className="mt-3 text-2xl font-extrabold text-[#201d31] sm:text-3xl">Selecciona un equipo</h1>
            <p className="mt-2 text-sm font-bold text-[#8d88a2]">
              Haz clic en <span className="text-violet-500">Ver ficha</span> para acceder al detalle completo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHidden((currentValue) => !currentValue)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f2ece0] px-5 text-sm font-extrabold text-[#5d5870] shadow-sm transition hover:bg-[#e9dfd0]"
            >
              <AppIcon name={showHidden ? 'eye' : 'eyeOff'} />
              {showHidden ? 'Ver visibles' : `Ocultos (${hiddenEquipmentsCount})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setScannerError('')
                setCameraMode('back')
                setZoomControl(null)
                setManualQrValue('')
                setScannerOpen(true)
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f2ece0] px-5 text-sm font-extrabold text-[#5d5870] shadow-sm transition hover:bg-[#e9dfd0]"
            >
              <AppIcon name="scan" />
              Escanear QR
            </button>
            <Link
              to="/equipos/alta"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-violet-600"
            >
              <AppIcon name="plus" />
              Dar de alta
            </Link>
          </div>
        </section>

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
                placeholder="Buscar por nombre, serie, marca..."
                className="h-12 w-full rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] pl-11 pr-4 text-sm font-bold text-[#2a263a] outline-none transition placeholder:text-[#9b95ac] focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </label>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-12 rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] px-4 text-sm font-extrabold text-[#2a263a] outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
            >
              <option value="all">Todos los tipos</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
              className="h-12 rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] px-4 text-sm font-extrabold text-[#2a263a] outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
            >
              <option value="all">Todas las marcas</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] px-4 text-sm font-extrabold text-[#2a263a] outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
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
                className={`rounded-xl px-4 text-xs font-extrabold transition ${viewMode === 'cards' ? 'bg-violet-500 text-white' : 'text-[#6f6a85]'}`}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-xl px-4 text-xs font-extrabold transition ${viewMode === 'table' ? 'bg-violet-500 text-white' : 'text-[#6f6a85]'}`}
              >
                Tabla
              </button>
            </div>
          </div>

          <p className="text-[11px] font-bold text-violet-300">
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
                  />
                ))}
              </div>
            ) : (
              <div className="hidden lg:block">
                <EquipmentTable
                  equipments={filteredEquipments}
                  showHidden={showHidden}
                  onToggleHidden={handleToggleHidden}
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
            <p className="text-[11px] font-bold text-violet-300">
              Mostrando {filteredEquipments.length} de {visibleEquipments.length}
            </p>
          </div>
        </section>
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#201d31]/40 px-4 py-5">
          <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#201d31]">Escanear QR</h2>
                <p className="mt-1 text-sm font-bold text-[#8d88a2]">Apunta la camara al codigo del equipo.</p>
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2ece0] text-[#5d5870]"
                aria-label="Cerrar scanner"
              >
                <AppIcon name="x" />
              </button>
            </div>

            <style>{`
              #${qrReaderId} {
                border: 0 !important;
                min-height: 300px;
                width: 100% !important;
              }

              #${qrReaderId} > div,
              #${qrReaderId}__scan_region,
              #${qrReaderId}__dashboard {
                width: 100% !important;
              }

              #${qrReaderId}__scan_region {
                min-height: 300px;
              }

              #${qrReaderId} video {
                height: 100% !important;
                min-height: 300px;
                object-fit: cover;
                width: 100% !important;
              }
            `}</style>
            <div id={qrReaderId} className="mt-5 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#f2ece0] sm:min-h-[360px]" />

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="block">
                <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8d88a2]">Camara</span>
                <div className="grid h-10 grid-cols-2 rounded-xl border border-[#e2d9c9] bg-[#f2ece0] p-1">
                  <button
                    type="button"
                    onClick={() => handleCameraModeChange('back')}
                    className={`rounded-lg text-xs font-extrabold transition ${cameraMode === 'back' ? 'bg-violet-500 text-white shadow-sm' : 'text-[#6f6a85]'}`}
                  >
                    Trasera
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCameraModeChange('front')}
                    className={`rounded-lg text-xs font-extrabold transition ${cameraMode === 'front' ? 'bg-violet-500 text-white shadow-sm' : 'text-[#6f6a85]'}`}
                  >
                    Frontal
                  </button>
                </div>
              </div>

              {zoomControl && (
                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8d88a2]">
                    Zoom {zoomControl.value.toFixed(1)}x
                  </span>
                  <input
                    type="range"
                    min={zoomControl.min}
                    max={zoomControl.max}
                    step={zoomControl.step}
                    value={zoomControl.value}
                    onChange={handleZoomChange}
                    className="h-10 w-full accent-violet-500"
                  />
                </label>
              )}
              </div>

            {scannerError && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-600">
                {scannerError}
              </p>
            )}

            <form onSubmit={handleManualScan} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={manualQrValue}
                onChange={(event) => setManualQrValue(event.target.value)}
                placeholder="Pega aqui el codigo o URL del QR"
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none focus:border-violet-300 focus:bg-white"
              />
              <button
                type="submit"
                className="h-11 rounded-xl bg-violet-500 px-5 text-sm font-extrabold text-white"
              >
                Abrir ficha
              </button>
            </form>
          </section>
        </div>
      )}
    </EquipmentShell>
  )
}

export default ListadoEquipos
