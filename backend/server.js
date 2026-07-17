const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend de SCAET funcionando");
});

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS resultado");

    res.json({
      mensaje: "Conexión a MySQL correcta",
      resultado: rows[0].resultado,
    });
  } catch (error) {
    console.error("Error al conectar con MySQL:", error);

    res.status(500).json({
      mensaje: "Error al conectar con MySQL",
      error: error.message,
    });
  }
});

async function verificarToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  const partes = authorization.split(" ");

  if (partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
    return res.status(401).json({ mensaje: "Formato de token inválido" });
  }

  let datosToken;

  try {
    datosToken = jwt.verify(partes[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }

  try {
    const [usuarios] = await pool.query(
      "SELECT id_usuario, correo, rol, activo FROM usuarios WHERE id_usuario = ? LIMIT 1",
      [datosToken.id_usuario]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }

    if (Number(usuarios[0].activo) !== 1) {
      return res.status(403).json({
        mensaje: "La cuenta está desactivada. Contacta al administrador.",
      });
    }

    req.usuario = {
      ...datosToken,
      correo: usuarios[0].correo,
      rol: usuarios[0].rol,
    };
    next();
  } catch (error) {
    console.error("Error al verificar usuario autenticado:", error);
    return res.status(500).json({ mensaje: "Error al verificar la sesión" });
  }
}

const rolesValidos = ["admin", "capturista", "usuario"];

function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: "No tienes permiso para realizar esta accion" });
    }

    next();
  };
}

app.post("/api/login", async (req, res) => {
  const identificadorRecibido = req.body.identificador ?? req.body.correo;
  const { contrasena } = req.body;

  if (
    typeof identificadorRecibido !== "string" ||
    !identificadorRecibido.trim() ||
    typeof contrasena !== "string" ||
    !contrasena
  ) {
    return res.status(400).json({ mensaje: "Correo o usuario y contraseña son obligatorios" });
  }

  const identificador = identificadorRecibido.trim();
  const correoNormalizado = identificador.toLowerCase();

  try {
    const [usuarios] = await pool.query(
      "SELECT id_usuario, nombre_completo, nombre_usuario, correo, contrasena_hash, " +
        "rol, activo, debe_cambiar_contrasena FROM usuarios " +
        "WHERE correo = ? OR nombre_usuario = ? LIMIT 1",
      [correoNormalizado, identificador]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ mensaje: "Correo, usuario o contraseña incorrectos" });
    }

    const usuario = usuarios[0];

    if (Number(usuario.activo) !== 1) {
      return res.status(403).json({
        mensaje: "La cuenta está desactivada. Contacta al administrador.",
      });
    }

    const contrasenaCorrecta = await bcrypt.compare(
      contrasena,
      usuario.contrasena_hash
    );

    if (!contrasenaCorrecta) {
      return res.status(401).json({ mensaje: "Correo, usuario o contraseña incorrectos" });
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        correo: usuario.correo,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      mensaje: "Inicio de sesión correcto",
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_completo: usuario.nombre_completo,
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        rol: usuario.rol,
        debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
      },
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return res.status(500).json({ mensaje: "Error al iniciar sesión" });
  }
});

