import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon } from '../components/Sidebar'
import { loadUserProfile } from '../utils/userProfile'

const apiUrl = '/api'

const emptyProviderForm = {
  providerName: '',
  companyName: '',
  rfc: '',
  phone: '',
  email: '',
  address: '',
  sellerName: '',
  rating: 'bueno',
  notes: '',
}

const ratingOptions = [
  { value: 'excelente', label: '★★★★★ Excelente', stars: 5 },
  { value: 'bueno', label: '★★★★ Bueno', stars: 4 },
  { value: 'regular', label: '★★★ Regular', stars: 3 },
  { value: 'malo', label: '★ Malo', stars: 1 },
]

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('scaet-token')
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.mensaje || 'No se pudo completar la solicitud.')
  }

  return data
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function mapProviderFromApi(provider) {
  return {
    id: provider.id_proveedor,
    providerName: provider.nombre_proveedor || '',
    companyName: provider.empresa || '',
    rfc: provider.rfc_empresa || '',
    phone: provider.telefono || '',
    email: provider.correo || '',
    address: provider.direccion || '',
    sellerName: provider.nombre_vendedor || '',
    rating: provider.calificacion || 'bueno',
    notes: provider.observaciones || '',
    active: Number(provider.activo) === 1,
  }
}

function buildProviderPayload(form) {
  return {
    nombre_proveedor: form.providerName.trim(),
    empresa: form.companyName.trim(),
    nombre_vendedor: form.sellerName.trim(),
    rfc_empresa: form.rfc.trim().toUpperCase(),
    telefono: form.phone.trim(),
    correo: form.email.trim().toLowerCase(),
    direccion: form.address.trim(),
    calificacion: form.rating,
    observaciones: form.notes.trim(),
  }
}

function RatingStars({ value }) {
  const option = ratingOptions.find((ratingOption) => ratingOption.value === value)
  const rating = option?.stars ?? 0

  if (!rating) {
    return <span className="text-xs font-extrabold text-[#b3adbf]">Sin calificación</span>
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={option.label}>
      {Array.from({ length: rating }).map((_, index) => (
        <span key={index}>★</span>
      ))}
    </span>
  )
}

function Field({ label, name, value, onChange, placeholder, type = 'text', required = false, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
    </label>
  )
}

function StatusMessage({ status }) {
  if (!status.text) {
    return null
  }

  const toneClass = status.type === 'error'
    ? 'bg-rose-50 text-rose-600'
    : 'bg-emerald-50 text-emerald-600'

  return (
    <p className={`rounded-xl px-4 py-3 text-sm font-bold ${toneClass}`} aria-live="polite">
      {status.text}
    </p>
  )
}

function EmptyState({ hasProviders, canCreateProvider }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-5 py-10 text-center sm:min-h-[340px]">
      <p className="max-w-md text-sm font-bold text-[#8d88a2]">
        {hasProviders
          ? 'No se encontraron proveedores con esa búsqueda.'
          : canCreateProvider
            ? 'Aún no hay proveedores registrados. Presiona Nuevo proveedor para agregar el primero.'
            : 'Aún no hay proveedores registrados.'}
      </p>
    </div>
  )
}

function providerValue(value, fallback = 'Pendiente') {
  return value || fallback
}

function DetailItem({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-blue-300">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[#5d5870]">{providerValue(value)}</p>
    </div>
  )
}

function ProviderDetails({ provider }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-[#393141] dark:bg-[#211b2a]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailItem label="RFC" value={provider.rfc} />
        <DetailItem label="Teléfono" value={provider.phone} />
        <DetailItem label="Correo" value={provider.email} />
        <DetailItem label="Calificación" value={ratingOptions.find((option) => option.value === provider.rating)?.label} />
        <DetailItem label="Proveedor" value={provider.providerName} />
        <DetailItem label="Empresa" value={provider.companyName} />
        <DetailItem label="Vendedor" value={provider.sellerName} />
        <DetailItem label="Dirección" value={provider.address} />
        <DetailItem label="Observaciones" value={provider.notes} className="sm:col-span-2 xl:col-span-4" />
      </div>
    </div>
  )
}

