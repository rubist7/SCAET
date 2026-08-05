const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");

const CONFIGURACION_ID = 1;
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CARPETA_CONFIGURACION = path.join(__dirname, "../../uploads/configuracion");

const imagenes = {
  firma: {
    campo: "firma_key",
    key: "firma-responsable.webp",
    etiqueta: "firma institucional",
  },
  logo: {
    campo: "logo_key",
    key: "logo-empresa.webp",
    etiqueta: "logo de la empresa",
  },
};

function normalizarTexto(valor, maximo) {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  return texto && texto.length <= maximo ? texto : null;
}

function normalizarCorreo(valor) {
  const correo = normalizarTexto(valor, 254);
  return correo && CORREO_VALIDO.test(correo) ? correo.toLowerCase() : null;
}

function serializarConfiguracion(configuracion) {
  if (!configuracion) return null;

  return {
    id_configuracion: configuracion.id_configuracion,
    nombre_empresa: configuracion.nombre_empresa,
    nombre_responsable: configuracion.nombre_responsable,
    puesto_responsable: configuracion.puesto_responsable,
    correo_cc: configuracion.correo_cc,
    firma_url: configuracion.firma_key ? "/uploads/configuracion/firma-responsable.webp" : null,
    logo_url: configuracion.logo_key ? "/uploads/configuracion/logo-empresa.webp" : null,
    fecha_actualizacion: configuracion.fecha_actualizacion,
  };
}

async function obtenerConfiguracion(pool) {
  const [filas] = await pool.query(
    `SELECT id_configuracion, nombre_empresa, nombre_responsable, puesto_responsable,
            firma_key, logo_key, correo_cc, fecha_actualizacion
       FROM configuracion_sistema
      WHERE id_configuracion = ?
      LIMIT 1`,
    [CONFIGURACION_ID]
  );
  return filas[0] || null;
}

function crearSubidaImagen() {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 },
    fileFilter: (_req, archivo, callback) => {
      if (!TIPOS_PERMITIDOS.has(archivo.mimetype)) {
        const error = new Error("Solo se permiten imagenes JPG, JPEG, PNG o WEBP");
        error.code = "TIPO_IMAGEN_NO_PERMITIDO";
        return callback(error);
      }
      return callback(null, true);
    },
  });

  return (req, res, next) => {
    upload.single("imagen")(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ mensaje: "La imagen no puede superar 5 MB" });
      }
      if (error.code === "TIPO_IMAGEN_NO_PERMITIDO") {
        return res.status(400).json({ mensaje: error.message });
      }
      return next(error);
    });
  };
}

