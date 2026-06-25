import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppIcon } from '../components/Sidebar'
import {
  calculateWarrantyEnd,
  createEquipmentId,
  createPublicId,
  createQrCode,
  createQrValue,
  getEquipmentById,
  loadEquipments,
  saveEquipments,
  typeOptions,
} from './equiposData'
import { EquipmentShell, Field, QrCode } from './equiposShared'

const emptyForm = {
  provider: '',
  type: 'Laptop',
  brand: '',
  model: '',
  serialNumber: '',
  purchaseDate: '',
  company: '',
  sellerName: '',
  warrantyMonths: '',
  warrantyEnd: '',
  specifications: '',
  photoUrl: '',
  photoName: '',
}

function EquipoAlta() {
  const navigate = useNavigate()
  const { equipmentId } = useParams()
  const editingEquipment = useMemo(() => (
    equipmentId ? getEquipmentById(equipmentId) : null
  ), [equipmentId])
  const [form, setForm] = useState(() => (
    editingEquipment
      ? {
          provider: editingEquipment.provider,
          type: editingEquipment.type,
          brand: editingEquipment.brand,
          model: editingEquipment.model,
          serialNumber: editingEquipment.serialNumber,
          purchaseDate: editingEquipment.purchaseDate,
          company: editingEquipment.company,
          sellerName: editingEquipment.sellerName,
          warrantyMonths: editingEquipment.warrantyMonths,
          warrantyEnd: editingEquipment.warrantyEnd,
          specifications: editingEquipment.specs,
          photoUrl: editingEquipment.photoUrl || '',
          photoName: editingEquipment.photoName || '',
        }
      : emptyForm
  ))
  const cameraInputRef = useRef(null)
  const uploadInputRef = useRef(null)

  const canTakePhoto = useMemo(() => {
    const navigatorInfo = globalThis.navigator
    const userAgent = navigatorInfo?.userAgent ?? ''
    const platform = navigatorInfo?.platform ?? ''
    const hasTouchScreen = (navigatorInfo?.maxTouchPoints ?? 0) > 1
    const userAgentMobile = Boolean(navigatorInfo?.userAgentData?.mobile)

    return (
      userAgentMobile
      || /Android|iPhone|iPad|iPod/i.test(userAgent)
      || (platform === 'MacIntel' && hasTouchScreen)
    )
  }, [])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    const nextForm = { ...form, [name]: value }

    if (name === 'purchaseDate' || name === 'warrantyMonths') {
      nextForm.warrantyEnd = calculateWarrantyEnd(nextForm.purchaseDate, nextForm.warrantyMonths)
    }

    setForm(nextForm)
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setForm((currentForm) => ({
        ...currentForm,
        photoUrl: reader.result,
        photoName: file.name,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const equipments = loadEquipments()
    const publicId = editingEquipment?.publicId ?? createPublicId(equipments)
    const equipmentId = editingEquipment?.id ?? createEquipmentId()
    const nextEquipment = {
      id: equipmentId,
      publicId,
      type: form.type,
      brand: form.brand.trim(),
      model: form.model.trim(),
      title: `${form.brand.trim()} ${form.model.trim()}`.trim(),
      serialNumber: form.serialNumber.trim(),
      provider: form.provider.trim(),
      company: form.company.trim(),
      sellerName: form.sellerName.trim(),
      purchaseDate: form.purchaseDate,
      warrantyEnd: form.warrantyEnd,
      warrantyMonths: form.warrantyMonths,
      area: editingEquipment?.area ?? '-',
      status: editingEquipment?.status ?? 'Disponible',
      specs: form.specifications.trim(),
      assignmentName: editingEquipment?.assignmentName ?? '-',
      assignmentType: editingEquipment?.assignmentType ?? '-',
      assignmentDate: editingEquipment?.assignmentDate ?? '-',
      photoKind: form.type.toLowerCase(),
      photoUrl: form.photoUrl,
      photoName: form.photoName,
    }
    nextEquipment.qrCode = createQrCode(nextEquipment)
    nextEquipment.qrValue = createQrValue(equipmentId)

    const nextEquipments = editingEquipment
      ? equipments.map((equipment) => (equipment.id === editingEquipment.id ? nextEquipment : equipment))
      : [nextEquipment, ...equipments]

    saveEquipments(nextEquipments)
    navigate('/equipos')
  }

  return (
    <EquipmentShell>
      <div className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        <section>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-violet-300">Equipos - Dar de alta</p>
          <h1 className="mt-3 text-2xl font-extrabold text-[#201d31] sm:text-3xl">
            {editingEquipment ? 'Editar equipo' : 'Alta de equipo'}
          </h1>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="border-b border-violet-500 pb-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-violet-300">
              Información del equipo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Proveedor" name="provider" value={form.provider} onChange={handleInputChange} placeholder="Ej. Dell" required />

              <label className="block">
                <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Tipo de Equipo</span>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleInputChange}
                  className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                >
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <Field label="Marca" name="brand" value={form.brand} onChange={handleInputChange} placeholder="Dell, HP, Lenovo, Samsung..." required />
              <Field label="Modelo" name="model" value={form.model} onChange={handleInputChange} placeholder="Ej. XPS 15 9500" required />
              <Field label="Num. de serie" name="serialNumber" value={form.serialNumber} onChange={handleInputChange} placeholder="SN-XXXXXXXX" required />
              <Field label="Fecha de compra" name="purchaseDate" value={form.purchaseDate} onChange={handleInputChange} type="date" />
              <Field label="Empresa" name="company" value={form.company} onChange={handleInputChange} placeholder="Ej. Tech's solution" required />
              <Field label="Nombre del vendedor" name="sellerName" value={form.sellerName} onChange={handleInputChange} placeholder="Ej. Carlos Reyes" />
              <Field label="Garantia (meses)" name="warrantyMonths" value={form.warrantyMonths} onChange={handleInputChange} placeholder="Ej. 12" type="number" min="0" />
              <Field label="Vence garantia" name="warrantyEnd" value={form.warrantyEnd} onChange={handleInputChange} placeholder="Se calcula automaticamente" readOnly />

              <label className="block lg:col-span-2">
                <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Especificaciones Tecnicas</span>
                <textarea
                  name="specifications"
                  value={form.specifications}
                  onChange={handleInputChange}
                  placeholder="Ej. Intel Core i7, 16GB RAM, 512GB SSD, Windows 11..."
                  rows="4"
                  className="min-h-28 w-full resize-y rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 py-3 text-sm font-bold text-[#2a263a] outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </label>
            </div>

            <div className="space-y-3">
              <p className="border-b border-[#f0edf6] pb-3 text-[10px] font-extrabold uppercase tracking-[0.28em] text-violet-300">
                Fotografia del Equipo
              </p>
              <div className={`grid gap-3 ${canTakePhoto ? 'sm:grid-cols-[160px_1fr]' : ''}`}>
                {canTakePhoto && (
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-[#d9cfbf] bg-[#f2ece0] text-[#201d31] transition hover:bg-[#e9dfd0]"
                    aria-label="Tomar foto"
                  >
                    <span className="flex h-14 w-16 items-center justify-center rounded-xl bg-[#e7dcc9]">
                      <AppIcon name="camera" />
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex min-h-24 items-center justify-center gap-4 rounded-2xl border border-dashed border-[#d9cfbf] bg-[#f2ece0] px-5 text-left transition hover:bg-[#e9dfd0]"
                >
                  <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-[#e7dcc9] text-[#201d31]">
                    <AppIcon name="image" />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-[#5d5870]">
                      {form.photoName || 'Haz clic para seleccionar una imagen desde tus archivos'}
                    </span>
                    <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#c7c1d6]">
                      JPG o PNG
                    </span>
                  </span>
                </button>
              </div>

              {canTakePhoto && (
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
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

            <div className="space-y-3">
              <p className="border-b border-[#f0edf6] pb-3 text-[10px] font-extrabold uppercase tracking-[0.28em] text-violet-300">
                Código QR
              </p>
              <div className="rounded-2xl bg-[#f2ece0] p-4">
                <div className="flex items-center gap-3">
                  <QrCode />
                  <div>
                    <p className="text-sm font-extrabold text-[#201d31]">Código QR</p>
                    <p className="mt-1 text-xs font-bold text-[#8d88a2]">Se genera automaticamente al guardar</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                to="/equipos"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f2ece0] px-8 text-sm font-extrabold text-[#6f6a85] transition hover:bg-[#e9dfd0]"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="h-11 rounded-xl bg-violet-500 px-8 text-sm font-extrabold text-white transition hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-200"
              >
                Guardar equipo y generar código QR
              </button>
            </div>
          </form>
        </section>
      </div>
    </EquipmentShell>
  )
}

export default EquipoAlta