function Proveedores() {
  const [profile] = useState(() => loadUserProfile())
  const [providers, setProviders] = useState([])
  const [form, setForm] = useState(emptyProviderForm)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showHiddenProviders, setShowHiddenProviders] = useState(false)
  const [expandedProviderId, setExpandedProviderId] = useState(null)
  const [status, setStatus] = useState({ type: '', text: '' })
  const formRef = useRef(null)
  const listRef = useRef(null)

  const canManageProvider = profile.roleKey === 'admin' || profile.roleKey === 'capturista'
  const canChangeProviderState = profile.roleKey === 'admin'
  const providerState = showHiddenProviders ? 'ocultos' : 'activos'
  const viewTitle = showHiddenProviders ? 'Proveedores ocultos' : 'Proveedores activos'
  const viewDescription = showHiddenProviders
    ? 'Proveedores desactivados que se conservan para auditoría y consulta.'
    : 'Proveedores visibles y disponibles para el sistema.'

  const loadProviders = async (state = providerState) => {
    try {
      const data = await apiRequest(`/proveedores?estado=${state}`)
      setProviders(data.proveedores.map(mapProviderFromApi))
    } catch (error) {
      setStatus({ type: 'error', text: error.message })
    }
  }

  useEffect(() => {
    let ignore = false

    apiRequest(`/proveedores?estado=${providerState}`)
      .then((data) => {
        if (!ignore) {
          setProviders(data.proveedores.map(mapProviderFromApi))
        }
      })
      .catch((error) => {
        if (!ignore) {
          setStatus({ type: 'error', text: error.message })
        }
      })

    return () => {
      ignore = true
    }
  }, [providerState])

  const filteredProviders = useMemo(() => {
    const term = normalizeText(search)

    if (!term) {
      return providers
    }

    return providers.filter((provider) => (
      [
        provider.providerName,
        provider.companyName,
        provider.sellerName,
        provider.rfc,
        provider.phone,
        provider.email,
      ].some((value) => normalizeText(value).includes(term))
    ))
  }, [providers, search])

  const isEditing = Boolean(editingId)

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: name === 'rfc' ? value.toUpperCase() : value,
    }))
    setStatus({ type: '', text: '' })
  }

  const scrollToForm = () => {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const scrollToList = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleToggleHiddenProviders = () => {
    setShowHiddenProviders((current) => !current)
    setExpandedProviderId(null)
    setStatus({ type: '', text: '' })
  }

  const handleNewProvider = () => {
    if (!canManageProvider) {
      return
    }

    setForm(emptyProviderForm)
    setEditingId(null)
    setShowHiddenProviders(false)
    setShowForm(true)
    setExpandedProviderId(null)
    setStatus({ type: '', text: '' })
    scrollToForm()
  }

  const handleCancel = () => {
    setForm(emptyProviderForm)
    setEditingId(null)
    setShowForm(false)
    setStatus({ type: '', text: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canManageProvider) {
      setStatus({ type: 'error', text: 'No tienes permiso para guardar proveedores.' })
      return
    }

    if (!form.providerName.trim()) {
      setStatus({ type: 'error', text: 'El nombre del proveedor es obligatorio.' })
      return
    }

    if (!form.companyName.trim()) {
      setStatus({ type: 'error', text: 'La empresa es obligatoria.' })
      return
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setStatus({ type: 'error', text: 'El correo no tiene un formato válido.' })
      return
    }

    try {
      const payload = buildProviderPayload(form)
      const data = await apiRequest(
        isEditing ? `/proveedores/${editingId}` : '/proveedores',
        {
          method: isEditing ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      )
      const savedProvider = mapProviderFromApi(data.proveedor)
      const nextState = isEditing ? providerState : 'activos'

      setForm(emptyProviderForm)
      setEditingId(null)
      setShowForm(false)
      setShowHiddenProviders(nextState === 'ocultos')
      setExpandedProviderId(savedProvider.id)
      setStatus({ type: 'success', text: data.mensaje })
      await loadProviders(nextState)
      scrollToList()
    } catch (error) {
      setStatus({ type: 'error', text: error.message })
    }
  }

  const handleEdit = (provider) => {
    if (!canManageProvider) {
      return
    }

    setForm({
      providerName: provider.providerName,
      companyName: provider.companyName,
      rfc: provider.rfc,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      sellerName: provider.sellerName,
      rating: provider.rating,
      notes: provider.notes,
    })
    setEditingId(provider.id)
    setShowForm(true)
    setExpandedProviderId(provider.id)
    setStatus({ type: '', text: '' })
    scrollToForm()
  }

  const handleProviderStateChange = async (provider, active) => {
    if (!canChangeProviderState) {
      return
    }

    try {
      const data = await apiRequest(`/proveedores/${provider.id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ activo: active ? 1 : 0 }),
      })

      if (provider.id === expandedProviderId) {
        setExpandedProviderId(null)
      }

      if (provider.id === editingId) {
        handleCancel()
      }

      setStatus({ type: 'success', text: data.mensaje })
      await loadProviders(providerState)
    } catch (error) {
      setStatus({ type: 'error', text: error.message })
    }
  }

  const handleToggleDetails = (providerId) => {
    setExpandedProviderId((currentProviderId) => (
      currentProviderId === providerId ? null : providerId
    ))
  }

  return (
    <div className="min-w-0 space-y-6">
            <section className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" ref={listRef}>
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold text-[#201d31] sm:text-3xl">Proveedores</h1>
                <p className="mt-1 text-sm font-bold text-[#8d88a2]">
                  {providers.length} {providers.length === 1 ? 'proveedor' : 'proveedores'} {showHiddenProviders ? 'ocultos' : 'activos'}
                </p>
              </div>

              {canManageProvider && (
                <button
                  type="button"
                  onClick={handleNewProvider}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3A9AF2] px-5 text-sm font-extrabold text-[#FFFFFF] shadow-sm transition hover:bg-[#238BEA] focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
                >
                  <AppIcon name="plus" />
                  Nuevo proveedor
                </button>
              )}
            </section>

            <StatusMessage status={status} />

            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="relative block">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9b95ac]">
                    <AppIcon name="search" />
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar proveedor..."
                    className="h-12 w-full rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] pl-11 pr-4 text-sm font-bold text-[#2a263a] outline-none transition placeholder:text-[#9b95ac] focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleToggleHiddenProviders}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#e2d9c9] bg-[#fbf7ef] px-3 text-xs font-extrabold text-[#6f6584] shadow-sm transition hover:bg-[#f2ece0] dark:border-[#30273b] dark:bg-[#241c2d] dark:text-[#c9bdd5] dark:hover:border-[#493a59] dark:hover:bg-[#2c2236]"
                  aria-label={showHiddenProviders ? 'Ver proveedores activos' : 'Ver proveedores ocultos'}
                  title={showHiddenProviders ? 'Ver proveedores activos' : 'Ver proveedores ocultos'}
                >
                  <AppIcon name={showHiddenProviders ? 'eye' : 'eyeOff'} />
                  {showHiddenProviders ? 'Activos' : 'Ocultos'}
                </button>
              </div>

              <div>
                <h2 className="text-sm font-extrabold text-[#201d31]">{viewTitle}</h2>
                <p className="mt-1 text-xs font-bold text-[#8d88a2]">{viewDescription}</p>
              </div>

              <div className="hidden min-h-[360px] overflow-x-auto rounded-2xl bg-white shadow-sm lg:block">
                <table className="w-full min-w-[940px] table-fixed text-left">
                  <thead className="bg-[#eee7d9] text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300">
                    <tr>
                      <th className="px-5 py-3">Nombre</th>
                      <th className="px-5 py-3">Empresa</th>
                      <th className="px-5 py-3">Vendedor</th>
                      <th className="px-5 py-3">Teléfono</th>
                      <th className="px-5 py-3">Correo</th>
                      <th className="px-5 py-3">Calificación</th>
                      <th className="w-40 px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1edf5] text-sm">
                    {filteredProviders.length > 0 ? (
                      filteredProviders.map((provider) => {
                        const isExpanded = expandedProviderId === provider.id

                        return (
                          <Fragment key={provider.id}>
                            <tr className={`transition hover:bg-blue-50/40 dark:hover:bg-[#211b2a] ${isExpanded ? 'bg-blue-50/30 dark:bg-[#1e1827]' : ''}`}>
                              <td className="px-5 py-4 font-extrabold text-[#201d31]">{provider.providerName}</td>
                              <td className="px-5 py-4 font-bold text-[#5d5870]">{provider.companyName}</td>
                              <td className="px-5 py-4 font-bold text-[#5d5870]">{provider.sellerName || 'Sin vendedor'}</td>
                              <td className="px-5 py-4 font-bold text-[#5d5870]">{provider.phone}</td>
                              <td className="truncate px-5 py-4 font-bold text-[#5d5870]">{provider.email}</td>
                              <td className="px-5 py-4 text-xs">
                                <RatingStars value={provider.rating} />
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDetails(provider.id)}
                                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                                      isExpanded
                                        ? 'bg-[#3A9AF2] text-[#FFFFFF]'
                                        : 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                                    }`}
                                    aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} información de ${provider.providerName}`}
                                    title="Información"
                                    aria-expanded={isExpanded}
                                  >
                                    <AppIcon name="info" />
                                  </button>
                                  {canManageProvider && (
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(provider)}
                                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 transition hover:bg-blue-100"
                                      aria-label={`Editar ${provider.providerName}`}
                                      title="Editar"
                                    >
                                      <AppIcon name="edit" />
                                    </button>
                                  )}
                                  {canChangeProviderState && (
                                    <button
                                      type="button"
                                      onClick={() => handleProviderStateChange(provider, !provider.active)}
                                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                                        provider.active
                                          ? 'border border-[#e8dfd0] bg-[#f2ece0] text-[#8d88a2] hover:bg-[#e9e0cf] dark:border-[#30273b] dark:bg-[#241c2d] dark:text-[#c9bdd5] dark:hover:border-[#493a59] dark:hover:bg-[#2c2236]'
                                          : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'
                                      }`}
                                      aria-label={`${provider.active ? 'Ocultar' : 'Activar'} ${provider.providerName}`}
                                      title={provider.active ? 'Ocultar' : 'Activar'}
                                    >
                                      <AppIcon name={provider.active ? 'eyeOff' : 'eye'} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="7" className="bg-[#fbfaf8] px-5 pb-5 dark:bg-[#191521]">
                                  <ProviderDetails provider={provider} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="7">
                          <EmptyState hasProviders={providers.length > 0} canCreateProvider={canManageProvider} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="min-h-[320px] rounded-2xl bg-white p-3 shadow-sm lg:hidden">
                {filteredProviders.length > 0 ? (
                  <div className="space-y-3">
                    {filteredProviders.map((provider) => {
                      const isExpanded = expandedProviderId === provider.id

                      return (
                        <article
                          key={provider.id}
                          className={`rounded-xl border p-4 transition ${
                            isExpanded
                              ? 'border-blue-200 bg-blue-50/40 dark:border-[#393141] dark:bg-[#211b2a]'
                              : 'border-[#f1edf5] bg-[#fbfaf8]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-base font-extrabold text-[#201d31]">{provider.providerName}</h2>
                              <p className="mt-1 truncate text-xs font-bold text-[#8d88a2]">{provider.companyName}</p>
                            </div>
                            <div className="shrink-0 text-xs">
                              <RatingStars value={provider.rating} />
                            </div>
                          </div>

                          <div className="mt-4 space-y-2 text-xs font-bold text-[#6f6a85]">
                            <p className="truncate">{provider.sellerName || 'Sin vendedor'}</p>
                            <p className="truncate">{provider.phone}</p>
                            <p className="break-all">{provider.email}</p>
                          </div>

                          {isExpanded && (
                            <div className="mt-4">
                              <ProviderDetails provider={provider} />
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleDetails(provider.id)}
                              className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition ${
                                isExpanded
                                  ? 'bg-[#3A9AF2] text-[#FFFFFF]'
                                  : 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                              }`}
                              aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} información de ${provider.providerName}`}
                              aria-expanded={isExpanded}
                            >
                              <AppIcon name="info" />
                              Info
                            </button>
                            {canManageProvider && (
                              <button
                                type="button"
                                onClick={() => handleEdit(provider)}
                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 text-xs font-extrabold text-blue-500 transition hover:bg-blue-100"
                              >
                                <AppIcon name="edit" />
                                Editar
                              </button>
                            )}
                            {canChangeProviderState && (
                              <button
                                type="button"
                                onClick={() => handleProviderStateChange(provider, !provider.active)}
                                className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition ${
                                  provider.active
                                    ? 'border border-[#e8dfd0] bg-[#f2ece0] text-[#8d88a2] hover:bg-[#e9e0cf] dark:border-[#30273b] dark:bg-[#241c2d] dark:text-[#c9bdd5] dark:hover:border-[#493a59] dark:hover:bg-[#2c2236]'
                                    : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'
                                }`}
                              >
                                <AppIcon name={provider.active ? 'eyeOff' : 'eye'} />
                                {provider.active ? 'Ocultar' : 'Activar'}
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState hasProviders={providers.length > 0} canCreateProvider={canManageProvider} />
                )}
              </div>
            </section>

            {showForm && canManageProvider && (
              <section ref={formRef} className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                <div className="border-b border-[#f0edf6] pb-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300">
                    {isEditing ? 'Formulario - editar proveedor' : 'Formulario - nuevo proveedor'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field
                      label="Nombre del proveedor"
                      name="providerName"
                      value={form.providerName}
                      onChange={handleInputChange}
                      placeholder="Nombre completo"
                      required
                    />
                    <Field
                      label="Nombre de la empresa"
                      name="companyName"
                      value={form.companyName}
                      onChange={handleInputChange}
                      placeholder="Empresa"
                      required
                    />
                    <Field
                      label="Nombre del vendedor"
                      name="sellerName"
                      value={form.sellerName}
                      onChange={handleInputChange}
                      placeholder="Responsable comercial"
                    />
                    <Field
                      label="RFC de la empresa"
                      name="rfc"
                      value={form.rfc}
                      onChange={handleInputChange}
                      placeholder="RFC"
                    />
                    <Field
                      label="Teléfono"
                      name="phone"
                      value={form.phone}
                      onChange={handleInputChange}
                      placeholder="Teléfono de contacto"
                      type="tel"
                    />
                    <Field
                      label="Gmail / Correo de contacto"
                      name="email"
                      value={form.email}
                      onChange={handleInputChange}
                      placeholder="correo@empresa.com"
                      type="email"
                    />
                    <Field
                      label="Dirección"
                      name="address"
                      value={form.address}
                      onChange={handleInputChange}
                      placeholder="Calle, número, ciudad"
                      className="lg:col-span-2"
                    />

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Calificación</span>
                      <select
                        name="rating"
                        value={form.rating}
                        onChange={handleInputChange}
                        className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      >
                        {ratingOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Observaciones</span>
                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleInputChange}
                        placeholder="Notas adicionales"
                        rows="3"
                        className="min-h-24 w-full resize-y rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 py-3 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="h-11 rounded-xl bg-[#f2ece0] px-8 text-sm font-extrabold text-[#6f6a85] transition hover:bg-[#e9dfd0]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="h-11 rounded-xl bg-[#3A9AF2] px-8 text-sm font-extrabold text-[#FFFFFF] transition hover:bg-[#238BEA] focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      {isEditing ? 'Guardar cambios' : 'Guardar proveedor'}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
  )
}

export default Proveedores