async function reemplazarImagen({ archivo, imagen }) {
  await fs.mkdir(CARPETA_CONFIGURACION, { recursive: true });

  const rutaFinal = path.join(CARPETA_CONFIGURACION, imagen.key);
  const sufijoTemporal = crypto.randomUUID();
  const rutaTemporal = path.join(CARPETA_CONFIGURACION, `.${imagen.key}.${sufijoTemporal}.tmp.webp`);
  const rutaRespaldo = path.join(CARPETA_CONFIGURACION, `.${imagen.key}.${sufijoTemporal}.previous.webp`);
  let respaldoCreado = false;

  try {
    await sharp(archivo.buffer, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(rutaTemporal);

    try {
      await fs.rename(rutaFinal, rutaRespaldo);
      respaldoCreado = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    try {
      await fs.rename(rutaTemporal, rutaFinal);
    } catch (error) {
      if (respaldoCreado) await fs.rename(rutaRespaldo, rutaFinal).catch(() => {});
      throw error;
    }

    return {
      rutaFinal,
      rutaRespaldo: respaldoCreado ? rutaRespaldo : null,
    };
  } catch (error) {
    await fs.rm(rutaTemporal, { force: true }).catch(() => {});
    throw error;
  }
}

function crearRouterConfiguracionSistema({ pool, verificarToken, autorizarRoles, registrarLogActividad }) {
  const router = express.Router();
  const soloAdmin = [verificarToken, autorizarRoles("admin")];
  const procesarImagen = crearSubidaImagen();

  router.get("/", ...soloAdmin, async (_req, res) => {
    try {
      const configuracion = await obtenerConfiguracion(pool);
      return res.json({
        configurada: Boolean(configuracion),
        configuracion: serializarConfiguracion(configuracion),
      });
    } catch (error) {
      console.error("Error al consultar configuracion del sistema:", error);
      return res.status(500).json({ mensaje: "No se pudo consultar la configuracion del sistema" });
    }
  });

  router.put("/", ...soloAdmin, async (req, res) => {
    const nombreEmpresa = normalizarTexto(req.body.nombre_empresa, 150);
    const nombreResponsable = normalizarTexto(req.body.nombre_responsable, 150);
    const puestoResponsable = normalizarTexto(req.body.puesto_responsable, 150);
    const correoCc = normalizarCorreo(req.body.correo_cc);

    if (!nombreEmpresa || !nombreResponsable || !puestoResponsable || !correoCc) {
      return res.status(400).json({
        mensaje: "Nombre de empresa, responsable, puesto y correo de copia validos son obligatorios",
      });
    }

    try {
      const anterior = await obtenerConfiguracion(pool);
      await pool.query(
        `INSERT INTO configuracion_sistema
          (id_configuracion, nombre_empresa, nombre_responsable, puesto_responsable, correo_cc)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          nombre_empresa = VALUES(nombre_empresa),
          nombre_responsable = VALUES(nombre_responsable),
          puesto_responsable = VALUES(puesto_responsable),
          correo_cc = VALUES(correo_cc)`,
        [CONFIGURACION_ID, nombreEmpresa, nombreResponsable, puestoResponsable, correoCc]
      );

      const configuracion = await obtenerConfiguracion(pool);
      const camposModificados = [
        ["nombre_empresa", nombreEmpresa],
        ["nombre_responsable", nombreResponsable],
        ["puesto_responsable", puestoResponsable],
        ["correo_cc", correoCc],
      ]
        .filter(([campo, valor]) => !anterior || anterior[campo] !== valor)
        .map(([campo]) => campo);

      void registrarLogActividad({
        usuario: req.usuario,
        accion: "Edicion",
        modulo: "Configuracion del sistema",
        entidad: "configuracion_sistema",
        idEntidad: CONFIGURACION_ID,
        descripcion: anterior ? "Configuracion del sistema actualizada" : "Configuracion del sistema creada",
        req,
        detalles: { campos_modificados: camposModificados },
      });

      return res.json({
        mensaje: "Configuracion del sistema guardada correctamente",
        configuracion: serializarConfiguracion(configuracion),
      });
    } catch (error) {
      console.error("Error al guardar configuracion del sistema:", error);
      return res.status(500).json({ mensaje: "No se pudo guardar la configuracion del sistema" });
    }
  });

  for (const [tipo, imagen] of Object.entries(imagenes)) {
    router.post(`/${tipo}`, ...soloAdmin, procesarImagen, async (req, res) => {
      if (!req.file) return res.status(400).json({ mensaje: "Debes seleccionar una imagen" });

      let resultadoArchivo;
      try {
        const configuracion = await obtenerConfiguracion(pool);
        if (!configuracion) {
          return res.status(409).json({ mensaje: "Guarda primero los datos de configuracion" });
        }

        resultadoArchivo = await reemplazarImagen({ archivo: req.file, imagen });
        try {
          await pool.query(
            `UPDATE configuracion_sistema
                SET ${imagen.campo} = ?, fecha_actualizacion = NOW()
              WHERE id_configuracion = ?`,
            [imagen.key, CONFIGURACION_ID]
          );
        } catch (errorBaseDatos) {
          await fs.rm(resultadoArchivo.rutaFinal, { force: true }).catch(() => {});
          if (resultadoArchivo.rutaRespaldo) {
            await fs.rename(resultadoArchivo.rutaRespaldo, resultadoArchivo.rutaFinal).catch(() => {});
          }
          throw errorBaseDatos;
        }

        if (resultadoArchivo.rutaRespaldo) {
          await fs.rm(resultadoArchivo.rutaRespaldo, { force: true }).catch(() => {});
        }

        const actualizada = await obtenerConfiguracion(pool);
        void registrarLogActividad({
          usuario: req.usuario,
          accion: "Edicion",
          modulo: "Configuracion del sistema",
          entidad: "configuracion_sistema",
          idEntidad: CONFIGURACION_ID,
          descripcion: `${imagen.etiqueta} actualizada`,
          req,
          detalles: { campos_modificados: [imagen.campo] },
        });

        return res.json({
          mensaje: `${imagen.etiqueta.charAt(0).toUpperCase()}${imagen.etiqueta.slice(1)} actualizada correctamente`,
          configuracion: serializarConfiguracion(actualizada),
        });
      } catch (error) {
        if (resultadoArchivo?.rutaRespaldo) {
          await fs.rm(resultadoArchivo.rutaRespaldo, { force: true }).catch(() => {});
        }
        if (error.name === "Error" && /Input buffer contains unsupported image format|Input file contains unsupported image format/i.test(error.message)) {
          return res.status(400).json({ mensaje: "El archivo seleccionado no contiene una imagen valida" });
        }
        console.error(`Error al actualizar ${imagen.etiqueta}:`, error);
        return res.status(500).json({ mensaje: `No se pudo guardar ${imagen.etiqueta}` });
      }
    });

  }

  return router;
}

module.exports = crearRouterConfiguracionSistema;
