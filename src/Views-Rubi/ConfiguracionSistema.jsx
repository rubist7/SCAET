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
const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function FirmaPreview({ previewUrl, onFileChange }) {
  return (
    <section className="rounded-2xl border border-[#f1edf5] bg-[#fbf9f4] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#201d31]">Firma institucional</h3>
          <p className="mt-1 text-xs font-bold text-[#8d88a2]">Se utilizara en una fase posterior para documentos nuevos.</p>
        </div>
        <label
          htmlFor="firma-institucional"
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-xs font-extrabold text-blue-600 transition hover:bg-blue-50"
        >
          <AppIcon name="image" />
          Cambiar firma
        </label>
        <input
          id="firma-institucional"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onFileChange}
        />
      </div>
      <div className="mt-4 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d9d1c1] bg-white p-3">
        {previewUrl ? (
          <img src={previewUrl} alt="Firma institucional" className="h-full w-full object-contain" />
        ) : (
          <p className="text-center text-xs font-bold text-[#9b95ac]">Aun no se ha cargado una firma.</p>
        )}
      </div>
    </section>
  );
}

export default function ConfiguracionSistema() {
  const [formulario, setFormulario] = useState(configuracionVacia);
  const [configuracionCargada, setConfiguracionCargada] = useState(null);
  const [firmaSeleccionada, setFirmaSeleccionada] = useState(null);
  const [estado, setEstado] = useState({ tipo: "", texto: "" });
  const [errores, setErrores] = useState({});
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
  }, [firmaSeleccionada]);

  const manejarCambio = (event) => {
    const { name, value } = event.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
    setErrores((actual) => ({ ...actual, [name]: "" }));
    setEstado({ tipo: "", texto: "" });
  };

  const manejarFirma = (event) => {
    const archivo = event.target.files?.[0];
    const error = validarImagen(archivo);
    event.target.value = "";
    if (error) {
      setEstado({ tipo: "error", texto: error });
      return;
    }
    if (!archivo) return;

    const seleccion = { archivo, preview: URL.createObjectURL(archivo) };
    setFirmaSeleccionada(seleccion);
    setEstado({ tipo: "", texto: "" });
  };

  const subirFirma = async (seleccion) => {
    if (!seleccion) return null;
    const datos = new FormData();
    datos.append("firma", seleccion.archivo);
    return apiRequest("/configuracion-sistema/firma", { method: "POST", body: datos });
  };

  const guardarConfiguracion = async (event) => {
    event.preventDefault();
    const siguientesErrores = {
      nombre_empresa: formulario.nombre_empresa.trim() ? "" : "El nombre de la empresa es obligatorio.",
      nombre_responsable: formulario.nombre_responsable.trim() ? "" : "El nombre del responsable es obligatorio.",
      puesto_responsable: formulario.puesto_responsable.trim() ? "" : "El puesto es obligatorio.",
      correo_cc: formulario.correo_cc.trim() && !correoValido.test(formulario.correo_cc.trim())
        ? "Ingresa un correo de copia valido."
        : "",
    };
    setErrores(siguientesErrores);
    if (Object.values(siguientesErrores).some(Boolean)) return;

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
        data = await subirFirma(firmaGuardada);
        aplicarConfiguracion(data.configuracion);
        setFirmaSeleccionada(null);
      }

      setEstado({ tipo: "exito", texto: "Configuracion del sistema guardada correctamente." });
    } catch (error) {
      setEstado({ tipo: "error", texto: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const firmaUrl = firmaSeleccionada?.preview
    || crearUrlActualizada(configuracionCargada?.firma_url, configuracionCargada?.fecha_actualizacion);

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

      <form noValidate onSubmit={guardarConfiguracion} className="space-y-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
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
              aria-invalid={Boolean(errores.nombre_empresa)}
              className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            {errores.nombre_empresa && <p className="mt-1 text-xs font-bold text-rose-600">{errores.nombre_empresa}</p>}
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
                aria-invalid={Boolean(errores.nombre_responsable)}
                className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {errores.nombre_responsable && <p className="mt-1 text-xs font-bold text-rose-600">{errores.nombre_responsable}</p>}
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">Puesto o cargo</span>
              <input
                name="puesto_responsable"
                value={formulario.puesto_responsable}
                onChange={manejarCambio}
                maxLength={150}
                required
                aria-invalid={Boolean(errores.puesto_responsable)}
                className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {errores.puesto_responsable && <p className="mt-1 text-xs font-bold text-rose-600">{errores.puesto_responsable}</p>}
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="border-b border-[#f1edf5] pb-3">
            <h2 className="text-base font-extrabold text-[#201d31]">Firma institucional</h2>
            <p className="mt-1 text-xs font-bold text-[#8d88a2]">Formatos JPG, PNG o WEBP; maximo 5 MB.</p>
          </div>
          <FirmaPreview previewUrl={firmaUrl} onFileChange={manejarFirma} />
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
              aria-invalid={Boolean(errores.correo_cc)}
              className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            {errores.correo_cc && <p className="mt-1 text-xs font-bold text-rose-600">{errores.correo_cc}</p>}
          </label>
        </section>

        <div className="border-t border-[#f1edf5] pt-5">
          {estado.texto && (
            <p
              className={`mb-3 rounded-xl px-4 py-3 text-sm font-bold ${estado.tipo === "error" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}
              role="status"
            >
              {estado.texto}
            </p>
          )}
          <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#201d31] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#332d4b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AppIcon name="check" />
            {guardando ? "Guardando..." : "Guardar configuracion"}
          </button>
          </div>
        </div>
      </form>
    </div>
  );
}