app.post(
  "/api/usuarios",
  verificarToken,
  autorizarRoles("admin"),
  async (req, res) => {
    const { nombre_completo, nombre_usuario, correo, contrasena, rol } = req.body;

    if (
      typeof nombre_completo !== "string" ||
      !nombre_completo.trim() ||
      typeof nombre_usuario !== "string" ||
      !nombre_usuario.trim() ||
      typeof correo !== "string" ||
      !correo.trim() ||
      typeof contrasena !== "string" ||
      !contrasena ||
      typeof rol !== "string" ||
      !rol.trim()
    ) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
    }

    if (contrasena.length < 6) {
      return res.status(400).json({ mensaje: "La contraseña debe tener al menos 6 caracteres" });
    }

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ mensaje: "El rol no es válido" });
    }

    const nombreUsuarioNormalizado = nombre_usuario.trim();
    const correoNormalizado = correo.trim().toLowerCase();

    try {
      const [usuariosExistentes] = await pool.query(
        "SELECT nombre_usuario, correo FROM usuarios " +
          "WHERE nombre_usuario = ? OR correo = ?",
        [nombreUsuarioNormalizado, correoNormalizado]
      );

      const nombreOcupado = usuariosExistentes.some(
        (usuario) =>
          usuario.nombre_usuario?.toLowerCase() === nombreUsuarioNormalizado.toLowerCase()
      );
      const correoOcupado = usuariosExistentes.some(
        (usuario) => usuario.correo.toLowerCase() === correoNormalizado
      );

      if (correoOcupado) {
        return res.status(409).json({ mensaje: "El correo ya está registrado." });
      }

      if (nombreOcupado) {
        return res.status(409).json({ mensaje: "El nombre de usuario ya está registrado." });
      }

      const contrasenaHash = await bcrypt.hash(contrasena, 10);
      const [resultado] = await pool.query(
        "INSERT INTO usuarios " +
          "(nombre_completo, nombre_usuario, correo, contrasena_hash, rol, activo, debe_cambiar_contrasena) " +
          "VALUES (?, ?, ?, ?, ?, 1, 1)",
        [nombre_completo.trim(), nombreUsuarioNormalizado, correoNormalizado, contrasenaHash, rol]
      );

      return res.status(201).json({
        mensaje: "Usuario creado correctamente",
        usuario: {
          id_usuario: resultado.insertId,
          nombre_completo: nombre_completo.trim(),
          nombre_usuario: nombreUsuarioNormalizado,
          correo: correoNormalizado,
          rol,
          activo: 1,
          debe_cambiar_contrasena: 1,
        },
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        const campoDuplicado = error.message.toLowerCase();
        const mensaje = campoDuplicado.includes("correo")
          ? "El correo ya está registrado."
          : "El nombre de usuario ya está registrado.";
        return res.status(409).json({ mensaje });
      }

      console.error("Error al crear usuario:", error);
      return res.status(500).json({ mensaje: "Error al crear usuario" });
    }
  }
);

app.get(
  "/api/usuarios",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    try {
      const [usuarios] = await pool.query(
        "SELECT id_usuario, nombre_completo, nombre_usuario, correo, rol, activo, " +
          "debe_cambiar_contrasena, fecha_creacion, fecha_actualizacion " +
          "FROM usuarios ORDER BY nombre_completo"
      );

      return res.json({ usuarios });
    } catch (error) {
      console.error("Error al listar usuarios:", error);
      return res.status(500).json({ mensaje: "Error al listar usuarios" });
    }
  }
);

