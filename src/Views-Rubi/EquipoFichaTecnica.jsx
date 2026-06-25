import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  EquipmentPhoto,
  EquipmentShell,
  QrCode,
  StatusBadge,
  WarrantyBadge,
} from './equiposShared'
import { formatDate, getEquipmentById, warrantyLabel } from './equiposData'

const downloadedQrCanvasSize = 320
const downloadedQrSize = 200

function createCenteredQrSvg(qrSvg) {
  const viewBox = qrSvg.getAttribute('viewBox') || '0 0 256 256'
  const qrOffset = (downloadedQrCanvasSize - downloadedQrSize) / 2

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${downloadedQrCanvasSize}" height="${downloadedQrCanvasSize}" viewBox="0 0 ${downloadedQrCanvasSize} ${downloadedQrCanvasSize}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <svg x="${qrOffset}" y="${qrOffset}" width="${downloadedQrSize}" height="${downloadedQrSize}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">
    ${qrSvg.innerHTML}
  </svg>
</svg>`
}

function InfoRow({ label, value, children }) {
  return (
    <div className="grid min-h-12 gap-1 border-b border-[#f1edf5] px-4 py-3 last:border-b-0 sm:grid-cols-[160px_1fr] sm:items-center">
      <p className="text-xs font-extrabold text-violet-300">{label}</p>
      <div className="break-words text-sm font-extrabold text-[#201d31] sm:text-right">
        {children ?? value}
      </div>
    </div>
  )
}

function EquipoFichaTecnica() {
  const { equipmentId } = useParams()
  const equipment = getEquipmentById(equipmentId)
  const qrRef = useRef(null)

  const handleDownloadQr = () => {
    if (!equipment) {
      return
    }

    const qrSvg = qrRef.current?.querySelector('svg')

    if (!qrSvg) {
      return
    }

    const serializedQr = createCenteredQrSvg(qrSvg)
    const blob = new Blob([serializedQr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${equipment.publicId.replace('#', '')}-qr.svg`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  if (!equipment) {
    return (
      <EquipmentShell>
        <div className="px-4 py-7 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-extrabold text-[#201d31]">Equipo no encontrado</h1>
            <p className="mt-2 text-sm font-bold text-[#8d88a2]">Ese equipo no existe en los registros.</p>
            <Link
              to="/equipos"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-violet-500 px-6 text-sm font-extrabold text-white"
            >
              Volver al listado
            </Link>
          </div>
        </div>
      </EquipmentShell>
    )
  }

  return (
    <EquipmentShell>
      <div className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-violet-300">
              Equipos - Seleccionar equipo - {equipment.title}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#201d31] sm:text-3xl">{equipment.title}</h1>
              <StatusBadge status={equipment.status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/equipos/alta/${equipment.id}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f2ece0] px-6 text-sm font-extrabold text-[#5d5870] transition hover:bg-[#e9dfd0]"
            >
              Editar
            </Link>
            <button
              type="button"
              onClick={handleDownloadQr}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f2ece0] px-6 text-sm font-extrabold text-[#5d5870] transition hover:bg-[#e9dfd0]"
            >
              Descargar código QR
            </button>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[190px_1fr]">
          <div className="space-y-4">
            <EquipmentPhoto equipment={equipment} size="lg" />
            <div ref={qrRef} className="flex justify-center rounded-2xl bg-[#f2ece0] p-5">
              <QrCode equipment={equipment} size="lg" />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <InfoRow label="Tipo" value={equipment.type} />
            <InfoRow label="Marca" value={equipment.brand} />
            <InfoRow label="Modelo" value={equipment.model} />
            <InfoRow label="Num. serie" value={equipment.serialNumber} />
            <InfoRow label="Proveedor" value={equipment.provider} />
            <InfoRow label="Fecha compra" value={formatDate(equipment.purchaseDate)} />
            <InfoRow label="Garantia">
              <span className="inline-flex items-center gap-3">
                <span>{warrantyLabel(equipment.warrantyMonths)}</span>
                <WarrantyBadge warrantyEnd={equipment.warrantyEnd} />
              </span>
            </InfoRow>
            <InfoRow label="Especificaciones" value={equipment.specs} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-extrabold text-[#201d31]">Asignación actual</h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <InfoRow label="Asignado a" value={equipment.assignmentName} />
            <InfoRow label="Tipo">
              <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-extrabold text-violet-500">
                {equipment.assignmentType}
              </span>
            </InfoRow>
            <InfoRow label="Fecha asignacion" value={formatDate(equipment.assignmentDate)} />
            <InfoRow label="Resguardo">
              <button type="button" className="text-sm font-extrabold text-violet-500">
                Ver PDF &gt;
              </button>
            </InfoRow>
          </div>
        </section>
      </div>
    </EquipmentShell>
  )
}

export default EquipoFichaTecnica
