const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");

const CONFIGURACION_ID = 1;
const FIRMA_KEY = "firma-responsable.webp";
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CARPETA_CONFIGURACION = path.join(__dirname, "../../uploads/configuracion");
const CONFIGURACION_PREDETERMINADA = {
  nombre_empresa: "Puente Calinda",
  nombre_responsable: "Javier Echeverria",
  puesto_responsable: "Gerente de IT",
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

function normalizarCorreoOpcional(valor) {
  if (valor === null || valor === undefined || (typeof valor === "string" && !valor.trim())) return "";
  return normalizarCorreo(valor);
}

function serializarConfiguracion(configuracion) {
  const datos = configuracion || {
    id_configuracion: CONFIGURACION_ID,
    nombre_empresa: "",
    nombre_responsable: "",
    puesto_responsable: "",
    correo_cc: "",
    firma_key: null,
    fecha_actualizacion: null,
  };

  return {
    id_configuracion: datos.id_configuracion,
    nombre_empresa: datos.nombre_empresa,
    nombre_responsable: datos.nombre_responsable,
    puesto_responsable: datos.puesto_responsable,
    correo_cc: datos.correo_cc,
    firma_key: datos.firma_key,
    firma_url: datos.firma_key ? "/uploads/configuracion/firma-responsable.webp" : null,
    fecha_actualizacion: datos.fecha_actualizacion,
  };
}

async function obtenerConfiguracion(pool) {
  const [filas] = await pool.query(
    `SELECT id_configuracion, nombre_empresa, nombre_responsable, puesto_responsable,
            firma_key, correo_cc, fecha_actualizacion
       FROM configuracion_sistema
      WHERE id_configuracion = ?
      LIMIT 1`,
    [CONFIGURACION_ID]
  );
  return filas[0] || null;
}

function procesarFirma(req, res, next) {
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

  upload.single("firma")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ mensaje: "La firma no puede superar 5 MB" });
    }
    if (error.code === "TIPO_IMAGEN_NO_PERMITIDO") {
      return res.status(400).json({ mensaje: error.message });
    }
    return next(error);
  });
}

async function prepararReemplazoFirma(archivo) {
  await fs.mkdir(CARPETA_CONFIGURACION, { recursive: true });

  const sufijoTemporal = crypto.randomUUID();
  const rutaFinal = path.join(CARPETA_CONFIGURACION, FIRMA_KEY);
  const rutaTemporal = path.join(CARPETA_CONFIGURACION, `.${FIRMA_KEY}.${sufijoTemporal}.tmp.webp`);
  const rutaRespaldo = path.join(CARPETA_CONFIGURACION, `.${FIRMA_KEY}.${sufijoTemporal}.previous.webp`);
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

    return { rutaFinal, rutaRespaldo: respaldoCreado ? rutaRespaldo : null };
  } catch (error) {
    await fs.rm(rutaTemporal, { force: true }).catch(() => {});
    throw error;
  }
}

async function retirarFirmaPersonalizada() {
  const rutaFinal = path.join(CARPETA_CONFIGURACION, FIRMA_KEY);
  const rutaRespaldo = path.join(CARPETA_CONFIGURACION, `.${FIRMA_KEY}.${crypto.randomUUID()}.restore.webp`);

  try {
    await fs.rename(rutaFinal, rutaRespaldo);
    return { rutaFinal, rutaRespaldo };
  } catch (error) {
    if (error.code === "ENOENT") return { rutaFinal, rutaRespaldo: null };
    throw error;
  }
}

