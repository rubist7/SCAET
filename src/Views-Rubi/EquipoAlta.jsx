import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import BackButton from '../components/BackButton'
import { AppIcon } from '../components/Sidebar'
import { buildEquipmentTypeOptions, calculateWarrantyEnd, customTypeOption, normalizeEquipmentType, standardTypeOptions, statusOptions } from './equiposData'
import { EquipmentShell, Field, QrCode } from './equiposShared'

const apiUrl = '/api'
const emptyForm = { id_proveedor: '', tipo_equipo: 'Laptop', marca: '', modelo: '', numero_serie: '', fecha_compra: '', garantia_meses: '', vence_garantia: '', especificaciones_tecnicas: '', estado: 'disponible' }
const emptyProvider = { empresa: '', nombre_vendedor: '', rfc_empresa: '', telefono: '', correo: '', direccion: '', calificacion: 'bueno', observaciones: '' }
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('scaet-token')}`, 'Content-Type': 'application/json' })
const authFileHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('scaet-token')}` })
const dateValue = (value) => value ? String(value).slice(0, 10) : ''
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageBytes = 5 * 1024 * 1024
const ratingOptions = [
  { value: 'excelente', label: 'Excelente', stars: 5 },
  { value: 'bueno', label: 'Bueno', stars: 4 },
  { value: 'regular', label: 'Regular', stars: 3 },
  { value: 'malo', label: 'Malo', stars: 1 },
]
const isSerialDuplicateMessage = (message) => /numero de serie ya esta registrado/i.test(message)

