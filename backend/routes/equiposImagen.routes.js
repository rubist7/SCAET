const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const CARPETA_EQUIPOS = path.join(__dirname, "../../uploads/equipos");

function obtenerIdEquipo(valor) {
  return /^\d+$/.test(String(valor)) && Number(valor) > 0 ? Number(valor) : null;
}

function crearFotoKey(codigoEquipo) {
  const codigoSeguro = String(codigoEquipo ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return codigoSeguro ? `${codigoSeguro}.webp` : null;
}

function esFotoKeySeguro(fotoKey) {
  return Boolean(fotoKey) && path.basename(fotoKey) === fotoKey;
}

function crearRouterImagenesEquipos({ pool, verificarToken, autorizarRoles, registrarLogActividad }) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 },
    fileFilter: (req, archivo, callback) => {
      if (!TIPOS_PERMITIDOS.has(archivo.mimetype)) {
        const error = new Error("Solo se permiten imagenes JPG, JPEG, PNG o WEBP");
        error.code = "TIPO_IMAGEN_NO_PERMITIDO";
        return callback(error);
      }

      return callback(null, true);
    },
  });

  const procesarArchivo = (req, res, next) => {
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

  router.post(
    "/:id_equipo",
    verificarToken,
    autorizarRoles("admin", "capturista"),
    procesarArchivo,
    async (req, res) => {
      const idEquipo = obtenerIdEquipo(req.params.id_equipo);
      if (!idEquipo) return res.status(400).json({ mensaje: "El identificador del equipo no es valido" });
      if (!req.file) return res.status(400).json({ mensaje: "Debes seleccionar una imagen" });

      let rutaTemporal;

      try {
        const [equipos] = await pool.query(
          "SELECT id_equipo, codigo_equipo, foto_key FROM equipos WHERE id_equipo = ? LIMIT 1",
          [idEquipo]
        );
        const equipo = equipos[0];
        if (!equipo) return res.status(404).json({ mensaje: "Equipo no encontrado" });

        const fotoKey = crearFotoKey(equipo.codigo_equipo);
        if (!fotoKey) {
          return res.status(409).json({ mensaje: "El equipo no tiene un codigo valido para nombrar su imagen" });
        }

        await fs.mkdir(CARPETA_EQUIPOS, { recursive: true });
        rutaTemporal = path.join(CARPETA_EQUIPOS, `.${fotoKey}.${crypto.randomUUID()}.tmp.webp`);
        const rutaFinal = path.join(CARPETA_EQUIPOS, fotoKey);

        await sharp(req.file.buffer, { failOn: "error", limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toFile(rutaTemporal);

        try {
          await fs.rename(rutaTemporal, rutaFinal);
        } catch (errorRenombrar) {
          if (!['EEXIST', 'EPERM'].includes(errorRenombrar.code)) throw errorRenombrar;
          await fs.rm(rutaFinal, { force: true });
          await fs.rename(rutaTemporal, rutaFinal);
        }
        rutaTemporal = null;

        const fotoUrl = `/api/equipos-imagenes/${idEquipo}`;
        await pool.query(
          "UPDATE equipos SET foto_key = ?, foto_url = ?, fecha_actualizacion = NOW() WHERE id_equipo = ?",
          [fotoKey, fotoUrl, idEquipo]
        );

        if (equipo.foto_key && equipo.foto_key !== fotoKey && esFotoKeySeguro(equipo.foto_key)) {
          await fs.rm(path.join(CARPETA_EQUIPOS, equipo.foto_key), { force: true }).catch(() => {});
        }

        if (registrarLogActividad) {
          void registrarLogActividad({
            usuario: req.usuario,
            accion: "Edicion",
            modulo: "Equipos",
            entidad: "equipos",
            idEntidad: idEquipo,
            descripcion: `Imagen actualizada para el equipo ${equipo.codigo_equipo}`,
            req,
            detalles: { id: idEquipo, codigo: equipo.codigo_equipo, foto_key: fotoKey },
          });
        }

        return res.json({
          mensaje: "Imagen del equipo actualizada correctamente",
          foto_key: fotoKey,
          foto_url: fotoUrl,
        });
      } catch (error) {
        if (rutaTemporal) await fs.rm(rutaTemporal, { force: true }).catch(() => {});
        if (error.name === "Error" && /Input buffer contains unsupported image format|Input file contains unsupported image format/i.test(error.message)) {
          return res.status(400).json({ mensaje: "El archivo seleccionado no contiene una imagen valida" });
        }
        console.error("Error al subir imagen del equipo:", error);
        return res.status(500).json({ mensaje: "No se pudo guardar la imagen del equipo" });
      }
    }
  );

  // La lectura queda publica, igual que /uploads, para que una etiqueta <img> pueda cargarla sin token.
  router.get("/:id_equipo", async (req, res) => {
    const idEquipo = obtenerIdEquipo(req.params.id_equipo);
    if (!idEquipo) return res.status(400).json({ mensaje: "El identificador del equipo no es valido" });

    try {
      const [equipos] = await pool.query(
        "SELECT foto_key FROM equipos WHERE id_equipo = ? LIMIT 1",
        [idEquipo]
      );
      const fotoKey = equipos[0]?.foto_key;
      if (!esFotoKeySeguro(fotoKey)) return res.status(404).json({ mensaje: "Imagen no encontrada" });

      res.set("Cache-Control", "no-store");
      return res.sendFile(fotoKey, { root: CARPETA_EQUIPOS }, (error) => {
        if (!error || res.headersSent) return;
        if (error.code === "ENOENT") return res.status(404).json({ mensaje: "Imagen no encontrada" });
        console.error("Error al leer imagen del equipo:", error);
        return res.status(500).json({ mensaje: "No se pudo leer la imagen del equipo" });
      });
    } catch (error) {
      console.error("Error al consultar imagen del equipo:", error);
      return res.status(500).json({ mensaje: "No se pudo consultar la imagen del equipo" });
    }
  });

  return router;
}

module.exports = crearRouterImagenesEquipos;