app.put(
  "/api/usuarios/me/perfil",
  verificarToken,
  autorizarRoles("admin"),
  async (req, res) => {
    const { nombre_completo, nombre_usuario, correo } = req.body;

    if (
      typeof nombre_completo !== "string" ||
      !nombre_completo.trim() ||
      typeof nombre_usuario !== "string" ||
      !nombre_usuario.trim() ||
      typeof correo !== "string" ||
      !correo.trim()
    ) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
    }

    const nombreUsuarioNormalizado = nombre_usuario.trim();
    const correoNormalizado = correo.trim().toLowerCase();

    try {
      const [usuariosExistentes] = await pool.query(
        "SELECT id_usuario, nombre_usuario, correo FROM usuarios " +
          "WHERE (nombre_usuario = ? OR correo = ?) AND id_usuario <> ?",
        [nombreUsuarioNormalizado, correoNormalizado, req.usuario.id_usuario]
      );

      const correoOcupado = usuariosExistentes.some(
        (usuario) => usuario.correo.toLowerCase() === correoNormalizado
      );
      const nombreOcupado = usuariosExistentes.some(
        (usuario) =>
          usuario.nombre_usuario?.toLowerCase() === nombreUsuarioNormalizado.toLowerCase()
      );

      if (correoOcupado) {
        return res.status(409).json({ mensaje: "El correo ya está registrado." });
      }

      if (nombreOcupado) {
        return res.status(409).json({ mensaje: "El nombre de usuario ya está registrado." });
      }

      const [resultado] = await pool.query(
        "UPDATE usuarios SET nombre_completo = ?, nombre_usuario = ?, correo = ?, " +
          "fecha_actualizacion = NOW() WHERE id_usuario = ?",
        [
          nombre_completo.trim(),
          nombreUsuarioNormalizado,
          correoNormalizado,
          req.usuario.id_usuario,
        ]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      const [usuariosActualizados] = await pool.query(
        "SELECT id_usuario, nombre_completo, nombre_usuario, correo, rol, activo, " +
          "debe_cambiar_contrasena, fecha_creacion, fecha_actualizacion " +
          "FROM usuarios WHERE id_usuario = ? LIMIT 1",
        [req.usuario.id_usuario]
      );

      return res.json({
        mensaje: "Perfil actualizado correctamente",
        usuario: usuariosActualizados[0],
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        const campoDuplicado = error.message.toLowerCase();
        const mensaje = campoDuplicado.includes("correo")
          ? "El correo ya está registrado."
          : "El nombre de usuario ya está registrado.";
        return res.status(409).json({ mensaje });
      }

      console.error("Error al actualizar perfil:", error);
      return res.status(500).json({ mensaje: "Error al actualizar perfil" });
    }
  }
);

app.put("/api/usuarios/me/password", verificarToken, async (req, res) => {
  const { contrasena_actual, nueva_contrasena } = req.body;

  if (
    typeof contrasena_actual !== "string" ||
    !contrasena_actual ||
    typeof nueva_contrasena !== "string" ||
    !nueva_contrasena
  ) {
    return res.status(400).json({ mensaje: "Ambas contraseñas son obligatorias" });
  }

  if (nueva_contrasena.length < 6) {
    return res.status(400).json({
      mensaje: "La nueva contraseña debe tener al menos 6 caracteres",
    });
  }

  try {
    const [usuarios] = await pool.query(
      "SELECT id_usuario, contrasena_hash FROM usuarios WHERE id_usuario = ? LIMIT 1",
      [req.usuario.id_usuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const contrasenaCorrecta = await bcrypt.compare(
      contrasena_actual,
      usuarios[0].contrasena_hash
    );

    if (!contrasenaCorrecta) {
      return res.status(401).json({ mensaje: "La contraseña actual es incorrecta" });
    }

    const contrasenaHash = await bcrypt.hash(nueva_contrasena, 10);
    await pool.query(
      "UPDATE usuarios SET contrasena_hash = ?, debe_cambiar_contrasena = 0, " +
        "fecha_actualizacion = NOW() WHERE id_usuario = ?",
      [contrasenaHash, req.usuario.id_usuario]
    );

    return res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al cambiar la contraseña propia:", error);
    return res.status(500).json({ mensaje: "Error al actualizar la contraseña" });
  }
});

app.put(
  "/api/usuarios/:id_usuario/rol",
  verificarToken,
  autorizarRoles("admin"),
  async (req, res) => {
    const { rol } = req.body;

    if (typeof rol !== "string" || !rolesValidos.includes(rol)) {
      return res.status(400).json({ mensaje: "El rol no es válido" });
    }

    try {
      const [resultado] = await pool.query(
        "UPDATE usuarios SET rol = ?, fecha_actualizacion = NOW() WHERE id_usuario = ?",
        [rol, req.params.id_usuario]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      return res.json({ mensaje: "Rol actualizado correctamente" });
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      return res.status(500).json({ mensaje: "Error al actualizar rol" });
    }
  }
);

app.put(
  "/api/usuarios/:id_usuario/password",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    const { nueva_contrasena } = req.body;

    if (typeof nueva_contrasena !== "string" || nueva_contrasena.length < 6) {
      return res.status(400).json({
        mensaje: "La nueva contraseña debe tener al menos 6 caracteres",
      });
    }

    try {
      const [usuarios] = await pool.query(
        "SELECT id_usuario, rol FROM usuarios WHERE id_usuario = ? LIMIT 1",
        [req.params.id_usuario]
      );

      if (usuarios.length === 0) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      if (req.usuario.rol === "capturista" && usuarios[0].rol === "admin") {
        return res.status(403).json({
          mensaje: "No tienes permiso para restablecer la contraseña de un administrador.",
        });
      }

      const contrasenaHash = await bcrypt.hash(nueva_contrasena, 10);
      await pool.query(
        "UPDATE usuarios SET contrasena_hash = ?, debe_cambiar_contrasena = 1, " +
          "fecha_actualizacion = NOW() WHERE id_usuario = ?",
        [contrasenaHash, req.params.id_usuario]
      );

      return res.json({ mensaje: "Contraseña restablecida correctamente" });
    } catch (error) {
      console.error("Error al restablecer contraseña:", error);
      return res.status(500).json({ mensaje: "Error al restablecer la contraseña" });
    }
  }
);

app.put(
  "/api/usuarios/correo",
  verificarToken,
  autorizarRoles("admin"),
  async (req, res) => {
  const { nuevo_correo } = req.body;

  if (typeof nuevo_correo !== "string" || !nuevo_correo.trim()) {
    return res.status(400).json({ mensaje: "El nuevo correo es obligatorio" });
  }

  const correoNormalizado = nuevo_correo.trim().toLowerCase();

  try {
    const [usuariosExistentes] = await pool.query(
      "SELECT id_usuario FROM usuarios " +
        "WHERE correo = ? AND id_usuario <> ? LIMIT 1",
      [correoNormalizado, req.usuario.id_usuario]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({ mensaje: "El correo ya está registrado." });
    }

    const [resultado] = await pool.query(
      "UPDATE usuarios SET correo = ?, fecha_actualizacion = NOW() " +
        "WHERE id_usuario = ?",
      [correoNormalizado, req.usuario.id_usuario]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const [usuariosActualizados] = await pool.query(
      "SELECT id_usuario, nombre_completo, correo, rol, activo, " +
        "debe_cambiar_contrasena, fecha_creacion, fecha_actualizacion " +
        "FROM usuarios WHERE id_usuario = ? LIMIT 1",
      [req.usuario.id_usuario]
    );

    return res.json({
      mensaje: "Correo actualizado correctamente",
      usuario: usuariosActualizados[0],
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "El correo ya está registrado." });
    }

    console.error("Error al actualizar correo:", error);
    return res.status(500).json({ mensaje: "Error al actualizar correo" });
  }
  }
);


app.put(
  "/api/usuarios/:id_usuario/estado",
  verificarToken,
  autorizarRoles("admin"),
  async (req, res) => {
    const { activo } = req.body;
    const activoNormalizado = Number(activo);

    if (
      !["number", "string"].includes(typeof activo) ||
      activo === "" ||
      ![0, 1].includes(activoNormalizado)
    ) {
      return res.status(400).json({ mensaje: "El estado del usuario no es válido" });
    }

    if (
      activoNormalizado === 0 &&
      String(req.params.id_usuario) === String(req.usuario.id_usuario)
    ) {
      return res.status(400).json({ mensaje: "No puedes ocultar tu propia cuenta." });
    }

    try {
      const [resultado] = await pool.query(
        "UPDATE usuarios SET activo = ?, fecha_actualizacion = NOW() WHERE id_usuario = ?",
        [activoNormalizado, req.params.id_usuario]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      const [usuariosActualizados] = await pool.query(
        "SELECT id_usuario, nombre_completo, nombre_usuario, correo, rol, activo, " +
          "debe_cambiar_contrasena, fecha_creacion, fecha_actualizacion " +
          "FROM usuarios WHERE id_usuario = ? LIMIT 1",
        [req.params.id_usuario]
      );

      return res.json({
        mensaje: activoNormalizado === 1
          ? "Usuario activado correctamente"
          : "Usuario ocultado correctamente",
        usuario: usuariosActualizados[0],
      });
    } catch (error) {
      console.error("Error al actualizar estado de usuario:", error);
      return res.status(500).json({ mensaje: "Error al actualizar estado de usuario" });
    }
  }
);
app.put(
  "/api/usuarios/:id_usuario",
  verificarToken,
  autorizarRoles("admin"),
  async (req, res) => {
    const { nombre_completo, nombre_usuario, correo } = req.body;

    if (
      typeof nombre_completo !== "string" ||
      !nombre_completo.trim() ||
      typeof nombre_usuario !== "string" ||
      !nombre_usuario.trim() ||
      typeof correo !== "string" ||
      !correo.trim()
    ) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
    }

    const nombreUsuarioNormalizado = nombre_usuario.trim();
    const correoNormalizado = correo.trim().toLowerCase();

    try {
      const [usuariosExistentes] = await pool.query(
        "SELECT id_usuario, nombre_usuario, correo FROM usuarios " +
          "WHERE (nombre_usuario = ? OR correo = ?) AND id_usuario <> ?",
        [nombreUsuarioNormalizado, correoNormalizado, req.params.id_usuario]
      );

      const correoOcupado = usuariosExistentes.some(
        (usuario) => usuario.correo.toLowerCase() === correoNormalizado
      );
      const nombreOcupado = usuariosExistentes.some(
        (usuario) =>
          usuario.nombre_usuario?.toLowerCase() === nombreUsuarioNormalizado.toLowerCase()
      );

      if (correoOcupado) {
        return res.status(409).json({ mensaje: "El correo ya está registrado." });
      }

      if (nombreOcupado) {
        return res.status(409).json({ mensaje: "El nombre de usuario ya está registrado." });
      }

      const [resultado] = await pool.query(
        "UPDATE usuarios SET nombre_completo = ?, nombre_usuario = ?, correo = ?, " +
          "fecha_actualizacion = NOW() WHERE id_usuario = ?",
        [
          nombre_completo.trim(),
          nombreUsuarioNormalizado,
          correoNormalizado,
          req.params.id_usuario,
        ]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      const [usuariosActualizados] = await pool.query(
        "SELECT id_usuario, nombre_completo, nombre_usuario, correo, rol, activo, " +
          "debe_cambiar_contrasena, fecha_creacion, fecha_actualizacion " +
          "FROM usuarios WHERE id_usuario = ? LIMIT 1",
        [req.params.id_usuario]
      );

      return res.json({
        mensaje: "Usuario actualizado correctamente",
        usuario: usuariosActualizados[0],
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        const campoDuplicado = error.message.toLowerCase();
        const mensaje = campoDuplicado.includes("correo")
          ? "El correo ya está registrado."
          : "El nombre de usuario ya está registrado.";
        return res.status(409).json({ mensaje });
      }

      console.error("Error al actualizar usuario:", error);
      return res.status(500).json({ mensaje: "Error al actualizar usuario" });
    }
  }
);

const calificacionesProveedorValidas = ["excelente", "bueno", "regular", "malo"];

function normalizarProveedor(body) {
  const {
    nombre_proveedor,
    empresa,
    nombre_vendedor = "",
    rfc_empresa = "",
    telefono = "",
    correo = "",
    direccion = "",
    calificacion = "bueno",
    observaciones = "",
  } = body;

  if (typeof nombre_proveedor !== "string" || !nombre_proveedor.trim()) {
    return { error: "El nombre del proveedor es obligatorio" };
  }

  if (typeof empresa !== "string" || !empresa.trim()) {
    return { error: "La empresa es obligatoria" };
  }

  if (typeof calificacion !== "string" || !calificacionesProveedorValidas.includes(calificacion)) {
    return { error: "La calificación no es válida" };
  }

  return {
    proveedor: {
      nombre_proveedor: nombre_proveedor.trim(),
      empresa: empresa.trim(),
      nombre_vendedor: typeof nombre_vendedor === "string" ? nombre_vendedor.trim() : "",
      rfc_empresa: typeof rfc_empresa === "string" ? rfc_empresa.trim().toUpperCase() : "",
      telefono: typeof telefono === "string" ? telefono.trim() : "",
      correo: typeof correo === "string" ? correo.trim().toLowerCase() : "",
      direccion: typeof direccion === "string" ? direccion.trim() : "",
      calificacion,
      observaciones: typeof observaciones === "string" ? observaciones.trim() : "",
    },
  };
}

async function obtenerProveedorPorId(idProveedor) {
  const [proveedores] = await pool.query(
    "SELECT id_proveedor, nombre_proveedor, empresa, nombre_vendedor, rfc_empresa, " +
      "telefono, correo, direccion, calificacion, observaciones, activo, " +
      "fecha_creacion, fecha_actualizacion FROM proveedores WHERE id_proveedor = ? LIMIT 1",
    [idProveedor]
  );

  return proveedores[0];
}

app.get("/api/proveedores", verificarToken, async (req, res) => {
  const estado = req.query.estado || "activos";
  const estadosPermitidos = ["activos", "ocultos", "todos"];

  if (!estadosPermitidos.includes(estado)) {
    return res.status(400).json({ mensaje: "El estado de proveedores no es válido" });
  }

  const filtros = [];
  const parametros = [];

  if (estado === "activos") {
    filtros.push("activo = ?");
    parametros.push(1);
  }

  if (estado === "ocultos") {
    filtros.push("activo = ?");
    parametros.push(0);
  }

  try {
    const [proveedores] = await pool.query(
      "SELECT id_proveedor, nombre_proveedor, empresa, nombre_vendedor, rfc_empresa, " +
        "telefono, correo, direccion, calificacion, observaciones, activo, " +
        "fecha_creacion, fecha_actualizacion FROM proveedores " +
        (filtros.length ? `WHERE ${filtros.join(" AND ")} ` : "") +
        "ORDER BY nombre_proveedor, empresa",
      parametros
    );

    return res.json({ proveedores });
  } catch (error) {
    console.error("Error al listar proveedores:", error);
    return res.status(500).json({ mensaje: "Error al listar proveedores" });
  }
});

app.post(
  "/api/proveedores",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    const { proveedor, error } = normalizarProveedor(req.body);

    if (error) {
      return res.status(400).json({ mensaje: error });
    }

    try {
      const [resultado] = await pool.query(
        "INSERT INTO proveedores " +
          "(nombre_proveedor, empresa, nombre_vendedor, rfc_empresa, telefono, correo, " +
          "direccion, calificacion, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
        [
          proveedor.nombre_proveedor,
          proveedor.empresa,
          proveedor.nombre_vendedor,
          proveedor.rfc_empresa,
          proveedor.telefono,
          proveedor.correo,
          proveedor.direccion,
          proveedor.calificacion,
          proveedor.observaciones,
        ]
      );

      const proveedorCreado = await obtenerProveedorPorId(resultado.insertId);

      return res.status(201).json({
        mensaje: "Proveedor creado correctamente",
        proveedor: proveedorCreado,
      });
    } catch (errorCrear) {
      console.error("Error al crear proveedor:", errorCrear);
      return res.status(500).json({ mensaje: "Error al crear proveedor" });
    }
  }
);

app.put(
  "/api/proveedores/:id_proveedor/estado",
  verificarToken,
  autorizarRoles("admin"),
  async (req, res) => {
    const { activo } = req.body;
    const activoNormalizado = Number(activo);

    if (
      !["number", "string"].includes(typeof activo) ||
      activo === "" ||
      ![0, 1].includes(activoNormalizado)
    ) {
      return res.status(400).json({ mensaje: "El estado del proveedor no es válido" });
    }

    try {
      const [resultado] = await pool.query(
        "UPDATE proveedores SET activo = ?, fecha_actualizacion = NOW() WHERE id_proveedor = ?",
        [activoNormalizado, req.params.id_proveedor]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Proveedor no encontrado" });
      }

      const proveedorActualizado = await obtenerProveedorPorId(req.params.id_proveedor);

      return res.json({
        mensaje: activoNormalizado === 1
          ? "Proveedor activado correctamente"
          : "Proveedor ocultado correctamente",
        proveedor: proveedorActualizado,
      });
    } catch (errorEstado) {
      console.error("Error al actualizar estado de proveedor:", errorEstado);
      return res.status(500).json({ mensaje: "Error al actualizar estado de proveedor" });
    }
  }
);

app.put(
  "/api/proveedores/:id_proveedor",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    const { proveedor, error } = normalizarProveedor(req.body);

    if (error) {
      return res.status(400).json({ mensaje: error });
    }

    try {
      const [resultado] = await pool.query(
        "UPDATE proveedores SET nombre_proveedor = ?, empresa = ?, nombre_vendedor = ?, " +
          "rfc_empresa = ?, telefono = ?, correo = ?, direccion = ?, calificacion = ?, " +
          "observaciones = ?, fecha_actualizacion = NOW() WHERE id_proveedor = ?",
        [
          proveedor.nombre_proveedor,
          proveedor.empresa,
          proveedor.nombre_vendedor,
          proveedor.rfc_empresa,
          proveedor.telefono,
          proveedor.correo,
          proveedor.direccion,
          proveedor.calificacion,
          proveedor.observaciones,
          req.params.id_proveedor,
        ]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Proveedor no encontrado" });
      }

      const proveedorActualizado = await obtenerProveedorPorId(req.params.id_proveedor);

      return res.json({
        mensaje: "Proveedor actualizado correctamente",
        proveedor: proveedorActualizado,
      });
    } catch (errorActualizar) {
      console.error("Error al actualizar proveedor:", errorActualizar);
      return res.status(500).json({ mensaje: "Error al actualizar proveedor" });
    }
  }
);

const correoColaboradorValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const camposColaborador = "id_colaborador, num_colaborador, nombre_completo, area, departamento, puesto, correo, telefono, extension, foto_key, foto_url, estado, observaciones, activo, fecha_creacion, fecha_actualizacion";

function normalizarColaborador(body) {
  const texto = (valor) => String(valor ?? "").trim();
  const opcional = (valor) => texto(valor) || null;
  const colaborador = {
    num_colaborador: texto(body.num_colaborador),
    nombre_completo: texto(body.nombre_completo),
    area: texto(body.area),
    departamento: opcional(body.departamento),
    puesto: opcional(body.puesto),
    correo: texto(body.correo).toLowerCase() || null,
    telefono: opcional(body.telefono),
    extension: opcional(body.extension),
    estado: texto(body.estado || "activo").toLowerCase(),
    observaciones: opcional(body.observaciones),
  };

  if (!colaborador.num_colaborador) return { error: "El número de colaborador es obligatorio" };
  if (!colaborador.nombre_completo) return { error: "El nombre completo es obligatorio" };
  if (!colaborador.area) return { error: "El área es obligatoria" };
  if (colaborador.correo && !correoColaboradorValido.test(colaborador.correo)) {
    return { error: "El formato del correo no es válido" };
  }
  if (!["activo", "inactivo"].includes(colaborador.estado)) {
    return { error: "El estado debe ser activo o inactivo" };
  }

  return { colaborador };
}

async function obtenerColaboradorPorId(idColaborador) {
  const [filas] = await pool.query(
    "SELECT " + camposColaborador + " FROM colaboradores WHERE id_colaborador = ? LIMIT 1",
    [idColaborador]
  );
  return filas[0];
}

function mensajeDuplicadoColaborador(error) {
  const detalle = String(error.sqlMessage || error.message || "").toLowerCase();
  return detalle.includes("correo")
    ? "El correo ya está registrado en otro colaborador."
    : "El número de colaborador ya está registrado.";
}

async function validarDuplicadoColaborador(colaborador, idColaborador = null) {
  const condicionId = idColaborador ? "id_colaborador <> ? AND " : "";
  const parametros = idColaborador
    ? [idColaborador, colaborador.num_colaborador, colaborador.correo]
    : [colaborador.num_colaborador, colaborador.correo];
  const [existentes] = await pool.query(
    "SELECT num_colaborador, correo FROM colaboradores WHERE " + condicionId +
      "(num_colaborador = ? OR (correo IS NOT NULL AND correo = ?))",
    parametros
  );

  if (existentes.some((item) => String(item.num_colaborador) === colaborador.num_colaborador)) {
    return "El número de colaborador ya está registrado.";
  }
  if (
    colaborador.correo &&
    existentes.some((item) => item.correo?.toLowerCase() === colaborador.correo)
  ) {
    return "El correo ya está registrado en otro colaborador.";
  }
  return null;
}

app.get(
  "/api/colaboradores",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    const estado = String(req.query.estado || "activos").toLowerCase();
    if (!["activos", "ocultos", "todos"].includes(estado)) {
      return res.status(400).json({ mensaje: "El filtro de estado no es válido" });
    }

    const condicion = estado === "todos" ? "" : " WHERE activo = ?";
    const parametros = estado === "todos" ? [] : [estado === "activos" ? 1 : 0];

    try {
      const [colaboradores] = await pool.query(
        "SELECT " + camposColaborador + " FROM colaboradores" + condicion +
          " ORDER BY nombre_completo",
        parametros
      );
      return res.json({ colaboradores });
    } catch (error) {
      console.error("Error al listar colaboradores:", error);
      return res.status(500).json({ mensaje: "Error al listar colaboradores" });
    }
  }
);

app.post(
  "/api/colaboradores",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    const { colaborador, error } = normalizarColaborador(req.body);
    if (error) return res.status(400).json({ mensaje: error });

    try {
      const duplicado = await validarDuplicadoColaborador(colaborador);
      if (duplicado) return res.status(409).json({ mensaje: duplicado });

      const [resultado] = await pool.query(
        "INSERT INTO colaboradores (num_colaborador, nombre_completo, area, departamento, " +
          "puesto, correo, telefono, extension, foto_key, foto_url, estado, observaciones, activo) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 1)",
        [
          colaborador.num_colaborador,
          colaborador.nombre_completo,
          colaborador.area,
          colaborador.departamento,
          colaborador.puesto,
          colaborador.correo,
          colaborador.telefono,
          colaborador.extension,
          colaborador.estado,
          colaborador.observaciones,
        ]
      );

      return res.status(201).json({
        mensaje: "Colaborador creado correctamente",
        colaborador: await obtenerColaboradorPorId(resultado.insertId),
      });
    } catch (errorCrear) {
      if (errorCrear.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ mensaje: mensajeDuplicadoColaborador(errorCrear) });
      }
      console.error("Error al crear colaborador:", errorCrear);
      return res.status(500).json({ mensaje: "Error al crear colaborador" });
    }
  }
);

