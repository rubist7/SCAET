const pool = require("../config/db");

const CAMPOS_SENSIBLES = new Set([
  "authorization",
  "contrasena",
  "contraseña",
  "contrasena_hash",
  "contraseña_hash",
  "password",
  "password_hash",
  "token",
  "access_token",
  "refresh_token",
]);

function limpiarDetalles(valor) {
  if (Array.isArray(valor)) {
    return valor.map(limpiarDetalles);
  }

  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([clave]) => !CAMPOS_SENSIBLES.has(clave.toLowerCase()))
        .map(([clave, contenido]) => [clave, limpiarDetalles(contenido)])
    );
  }

  return valor;
}

function limitarTexto(valor, longitud) {
  if (valor === null || valor === undefined) return null;
  return String(valor).slice(0, longitud);
}

async function registrarLogActividad({
  db = pool,
  usuario,
  accion,
  modulo,
  entidad = null,
  idEntidad = null,
  descripcion,
  req = null,
  detalles = null,
}) {
  try {
    if (!usuario || !accion || !modulo || !descripcion) {
      console.error("No se registró el log de actividad: faltan datos obligatorios");
      return false;
    }

    const detallesSeguros = detalles == null
      ? null
      : JSON.stringify(limpiarDetalles(detalles));

    await db.query(
      `INSERT INTO logs_actividad
        (id_usuario, nombre_usuario, correo_usuario, rol_usuario, accion, modulo,
         entidad, id_entidad, descripcion, metodo, ruta, ip, user_agent, detalles_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario.id_usuario || null,
        limitarTexto(usuario.nombre_completo || usuario.nombre_usuario, 120),
        limitarTexto(usuario.correo, 254),
        limitarTexto(usuario.rol, 50),
        limitarTexto(accion, 80),
        limitarTexto(modulo, 80),
        limitarTexto(entidad, 80),
        limitarTexto(idEntidad, 80),
        String(descripcion),
        limitarTexto(req?.method, 10),
        limitarTexto(req?.originalUrl || req?.path, 255),
        limitarTexto(req?.ip, 80),
        req?.get?.("user-agent") || null,
        detallesSeguros,
      ]
    );

    return true;
  } catch (error) {
    console.error("Error al registrar log de actividad:", error);
    return false;
  }
}

module.exports = { registrarLogActividad };
