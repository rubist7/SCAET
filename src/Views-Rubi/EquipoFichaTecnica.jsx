import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import ResguardoFirma from '../Views-Nat/ResguardoFirma'
import { EquipmentPhoto, EquipmentShell, QrCode, StatusBadge, WarrantyBadge } from './equiposShared'
import { formatDate, warrantyLabel } from './equiposData'

const apiUrl = '/api'
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('scaet-token')}` })
const dateValue = (value) => value ? String(value).slice(0, 10) : ''

function InfoRow({ label, value, children }) {
  return <div className="grid min-h-12 gap-1 border-b border-[#f1edf5] px-4 py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:items-center"><p className="text-xs font-extrabold text-blue-300">{label}</p><div className="whitespace-pre-line break-words text-sm font-extrabold text-[#201d31] sm:text-right">{children ?? value ?? '-'}</div></div>
}

function EquipoFichaTecnica() {
  const { equipmentId, qrToken } = useParams()
  const [equipment, setEquipment] = useState(null)
  const [error, setError] = useState('')
  const [qrStorageError, setQrStorageError] = useState('')
  const [viewingResguardoId, setViewingResguardoId] = useState(null)
  const qrRef = useRef(null)
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('scaet-user') || '{}') } catch { return {} } }, [])
  const canEdit = ['admin', 'capturista'].includes(user.rol)

  useEffect(() => {
    fetch(qrToken ? `${apiUrl}/equipos/qr/${encodeURIComponent(qrToken)}` : `${apiUrl}/equipos/${equipmentId}`, { headers: headers() }).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.mensaje)
      const e = data.equipo
      const assignment = data.asignacion_actual
      const collaboratorLabel = assignment
        ? `${assignment.nombre_completo}${assignment.num_colaborador ? ` (#${assignment.num_colaborador})` : ''}`
        : '-'
      setEquipment({ id: String(e.id_equipo), publicId: e.codigo_equipo, title: e.nombre_equipo, type: e.tipo_equipo, brand: e.marca, model: e.modelo, serialNumber: e.numero_serie, provider: e.nombre_proveedor || '-', company: e.empresa || '-', sellerName: e.nombre_vendedor || '-', purchaseDate: dateValue(e.fecha_compra), warrantyMonths: e.garantia_meses, warrantyEnd: dateValue(e.vence_garantia), status: assignment ? 'Asignado' : (e.estado ? e.estado[0].toUpperCase() + e.estado.slice(1) : 'Disponible'), specs: e.especificaciones_tecnicas || '-', photoUrl: e.foto_url || '', qrValue: e.qr_url || `/equipos/qr/${e.qr_token}`, assignmentName: collaboratorLabel, assignmentType: assignment?.tipo_asignacion || '-', assignmentDate: dateValue(assignment?.fecha_asignacion) || '-', resguardoId: assignment?.id_resguardo || null })
    }).catch((reason) => setError(reason.message || 'Equipo no encontrado'))
  }, [equipmentId, qrToken])

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg'); if (!svg || !equipment) return
    setQrStorageError('')
    const canvas = document.createElement('canvas'); canvas.width = 520; canvas.height = 650
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#201d31'; context.textAlign = 'center'
    context.font = 'bold 25px sans-serif'; context.fillText(equipment.publicId, 260, 60)
    context.font = 'bold 19px sans-serif'; context.fillText(equipment.title, 260, 100); context.font = '17px sans-serif'; context.fillText(`${equipment.brand} / ${equipment.model}`, 260, 135)
    const image = new Image(); const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob)
    image.onload = () => {
      context.drawImage(image, 60, 165, 400, 400); context.font = '16px sans-serif'; context.fillText(equipment.serialNumber, 260, 610); URL.revokeObjectURL(url)
      canvas.toBlob(async (qrBlob) => {
        if (!qrBlob) {
          setQrStorageError('No se pudo preparar el codigo QR para descargarlo.')
          return
        }

        const downloadUrl = URL.createObjectURL(qrBlob)
        const link = document.createElement('a'); link.download = `QR-${equipment.publicId}.png`; link.href = downloadUrl; link.click()
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)

        try {
          const formData = new FormData()
          formData.append('qr', qrBlob, 'qr.png')
          const response = await fetch(`${apiUrl}/equipos-imagenes/${encodeURIComponent(equipment.id)}/qr`, {
            method: 'POST', headers: headers(), body: formData,
          })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(payload.mensaje || 'No se pudo guardar el codigo QR en el servidor')
        } catch (reason) {
          setQrStorageError(`El codigo QR se descargo, pero no pudo guardarse en el servidor: ${reason.message || 'intenta nuevamente.'}`)
        }
      }, 'image/png')
    }
    image.src = url
  }

  if (!equipment) return <EquipmentShell><div className="space-y-5 rounded-2xl bg-white p-8 shadow-sm"><BackButton fallback="/equipos" label="Volver a equipos" /><h1 className="text-center text-xl font-extrabold">{error || 'Cargando equipo...'}</h1></div></EquipmentShell>
  if (viewingResguardoId) return <ResguardoFirma resguardo={{ idResguardo: viewingResguardoId, persisted: true }} onBack={() => setViewingResguardoId(null)} backLabel="Volver a ficha técnica" />
  return <EquipmentShell><div className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <BackButton fallback="/equipos" label="Volver a equipos" />
    <section className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><p className="break-words text-xs font-extrabold uppercase tracking-widest text-blue-300">Ficha técnica · {equipment.publicId}</p><div className="mt-3 flex min-w-0 flex-wrap items-center gap-3"><h1 className="min-w-0 break-words text-2xl font-extrabold text-[#201d31]">{equipment.title}</h1><StatusBadge status={equipment.status} /></div></div><div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">{canEdit && <Link to={`/equipos/editar/${equipment.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f2ece0] px-6 py-3 text-center font-extrabold">Editar</Link>}<button onClick={downloadQr} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3A9AF2] px-6 py-3 text-center font-extrabold text-white">Descargar código QR</button></div></section>
    {qrStorageError && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700" role="alert">{qrStorageError}</p>}
    <section className="grid gap-5 xl:grid-cols-[210px_1fr]"><div className="space-y-4"><EquipmentPhoto equipment={equipment} size="lg" /><div ref={qrRef} className="flex justify-center rounded-2xl bg-[#f2ece0] p-5"><QrCode equipment={equipment} size="lg" /></div></div><div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <InfoRow label="Código" value={equipment.publicId} /><InfoRow label="Nombre" value={equipment.title} /><InfoRow label="Tipo" value={equipment.type} /><InfoRow label="Marca" value={equipment.brand} /><InfoRow label="Modelo" value={equipment.model} /><InfoRow label="Número de serie" value={equipment.serialNumber} /><InfoRow label="Proveedor" value={equipment.provider} /><InfoRow label="Empresa" value={equipment.company} /><InfoRow label="Vendedor" value={equipment.sellerName} /><InfoRow label="Fecha de compra" value={formatDate(equipment.purchaseDate)} /><InfoRow label="Garantía"><span className="inline-flex items-center gap-3">{warrantyLabel(equipment.warrantyMonths)} <WarrantyBadge warrantyEnd={equipment.warrantyEnd} /></span></InfoRow><InfoRow label="Estado" value={equipment.status} /><InfoRow label="Especificaciones" value={equipment.specs} />
    </div></section>
    <section className="space-y-3">
      <h2 className="text-base font-extrabold text-[#201d31]">Asignación actual</h2>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <InfoRow label="Asignado a" value={equipment.assignmentName} />
        <InfoRow label="Tipo"><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-500">{equipment.assignmentType}</span></InfoRow>
        <InfoRow label="Fecha asignación" value={equipment.assignmentDate === '-' ? '-' : formatDate(equipment.assignmentDate)} />
        <InfoRow label="Resguardo">{equipment.resguardoId ? <button type="button" onClick={() => setViewingResguardoId(equipment.resguardoId)} className="text-sm font-extrabold text-blue-500">Ver resguardo &gt;</button> : '-'}</InfoRow>
      </div>
    </section>
  </div></EquipmentShell>
}
export default EquipoFichaTecnica
