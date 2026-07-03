import { Fragment, useMemo, useRef, useState } from 'react'
import { AppIcon } from '../components/Sidebar'

const emptyCollaboratorForm = {
  employeeNumber: '',
  fullName: '',
  area: '',
  department: '',
  position: '',
  email: '',
  phone: '',
  extension: '',
  equipmentCount: '0',
  status: 'Activo',
  notes: '',
  photoUrl: '',
  photoName: '',
}

const statusOptions = ['Activo', 'Temporal', 'Inactivo']

function createCollaboratorId() {
  return globalThis.crypto?.randomUUID?.() ?? `collaborator-${Date.now()}`
}

function normalizeText(value) {
  return value.toString().trim().toLowerCase()
}

function collaboratorValue(value, fallback = 'Pendiente') {
  return value || fallback
}

function getInitials(name, fallback = 'CL') {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return fallback.slice(0, 2).toUpperCase()
  }

  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

function Avatar({ collaborator, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'h-20 w-20 text-xl' : 'h-10 w-10 text-xs'

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-300 bg-blue-50 font-extrabold text-blue-500 ${sizeClass}`}>
      {collaborator.photoUrl ? (
        <img src={collaborator.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{getInitials(collaborator.fullName, collaborator.employeeNumber || 'CL')}</span>
      )}
    </div>
  )
}

function DetailItem({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-blue-300">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[#5d5870]">{collaboratorValue(value)}</p>
    </div>
  )
}

function CollaboratorDetails({ collaborator }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar collaborator={collaborator} size="lg" />
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Num. colaborador" value={collaborator.employeeNumber} />
          <DetailItem label="Nombre completo" value={collaborator.fullName} />
          <DetailItem label="Area" value={collaborator.area} />
          <DetailItem label="Departamento" value={collaborator.department} />
          <DetailItem label="Puesto" value={collaborator.position} />
          <DetailItem label="Correo" value={collaborator.email} />
          <DetailItem label="Telefono" value={collaborator.phone} />
          <DetailItem label="Extension" value={collaborator.extension} />
          <DetailItem label="Equipos" value={collaborator.equipmentCount} />
          <DetailItem label="Estado" value={collaborator.status} />
          <DetailItem label="Imagen" value={collaborator.photoName} />
          <DetailItem label="Observaciones" value={collaborator.notes} className="sm:col-span-2 xl:col-span-4" />
        </div>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, placeholder, type = 'text', required = false, className = '', min }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">{label}</span>
      <input
        name={name}
        type={type}
        min={min}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
    </label>
  )
}

function EmptyState({ hasCollaborators, showHidden = false }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-5 py-10 text-center sm:min-h-[340px]">
      <p className="max-w-md text-sm font-bold text-[#8d88a2]">
        {hasCollaborators
          ? 'No se encontraron colaboradores con esos filtros.'
          : showHidden
            ? 'No hay colaboradores ocultos por ahora.'
            : 'Aun no hay colaboradores registrados. Presiona Nuevo colaborador para agregar el primero.'}
      </p>
    </div>
  )
}

function Colaboradores() {
  const [collaborators, setCollaborators] = useState([])
  const [form, setForm] = useState(emptyCollaboratorForm)
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedCollaboratorId, setExpandedCollaboratorId] = useState(null)
  const [showHidden, setShowHidden] = useState(false)
  const formRef = useRef(null)
  const listRef = useRef(null)
  const uploadInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const visibleCollaborators = useMemo(() => (
    collaborators.filter((collaborator) => Boolean(collaborator.hidden) === showHidden)
  ), [collaborators, showHidden])

  const hiddenCollaboratorsCount = collaborators.filter((collaborator) => collaborator.hidden).length

  const areaOptions = useMemo(() => (
    Array.from(new Set(visibleCollaborators.map((collaborator) => collaborator.area).filter(Boolean))).sort()
  ), [visibleCollaborators])

  const filteredCollaborators = useMemo(() => {
    const term = normalizeText(search)

    return visibleCollaborators.filter((collaborator) => {
      const matchesArea = areaFilter === 'all' || collaborator.area === areaFilter

      if (!matchesArea) {
        return false
      }

      if (!term) {
        return true
      }

      return [
        collaborator.employeeNumber,
        collaborator.fullName,
        collaborator.area,
        collaborator.department,
        collaborator.position,
        collaborator.email,
        collaborator.phone,
      ].some((value) => normalizeText(value).includes(term))
    })
  }, [areaFilter, search, visibleCollaborators])

  const isEditing = Boolean(editingId)

  const canTakePhoto = useMemo(() => {
    const navigatorInfo = globalThis.navigator
    const userAgent = navigatorInfo?.userAgent ?? ''
    const platform = navigatorInfo?.platform ?? ''
    const hasTouchScreen = (navigatorInfo?.maxTouchPoints ?? 0) > 1
    const userAgentMobile = Boolean(navigatorInfo?.userAgentData?.mobile)
    const isMobileOrTablet = (
      userAgentMobile
      || /Android|iPhone|iPad|iPod/i.test(userAgent)
      || (platform === 'MacIntel' && hasTouchScreen)
    )

    return isMobileOrTablet
  }, [])

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

  const handleInputChange = (event) => {
    const { name, value } = event.target
    const fieldName = name === 'area' || name.toLowerCase().includes('rea') ? 'area' : name
    setForm((currentForm) => ({ ...currentForm, [fieldName]: value }))
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setForm((currentForm) => ({
      ...currentForm,
      photoUrl: URL.createObjectURL(file),
      photoName: file.name,
    }))
  }

  const handleNewCollaborator = () => {
    setForm(emptyCollaboratorForm)
    setEditingId(null)
    setShowForm(true)
    setExpandedCollaboratorId(null)
    scrollToForm()
  }

  const handleCancel = () => {
    setForm(emptyCollaboratorForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const cleanCollaborator = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    )
    const savedCollaboratorId = editingId ?? createCollaboratorId()

    setCollaborators((currentCollaborators) => {
      if (editingId) {
        return currentCollaborators.map((collaborator) => (
          collaborator.id === editingId ? { ...collaborator, ...cleanCollaborator } : collaborator
        ))
      }

      return [{ id: savedCollaboratorId, hidden: false, ...cleanCollaborator }, ...currentCollaborators]
    })

    setForm(emptyCollaboratorForm)
    setEditingId(null)
    setShowForm(false)
    setExpandedCollaboratorId(null)
    scrollToList()
  }

  const handleEdit = (collaborator) => {
    setForm({
      employeeNumber: collaborator.employeeNumber,
      fullName: collaborator.fullName,
      area: collaborator.area,
      department: collaborator.department,
      position: collaborator.position,
      email: collaborator.email,
      phone: collaborator.phone,
      extension: collaborator.extension,
      equipmentCount: collaborator.equipmentCount,
      status: collaborator.status,
      notes: collaborator.notes,
      photoUrl: collaborator.photoUrl,
      photoName: collaborator.photoName,
    })
    setEditingId(collaborator.id)
    setShowForm(true)
    setExpandedCollaboratorId(null)
    scrollToForm()
  }

  const handleToggleHidden = (collaboratorId, shouldHide) => {
    setCollaborators((currentCollaborators) => (
      currentCollaborators.map((collaborator) => (
        collaborator.id === collaboratorId
          ? { ...collaborator, hidden: shouldHide, hiddenAt: shouldHide ? new Date().toISOString() : '' }
          : collaborator
      ))
    ))

    if (collaboratorId === expandedCollaboratorId) {
      setExpandedCollaboratorId(null)
    }

    if (collaboratorId === editingId) {
      handleCancel()
    }
  }

  const handleToggleDetails = (collaboratorId) => {
    setExpandedCollaboratorId((currentCollaboratorId) => (
      currentCollaboratorId === collaboratorId ? null : collaboratorId
    ))
  }

  return (
    <div className="space-y-6">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" ref={listRef}>
              <div>
                <h1 className="text-2xl font-extrabold text-[#201d31] sm:text-3xl">Colaboradores</h1>
                <p className="mt-1 text-sm font-bold text-[#8d88a2]">
                  {visibleCollaborators.length} {showHidden ? 'ocultos' : 'visibles'}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowHidden((currentValue) => !currentValue)
                    setExpandedCollaboratorId(null)
                    setAreaFilter('all')
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f2ece0] px-5 text-sm font-extrabold text-[#5d5870] shadow-sm transition hover:bg-[#e9dfd0]"
                >
                  <AppIcon name={showHidden ? 'eye' : 'eyeOff'} />
                  {showHidden ? 'Ver visibles' : `Ocultos (${hiddenCollaboratorsCount})`}
                </button>
                <button
                  type="button"
                  onClick={handleNewCollaborator}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3A9AF2] px-5 text-sm font-extrabold text-[#FFFFFF] shadow-sm transition hover:bg-[#238BEA] focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <AppIcon name="plus" />
                  Nuevo colaborador
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
                <label className="relative block">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9b95ac]">
                    <AppIcon name="search" />
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre o numero..."
                    className="h-12 w-full rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] pl-11 pr-4 text-sm font-bold text-[#2a263a] outline-none transition placeholder:text-[#9b95ac] focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <select
                  value={areaFilter}
                  onChange={(event) => setAreaFilter(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#e8dfd0] bg-[#f2ece0] px-4 text-sm font-extrabold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">Todas las areas</option>
                  {areaOptions.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className="hidden min-h-[360px] overflow-hidden rounded-2xl bg-white shadow-sm lg:block">
                <table className="w-full table-fixed text-left">
                  <thead className="bg-[#eee7d9] text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300">
                    <tr>
                      <th className="w-20 px-5 py-3">Foto</th>
                      <th className="w-28 px-5 py-3">Num.</th>
                      <th className="px-5 py-3">Nombre completo</th>
                      <th className="px-5 py-3">Area</th>
                      <th className="px-5 py-3">Departamento</th>
                      <th className="px-5 py-3">Puesto</th>
                      <th className="w-28 px-5 py-3 text-center">Equipos</th>
                      <th className="w-40 px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1edf5] text-sm">
                    {filteredCollaborators.length > 0 ? (
                      filteredCollaborators.map((collaborator) => {
                        const isExpanded = expandedCollaboratorId === collaborator.id

                        return (
                          <Fragment key={collaborator.id}>
                            <tr className={`transition hover:bg-blue-50/40 ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                              <td className="px-5 py-4">
                                <Avatar collaborator={collaborator} />
                              </td>
                              <td className="px-5 py-4 font-bold text-[#8d88a2]">{collaborator.employeeNumber}</td>
                              <td className="px-5 py-4 font-extrabold text-[#201d31]">{collaborator.fullName}</td>
                              <td className="px-5 py-4 font-bold text-[#5d5870]">{collaborator.area}</td>
                              <td className="px-5 py-4 font-bold text-[#5d5870]">{collaborator.department}</td>
                              <td className="px-5 py-4 font-bold text-[#5d5870]">{collaborator.position}</td>
                              <td className="px-5 py-4 text-center">
                                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-blue-50 px-3 text-xs font-extrabold text-blue-500">
                                  {collaborator.equipmentCount || '0'}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDetails(collaborator.id)}
                                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                                      isExpanded
                                        ? 'bg-[#3A9AF2] text-[#FFFFFF]'
                                        : 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                                    }`}
                                    aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} informacion de ${collaborator.fullName}`}
                                    title="Informacion"
                                    aria-expanded={isExpanded}
                                  >
                                    <AppIcon name="info" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(collaborator)}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 transition hover:bg-blue-100"
                                    aria-label={`Editar ${collaborator.fullName}`}
                                    title="Editar"
                                  >
                                    <AppIcon name="edit" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleHidden(collaborator.id, !showHidden)}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2ece0] text-[#6f6a85] transition hover:bg-[#e9dfd0]"
                                    aria-label={`${showHidden ? 'Restaurar' : 'Ocultar'} ${collaborator.fullName}`}
                                    title={showHidden ? 'Restaurar' : 'Ocultar'}
                                  >
                                    <AppIcon name={showHidden ? 'eye' : 'eyeOff'} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="8" className="bg-[#fbfaf8] px-5 pb-5">
                                  <CollaboratorDetails collaborator={collaborator} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="8">
                          <EmptyState hasCollaborators={visibleCollaborators.length > 0} showHidden={showHidden} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="min-h-[320px] rounded-2xl bg-white p-3 shadow-sm lg:hidden">
                {filteredCollaborators.length > 0 ? (
                  <div className="space-y-3">
                    {filteredCollaborators.map((collaborator) => {
                      const isExpanded = expandedCollaboratorId === collaborator.id

                      return (
                        <article
                          key={collaborator.id}
                          className={`rounded-xl border p-4 transition ${
                            isExpanded
                              ? 'border-blue-200 bg-blue-50/40'
                              : 'border-[#f1edf5] bg-[#fbfaf8]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar collaborator={collaborator} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h2 className="truncate text-base font-extrabold text-[#201d31]">{collaborator.fullName}</h2>
                                  <p className="mt-1 truncate text-xs font-bold text-[#8d88a2]">{collaborator.employeeNumber}</p>
                                </div>
                                <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 px-3 text-xs font-extrabold text-blue-500">
                                  {collaborator.equipmentCount || '0'}
                                </span>
                              </div>

                              <div className="mt-4 space-y-2 text-xs font-bold text-[#6f6a85]">
                                <p className="truncate">{collaborator.area || 'Sin area'}</p>
                                <p className="truncate">{collaborator.department || 'Sin departamento'}</p>
                                <p className="truncate">{collaborator.position || 'Sin puesto'}</p>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4">
                              <CollaboratorDetails collaborator={collaborator} />
                            </div>
                          )}

                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleDetails(collaborator.id)}
                              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition ${
                                isExpanded
                                  ? 'bg-[#3A9AF2] text-[#FFFFFF]'
                                  : 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                              }`}
                              aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} informacion de ${collaborator.fullName}`}
                              aria-expanded={isExpanded}
                            >
                              <AppIcon name="info" />
                              Info
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(collaborator)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-50 text-xs font-extrabold text-blue-500 transition hover:bg-blue-100"
                            >
                              <AppIcon name="edit" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleHidden(collaborator.id, !showHidden)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f2ece0] text-xs font-extrabold text-[#6f6a85] transition hover:bg-[#e9dfd0]"
                            >
                              <AppIcon name={showHidden ? 'eye' : 'eyeOff'} />
                              {showHidden ? 'Restaurar' : 'Ocultar'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState hasCollaborators={visibleCollaborators.length > 0} showHidden={showHidden} />
                )}
              </div>
            </section>

            {showForm && (
              <section ref={formRef} className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                <div className="border-b border-[#f0edf6] pb-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300">
                    {isEditing ? 'Formulario - editar colaborador' : 'Formulario - nuevo colaborador'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                    <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-[#f0edf6] bg-[#fbfaf8] p-4 lg:w-56">
                      <Avatar collaborator={form} size="lg" />
                      <div className="grid w-full gap-2">
                        {canTakePhoto && (
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f2ece0] text-xs font-extrabold text-[#6f6a85] transition hover:bg-[#e9dfd0]"
                          >
                            <AppIcon name="camera" />
                            Tomar foto
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => uploadInputRef.current?.click()}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f2ece0] text-xs font-extrabold text-[#6f6a85] transition hover:bg-[#e9dfd0]"
                        >
                          <AppIcon name="image" />
                          Subir imagen
                        </button>
                      </div>
                      <p className="text-center text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#c7c1d6]">
                        JPG / PNG
                      </p>
                      {canTakePhoto && (
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      )}
                      <input
                        ref={uploadInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </div>

                    <div className="grid flex-1 gap-4 lg:grid-cols-2">
                      <Field
                        label="Num. de colaborador"
                        name="employeeNumber"
                        value={form.employeeNumber}
                        onChange={handleInputChange}
                        placeholder="EL-0001"
                        required
                      />
                      <Field
                        label="Nombre completo"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleInputChange}
                        placeholder="Nombre Apellido Apellido"
                        required
                      />
                      <Field
                        label="Área"
                        name="área"
                        value={form.area}
                        onChange={handleInputChange}
                        placeholder="Recepcion"
                        required
                      />
                      <Field
                        label="Departamento"
                        name="department"
                        value={form.department}
                        onChange={handleInputChange}
                        placeholder="Recursos Humanos"
                        required
                      />
                      <Field
                        label="Puesto"
                        name="position"
                        value={form.position}
                        onChange={handleInputChange}
                        placeholder="Recepcionista Senior"
                        required
                      />
                      <Field
                        label="Correo de contacto"
                        name="email"
                        value={form.email}
                        onChange={handleInputChange}
                        placeholder="colaborador@breathless.com"
                        type="email"
                        required
                      />
                      <Field
                        label="Telefono"
                        name="phone"
                        value={form.phone}
                        onChange={handleInputChange}
                        placeholder="Telefono de contacto"
                        type="tel"
                      />
                      <Field
                        label="Extension"
                        name="extension"
                        value={form.extension}
                        onChange={handleInputChange}
                        placeholder="Ext. 000"
                      />
                      <Field
                        label="Equipos asignados"
                        name="equipmentCount"
                        value={form.equipmentCount}
                        onChange={handleInputChange}
                        placeholder="0"
                        type="number"
                        min="0"
                      />

                      <label className="block">
                        <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Estado</span>
                        <select
                          name="status"
                          value={form.status}
                          onChange={handleInputChange}
                          className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        >
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block lg:col-span-2">
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
                      {isEditing ? 'Guardar cambios' : 'Guardar colaborador'}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
  )
}

export default Colaboradores