function crearRouterConfiguracionSistema({ pool, verificarToken, autorizarRoles, registrarLogActividad }) {
  const router = express.Router();
  const soloAdmin = [verificarToken, autorizarRoles("admin")];

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
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const nombreEmpresa = normalizarTexto(body.nombre_empresa, 150);
    const nombreResponsable = normalizarTexto(body.nombre_responsable, 150);
    const puestoResponsable = normalizarTexto(body.puesto_responsable, 150);

    if (!nombreEmpresa || !nombreResponsable || !puestoResponsable) {
      return res.status(400).json({
        mensaje: "Nombre de empresa, responsable y puesto son obligatorios",
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
          puesto_responsable = VALUES(puesto_responsable)`,
        [CONFIGURACION_ID, nombreEmpresa, nombreResponsable, puestoResponsable, ""]
      );

      const configuracion = await obtenerConfiguracion(pool);
      const camposModificados = [
        ["nombre_empresa", nombreEmpresa],
        ["nombre_responsable", nombreResponsable],
        ["puesto_responsable", puestoResponsable],
      ]
        .filter(([campo, valor]) => !anterior || anterior[campo] !== valor)
        .map(([campo]) => campo);

      void registrarLogActividad({
        usuario: req.usuario,
        accion: "Edicion",
        modulo: "Configuracion del sistema",
        entidad: "configuracion_sistema",
        idEntidad: CONFIGURACION_ID,
        descripcion: anterior ? "Configuracion institucional actualizada" : "Configuracion institucional creada",
        req,
        detalles: { campos_modificados: camposModificados },
      });

      return res.json({
        mensaje: "Configuracion institucional guardada correctamente",
        configuracion: serializarConfiguracion(configuracion),
      });
    } catch (error) {
      console.error("Error al guardar configuracion institucional:", error);
      return res.status(500).json({ mensaje: "No se pudo guardar la configuracion institucional" });
    }
  });

  router.put("/correo", ...soloAdmin, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const correoCc = normalizarCorreoOpcional(body.correo_cc);

    if (correoCc === null) {
      return res.status(400).json({ mensaje: "El correo de copia debe ser valido si se proporciona" });
    }

    try {
      const anterior = await obtenerConfiguracion(pool);
      await pool.query(
        `INSERT INTO configuracion_sistema
          (id_configuracion, nombre_empresa, nombre_responsable, puesto_responsable, correo_cc)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE correo_cc = VALUES(correo_cc)`,
        [
          CONFIGURACION_ID,
          CONFIGURACION_PREDETERMINADA.nombre_empresa,
          CONFIGURACION_PREDETERMINADA.nombre_responsable,
          CONFIGURACION_PREDETERMINADA.puesto_responsable,
          correoCc,
        ]
      );

      const configuracion = await obtenerConfiguracion(pool);
      void registrarLogActividad({
        usuario: req.usuario,
        accion: "Edicion",
        modulo: "Configuracion del sistema",
        entidad: "configuracion_sistema",
        idEntidad: CONFIGURACION_ID,
        descripcion: anterior ? "Correo de copia actualizado" : "Configuracion de correo creada",
        req,
        detalles: { campos_modificados: ["correo_cc"] },
      });

      return res.json({
        mensaje: "Configuracion de correo guardada correctamente",
        configuracion: serializarConfiguracion(configuracion),
      });
    } catch (error) {
      console.error("Error al guardar configuracion de correo:", error);
      return res.status(500).json({ mensaje: "No se pudo guardar la configuracion de correo" });
    }
  });

  router.post("/restaurar-predeterminada", ...soloAdmin, async (req, res) => {
    let firmaRetirada;

    try {
      firmaRetirada = await retirarFirmaPersonalizada();
      await pool.query(
        `INSERT INTO configuracion_sistema
          (id_configuracion, nombre_empresa, nombre_responsable, puesto_responsable, correo_cc, firma_key)
         VALUES (?, ?, ?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE
          nombre_empresa = VALUES(nombre_empresa),
          nombre_responsable = VALUES(nombre_responsable),
          puesto_responsable = VALUES(puesto_responsable),
          firma_key = NULL`,
        [
          CONFIGURACION_ID,
          CONFIGURACION_PREDETERMINADA.nombre_empresa,
          CONFIGURACION_PREDETERMINADA.nombre_responsable,
          CONFIGURACION_PREDETERMINADA.puesto_responsable,
          "",
        ]
      );

      if (firmaRetirada.rutaRespaldo) {
        await fs.rm(firmaRetirada.rutaRespaldo, { force: true }).catch(() => {});
      }

      const configuracion = await obtenerConfiguracion(pool);
      void registrarLogActividad({
        usuario: req.usuario,
        accion: "Restauracion",
        modulo: "Configuracion del sistema",
        entidad: "configuracion_sistema",
        idEntidad: CONFIGURACION_ID,
        descripcion: "Configuracion institucional restaurada a valores predeterminados",
        req,
        detalles: { campos_modificados: ["nombre_empresa", "nombre_responsable", "puesto_responsable", "firma_key"] },
      });

      return res.json({
        mensaje: "Configuracion institucional restaurada a valores predeterminados",
        configuracion: serializarConfiguracion(configuracion),
      });
    } catch (error) {
      if (firmaRetirada?.rutaRespaldo) {
        await fs.rename(firmaRetirada.rutaRespaldo, firmaRetirada.rutaFinal).catch(() => {});
      }
      console.error("Error al restaurar configuracion institucional:", error);
      return res.status(500).json({ mensaje: "No se pudo restaurar la configuracion institucional" });
    }
  });

  router.post("/firma", ...soloAdmin, procesarFirma, async (req, res) => {
    if (!req.file) return res.status(400).json({ mensaje: "Debes seleccionar una firma" });

    let resultadoArchivo;
    try {
      const configuracion = await obtenerConfiguracion(pool);
      if (!configuracion) {
        return res.status(409).json({ mensaje: "Guarda primero los datos de configuracion" });
      }

      resultadoArchivo = await prepararReemplazoFirma(req.file);
      try {
        await pool.query(
          `UPDATE configuracion_sistema
              SET firma_key = ?, fecha_actualizacion = NOW()
            WHERE id_configuracion = ?`,
          [FIRMA_KEY, CONFIGURACION_ID]
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
        descripcion: "Firma institucional actualizada",
        req,
        detalles: { campos_modificados: ["firma_key"] },
      });

      return res.json({
        mensaje: "Firma institucional actualizada correctamente",
        configuracion: serializarConfiguracion(actualizada),
      });
    } catch (error) {
      if (resultadoArchivo?.rutaRespaldo) {
        await fs.rm(resultadoArchivo.rutaRespaldo, { force: true }).catch(() => {});
      }
      if (error.name === "Error" && /Input buffer contains unsupported image format|Input file contains unsupported image format/i.test(error.message)) {
        return res.status(400).json({ mensaje: "El archivo seleccionado no contiene una imagen valida" });
      }
      console.error("Error al actualizar firma institucional:", error);
      return res.status(500).json({ mensaje: "No se pudo guardar la firma institucional" });
    }
  });

  return router;
}

module.exports = crearRouterConfiguracionSistema;
