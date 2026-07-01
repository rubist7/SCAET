import { Fragment, useMemo, useRef, useState } from 'react'
import AppSidebar, { AppIcon } from '../components/Sidebar'

const emptyProviderForm = {
  providerName: '',
  companyName: '',
  rfc: '',
  phone: '',
  email: '',
  address: '',
  sellerName: '',
  rating: '5',
  notes: '',
}

const ratingOptions = [
  { value: '5', label: '★★★★★ Excelente' },
  { value: '4', label: '★★★★ Muy bueno' },
  { value: '3', label: '★★★ Bueno' },
  { value: '2', label: '★★ Regular' },
  { value: '1', label: '★ Revisar' },
]

function createProviderId() {
  return globalThis.crypto?.randomUUID?.() ?? `provider-${Date.now()}`
}

function normalizeText(value) {
  return value.toString().trim().toLowerCase()
}

function RatingStars({ value }) {
  const rating = Number(value)

  if (!rating) {
    return <span className="text-xs font-extrabold text-[#b3adbf]">Sin calificacion</span>
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${rating} de 5 estrellas`}>
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
        className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />
    </label>
  )
}

function EmptyState({ hasProviders }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-5 py-10 text-center sm:min-h-[340px]">
      <p className="max-w-md text-sm font-bold text-[#8d88a2]">
        {hasProviders
          ? 'No se encontraron proveedores con esa busqueda.'
          : 'Aun no hay proveedores registrados. Presiona Nuevo proveedor para agregar el primero.'}
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
      <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-violet-300">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[#5d5870]">{providerValue(value)}</p>
    </div>
  )
}

function ProviderDetails({ provider }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailItem label="RFC" value={provider.rfc} />
        <DetailItem label="Telefono" value={provider.phone} />
        <DetailItem label="Correo" value={provider.email} />
        <DetailItem label="Calificacion" value={ratingOptions.find((option) => option.value === provider.rating)?.label} />
        <DetailItem label="Proveedor" value={provider.providerName} />
        <DetailItem label="Empresa" value={provider.companyName} />
        <DetailItem label="Vendedor" value={provider.sellerName} />
        <DetailItem label="Direccion" value={provider.address} />
        <DetailItem label="Observaciones" value={provider.notes} className="sm:col-span-2 xl:col-span-4" />
      </div>
    </div>
  )
}

function Proveedores() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [providers, setProviders] = useState([])
  const [form, setForm] = useState(emptyProviderForm)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedProviderId, setExpandedProviderId] = useState(null)
  const formRef = useRef(null)
  const listRef = useRef(null)

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
        provider.address,
      ].some((value) => normalizeText(value).includes(term))
    ))
  }, [providers, search])

  const isEditing = Boolean(editingId)

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
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

  const handleNewProvider = () => {
    setForm(emptyProviderForm)
    setEditingId(null)
    setShowForm(true)
    setExpandedProviderId(null)
    scrollToForm()
  }

  const handleCancel = () => {
    setForm(emptyProviderForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const cleanProvider = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    )
    const savedProviderId = editingId ?? createProviderId()

    setProviders((currentProviders) => {
      if (editingId) {
        return currentProviders.map((provider) => (
          provider.id === editingId ? { ...provider, ...cleanProvider } : provider
        ))
      }

      return [{ id: savedProviderId, ...cleanProvider }, ...currentProviders]
    })

    setForm(emptyProviderForm)
    setEditingId(null)
    setShowForm(false)
    setExpandedProviderId(savedProviderId)
    scrollToList()
  }

  const handleEdit = (provider) => {
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
    scrollToForm()
  }

  const handleDelete = (providerId) => {
    setProviders((currentProviders) => currentProviders.filter((provider) => provider.id !== providerId))

    if (providerId === expandedProviderId) {
      setExpandedProviderId(null)
    }

    if (providerId === editingId) {
      handleCancel()
    }
  }

  const handleToggleDetails = (providerId) => {
    setExpandedProviderId((currentProviderId) => (
      currentProviderId === providerId ? null : providerId
    ))
  }

  return (
    <div className="min-h-screen bg-[#f6f2ec] font-sans text-[#2a263a]">
      <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#f6f2ec]">
        <AppSidebar isOpen={sidebarOpen} activePage="Proveedores" />

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Cerrar menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-[#201d31]/30 lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-[#ece7df] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white text-[#6f6a85] shadow-sm lg:hidden"
                aria-label="Abrir menu"
              >
                <AppIcon name="menu" />
              </button>
              <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.32em] text-[#8d88a2] sm:text-sm">
                Inventario de proveedores
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden rounded-full bg-violet-50 px-5 py-2 text-sm font-extrabold text-violet-500 sm:inline-flex">
                Administrador
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-violet-300 bg-violet-50 text-xs font-extrabold text-violet-500">
                JE
              </span>
            </div>
          </header>

          <div className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" ref={listRef}>
              <div>
                <h1 className="text-2xl font-extrabold text-[#201d31] sm:text-3xl">Proveedores</h1>
                <p className="mt-1 text-sm font-bold text-[#8d88a2]">
                  {providers.length} {providers.length === 1 ? 'registro local' : 'registros locales'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNewProvider}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#91C6F8] px-5 text-sm font-extrabold text-[#0F5FAF] shadow-sm transition hover:bg-[#79B8F4] focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <AppIcon name="plus" />
                Nuevo proveedor
              </button>
            </section>

            <section className="space-y-4">
              <label className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9b95ac]">
                  <AppIcon name="search" />
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar proveedor..."
                  className="h-12 w-full rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] pl-11 pr-4 text-sm font-bold text-[#2a263a] outline-none transition placeholder:text-[#9b95ac] focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <div className="hidden min-h-[360px] overflow-hidden rounded-2xl bg-white shadow-sm lg:block">
                <table className="w-full table-fixed text-left">
                  <thead className="bg-[#eee7d9] text-[10px] font-extrabold uppercase tracking-[0.28em] text-violet-300">
                    <tr>
                      <th className="px-5 py-3">Nombre</th>
                      <th className="px-5 py-3">Empresa</th>
                      <th className="px-5 py-3">Vendedor</th>
                      <th className="px-5 py-3">Telefono</th>
                      <th className="px-5 py-3">Correo</th>
                      <th className="px-5 py-3">Calificacion</th>
                      <th className="w-40 px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1edf5] text-sm">
                    {filteredProviders.length > 0 ? (
                      filteredProviders.map((provider) => {
                        const isExpanded = expandedProviderId === provider.id

                        return (
                          <Fragment key={provider.id}>
                            <tr className={`transition hover:bg-violet-50/40 ${isExpanded ? 'bg-violet-50/30' : ''}`}>
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
                                        ? 'bg-[#91C6F8] text-[#0F5FAF]'
                                        : 'bg-violet-50 text-violet-500 hover:bg-violet-100'
                                    }`}
                                    aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} informacion de ${provider.providerName}`}
                                    title="Informacion"
                                    aria-expanded={isExpanded}
                                  >
                                    <AppIcon name="info" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(provider)}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500 transition hover:bg-violet-100"
                                    aria-label={`Editar ${provider.providerName}`}
                                    title="Editar"
                                  >
                                    <AppIcon name="edit" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(provider.id)}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-400 transition hover:bg-rose-100"
                                    aria-label={`Eliminar ${provider.providerName}`}
                                    title="Eliminar"
                                  >
                                    <AppIcon name="trash" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="7" className="bg-[#fbfaf8] px-5 pb-5">
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
                          <EmptyState hasProviders={providers.length > 0} />
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
                              ? 'border-violet-200 bg-violet-50/40'
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

                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleDetails(provider.id)}
                              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition ${
                                isExpanded
                                  ? 'bg-[#91C6F8] text-[#0F5FAF]'
                                  : 'bg-violet-50 text-violet-500 hover:bg-violet-100'
                              }`}
                              aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} informacion de ${provider.providerName}`}
                              aria-expanded={isExpanded}
                            >
                              <AppIcon name="info" />
                              Info
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(provider)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-50 text-xs font-extrabold text-violet-500 transition hover:bg-violet-100"
                            >
                              <AppIcon name="edit" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(provider.id)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-50 text-xs font-extrabold text-rose-400 transition hover:bg-rose-100"
                            >
                              <AppIcon name="trash" />
                              Eliminar
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState hasProviders={providers.length > 0} />
                )}
              </div>
            </section>

            {showForm && (
              <section ref={formRef} className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                <div className="border-b border-[#f0edf6] pb-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-violet-300">
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
                      label="Telefono"
                      name="phone"
                      value={form.phone}
                      onChange={handleInputChange}
                      placeholder="Telefono de contacto"
                      type="tel"
                      required
                    />
                    <Field
                      label="Gmail / Correo de contacto"
                      name="email"
                      value={form.email}
                      onChange={handleInputChange}
                      placeholder="correo@empresa.com"
                      type="email"
                      required
                    />
                    <Field
                      label="Direccion"
                      name="address"
                      value={form.address}
                      onChange={handleInputChange}
                      placeholder="Calle, numero, ciudad"
                      className="lg:col-span-2"
                    />

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Calificacion</span>
                      <select
                        name="rating"
                        value={form.rating}
                        onChange={handleInputChange}
                        className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
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
                        className="min-h-24 w-full resize-y rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 py-3 text-sm font-bold text-[#2a263a] outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
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
                      className="h-11 rounded-xl bg-[#91C6F8] px-8 text-sm font-extrabold text-[#0F5FAF] transition hover:bg-[#79B8F4] focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      {isEditing ? 'Guardar cambios' : 'Guardar proveedor'}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Proveedores
