import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppIcon } from '../components/Sidebar'
import { calculateWarrantyEnd, statusOptions, typeOptions } from './equiposData'
import { EquipmentShell, Field, QrCode } from './equiposShared'

const apiUrl = '/api'
const emptyForm = { id_proveedor: '', tipo_equipo: 'Laptop', marca: '', modelo: '', numero_serie: '', fecha_compra: '', garantia_meses: '', vence_garantia: '', especificaciones_tecnicas: '', estado: 'disponible' }
const emptyProvider = { nombre_proveedor: '', empresa: '', nombre_vendedor: '', rfc_empresa: '', telefono: '', correo: '', direccion: '', calificacion: 'bueno', observaciones: '' }
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('scaet-token')}`, 'Content-Type': 'application/json' })
const dateValue = (value) => value ? String(value).slice(0, 10) : ''
const ratingOptions = [
  { value: 'excelente', label: 'Excelente', stars: 5 },
  { value: 'bueno', label: 'Bueno', stars: 4 },
  { value: 'regular', label: 'Regular', stars: 3 },
  { value: 'malo', label: 'Malo', stars: 1 },
]

function EquipoAlta() {
  const navigate = useNavigate()
  const location = useLocation()
  const { equipmentId } = useParams()
  const [form, setForm] = useState(emptyForm)
  const [providers, setProviders] = useState([])
  const [providerForm, setProviderForm] = useState(emptyProvider)
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [loading, setLoading] = useState(Boolean(equipmentId))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [hasActiveAssignment, setHasActiveAssignment] = useState(false)
  const cameraInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const selectedProvider = useMemo(() => providers.find((item) => String(item.id_proveedor) === String(form.id_proveedor)), [form.id_proveedor, providers])
  const canTakePhoto = useMemo(() => {
    const navigatorInfo = globalThis.navigator
    const userAgent = navigatorInfo?.userAgent ?? ''
    const platform = navigatorInfo?.platform ?? ''
    const hasTouchScreen = (navigatorInfo?.maxTouchPoints ?? 0) > 1

    return Boolean(navigatorInfo?.userAgentData?.mobile)
      || /Android|iPhone|iPad|iPod/i.test(userAgent)
      || (platform === 'MacIntel' && hasTouchScreen)
  }, [])

  const loadProviders = async () => {
    const response = await fetch(`${apiUrl}/proveedores?estado=activos`, { headers: authHeaders() })
    const data = await response.json()
    if (!response.ok) throw new Error(data.mensaje || 'No se pudieron cargar los proveedores')
    setProviders(data.proveedores || [])
    return data.proveedores || []
  }

  useEffect(() => {
    loadProviders().catch((error) => setMessage(error.message))
    if (!equipmentId) return
    fetch(`${apiUrl}/equipos/${equipmentId}`, { headers: authHeaders() }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensaje)
      const e = data.equipo
      const assigned = Boolean(data.asignacion_actual)
      setHasActiveAssignment(assigned)
      setForm({ id_proveedor: e.id_proveedor ?? '', tipo_equipo: e.tipo_equipo, marca: e.marca, modelo: e.modelo, numero_serie: e.numero_serie, fecha_compra: dateValue(e.fecha_compra), garantia_meses: e.garantia_meses ?? '', vence_garantia: dateValue(e.vence_garantia), especificaciones_tecnicas: e.especificaciones_tecnicas ?? '', estado: assigned ? 'asignado' : e.estado })
    }).catch((error) => setMessage(error.message)).finally(() => setLoading(false))
  }, [equipmentId])

  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => { const next = { ...current, [name]: value }; if (name === 'fecha_compra' || name === 'garantia_meses') next.vence_garantia = calculateWarrantyEnd(next.fecha_compra, next.garantia_meses); return next })
  }

  const changePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoName(file.name)
    event.target.value = ''
  }

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const saveProvider = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('')
    try {
      const response = await fetch(`${apiUrl}/proveedores`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(providerForm) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensaje || 'No se pudo crear el proveedor')
      const refreshed = await loadProviders()
      const created = data.proveedor || refreshed.find((item) => item.nombre_proveedor === providerForm.nombre_proveedor && item.empresa === providerForm.empresa)
      setForm((current) => ({ ...current, id_proveedor: created?.id_proveedor ?? '' }))
      setShowProviderForm(false); setProviderForm(emptyProvider); setMessage('Proveedor creado y seleccionado.')
    } catch (error) { setMessage(error.message) } finally { setSaving(false) }
  }

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('')
    try {
      const response = await fetch(`${apiUrl}/equipos${equipmentId ? `/${equipmentId}` : ''}`, { method: equipmentId ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensaje || 'No se pudo guardar el equipo')
      navigate(location.state?.returnTo || '/equipos')
    } catch (error) { setMessage(error.message) } finally { setSaving(false) }
  }

  if (loading) return <EquipmentShell><p className="p-8 text-sm font-bold text-[#8d88a2]">Cargando equipo...</p></EquipmentShell>
  return <EquipmentShell><div className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <h1 className="text-2xl font-extrabold text-[#201d31] sm:text-3xl">{equipmentId ? 'Editar equipo' : 'Alta de equipo'}</h1>
    {message && <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-600">{message}</p>}
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block"><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Proveedor</span><div className="flex gap-2"><select name="id_proveedor" value={form.id_proveedor} onChange={change} required className="h-11 min-w-0 flex-1 rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold"><option value="">Selecciona un proveedor</option>{providers.map((p) => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_proveedor} - {p.empresa}</option>)}</select><button type="button" onClick={() => setShowProviderForm(true)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-500" title="Nuevo proveedor"><AppIcon name="plus" /></button></div></label>
        <label><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Tipo de equipo</span><select name="tipo_equipo" value={form.tipo_equipo} onChange={change} className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold">{typeOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        {selectedProvider && (selectedProvider.empresa || selectedProvider.nombre_vendedor) && <div className="flex flex-wrap gap-2 lg:col-span-2">{selectedProvider.empresa && <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-extrabold text-blue-600">Empresa: {selectedProvider.empresa}</span>}{selectedProvider.nombre_vendedor && <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-600">Vendedor: {selectedProvider.nombre_vendedor}</span>}</div>}
        <Field label="Marca" name="marca" value={form.marca} onChange={change} required /><Field label="Modelo" name="modelo" value={form.modelo} onChange={change} required />
        <Field label="Número de serie" name="numero_serie" value={form.numero_serie} onChange={change} required /><Field label="Fecha de compra" name="fecha_compra" value={form.fecha_compra} onChange={change} type="date" />
        <Field label="Garantía (meses)" name="garantia_meses" value={form.garantia_meses} onChange={change} type="number" min="0" /><Field label="Vence garantía" name="vence_garantia" value={form.vence_garantia} onChange={change} readOnly />
        <label><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Estado</span><select name="estado" value={form.estado} onChange={change} className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold">{statusOptions.filter((item) => !hasActiveAssignment || item.toLowerCase() !== 'disponible').map((item) => <option key={item} value={item.toLowerCase()}>{item}</option>)}</select></label>
        <label className="lg:col-span-2"><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Especificaciones técnicas</span><textarea name="especificaciones_tecnicas" value={form.especificaciones_tecnicas} onChange={change} rows="4" className="w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] p-4 text-sm font-bold" /></label>
      </div>
      <div className="space-y-3">
        <p className="border-b border-[#f0edf6] pb-3 text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300">Fotografía del equipo</p>
        <div className="grid gap-3 lg:grid-cols-1">
          {canTakePhoto && <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#d9cfbf] bg-[#f2ece0] text-[#201d31] transition hover:bg-[#e9dfd0]" aria-label="Tomar foto del equipo">{photoPreview ? <img src={photoPreview} alt="Vista previa del equipo" className="h-full w-full object-cover" /> : <span className="flex h-14 w-16 items-center justify-center rounded-xl bg-[#e7dcc9]"><AppIcon name="camera" /></span>}</button>}
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-28 min-w-0 items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-[#d9cfbf] bg-[#f2ece0] px-5 text-left transition hover:bg-[#e9dfd0]">{photoPreview ? <img src={photoPreview} alt="Vista previa del equipo" className="h-20 w-24 shrink-0 rounded-xl object-cover" /> : <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-[#e7dcc9]"><AppIcon name="image" /></span>}<span className="min-w-0"><span className="block truncate text-sm font-extrabold text-[#5d5870]">{photoName || 'Haz clic para seleccionar una imagen desde tus archivos'}</span><span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#aaa3b8]">JPG o PNG</span></span></button>
        </div>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={changePhoto} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={changePhoto} className="hidden" />
        <p className="text-xs font-bold text-[#9b95ac]">Vista previa local. La fotografía todavía no se envía ni se guarda en el servidor.</p>
      </div>
      <div className="rounded-2xl bg-[#f2ece0] p-4"><div className="flex items-center gap-3"><QrCode /><p className="text-sm font-extrabold">El QR se genera automáticamente al guardar.</p></div></div>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => navigate('/equipos')} className="h-11 rounded-xl bg-[#f2ece0] px-8 font-extrabold">Cancelar</button><button disabled={saving} className="h-11 rounded-xl bg-[#3A9AF2] px-8 font-extrabold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar equipo y generar QR'}</button></div>
    </form></section>
    {showProviderForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#201d31]/40 p-4"><form onSubmit={saveProvider} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="flex justify-between border-b border-[#f0edf6] pb-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300">Formulario</p><h2 className="mt-1 text-xl font-extrabold">Nuevo proveedor</h2></div><button type="button" onClick={() => setShowProviderForm(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2ece0]"><AppIcon name="x" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{[['nombre_proveedor','Nombre del proveedor'],['empresa','Empresa'],['nombre_vendedor','Nombre del vendedor'],['rfc_empresa','RFC de la empresa'],['telefono','Teléfono'],['correo','Gmail / Correo de contacto'],['direccion','Dirección']].map(([name,label]) => <Field key={name} label={label} name={name} value={providerForm[name]} onChange={(e) => setProviderForm((p) => ({ ...p, [name]: e.target.value }))} required={name === 'nombre_proveedor' || name === 'empresa'} />)}<fieldset className="sm:col-span-2"><legend className="mb-2 text-[11px] font-extrabold text-[#8d88a2]">Calificación</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{ratingOptions.map((option) => <button key={option.value} type="button" onClick={() => setProviderForm((p) => ({ ...p, calificacion: option.value }))} className={`rounded-xl border px-3 py-2 text-left transition ${providerForm.calificacion === option.value ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-100' : 'border-[#e2d9c9] bg-[#f2ece0]'}`}><span className="block text-sm text-amber-400">{'★'.repeat(option.stars)}</span><span className="text-[10px] font-extrabold text-[#6f6a85]">{option.label}</span></button>)}</div></fieldset><label className="sm:col-span-2"><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Observaciones</span><textarea name="observaciones" value={providerForm.observaciones} onChange={(e) => setProviderForm((p) => ({ ...p, observaciones: e.target.value }))} placeholder="Notas adicionales" rows="5" className="min-h-32 w-full resize-y rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 py-3 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowProviderForm(false)} className="rounded-xl bg-[#f2ece0] px-6 py-3 font-bold">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#3A9AF2] px-6 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar proveedor'}</button></div></form></div>}
  </div></EquipmentShell>
}
export default EquipoAlta
