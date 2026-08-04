const express = require("express");
const multer = require("multer");
const {
  enviarDevolucionCorreo,
  enviarResguardoCorreo,
  esCorreoValido,
} = require("../services/resguardoCorreo.service");

const TAMANO_MAXIMO_PDF_BYTES = 10 * 1024 * 1024;
const PREFIJO_PDF = Buffer.from("%PDF-");

function obtenerIdResguardo(valor) {
  return /^\d+$/.test(String(valor)) && Number(valor) > 0 ? Number(valor) : null;
}

function esPdfValido(archivo) {
  return archivo?.mimetype === "application/pdf"
    && Buffer.isBuffer(archivo.buffer)
    && archivo.buffer.length >= PREFIJO_PDF.length
    && archivo.buffer.subarray(0, PREFIJO_PDF.length).equals(PREFIJO_PDF);
}

function crearRouterResguardosCorreo({ pool, verificarToken, autorizarRoles, registrarLogActividad }) {
  const router = express.Router();
  const enviosEnCurso = new Set();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANO_MAXIMO_PDF_BYTES, files: 1 },
    fileFilter: (_req, archivo, callback) => {
      if (archivo.mimetype !== "application/pdf") {
        const error = new Error("Solo se permite adjuntar un archivo PDF");
        error.code = "TIPO_PDF_NO_PERMITIDO";
        return callback(error);
      }

      return callback(null, true);
    },
  });

  const procesarPdf = (req, res, next) => {
    upload.single("pdf")(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ mensaje: "El PDF no puede superar 10 MB" });
      }
      if (error.code === "TIPO_PDF_NO_PERMITIDO") {
        return res.status(400).json({ mensaje: error.message });
      }
      return next(error);
    });
  };

  router.post(
    "/:id_resguardo/enviar",
    verificarToken,
    autorizarRoles("admin", "capturista"),
    procesarPdf,
    async (req, res) => {
      const idResguardo = obtenerIdResguardo(req.params.id_resguardo);
      if (!idResguardo) return res.status(400).json({ mensaje: "El identificador del resguardo no es valido" });
      if (!req.file || !esPdfValido(req.file)) {
        return res.status(400).json({ mensaje: "Debes adjuntar un PDF valido" });
      }
      if (enviosEnCurso.has(idResguardo)) {
        return res.status(409).json({ mensaje: "El resguardo ya se esta enviando" });
      }

      enviosEnCurso.add(idResguardo);
      try {
        const [filas] = await pool.query(
          `SELECT r.id_resguardo, r.id_asignacion, r.folio, r.tipo_documento, r.correo_colaborador, r.correo_enviado,
            c.id_colaborador, c.num_colaborador, c.nombre_completo, c.correo AS correo_actual
           FROM resguardos r
           INNER JOIN asignaciones a ON a.id_asignacion = r.id_asignacion
           INNER JOIN colaboradores c ON c.id_colaborador = a.id_colaborador
           WHERE r.id_resguardo = ? AND r.tipo_documento IN ('asignacion', 'devolucion')
           LIMIT 1`,
          [idResguardo]
        );
        const resguardo = filas[0];
        if (!resguardo) return res.status(404).json({ mensaje: "Resguardo no encontrado" });

        const correoColaborador = String(resguardo.correo_colaborador || "").trim()
          || String(resguardo.correo_actual || "").trim();
        if (!esCorreoValido(correoColaborador)) {
          return res.status(422).json({ mensaje: "El resguardo no tiene un correo de colaborador valido" });
        }

        const esDevolucion = resguardo.tipo_documento === "devolucion";
        const [equipos] = await pool.query(
          esDevolucion
            ? `SELECT rd.id_detalle,
                 COALESCE(NULLIF(TRIM(d.codigo_equipo_snapshot), ''), e.codigo_equipo) AS codigo_equipo
               FROM resguardo_detalles rd
               INNER JOIN asignacion_detalles d ON d.id_detalle = rd.id_detalle
               LEFT JOIN equipos e ON e.id_equipo = d.id_equipo
               WHERE rd.id_resguardo = ? AND d.id_asignacion = ?
               ORDER BY codigo_equipo ASC, rd.id_detalle ASC`
            : `SELECT d.id_detalle,
                 COALESCE(NULLIF(TRIM(d.codigo_equipo_snapshot), ''), e.codigo_equipo) AS codigo_equipo,
                 d.tipo_asignacion,
                 DATE_FORMAT(d.fecha_devolucion_programada, '%Y-%m-%d') AS fecha_devolucion_programada
               FROM asignacion_detalles d
               LEFT JOIN equipos e ON e.id_equipo = d.id_equipo
               WHERE d.id_asignacion = ?
               ORDER BY codigo_equipo ASC, d.id_detalle ASC`,
          esDevolucion ? [idResguardo, resguardo.id_asignacion] : [resguardo.id_asignacion]
        );
        if (esDevolucion && !equipos.length) {
          return res.status(409).json({ mensaje: "Esta devolucion no tiene detalles relacionados para enviar por correo" });
        }

        await (esDevolucion ? enviarDevolucionCorreo : enviarResguardoCorreo)({
          folio: resguardo.folio,
          nombreColaborador: resguardo.nombre_completo,
          correoColaborador,
          equipos,
          pdfBuffer: req.file.buffer,
        });

        await pool.query(
          "UPDATE resguardos SET correo_enviado = 1, fecha_actualizacion = NOW() WHERE id_resguardo = ?",
          [idResguardo]
        );
        void registrarLogActividad({
          usuario: req.usuario,
          accion: "Envio de correo",
          modulo: "Resguardos",
          entidad: "resguardos",
          idEntidad: idResguardo,
          descripcion: `${esDevolucion ? "Devolucion" : "Resguardo"} enviado por correo: ${resguardo.folio}`,
          req,
          detalles: { id_resguardo: idResguardo, folio: resguardo.folio, correo_enviado_previamente: Boolean(resguardo.correo_enviado) },
        });
        return res.json({
          mensaje: esDevolucion ? "Devolucion enviada correctamente" : "Resguardo enviado correctamente",
          id_resguardo: idResguardo,
          folio: resguardo.folio,
          correo_enviado: true,
        });
      } catch (error) {
        if (error.code === "CORREO_NO_CONFIGURADO") {
          return res.status(503).json({ mensaje: "El servicio de correo no esta disponible" });
        }
        if (error.code === "CORREO_INVALIDO") {
          return res.status(422).json({ mensaje: "La configuracion de correo no es valida" });
        }
        console.error("Error al enviar resguardo por correo:", error.code || error.message);
        return res.status(500).json({ mensaje: "No se pudo enviar el resguardo por correo" });
      } finally {
        enviosEnCurso.delete(idResguardo);
      }
    }
  );

  return router;
}

module.exports = crearRouterResguardosCorreo;
