import { useEffect, useState } from "react";
import { AppIcon } from "../components/Sidebar";

const configuracionVacia = {
  nombre_empresa: "",
  nombre_responsable: "",
  puesto_responsable: "",
  correo_cc: "",
};

const tiposImagenPermitidos = new Set(["image/jpeg", "image/png", "image/webp"]);
const tamanoMaximoImagen = 5 * 1024 * 1024;

function crearUrlActualizada(url, fechaActualizacion) {
  if (!url) return null;
  return `${url}?v=${encodeURIComponent(fechaActualizacion || "actual")}`;
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("scaet-token");
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json();

  if (!response.ok) throw new Error(data.mensaje || "No se pudo completar la solicitud.");
  return data;
}

function validarImagen(archivo) {
  if (!archivo) return "";
  if (!tiposImagenPermitidos.has(archivo.type)) return "Solo se permiten imagenes JPG, PNG o WEBP.";
  if (archivo.size > tamanoMaximoImagen) return "La imagen no puede superar 5 MB.";
  return "";
}

function PreviewCard({ title, description, previewUrl, onFileChange, inputId }) {
  return (
    <section className="rounded-2xl border border-[#f1edf5] bg-[#fbf9f4] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#201d31]">{title}</h3>
          <p className="mt-1 text-xs font-bold text-[#8d88a2]">{description}</p>
        </div>
        <label
          htmlFor={inputId}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-xs font-extrabold text-blue-600 transition hover:bg-blue-50"
        >
          <AppIcon name="image" />
          Cambiar imagen
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onFileChange}
        />
      </div>
      <div className="mt-4 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d9d1c1] bg-white p-3">
        {previewUrl ? (
          <img src={previewUrl} alt={title} className="h-full w-full object-contain" />
        ) : (
          <p className="text-center text-xs font-bold text-[#9b95ac]">Aun no se ha cargado una imagen.</p>
        )}
      </div>
    </section>
  );
}