app.put(
  "/api/colaboradores/:id_colaborador/estado",
  verificarToken,
  autorizarRoles("admin"),
  async (req, res) => {
    const activo = Number(req.body.activo);
    if (req.body.activo === "" || req.body.activo == null || ![0, 1].includes(activo)) {
      return res.status(400).json({ mensaje: "El estado del colaborador no es válido" });
    }

    try {
      const [resultado] = await pool.query(
        "UPDATE colaboradores SET activo = ?, fecha_actualizacion = NOW() WHERE id_colaborador = ?",
        [activo, req.params.id_colaborador]
      );
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Colaborador no encontrado" });
      }
      return res.json({
        mensaje: activo ? "Colaborador activado correctamente" : "Colaborador ocultado correctamente",
        colaborador: await obtenerColaboradorPorId(req.params.id_colaborador),
      });
    } catch (errorEstado) {
      console.error("Error al actualizar estado de colaborador:", errorEstado);
      return res.status(500).json({ mensaje: "Error al actualizar estado de colaborador" });
    }
  }
);

app.put(
  "/api/colaboradores/:id_colaborador",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    const { colaborador, error } = normalizarColaborador(req.body);
    if (error) return res.status(400).json({ mensaje: error });

    try {
      const duplicado = await validarDuplicadoColaborador(
        colaborador,
        req.params.id_colaborador
      );
      if (duplicado) return res.status(409).json({ mensaje: duplicado });

      const [resultado] = await pool.query(
        "UPDATE colaboradores SET num_colaborador = ?, nombre_completo = ?, area = ?, " +
          "departamento = ?, puesto = ?, correo = ?, telefono = ?, extension = ?, estado = ?, " +
          "observaciones = ?, fecha_actualizacion = NOW() WHERE id_colaborador = ?",
        [
          colaborador.num_colaborador,
          colaborador.nombre_completo,
          colaborador.area,
          colaborador.departamento,
          colaborador.puesto,
          colaborador.correo,
          colaborador.telefono,
          colaborador.extension,
          colaborador.estado,
          colaborador.observaciones,
          req.params.id_colaborador,
        ]
      );
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Colaborador no encontrado" });
      }
      return res.json({
        mensaje: "Colaborador actualizado correctamente",
        colaborador: await obtenerColaboradorPorId(req.params.id_colaborador),
      });
    } catch (errorActualizar) {
      if (errorActualizar.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ mensaje: mensajeDuplicadoColaborador(errorActualizar) });
      }
      console.error("Error al actualizar colaborador:", errorActualizar);
      return res.status(500).json({ mensaje: "Error al actualizar colaborador" });
    }
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
