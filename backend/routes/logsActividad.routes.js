const express = require("express");
const pool = require("../config/db");

const ACCIONES_PERMITIDAS = [
  "Alta",
  "Asignacion",
  "Mantenimiento",
  "Sesion",
  "Edicion",
];

function enteroNoNegativo(valor, predeterminado) {
  if (valor === undefined) return predeterminado;
  if (!/^\d+$/.test(String(valor))) return null;
  return Number(valor);
}

module.exports = function crearRouterLogsActividad({
  verificarToken,
  autorizarRoles,
}) {
  const router = express.Router();
  const soloAdministrador = autorizarRoles("admin");

  router.get(
    "/usuarios",
    verificarToken,
    soloAdministrador,
    async (_req, res) => {
      try {
        const [usuarios] = await pool.query(
          `SELECT id_usuario, nombre_completo, rol, activo
           FROM usuarios
           ORDER BY nombre_completo, id_usuario`
        );

        return res.json({ usuarios });
      } catch (error) {
        console.error("Error al listar usuarios para logs:", error);
        return res.status(500).json({
          mensaje: "Error al listar usuarios de actividad",
        });
      }
    }
  );

  router.get(
    "/",
    verificarToken,
    soloAdministrador,
    async (req, res) => {
      const { fecha, accion, id_usuario: idUsuario } = req.query;
      const limitSolicitado = enteroNoNegativo(req.query.limit, 50);
      const offset = enteroNoNegativo(req.query.offset, 0);

      if (
        fecha !== undefined &&
        !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))
      ) {
        return res.status(400).json({ mensaje: "La fecha no es válida" });
      }
      if (accion !== undefined && !ACCIONES_PERMITIDAS.includes(accion)) {
        return res.status(400).json({ mensaje: "La acción no es válida" });
      }

      const idUsuarioNumero = idUsuario === undefined
        ? null
        : enteroNoNegativo(idUsuario, null);
      if (
        idUsuario !== undefined &&
        (!idUsuarioNumero || idUsuarioNumero < 1)
      ) {
        return res.status(400).json({ mensaje: "El usuario no es válido" });
      }
      if (limitSolicitado === null || limitSolicitado < 1 || offset === null) {
        return res.status(400).json({
          mensaje: "La paginación no es válida",
        });
      }

      const limit = Math.min(limitSolicitado, 200);
      const filtros = [];
      const parametros = [];

      if (fecha) {
        filtros.push(
          "fecha_creacion >= ? AND fecha_creacion < DATE_ADD(?, INTERVAL 1 DAY)"
        );
        parametros.push(fecha, fecha);
      }
      if (accion) {
        filtros.push("accion = ?");
        parametros.push(accion);
      }
      if (idUsuarioNumero) {
        filtros.push("id_usuario = ?");
        parametros.push(idUsuarioNumero);
      }

      const where = filtros.length ? ` WHERE ${filtros.join(" AND ")}` : "";

      try {
        const [logs] = await pool.query(
          `SELECT id_log, id_usuario, nombre_usuario, correo_usuario, rol_usuario,
                  accion, modulo, entidad, id_entidad, descripcion, metodo, ruta,
                  ip, user_agent, detalles_json, fecha_creacion
           FROM logs_actividad${where}
           ORDER BY fecha_creacion DESC, id_log DESC
           LIMIT ? OFFSET ?`,
          [...parametros, limit, offset]
        );
        const [[conteo]] = await pool.query(
          `SELECT COUNT(*) AS total FROM logs_actividad${where}`,
          parametros
        );

        return res.json({
          logs,
          total: Number(conteo.total),
          limit,
          offset,
        });
      } catch (error) {
        console.error("Error al listar logs de actividad:", error);
        return res.status(500).json({
          mensaje: "Error al listar logs de actividad",
        });
      }
    }
  );

  return router;
};