function EquipoAlta() {
  const navigate = useNavigate()
  const location = useLocation()
  const { equipmentId } = useParams()
  const [form, setForm] = useState(emptyForm)
  const [initialForm, setInitialForm] = useState(emptyForm)
  const [providers, setProviders] = useState([])
  const [loadedEquipments, setLoadedEquipments] = useState([])
  const [providerForm, setProviderForm] = useState(emptyProvider)
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [loading, setLoading] = useState(Boolean(equipmentId))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [duplicateError, setDuplicateError] = useState({ field: '', message: '' })
  const [customEquipmentType, setCustomEquipmentType] = useState('')
  const [initialCustomEquipmentType, setInitialCustomEquipmentType] = useState('')
  const [customTypeError, setCustomTypeError] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [createdEquipmentId, setCreatedEquipmentId] = useState(null)
  const [hasActiveAssignment, setHasActiveAssignment] = useState(false)
  const cameraInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const providerInputRef = useRef(null)
  const typeInputRef = useRef(null)
  const customTypeInputRef = useRef(null)
  const brandInputRef = useRef(null)
  const modelInputRef = useRef(null)
  const serialInputRef = useRef(null)
  const saveButtonRef = useRef(null)
  const pendingErrorFocusRef = useRef(null)
  const selectedProvider = useMemo(() => providers.find((item) => String(item.id_proveedor) === String(form.id_proveedor)), [form.id_proveedor, providers])
  const typeOptions = useMemo(() => buildEquipmentTypeOptions(loadedEquipments), [loadedEquipments])
  const canTakePhoto = useMemo(() => {
    const navigatorInfo = globalThis.navigator
    const userAgent = navigatorInfo?.userAgent ?? ''
    const platform = navigatorInfo?.platform ?? ''
    const hasTouchScreen = (navigatorInfo?.maxTouchPoints ?? 0) > 1

    return Boolean(navigatorInfo?.userAgentData?.mobile)
      || /Android|iPhone|iPad|iPod/i.test(userAgent)
      || (platform === 'MacIntel' && hasTouchScreen)
  }, [])

  const focusField = useCallback((field) => {
    const target = {
      id_proveedor: providerInputRef.current,
      tipo_equipo: typeInputRef.current,
      custom_type: customTypeInputRef.current,
      marca: brandInputRef.current,
      modelo: modelInputRef.current,
      numero_serie: serialInputRef.current,
      save: saveButtonRef.current,
    }[field]

    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.requestAnimationFrame(() => target.focus({ preventScroll: true }))
  }, [])

  const queueErrorFocus = useCallback((field) => {
    pendingErrorFocusRef.current = field
  }, [])

  useEffect(() => {
    const field = pendingErrorFocusRef.current
    if (!field) return undefined

    pendingErrorFocusRef.current = null
    const frame = window.requestAnimationFrame(() => focusField(field))
    return () => window.cancelAnimationFrame(frame)
  }, [customTypeError, duplicateError, focusField])

  const loadProviders = async () => {
    const response = await fetch(`${apiUrl}/proveedores?estado=activos`, { headers: authHeaders() })
    const data = await response.json()
    if (!response.ok) throw new Error(data.mensaje || 'No se pudieron cargar los proveedores')
    setProviders(data.proveedores || [])
    return data.proveedores || []
  }

  const loadEquipmentTypes = async () => {
    const [activeResponse, hiddenResponse] = await Promise.all([
      fetch(`${apiUrl}/equipos?estado=activos`, { headers: authHeaders() }),
      fetch(`${apiUrl}/equipos?estado=ocultos`, { headers: authHeaders() }),
    ])
    const [activeData, hiddenData] = await Promise.all([activeResponse.json(), hiddenResponse.json()])
    if (!activeResponse.ok) throw new Error(activeData.mensaje || 'No se pudieron cargar los tipos de equipo')
    if (!hiddenResponse.ok) throw new Error(hiddenData.mensaje || 'No se pudieron cargar los tipos de equipo')
    const equipments = [...(activeData.equipos || []), ...(hiddenData.equipos || [])]
    setLoadedEquipments(equipments)
    return buildEquipmentTypeOptions(equipments)
  }

  useEffect(() => {
    loadProviders().catch((error) => setMessage(error.message))
    const equipmentTypeOptionsPromise = loadEquipmentTypes().catch((error) => {
      setMessage(error.message)
      return [...standardTypeOptions, customTypeOption]
    })
    if (!equipmentId) return
    fetch(`${apiUrl}/equipos/${equipmentId}`, { headers: authHeaders() }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensaje)
      const e = data.equipo
      const assigned = Boolean(data.asignacion_actual)
      setHasActiveAssignment(assigned)
      const storedType = String(e.tipo_equipo ?? '').trim()
      const availableTypeOptions = await equipmentTypeOptionsPromise
      const availableType = availableTypeOptions.find((type) => type.toLocaleLowerCase('es') === storedType.toLocaleLowerCase('es'))
      const customType = availableType ? '' : storedType
      const loadedForm = { id_proveedor: e.id_proveedor ?? '', tipo_equipo: availableType || customTypeOption, marca: e.marca, modelo: e.modelo, numero_serie: e.numero_serie, fecha_compra: dateValue(e.fecha_compra), garantia_meses: e.garantia_meses ?? '', vence_garantia: dateValue(e.vence_garantia), especificaciones_tecnicas: e.especificaciones_tecnicas ?? '', estado: e.estado }
      setForm(loadedForm)
      setInitialForm(loadedForm)
      setCustomEquipmentType(customType)
      setInitialCustomEquipmentType(customType)
      setPhotoPreview(e.foto_url || '')
      setPhotoName(e.foto_key || '')
    }).catch((error) => setMessage(error.message)).finally(() => setLoading(false))
  }, [equipmentId])

  const change = (event) => {
    const { name, value } = event.target
    if (name === 'numero_serie') setDuplicateError((current) => current.field === 'numero_serie' ? { field: '', message: '' } : current)
    if (name === 'tipo_equipo') {
      setCustomTypeError('')
      if (value !== customTypeOption) setCustomEquipmentType('')
    }
    setForm((current) => { const next = { ...current, [name]: value }; if (name === 'fecha_compra' || name === 'garantia_meses') next.vence_garantia = calculateWarrantyEnd(next.fecha_compra, next.garantia_meses); return next })
  }

  const changeCustomEquipmentType = (event) => {
    setCustomEquipmentType(event.target.value)
    setCustomTypeError('')
  }

  const getFirstLocalInvalidField = () => {
    if (!form.id_proveedor.trim()) return 'id_proveedor'
    if (!form.tipo_equipo.trim()) return 'tipo_equipo'
    if (form.tipo_equipo === customTypeOption) {
      const normalizedType = normalizeEquipmentType(customEquipmentType)
      if (!normalizedType || normalizedType.toLocaleLowerCase('es') === customTypeOption.toLocaleLowerCase('es')) return 'custom_type'
    }
    if (!form.marca.trim()) return 'marca'
    if (!form.modelo.trim()) return 'modelo'
    if (!form.numero_serie.trim()) return 'numero_serie'
    return ''
  }

  const getBackendErrorField = (message) => {
    const normalizedMessage = String(message ?? '').toLocaleLowerCase('es')
    if (normalizedMessage.includes('proveedor')) return 'id_proveedor'
    if (normalizedMessage.includes('tipo')) return 'tipo_equipo'
    if (normalizedMessage.includes('marca')) return 'marca'
    if (normalizedMessage.includes('modelo')) return 'modelo'
    if (normalizedMessage.includes('serie')) return 'numero_serie'
    return 'save'
  }

  const handleSaveButtonClick = (event) => {
    const firstInvalidField = getFirstLocalInvalidField()

    if (firstInvalidField === 'custom_type') {
      event.preventDefault()
      queueErrorFocus(firstInvalidField)
      setCustomTypeError('Especifica un tipo de equipo válido.')
      return
    }

    if (firstInvalidField) {
      focusField(firstInvalidField)
      return
    }

    const nativeInvalidField = event.currentTarget.form?.querySelector(':invalid')
    if (nativeInvalidField) {
      nativeInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.requestAnimationFrame(() => nativeInvalidField.focus({ preventScroll: true }))
    }
  }

  const changePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!allowedImageTypes.includes(file.type)) {
      setMessage('Solo puedes seleccionar imagenes JPG, JPEG, PNG o WEBP.')
      return
    }

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 4.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      })

      if (compressedFile.size > maxImageBytes) {
        setMessage('La imagen comprimida supera el limite de 5 MB.')
        return
      }

      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
      setPhotoFile(compressedFile)
      setPhotoPreview(URL.createObjectURL(compressedFile))
      setPhotoName(compressedFile.name)
      setMessage('')
    } catch (error) {
      setMessage(error.message || 'No se pudo comprimir la imagen seleccionada.')
    }
  }

  useEffect(() => () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const saveProvider = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('')
    try {
      const providerPayload = { ...providerForm, nombre_proveedor: providerForm.empresa.trim() }
      const response = await fetch(`${apiUrl}/proveedores`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(providerPayload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensaje || 'No se pudo crear el proveedor')
      const refreshed = await loadProviders()
      const created = data.proveedor || refreshed.find((item) => item.nombre_proveedor === providerPayload.nombre_proveedor && item.empresa === providerForm.empresa)
      setForm((current) => ({ ...current, id_proveedor: created?.id_proveedor ?? '' }))
      setShowProviderForm(false); setProviderForm(emptyProvider); setMessage('Proveedor creado y seleccionado.')
    } catch (error) { setMessage(error.message) } finally { setSaving(false) }
  }

  const submit = async (event) => {
    event.preventDefault()
    const normalizedCustomType = form.tipo_equipo === customTypeOption ? normalizeEquipmentType(customEquipmentType) : ''
    if (form.tipo_equipo === customTypeOption && (!normalizedCustomType || normalizedCustomType.toLocaleLowerCase('es') === customTypeOption.toLocaleLowerCase('es'))) {
      queueErrorFocus('custom_type')
      setCustomTypeError('Especifica un tipo de equipo válido.')
      return
    }
    if (normalizedCustomType) setCustomEquipmentType(normalizedCustomType)
    setSaving(true); setMessage(''); setDuplicateError({ field: '', message: '' })
    let equipoGuardado = false
    try {
      const payload = { ...form, tipo_equipo: normalizedCustomType || form.tipo_equipo }
      const idEquipo = equipmentId || createdEquipmentId
      if (idEquipo && payload.estado === 'asignado') delete payload.estado
      const response = await fetch(`${apiUrl}/equipos${idEquipo ? `/${idEquipo}` : ''}`, { method: idEquipo ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) {
        const errorMessage = data.mensaje || 'No se pudo guardar el equipo'
        if (response.status === 409) {
          setDuplicateError({
            field: isSerialDuplicateMessage(errorMessage) ? 'numero_serie' : 'save',
            message: errorMessage,
          })
          queueErrorFocus(isSerialDuplicateMessage(errorMessage) ? 'numero_serie' : 'save')
          return
        }
        const backendError = new Error(errorMessage)
        backendError.field = getBackendErrorField(errorMessage)
        throw backendError
      }
      const idEquipoGuardado = data.equipo?.id_equipo || idEquipo
      equipoGuardado = true
      if (!equipmentId && idEquipoGuardado) setCreatedEquipmentId(idEquipoGuardado)

      if (photoFile) {
        const imageFormData = new FormData()
        imageFormData.append('imagen', photoFile, photoFile.name)
        const imageResponse = await fetch(`${apiUrl}/equipos-imagenes/${idEquipoGuardado}`, {
          method: 'POST',
          headers: authFileHeaders(),
          body: imageFormData,
        })
        const imageData = await imageResponse.json()
        if (!imageResponse.ok) throw new Error(imageData.mensaje || 'No se pudo subir la imagen del equipo')

        if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
        setPhotoPreview(`${imageData.foto_url}?v=${Date.now()}`)
        setPhotoName(imageData.foto_key)
        setPhotoFile(null)
      }

      const destination = location.state?.returnTo || '/equipos'
      navigate(destination, destination === '/equipos' ? { state: { refreshEquipmentList: Date.now() } } : undefined)
    } catch (error) {
      focusField(error.field || getBackendErrorField(error.message))
      setMessage(equipoGuardado ? `El equipo se guardo, pero no se pudo subir la imagen: ${error.message}` : error.message)
    } finally { setSaving(false) }
  }

  const returnTo = location.state?.returnTo || '/equipos'
  const returnLabel = location.state?.returnLabel ? `Volver a ${location.state.returnLabel}` : 'Volver a equipos'
  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm) || customEquipmentType !== initialCustomEquipmentType || Boolean(photoFile)

  if (loading) return <EquipmentShell><p className="p-8 text-sm font-bold text-[#8d88a2]">Cargando equipo...</p></EquipmentShell>
  return <EquipmentShell><div className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <BackButton onBack={() => navigate(returnTo)} hasUnsavedChanges={hasUnsavedChanges} label={returnLabel} />
    <h1 className="text-2xl font-extrabold text-[#201d31] sm:text-3xl">{equipmentId ? 'Editar equipo' : 'Alta de equipo'}</h1>
    {message && <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-600">{message}</p>}
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block"><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Proveedor</span><div className="flex gap-2"><select ref={providerInputRef} name="id_proveedor" value={form.id_proveedor} onChange={change} required className="h-11 min-w-0 flex-1 scroll-mt-28 rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold"><option value="">Selecciona un proveedor</option>{providers.map((p) => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_proveedor} - {p.empresa}</option>)}</select><button type="button" onClick={() => setShowProviderForm(true)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-500" title="Nuevo proveedor"><AppIcon name="plus" /></button></div></label>
        <label><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Tipo de equipo</span><select ref={typeInputRef} name="tipo_equipo" value={form.tipo_equipo} onChange={change} className="h-11 w-full scroll-mt-28 rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold">{typeOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        {form.tipo_equipo === customTypeOption && <label><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Especifica el tipo de equipo</span><input ref={customTypeInputRef} value={customEquipmentType} onChange={changeCustomEquipmentType} placeholder="Ej. Radio, Bocina, Proyector..." required maxLength="80" aria-invalid={customTypeError ? 'true' : undefined} className={`h-11 w-full scroll-mt-28 rounded-xl border bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:bg-white focus:ring-2 ${customTypeError ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100' : 'border-[#e2d9c9] focus:border-blue-300 focus:ring-blue-100'}`} />{customTypeError && <p role="alert" className="mt-1 text-xs font-bold text-rose-600">{customTypeError}</p>}</label>}
        {selectedProvider && (selectedProvider.empresa || selectedProvider.nombre_vendedor) && <div className="flex flex-wrap gap-2 lg:col-span-2">{selectedProvider.empresa && <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-extrabold text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">Empresa: {selectedProvider.empresa}</span>}{selectedProvider.nombre_vendedor && <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">Vendedor: {selectedProvider.nombre_vendedor}</span>}</div>}
        <Field label="Marca" name="marca" value={form.marca} onChange={change} required inputRef={brandInputRef} /><Field label="Modelo" name="modelo" value={form.modelo} onChange={change} required inputRef={modelInputRef} />
        <Field label="Número de serie" name="numero_serie" value={form.numero_serie} onChange={change} required inputRef={serialInputRef} error={duplicateError.field === 'numero_serie' ? duplicateError.message : ''} /><Field label="Fecha de compra" name="fecha_compra" value={form.fecha_compra} onChange={change} type="date" />
        <Field label="Garantía (meses)" name="garantia_meses" value={form.garantia_meses} onChange={change} type="number" min="0" /><Field label="Vence garantía" name="vence_garantia" value={form.vence_garantia} onChange={change} readOnly />
        <label><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Estado</span><select name="estado" value={form.estado} onChange={change} className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold">{form.estado === 'asignado' && <option value="asignado" disabled>Asignado - administrado por Asignación</option>}{statusOptions.filter((item) => item.toLowerCase() !== 'asignado' && (!hasActiveAssignment || item.toLowerCase() !== 'disponible')).map((item) => <option key={item} value={item.toLowerCase()}>{item}</option>)}</select></label>
        <label className="lg:col-span-2"><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Especificaciones técnicas</span><textarea name="especificaciones_tecnicas" value={form.especificaciones_tecnicas} onChange={change} rows="4" className="w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] p-4 text-sm font-bold" /></label>
      </div>
      <div className="space-y-3">
        <p className="border-b border-[#f0edf6] pb-3 text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300">Fotografía del equipo</p>
        <div className="grid gap-3 lg:grid-cols-1">
          {canTakePhoto && <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#d9cfbf] bg-[#f2ece0] text-[#201d31] transition hover:bg-[#e9dfd0]" aria-label="Tomar foto del equipo">{photoPreview ? <img src={photoPreview} alt="Vista previa del equipo" className="h-full w-full object-cover" /> : <span className="flex h-14 w-16 items-center justify-center rounded-xl bg-[#e7dcc9]"><AppIcon name="camera" /></span>}</button>}
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-28 min-w-0 items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-[#d9cfbf] bg-[#f2ece0] px-5 text-left transition hover:bg-[#e9dfd0]">{photoPreview ? <img src={photoPreview} alt="Vista previa del equipo" className="h-20 w-24 shrink-0 rounded-xl object-cover" /> : <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-[#e7dcc9]"><AppIcon name="image" /></span>}<span className="min-w-0"><span className="block truncate text-sm font-extrabold text-[#5d5870]">{photoName || 'Haz clic para seleccionar una imagen desde tus archivos'}</span><span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#aaa3b8]">JPG, PNG o WEBP · Máximo 5 MB</span></span></button>
        </div>
        <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={changePhoto} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={changePhoto} className="hidden" />
        <p className="text-xs font-bold text-[#9b95ac]">La imagen se comprime antes de enviarse y se guarda al guardar el equipo.</p>
      </div>
      <div className="rounded-2xl bg-[#f2ece0] p-4"><div className="flex items-center gap-3"><QrCode /><p className="text-sm font-extrabold">El QR se genera automáticamente al guardar.</p></div></div>
      <div className="space-y-3">{duplicateError.field === 'save' && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">{duplicateError.message}</p>}<div className="flex justify-end gap-3"><button ref={saveButtonRef} type="submit" onClick={handleSaveButtonClick} disabled={saving} className="h-11 scroll-mt-28 rounded-xl bg-[#3A9AF2] px-8 font-extrabold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar equipo y generar QR'}</button></div></div>
    </form></section>
    {showProviderForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#201d31]/40 p-4"><form onSubmit={saveProvider} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="flex justify-between border-b border-[#f0edf6] pb-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300">Formulario</p><h2 className="mt-1 text-xl font-extrabold">Nuevo proveedor</h2></div><button type="button" onClick={() => setShowProviderForm(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2ece0]"><AppIcon name="x" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{[['empresa','Empresa'],['nombre_vendedor','Nombre del vendedor'],['rfc_empresa','RFC de la empresa'],['telefono','Teléfono'],['correo','Gmail / Correo de contacto'],['direccion','Dirección']].map(([name,label]) => <Field key={name} label={label} name={name} value={providerForm[name]} onChange={(e) => setProviderForm((p) => ({ ...p, [name]: e.target.value }))} required={name === 'empresa'} />)}<fieldset className="sm:col-span-2"><legend className="mb-2 text-[11px] font-extrabold text-[#8d88a2]">Calificación</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{ratingOptions.map((option) => <button key={option.value} type="button" onClick={() => setProviderForm((p) => ({ ...p, calificacion: option.value }))} className={`rounded-xl border px-3 py-2 text-left transition ${providerForm.calificacion === option.value ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-100' : 'border-[#e2d9c9] bg-[#f2ece0]'}`}><span className="block text-sm text-amber-400">{'★'.repeat(option.stars)}</span><span className="text-[10px] font-extrabold text-[#6f6a85]">{option.label}</span></button>)}</div></fieldset><label className="sm:col-span-2"><span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Observaciones</span><textarea name="observaciones" value={providerForm.observaciones} onChange={(e) => setProviderForm((p) => ({ ...p, [name]: e.target.value }))} placeholder="Notas adicionales" rows="5" className="min-h-32 w-full resize-y rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 py-3 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowProviderForm(false)} className="rounded-xl bg-[#f2ece0] px-6 py-3 font-bold">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#3A9AF2] px-6 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar proveedor'}</button></div></form></div>}
  </div></EquipmentShell>
}
export default EquipoAlta