export default function ConfiguracionSistema() {
  const [formulario, setFormulario] = useState(configuracionVacia);
  const [configuracionCargada, setConfiguracionCargada] = useState(null);
  const [firmaSeleccionada, setFirmaSeleccionada] = useState(null);
  const [logoSeleccionado, setLogoSeleccionado] = useState(null);
  const [estado, setEstado] = useState({ tipo: "", texto: "" });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const aplicarConfiguracion = (configuracion) => {
    const siguienteFormulario = configuracion
      ? {
        nombre_empresa: configuracion.nombre_empresa || "",
        nombre_responsable: configuracion.nombre_responsable || "",
        puesto_responsable: configuracion.puesto_responsable || "",
        correo_cc: configuracion.correo_cc || "",
      }
      : configuracionVacia;
    setFormulario(siguienteFormulario);
    setConfiguracionCargada(configuracion);
  };

  useEffect(() => {
    let ignorar = false;

    apiRequest("/configuracion-sistema")
      .then((data) => {
        if (!ignorar) aplicarConfiguracion(data.configuracion);
      })
      .catch((error) => {
        if (!ignorar) setEstado({ tipo: "error", texto: error.message });
      })
      .finally(() => {
        if (!ignorar) setCargando(false);
      });

    return () => {
      ignorar = true;
    };
  }, []);

  useEffect(() => () => {
    if (firmaSeleccionada?.preview) URL.revokeObjectURL(firmaSeleccionada.preview);
    if (logoSeleccionado?.preview) URL.revokeObjectURL(logoSeleccionado.preview);
  }, [firmaSeleccionada, logoSeleccionado]);

  const manejarCambio = (event) => {
    const { name, value } = event.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
    setEstado({ tipo: "", texto: "" });
  };

  const manejarImagen = (tipo) => (event) => {
    const archivo = event.target.files?.[0];
    const error = validarImagen(archivo);
    event.target.value = "";
    if (error) {
      setEstado({ tipo: "error", texto: error });
      return;
    }
    if (!archivo) return;

    const seleccion = { archivo, preview: URL.createObjectURL(archivo) };
    if (tipo === "firma") setFirmaSeleccionada(seleccion);
    else setLogoSeleccionado(seleccion);
    setEstado({ tipo: "", texto: "" });
  };

  const subirImagen = async (tipo, seleccion) => {
    if (!seleccion) return null;
    const datos = new FormData();
    datos.append("imagen", seleccion.archivo);
    return apiRequest(`/configuracion-sistema/${tipo}`, { method: "POST", body: datos });
  };

  const guardarConfiguracion = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setEstado({ tipo: "", texto: "" });

    try {
      let data = await apiRequest("/configuracion-sistema", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formulario),
      });
      aplicarConfiguracion(data.configuracion);

      const firmaGuardada = firmaSeleccionada;
      if (firmaGuardada) {
        data = await subirImagen("firma", firmaGuardada);
        aplicarConfiguracion(data.configuracion);
        setFirmaSeleccionada(null);
      }

      const logoGuardado = logoSeleccionado;
      if (logoGuardado) {
        data = await subirImagen("logo", logoGuardado);
        aplicarConfiguracion(data.configuracion);
        setLogoSeleccionado(null);
      }

      setEstado({ tipo: "exito", texto: "Configuracion del sistema guardada correctamente." });
    } catch (error) {
      setEstado({ tipo: "error", texto: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const restaurarValores = () => {
    aplicarConfiguracion(configuracionCargada);
    setFirmaSeleccionada(null);
    setLogoSeleccionado(null);
    setEstado({ tipo: "", texto: "" });
  };

  const firmaUrl = firmaSeleccionada?.preview
    || crearUrlActualizada(configuracionCargada?.firma_url, configuracionCargada?.fecha_actualizacion);
  const logoUrl = logoSeleccionado?.preview
    || crearUrlActualizada(configuracionCargada?.logo_url, configuracionCargada?.fecha_actualizacion);

  if (cargando) {
    return <p className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#6f6584]">Cargando configuracion del sistema...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-blue-300">Sistema</p>
        <h1 className="mt-3 text-2xl font-extrabold text-[#201d31] sm:text-3xl">Configuracion del sistema</h1>
        <p className="mt-2 text-sm font-bold text-[#8d88a2]">
          Los cambios realizados aqui se aplicaran unicamente a los documentos generados posteriormente.
        </p>
      </section>

      {estado.texto && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-bold ${estado.tipo === "error" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}
          role="status"
        >
          {estado.texto}
        </p>
      )}

      <form onSubmit={guardarConfiguracion} className="space-y-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <section className="space-y-4">
          <div className="border-b border-[#f1edf5] pb-3">
            <h2 className="text-base font-extrabold text-[#201d31]">Empresa</h2>
          </div>
          <label className="block">
            <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Nombre de la empresa</span>
            <input
              name="nombre_empresa"
              value={formulario.nombre_empresa}
              onChange={manejarCambio}
              maxLength={150}
              required
              className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </section>

        <section className="space-y-4">
          <div className="border-b border-[#f1edf5] pb-3">
            <h2 className="text-base font-extrabold text-[#201d31]">Responsable</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Nombre del responsable</span>
              <input
                name="nombre_responsable"
                value={formulario.nombre_responsable}
                onChange={manejarCambio}
                maxLength={150}
                required
                className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Puesto o cargo</span>
              <input
                name="puesto_responsable"
                value={formulario.puesto_responsable}
                onChange={manejarCambio}
                maxLength={150}
                required
                className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="border-b border-[#f1edf5] pb-3">
            <h2 className="text-base font-extrabold text-[#201d31]">Imagenes institucionales</h2>
            <p className="mt-1 text-xs font-bold text-[#8d88a2]">Formatos JPG, PNG o WEBP; maximo 5 MB.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PreviewCard
              title="Firma institucional"
              description="Se utilizara en una fase posterior para documentos nuevos."
              previewUrl={firmaUrl}
              onFileChange={manejarImagen("firma")}
              inputId="firma-institucional"
            />
            <PreviewCard
              title="Logo de la empresa"
              description="Queda preparado para futuras mejoras de documentos."
              previewUrl={logoUrl}
              onFileChange={manejarImagen("logo")}
              inputId="logo-empresa"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="border-b border-[#f1edf5] pb-3">
            <h2 className="text-base font-extrabold text-[#201d31]">Correo</h2>
          </div>
          <label className="block">
            <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Correo de copia (CC)</span>
            <input
              name="correo_cc"
              type="email"
              value={formulario.correo_cc}
              onChange={manejarCambio}
              maxLength={254}
              required
              className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-[#f1edf5] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={restaurarValores}
            disabled={guardando}
            className="h-11 rounded-xl border border-[#e2d9c9] bg-white px-5 text-sm font-extrabold text-[#5d5870] transition hover:bg-[#f7f4ec] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Restaurar valores
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#201d31] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#332d4b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AppIcon name="check" />
            {guardando ? "Guardando..." : "Guardar configuracion"}
          </button>
        </div>
      </form>
    </div>
  );
}
