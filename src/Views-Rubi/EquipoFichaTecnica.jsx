import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EquipmentPhoto, EquipmentShell, QrCode, StatusBadge, WarrantyBadge } from './equiposShared'
import { formatDate, warrantyLabel } from './equiposData'

const apiUrl = '/api'
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('scaet-token')}` })
const dateValue = (value) => value ? String(value).slice(0, 10) : ''

function InfoRow({ label, value, children }) {
  return <div className="grid min-h-12 gap-1 border-b border-[#f1edf5] px-4 py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:items-center"><p className="text-xs font-extrabold text-blue-300">{label}</p><div className="break-words text-sm font-extrabold text-[#201d31] sm:text-right">{children ?? value ?? '-'}</div></div>
}

function EquipoFichaTecnica() {
  const { equipmentId, qrToken } = useParams()
  const [equipment, setEquipment] = useState(null)
  const [error, setError] = useState('')
  const qrRef = useRef(null)
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('scaet-user') || '{}') } catch { return {} } }, [])
  const canEdit = ['admin', 'capturista'].includes(user.rol)

  useEffect(() => {
    fetch(qrToken ? `${apiUrl}/equipos/qr/${encodeURIComponent(qrToken)}` : `${apiUrl}/equipos/${equipmentId}`, { headers: headers() }).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.mensaje)
      const e = data.equipo
      setEquipment({ id: String(e.id_equipo), publicId: e.codigo_equipo, title: e.nombre_equipo, type: e.tipo_equipo, brand: e.marca, model: e.modelo, serialNumber: e.numero_serie, provider: e.nombre_proveedor || '-', company: e.empresa || '-', sellerName: e.nombre_vendedor || '-', purchaseDate: dateValue(e.fecha_compra), warrantyMonths: e.garantia_meses, warrantyEnd: dateValue(e.vence_garantia), status: e.estado ? e.estado[0].toUpperCase() + e.estado.slice(1) : 'Disponible', specs: e.especificaciones_tecnicas || '-', photoUrl: e.foto_url || '', qrValue: e.qr_url || `/equipos/qr/${e.qr_token}`, assignmentName: e.nombre_colaborador || e.asignado_a || '-', assignmentType: e.tipo_asignacion || '-', assignmentDate: dateValue(e.fecha_asignacion) || '-' })
    }).catch((reason) => setError(reason.message || 'Equipo no encontrado'))
  }, [equipmentId, qrToken])

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg'); if (!svg || !equipment) return
    const canvas = document.createElement('canvas'); canvas.width = 520; canvas.height = 650
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#201d31'; context.textAlign = 'center'
    context.font = 'bold 25px sans-serif'; context.fillText(equipment.publicId, 260, 60)
    context.font = 'bold 19px sans-serif'; context.fillText(equipment.title, 260, 100); context.font = '17px sans-serif'; context.fillText(`${equipment.brand} / ${equipment.model}`, 260, 135)
    const image = new Image(); const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob)
    image.onload = () => { context.drawImage(image, 60, 165, 400, 400); context.font = '16px sans-serif'; context.fillText(equipment.serialNumber, 260, 610); URL.revokeObjectURL(url); const link = document.createElement('a'); link.download = `QR-${equipment.publicId}.png`; link.href = canvas.toDataURL('image/png'); link.click() }; image.src = url
  }

  if (!equipment) return <EquipmentShell><div className="rounded-2xl bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-extrabold">{error || 'Cargando equipo...'}</h1><Link to="/equipos" className="mt-5 inline-flex rounded-xl bg-[#3A9AF2] px-6 py-3 font-bold text-white">Volver al listado</Link></div></EquipmentShell>
  return <EquipmentShell><div className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-widest text-blue-300">Ficha técnica · {equipment.publicId}</p><div className="mt-3 flex items-center gap-3"><h1 className="text-2xl font-extrabold text-[#201d31]">{equipment.title}</h1><StatusBadge status={equipment.status} /></div></div><div className="flex gap-3">{canEdit && <Link to={`/equipos/editar/${equipment.id}`} className="rounded-xl bg-[#f2ece0] px-6 py-3 font-extrabold">Editar</Link>}<button onClick={downloadQr} className="rounded-xl bg-[#3A9AF2] px-6 py-3 font-extrabold text-white">Descargar código QR</button></div></section>
    <section className="grid gap-5 xl:grid-cols-[210px_1fr]"><div className="space-y-4"><EquipmentPhoto equipment={equipment} size="lg" /><div ref={qrRef} className="flex justify-center rounded-2xl bg-[#f2ece0] p-5"><QrCode equipment={equipment} size="lg" /></div></div><div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <InfoRow label="Código" value={equipment.publicId} /><InfoRow label="Nombre" value={equipment.title} /><InfoRow label="Tipo" value={equipment.type} /><InfoRow label="Marca" value={equipment.brand} /><InfoRow label="Modelo" value={equipment.model} /><InfoRow label="Número de serie" value={equipment.serialNumber} /><InfoRow label="Proveedor" value={equipment.provider} /><InfoRow label="Empresa" value={equipment.company} /><InfoRow label="Vendedor" value={equipment.sellerName} /><InfoRow label="Fecha de compra" value={formatDate(equipment.purchaseDate)} /><InfoRow label="Garantía"><span className="inline-flex items-center gap-3">{warrantyLabel(equipment.warrantyMonths)} <WarrantyBadge warrantyEnd={equipment.warrantyEnd} /></span></InfoRow><InfoRow label="Estado" value={equipment.status} /><InfoRow label="Especificaciones" value={equipment.specs} />
    </div></section>
    <section className="space-y-3">
      <h2 className="text-base font-extrabold text-[#201d31]">Asignación actual</h2>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <InfoRow label="Asignado a" value={equipment.assignmentName} />
        <InfoRow label="Tipo"><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-500">{equipment.assignmentType}</span></InfoRow>
        <InfoRow label="Fecha asignación" value={equipment.assignmentDate === '-' ? '-' : formatDate(equipment.assignmentDate)} />
        <InfoRow label="Resguardo"><button type="button" className="text-sm font-extrabold text-blue-500">Ver PDF &gt;</button></InfoRow>
      </div>
    </section>
  </div></EquipmentShell>
}
export default EquipoFichaTecnica
