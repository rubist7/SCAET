const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
const pool = require("./config/db");
const crearRouterMantenimientos = require("./routes/mantenimientos.routes");
const crearRouterLogsActividad = require("./routes/logsActividad.routes");
const crearRouterImagenesEquipos = require("./routes/equiposImagen.routes");
const { registrarLogActividad } = require("./utils/logsActividad");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

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
      "SELECT id_usuario, nombre_completo, correo, rol, activo FROM usuarios WHERE id_usuario = ? LIMIT 1",
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
      nombre_completo: usuarios[0].nombre_completo,
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

    void registrarLogActividad({
      usuario,
      accion: "Sesion",
      modulo: "Login",
      entidad: "usuarios",
      idEntidad: usuario.id_usuario,
      descripcion: "Inicio de sesión",
      req,
    });

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
      const [duplicados] = await pool.query(
        "SELECT id_proveedor FROM proveedores WHERE LOWER(nombre_proveedor) = LOWER(?) AND LOWER(empresa) = LOWER(?) LIMIT 1",
        [proveedor.nombre_proveedor, proveedor.empresa]
      );
      if (duplicados.length) {
        return res.status(409).json({ mensaje: "Ya existe un proveedor con el mismo nombre y empresa" });
      }
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

      void registrarLogActividad({
        usuario: req.usuario, accion: "Alta", modulo: "Proveedores", entidad: "proveedores",
        idEntidad: resultado.insertId,
        descripcion: `Alta de proveedor: ${proveedorCreado.nombre_proveedor}`, req,
        detalles: { id: resultado.insertId, nombre: proveedorCreado.nombre_proveedor },
      });

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

      void registrarLogActividad({
        usuario: req.usuario, accion: "Edicion", modulo: "Proveedores", entidad: "proveedores",
        idEntidad: req.params.id_proveedor,
        descripcion: `Proveedor ${activoNormalizado ? "restaurado" : "ocultado"}: ${proveedorActualizado.nombre_proveedor}`, req,
        detalles: { id: req.params.id_proveedor, nombre: proveedorActualizado.nombre_proveedor, activo: activoNormalizado },
      });

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

      void registrarLogActividad({
        usuario: req.usuario, accion: "Edicion", modulo: "Proveedores", entidad: "proveedores",
        idEntidad: req.params.id_proveedor,
        descripcion: `Edición de proveedor: ${proveedorActualizado.nombre_proveedor}`, req,
        detalles: { id: req.params.id_proveedor, nombre: proveedorActualizado.nombre_proveedor },
      });

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

const estadosEquipoValidos = ["disponible", "asignado", "mantenimiento", "baja"];
const camposEquipo = "e.id_equipo, e.id_proveedor, e.codigo_equipo, e.nombre_equipo, e.tipo_equipo, e.marca, e.modelo, e.numero_serie, e.fecha_compra, e.garantia_meses, e.vence_garantia, e.especificaciones_tecnicas, e.foto_key, e.foto_url, e.qr_token, e.qr_url, e.estado, e.activo, e.fecha_creacion, e.fecha_actualizacion, p.nombre_proveedor, p.empresa, p.nombre_vendedor";

function normalizarEquipo(body) {
  const texto = (valor) => String(valor ?? "").trim();
  const equipo = {
    id_proveedor: body.id_proveedor === "" || body.id_proveedor == null ? null : Number(body.id_proveedor),
    codigo_equipo: texto(body.codigo_equipo).toUpperCase(),
    nombre_equipo: texto(body.nombre_equipo), tipo_equipo: texto(body.tipo_equipo), marca: texto(body.marca),
    modelo: texto(body.modelo), numero_serie: texto(body.numero_serie), fecha_compra: texto(body.fecha_compra) || null,
    garantia_meses: body.garantia_meses === "" || body.garantia_meses == null ? null : Number(body.garantia_meses),
    especificaciones_tecnicas: texto(body.especificaciones_tecnicas) || null,
    estado: texto(body.estado).toLowerCase() || "disponible",
  };
  if (!equipo.tipo_equipo || !equipo.marca || !equipo.modelo || !equipo.numero_serie) return { error: "Tipo, marca, modelo y numero de serie son obligatorios" };
  if (equipo.id_proveedor !== null && (!Number.isInteger(equipo.id_proveedor) || equipo.id_proveedor < 1)) return { error: "El proveedor seleccionado no es valido" };
  if (equipo.garantia_meses !== null && (!Number.isInteger(equipo.garantia_meses) || equipo.garantia_meses < 0)) return { error: "La garantia en meses no es valida" };
  if (!estadosEquipoValidos.includes(equipo.estado)) return { error: "El estado del equipo no es valido" };
  equipo.nombre_equipo ||= `${equipo.tipo_equipo} ${equipo.marca} ${equipo.modelo}`;
  equipo.vence_garantia = null;
  if (equipo.fecha_compra && equipo.garantia_meses !== null) {
    const fecha = new Date(`${equipo.fecha_compra}T12:00:00Z`);
    if (!Number.isNaN(fecha.getTime())) { fecha.setUTCMonth(fecha.getUTCMonth() + equipo.garantia_meses); equipo.vence_garantia = fecha.toISOString().slice(0, 10); }
  }
  return { equipo };
}

async function obtenerEquipo(clausula, valor) {
  const [filas] = await pool.query(`SELECT ${camposEquipo} FROM equipos e LEFT JOIN proveedores p ON p.id_proveedor = e.id_proveedor WHERE ${clausula} LIMIT 1`, [valor]);
  return filas[0];
}

async function obtenerAsignacionActualEquipo(idEquipo) {
  const [filas] = await pool.query(
    `SELECT a.id_asignacion, r.id_resguardo, r.folio,
      c.id_colaborador, c.nombre_completo, c.num_colaborador,
      d.tipo_asignacion, d.fecha_asignacion, d.fecha_devolucion_programada,
      d.estado_detalle
    FROM asignacion_detalles d
    JOIN asignaciones a ON a.id_asignacion = d.id_asignacion AND a.estado = 'activa'
    JOIN colaboradores c ON c.id_colaborador = a.id_colaborador
    LEFT JOIN resguardos r ON r.id_asignacion = a.id_asignacion AND r.tipo_documento = 'asignacion'
    WHERE d.id_equipo = ? AND d.estado_detalle = 'activo'
    ORDER BY d.fecha_asignacion DESC, d.id_detalle DESC
    LIMIT 1`,
    [idEquipo]
  );
  return filas[0] || null;
}

app.get("/api/equipos", verificarToken, async (req, res) => {
  const vista = req.query.estado || "activos";
  if (!["activos", "ocultos", "todos"].includes(vista)) return res.status(400).json({ mensaje: "El estado de consulta no es valido" });
  const filtros = [], parametros = [];
  if (vista !== "todos") { filtros.push("e.activo = ?"); parametros.push(vista === "activos" ? 1 : 0); }
  for (const campo of ["tipo_equipo", "marca", "id_proveedor"]) if (req.query[campo]) { filtros.push(`e.${campo} = ?`); parametros.push(req.query[campo]); }
  if (req.query.estado_equipo) { filtros.push("e.estado = ?"); parametros.push(req.query.estado_equipo); }
  try {
    const [equipos] = await pool.query(`SELECT ${camposEquipo},
      CASE WHEN e.estado = 'asignado' THEN COALESCE((
        SELECT COALESCE(NULLIF(TRIM(c.area), ''), 'Sin área asignada')
        FROM asignacion_detalles d
        JOIN asignaciones a ON a.id_asignacion = d.id_asignacion AND a.estado = 'activa'
        JOIN colaboradores c ON c.id_colaborador = a.id_colaborador
        WHERE d.id_equipo = e.id_equipo AND d.estado_detalle = 'activo'
        ORDER BY d.fecha_asignacion DESC, d.id_detalle DESC
        LIMIT 1
      ), 'Sin área asignada') ELSE '-' END AS area_actual
      FROM equipos e LEFT JOIN proveedores p ON p.id_proveedor = e.id_proveedor ${filtros.length ? `WHERE ${filtros.join(" AND ")}` : ""} ORDER BY e.fecha_creacion DESC`, parametros);
    return res.json({ equipos });
  } catch (error) { console.error("Error al listar equipos:", error); return res.status(500).json({ mensaje: "Error al listar equipos" }); }
});

app.get("/api/dashboard/resumen", verificarToken, async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN activo = 1 AND estado = 'asignado' THEN 1 ELSE 0 END), 0) AS asignado,
        COALESCE(SUM(CASE WHEN activo = 1 AND estado = 'disponible' THEN 1 ELSE 0 END), 0) AS disponible,
        COALESCE(SUM(CASE WHEN activo = 1 AND estado = 'mantenimiento' THEN 1 ELSE 0 END), 0) AS mantenimiento,
        COALESCE(SUM(CASE WHEN activo = 0 OR estado = 'baja' THEN 1 ELSE 0 END), 0) AS baja
      FROM equipos`
    );

    return res.json({ resumen: filas[0] || { total: 0, asignado: 0, disponible: 0, mantenimiento: 0, baja: 0 } });
  } catch (error) {
    console.error("Error al calcular el resumen del dashboard:", error);
    return res.status(500).json({ mensaje: "Error al cargar el resumen del dashboard" });
  }
});

app.get("/api/dashboard/ultimos-equipos", verificarToken, async (req, res) => {
  const limiteSolicitado = Number.parseInt(req.query.limit, 10);
  const limite = Number.isInteger(limiteSolicitado)
    ? Math.min(Math.max(limiteSolicitado, 1), 10)
    : 5;

  try {
    const [equipos] = await pool.query(
      `SELECT e.id_equipo, e.codigo_equipo, e.nombre_equipo, e.marca, e.modelo,
        e.estado, e.activo, e.fecha_creacion,
        CASE WHEN e.estado = 'asignado' THEN COALESCE((
          SELECT COALESCE(NULLIF(TRIM(c.area), ''), NULLIF(TRIM(c.departamento), ''))
          FROM asignacion_detalles d
          JOIN asignaciones a
            ON a.id_asignacion = d.id_asignacion
           AND a.estado = 'activa'
          JOIN colaboradores c ON c.id_colaborador = a.id_colaborador
          WHERE d.id_equipo = e.id_equipo
            AND d.estado_detalle = 'activo'
          ORDER BY d.fecha_asignacion DESC, d.id_detalle DESC
          LIMIT 1
        ), '-') ELSE '-' END AS area_actual
      FROM equipos e
      ORDER BY e.fecha_creacion DESC, e.id_equipo DESC
      LIMIT ?`,
      [limite]
    );

    return res.json({ equipos });
  } catch (error) {
    console.error("Error al consultar los ultimos equipos del dashboard:", error);
    return res.status(500).json({ mensaje: "Error al cargar los ultimos equipos" });
  }
});

app.post("/api/equipos", verificarToken, autorizarRoles("admin", "capturista"), async (req, res) => {
  const { equipo, error } = normalizarEquipo(req.body);
  if (error) return res.status(400).json({ mensaje: error });
  try {
    if (!equipo.codigo_equipo) { const [seq] = await pool.query("SELECT COALESCE(MAX(id_equipo), 0) + 1 siguiente FROM equipos"); equipo.codigo_equipo = `EQ-${String(seq[0].siguiente).padStart(4, "0")}`; }
    const qrToken = crypto.randomUUID();
    const qrUrl = `/equipos/qr/${qrToken}`;
    const [resultado] = await pool.query("INSERT INTO equipos (id_proveedor, codigo_equipo, nombre_equipo, tipo_equipo, marca, modelo, numero_serie, fecha_compra, garantia_meses, vence_garantia, especificaciones_tecnicas, foto_key, foto_url, qr_token, qr_url, estado, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, 1)", [equipo.id_proveedor, equipo.codigo_equipo, equipo.nombre_equipo, equipo.tipo_equipo, equipo.marca, equipo.modelo, equipo.numero_serie, equipo.fecha_compra, equipo.garantia_meses, equipo.vence_garantia, equipo.especificaciones_tecnicas, qrToken, qrUrl, equipo.estado]);
    void registrarLogActividad({
      usuario: req.usuario, accion: "Alta", modulo: "Equipos", entidad: "equipos",
      idEntidad: resultado.insertId, descripcion: `Alta de equipo: ${equipo.nombre_equipo} (${equipo.codigo_equipo})`, req,
      detalles: { id: resultado.insertId, nombre: equipo.nombre_equipo, codigo: equipo.codigo_equipo },
    });
    return res.status(201).json({ mensaje: "Equipo creado correctamente", equipo: await obtenerEquipo("e.id_equipo = ?", resultado.insertId) });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ mensaje: err.message.toLowerCase().includes("serie") ? "El numero de serie ya esta registrado" : "El codigo del equipo ya esta registrado" });
    console.error("Error al crear equipo:", err); return res.status(500).json({ mensaje: "Error al crear equipo" });
  }
});

app.put("/api/equipos/:id_equipo/estado", verificarToken, autorizarRoles("admin"), async (req, res) => {
  const activo = Number(req.body.activo);
  if (![0, 1].includes(activo)) return res.status(400).json({ mensaje: "El estado activo no es valido" });
  try { const [r] = await pool.query("UPDATE equipos SET activo = ?, fecha_actualizacion = NOW() WHERE id_equipo = ?", [activo, req.params.id_equipo]); if (!r.affectedRows) return res.status(404).json({ mensaje: "Equipo no encontrado" });
    void registrarLogActividad({
      usuario: req.usuario, accion: "Edicion", modulo: "Equipos", entidad: "equipos",
      idEntidad: req.params.id_equipo, descripcion: `Equipo ${activo ? "restaurado" : "ocultado"}: ID ${req.params.id_equipo}`, req,
      detalles: { id: req.params.id_equipo, activo },
    });
    return res.json({ mensaje: activo ? "Equipo activado correctamente" : "Equipo ocultado correctamente", equipo: await obtenerEquipo("e.id_equipo = ?", req.params.id_equipo) }); }
  catch (error) { console.error("Error al cambiar estado del equipo:", error); return res.status(500).json({ mensaje: "Error al cambiar estado del equipo" }); }
});

app.get("/api/equipos/qr/:qr_token", verificarToken, async (req, res) => {
  try { const equipo = await obtenerEquipo("e.qr_token = ?", req.params.qr_token); return equipo ? res.json({ equipo }) : res.status(404).json({ mensaje: "Equipo no encontrado" }); }
  catch { return res.status(500).json({ mensaje: "Error al consultar equipo" }); }
});

app.get("/api/equipos/:id_equipo", verificarToken, async (req, res) => {
  try {
    const equipo = await obtenerEquipo("e.id_equipo = ?", req.params.id_equipo);
    if (!equipo) return res.status(404).json({ mensaje: "Equipo no encontrado" });
    const asignacionActual = await obtenerAsignacionActualEquipo(equipo.id_equipo);
    return res.json({ equipo, asignacion_actual: asignacionActual });
  }
  catch { return res.status(500).json({ mensaje: "Error al consultar equipo" }); }
});

app.put("/api/equipos/:id_equipo", verificarToken, autorizarRoles("admin", "capturista"), async (req, res) => {
  const { equipo, error } = normalizarEquipo(req.body);
  if (error) return res.status(400).json({ mensaje: error });
  if (Object.prototype.hasOwnProperty.call(req.body, "estado") && equipo.estado === "asignado") {
    return res.status(400).json({ mensaje: "El estado asignado solo puede establecerse desde el flujo de Asignacion" });
  }
  try {
    const [actuales] = await pool.query("SELECT qr_token, qr_url, estado FROM equipos WHERE id_equipo = ? LIMIT 1", [req.params.id_equipo]);
    if (!actuales.length) return res.status(404).json({ mensaje: "Equipo no encontrado" });
    if (!Object.prototype.hasOwnProperty.call(req.body, "estado")) equipo.estado = actuales[0].estado;
    if (equipo.estado === "disponible") {
      const [detallesActivos] = await pool.query(
        `SELECT d.id_detalle
         FROM asignacion_detalles d
         JOIN asignaciones a
           ON a.id_asignacion = d.id_asignacion
          AND a.estado = 'activa'
         WHERE d.id_equipo = ? AND d.estado_detalle = 'activo'
         LIMIT 1`,
        [req.params.id_equipo]
      );
      if (detallesActivos.length) {
        return res.status(409).json({ mensaje: "Un equipo con asignacion activa no puede cambiarse manualmente a disponible" });
      }
    }
    const qrToken = actuales[0].qr_token || crypto.randomUUID();
    const qrUrl = actuales[0].qr_url || `/equipos/qr/${qrToken}`;
    await pool.query("UPDATE equipos SET id_proveedor = ?, codigo_equipo = COALESCE(NULLIF(?, ''), codigo_equipo), nombre_equipo = ?, tipo_equipo = ?, marca = ?, modelo = ?, numero_serie = ?, fecha_compra = ?, garantia_meses = ?, vence_garantia = ?, especificaciones_tecnicas = ?, estado = ?, qr_token = ?, qr_url = ?, fecha_actualizacion = NOW() WHERE id_equipo = ?", [equipo.id_proveedor, equipo.codigo_equipo, equipo.nombre_equipo, equipo.tipo_equipo, equipo.marca, equipo.modelo, equipo.numero_serie, equipo.fecha_compra, equipo.garantia_meses, equipo.vence_garantia, equipo.especificaciones_tecnicas, equipo.estado, qrToken, qrUrl, req.params.id_equipo]);
    void registrarLogActividad({
      usuario: req.usuario, accion: "Edicion", modulo: "Equipos", entidad: "equipos",
      idEntidad: req.params.id_equipo, descripcion: `Edición de equipo: ${equipo.nombre_equipo} (${equipo.codigo_equipo})`, req,
      detalles: { id: req.params.id_equipo, nombre: equipo.nombre_equipo, codigo: equipo.codigo_equipo },
    });
    return res.json({ mensaje: "Equipo actualizado correctamente", equipo: await obtenerEquipo("e.id_equipo = ?", req.params.id_equipo) });
  } catch (err) { if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ mensaje: "El numero de serie o codigo ya esta registrado en otro equipo" }); return res.status(500).json({ mensaje: "Error al editar equipo" }); }
});

const tiposAsignacionValidos = ["temporal", "permanente"];

function textoOpcional(valor) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

function agruparAsignacionesActivas(filas) {
  const asignaciones = new Map();

  for (const fila of filas) {
    if (!asignaciones.has(fila.id_asignacion)) {
      asignaciones.set(fila.id_asignacion, {
        id_asignacion: fila.id_asignacion,
        fecha_resguardo: fila.fecha_resguardo,
        estado: fila.estado_asignacion,
        observaciones_generales: fila.observaciones_generales,
        colaborador: {
          id_colaborador: fila.id_colaborador,
          nombre_completo: fila.nombre_completo,
          num_colaborador: fila.num_colaborador,
          area: fila.area,
          departamento: fila.departamento,
          puesto: fila.puesto,
          correo: fila.correo,
        },
        resguardo: fila.id_resguardo ? {
          id_resguardo: fila.id_resguardo,
          folio: fila.folio,
          tipo_documento: fila.tipo_documento,
        } : null,
        activos: [],
      });
    }

    asignaciones.get(fila.id_asignacion).activos.push({
      id_detalle: fila.id_detalle,
      id_equipo: fila.id_equipo,
      codigo_equipo: fila.codigo_equipo,
      nombre_equipo: fila.nombre_equipo,
      tipo_equipo: fila.tipo_equipo,
      marca: fila.marca,
      modelo: fila.modelo,
      numero_serie: fila.numero_serie,
      tipo_asignacion: fila.tipo_asignacion,
      fecha_asignacion: fila.fecha_asignacion,
      fecha_devolucion_programada: fila.fecha_devolucion_programada,
      accesorios_entregados: fila.accesorios_entregados,
      estado_fisico_entrega: fila.estado_fisico_entrega,
      observaciones: fila.observaciones,
      estado_detalle: fila.estado_detalle,
      fecha_devolucion_real: fila.fecha_devolucion_real,
      estado_fisico_devolucion: fila.estado_fisico_devolucion,
      accesorios_devueltos: fila.accesorios_devueltos,
      observaciones_devolucion: fila.observaciones_devolucion,
    });
  }

  return [...asignaciones.values()].map((asignacion) => {
    const tipos = [...new Set(asignacion.activos.map((activo) => activo.tipo_asignacion))];
    const fechasDevolucion = asignacion.activos
      .map((activo) => activo.fecha_devolucion_programada)
      .filter(Boolean)
      .sort();

    return {
      ...asignacion,
      cantidad_activos: asignacion.activos.length,
      tipos_activos: [...new Set(asignacion.activos.map((activo) => activo.tipo_equipo))],
      tipo_asignacion_general: tipos.length === 1 ? tipos[0] : "mixto",
      fecha_inicio: asignacion.activos.map((activo) => activo.fecha_asignacion).filter(Boolean).sort()[0] || asignacion.fecha_resguardo,
      fecha_devolucion_programada: fechasDevolucion.at(-1) || null,
    };
  });
}

async function consultarAsignacionCompleta(ejecutor, idAsignacion) {
  const [filas] = await ejecutor.query(
    `SELECT a.id_asignacion, a.fecha_resguardo, a.estado AS estado_asignacion, a.observaciones_generales,
      c.id_colaborador, c.nombre_completo, c.num_colaborador, c.area, c.departamento, c.puesto, c.correo,
      u.id_usuario AS id_responsable, u.nombre_completo AS responsable_nombre, u.rol AS responsable_rol,
      r.id_resguardo, r.folio, r.tipo_documento, r.estado AS estado_resguardo,
      r.firma_colaborador, r.firma_responsable, r.pdf_key, r.pdf_url, r.correo_enviado,
      d.id_detalle, d.id_equipo, d.tipo_asignacion, d.fecha_asignacion,
      d.fecha_devolucion_programada, d.fecha_devolucion_real, d.accesorios_entregados,
      d.estado_fisico_entrega, d.observaciones, d.estado_detalle, d.estado_fisico_devolucion,
      d.accesorios_devueltos, d.observaciones_devolucion,
      COALESCE(d.codigo_equipo_snapshot, e.codigo_equipo) AS codigo_equipo,
      COALESCE(d.nombre_equipo_snapshot, e.nombre_equipo) AS nombre_equipo,
      COALESCE(d.tipo_equipo_snapshot, e.tipo_equipo) AS tipo_equipo,
      COALESCE(d.marca_snapshot, e.marca) AS marca, COALESCE(d.modelo_snapshot, e.modelo) AS modelo,
      COALESCE(d.numero_serie_snapshot, e.numero_serie) AS numero_serie
    FROM asignaciones a
    JOIN colaboradores c ON c.id_colaborador = a.id_colaborador
    LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario_entrega
    LEFT JOIN resguardos r ON r.id_asignacion = a.id_asignacion AND r.tipo_documento = 'asignacion'
    JOIN asignacion_detalles d ON d.id_asignacion = a.id_asignacion
    JOIN equipos e ON e.id_equipo = d.id_equipo
    WHERE a.id_asignacion = ?
    ORDER BY d.id_detalle`,
    [idAsignacion]
  );

  if (!filas.length) return null;
  const agrupada = agruparAsignacionesActivas(filas)[0];
  return {
    asignacion: {
      id_asignacion: agrupada.id_asignacion,
      fecha_resguardo: agrupada.fecha_resguardo,
      estado: agrupada.estado,
      observaciones_generales: agrupada.observaciones_generales,
    },
    colaborador: agrupada.colaborador,
    responsable: filas[0].id_responsable ? {
      id_usuario: filas[0].id_responsable,
      nombre_completo: filas[0].responsable_nombre,
      rol: filas[0].responsable_rol,
    } : null,
    resguardo: agrupada.resguardo ? {
      ...agrupada.resguardo,
      estado: filas[0].estado_resguardo,
      firma_colaborador: filas[0].firma_colaborador,
      firma_responsable: filas[0].firma_responsable,
      pdf_key: filas[0].pdf_key,
      pdf_url: filas[0].pdf_url,
      correo_enviado: filas[0].correo_enviado,
    } : null,
    activos: agrupada.activos,
  };
}

app.get("/api/asignaciones/activas", verificarToken, async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT a.id_asignacion, a.fecha_resguardo, a.estado AS estado_asignacion, a.observaciones_generales,
        c.id_colaborador, c.nombre_completo, c.num_colaborador, c.area, c.departamento, c.puesto, c.correo,
        r.id_resguardo, r.folio, r.tipo_documento,
        d.id_detalle, d.id_equipo, d.tipo_asignacion, d.fecha_asignacion,
        d.fecha_devolucion_programada, d.accesorios_entregados, d.estado_fisico_entrega,
        d.observaciones, d.estado_detalle,
        COALESCE(d.codigo_equipo_snapshot, e.codigo_equipo) AS codigo_equipo,
        COALESCE(d.nombre_equipo_snapshot, e.nombre_equipo) AS nombre_equipo,
        COALESCE(d.tipo_equipo_snapshot, e.tipo_equipo) AS tipo_equipo,
        COALESCE(d.marca_snapshot, e.marca) AS marca, COALESCE(d.modelo_snapshot, e.modelo) AS modelo,
        COALESCE(d.numero_serie_snapshot, e.numero_serie) AS numero_serie
      FROM asignaciones a
      JOIN colaboradores c ON c.id_colaborador = a.id_colaborador
      JOIN asignacion_detalles d ON d.id_asignacion = a.id_asignacion AND d.estado_detalle = 'activo'
      JOIN equipos e ON e.id_equipo = d.id_equipo
      LEFT JOIN resguardos r ON r.id_asignacion = a.id_asignacion AND r.tipo_documento = 'asignacion'
      WHERE a.estado = 'activa'
      ORDER BY a.fecha_resguardo DESC, a.id_asignacion DESC, d.id_detalle`,
    );
    return res.json({ asignaciones: agruparAsignacionesActivas(filas) });
  } catch (error) {
    console.error("Error al listar asignaciones activas:", error);
    return res.status(500).json({ mensaje: "Error al listar asignaciones activas" });
  }
});

app.post(
  "/api/asignaciones",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    const idColaborador = Number(req.body.id_colaborador);
    const activos = req.body.activos;

    if (!Number.isInteger(idColaborador) || idColaborador < 1) {
      return res.status(400).json({ mensaje: "El colaborador es obligatorio" });
    }
    if (!Array.isArray(activos) || activos.length === 0) {
      return res.status(400).json({ mensaje: "Debes incluir al menos un activo" });
    }

    const ids = new Set();
    const normalizados = [];
    for (const activo of activos) {
      const idEquipo = Number(activo.id_equipo);
      const tipoAsignacion = String(activo.tipo_asignacion || "").trim().toLowerCase();
      const fechaDevolucion = textoOpcional(activo.fecha_devolucion_programada);

      if (!Number.isInteger(idEquipo) || idEquipo < 1) {
        return res.status(400).json({ mensaje: "Cada activo debe tener un id_equipo valido" });
      }
      if (ids.has(idEquipo)) {
        return res.status(400).json({ mensaje: "No puedes incluir el mismo equipo dos veces" });
      }
      if (!tiposAsignacionValidos.includes(tipoAsignacion)) {
        return res.status(400).json({ mensaje: "El tipo de asignacion debe ser temporal o permanente" });
      }
      if (tipoAsignacion === "temporal" && !fechaDevolucion) {
        return res.status(400).json({ mensaje: "La fecha de devolucion es obligatoria para activos temporales" });
      }

      ids.add(idEquipo);
      normalizados.push({
        id_equipo: idEquipo,
        tipo_asignacion: tipoAsignacion,
        fecha_devolucion_programada: tipoAsignacion === "permanente" ? null : fechaDevolucion,
        accesorios_entregados: textoOpcional(activo.accesorios_entregados),
        estado_fisico_entrega: textoOpcional(activo.estado_fisico_entrega) || "Buen estado",
        observaciones: textoOpcional(activo.observaciones),
      });
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [colaboradores] = await conexion.query(
        "SELECT id_colaborador, nombre_completo, num_colaborador, correo FROM colaboradores WHERE id_colaborador = ? AND activo = 1 LIMIT 1 FOR UPDATE",
        [idColaborador]
      );
      if (!colaboradores.length) {
        await conexion.rollback();
        return res.status(400).json({ mensaje: "El colaborador no existe o esta inactivo" });
      }

      const marcadores = normalizados.map(() => "?").join(", ");
      const idsEquipos = normalizados.map((activo) => activo.id_equipo);
      const [equiposDisponibles] = await conexion.query(
        `SELECT id_equipo, codigo_equipo, nombre_equipo, tipo_equipo, marca, modelo, numero_serie FROM equipos WHERE id_equipo IN (${marcadores}) AND activo = 1 AND estado = 'disponible' FOR UPDATE`,
        idsEquipos
      );
      if (equiposDisponibles.length !== normalizados.length) {
        await conexion.rollback();
        return res.status(409).json({ mensaje: "Uno o mas equipos ya no estan disponibles" });
      }

      const [detallesActivos] = await conexion.query(
        `SELECT id_equipo FROM asignacion_detalles WHERE id_equipo IN (${marcadores}) AND estado_detalle = 'activo' LIMIT 1 FOR UPDATE`,
        idsEquipos
      );
      if (detallesActivos.length) {
        await conexion.rollback();
        return res.status(409).json({ mensaje: "Uno o mas equipos ya tienen una asignacion activa" });
      }

      const [asignacion] = await conexion.query(
        "INSERT INTO asignaciones (id_colaborador, id_usuario_entrega, fecha_resguardo, estado, observaciones_generales) VALUES (?, ?, CURDATE(), 'activa', ?)",
        [idColaborador, req.usuario.id_usuario || null, textoOpcional(req.body.observaciones_generales)]
      );

      const equiposPorId = new Map(equiposDisponibles.map((equipo) => [Number(equipo.id_equipo), equipo]));
      for (const activo of normalizados) {
        const equipo = equiposPorId.get(activo.id_equipo);
        await conexion.query(
          `INSERT INTO asignacion_detalles
            (id_asignacion, id_equipo, codigo_equipo_snapshot, nombre_equipo_snapshot,
             tipo_equipo_snapshot, marca_snapshot, modelo_snapshot, numero_serie_snapshot,
             tipo_asignacion, fecha_asignacion, fecha_devolucion_programada,
             accesorios_entregados, estado_fisico_entrega, observaciones, estado_detalle)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, 'activo')`,
          [asignacion.insertId, activo.id_equipo, equipo.codigo_equipo, equipo.nombre_equipo,
            equipo.tipo_equipo, equipo.marca, equipo.modelo, equipo.numero_serie,
            activo.tipo_asignacion, activo.fecha_devolucion_programada,
            activo.accesorios_entregados, activo.estado_fisico_entrega, activo.observaciones]
        );
      }

      await conexion.query(
        `UPDATE equipos SET estado = 'asignado', fecha_actualizacion = NOW() WHERE id_equipo IN (${marcadores})`,
        idsEquipos
      );

      const folio = `RES-${String(asignacion.insertId).padStart(6, "0")}`;
      const [resguardo] = await conexion.query(
        `INSERT INTO resguardos
          (id_asignacion, id_usuario_responsable, tipo_documento, fecha_documento,
           nombre_colaborador_snapshot, num_colaborador_snapshot, nombre_responsable_snapshot,
           folio, correo_colaborador, correo_responsable, correo_enviado, estado)
         VALUES (?, ?, 'asignacion', NOW(), ?, ?, ?, ?, ?, ?, 0, 'generado')`,
        [asignacion.insertId, req.usuario.id_usuario || null, colaboradores[0].nombre_completo,
          colaboradores[0].num_colaborador, req.usuario.nombre_completo || req.usuario.correo || null,
          folio, colaboradores[0].correo || null, req.usuario.correo || null]
      );

      await conexion.commit();
      void registrarLogActividad({
        usuario: req.usuario, accion: "Asignacion", modulo: "Asignaciones", entidad: "asignaciones",
        idEntidad: asignacion.insertId,
        descripcion: `Asignación registrada para: ${colaboradores[0].nombre_completo}`, req,
        detalles: { id_asignacion: asignacion.insertId, id_colaborador: idColaborador,
          nombre_colaborador: colaboradores[0].nombre_completo, cantidad_equipos: normalizados.length,
          tipo_asignacion: [...new Set(normalizados.map((item) => item.tipo_asignacion))].join(", ") },
      });
      return res.status(201).json({
        mensaje: "Asignacion y resguardo creados correctamente",
        id_asignacion: asignacion.insertId,
        id_resguardo: resguardo.insertId,
        folio,
      });
    } catch (error) {
      await conexion.rollback();
      console.error("Error al crear asignacion:", error);
      return res.status(500).json({ mensaje: "Error al crear la asignacion" });
    } finally {
      conexion.release();
    }
  }
);

app.get("/api/asignaciones/:id_asignacion", verificarToken, async (req, res) => {
  try {
    const detalle = await consultarAsignacionCompleta(pool, req.params.id_asignacion);
    return detalle ? res.json(detalle) : res.status(404).json({ mensaje: "Asignacion no encontrada" });
  } catch (error) {
    console.error("Error al consultar asignacion:", error);
    return res.status(500).json({ mensaje: "Error al consultar la asignacion" });
  }
});

app.post(
  "/api/asignaciones/:id_asignacion/devoluciones",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    const idAsignacion = Number(req.params.id_asignacion);
    const detalles = req.body.detalles;
    const fechaDevolucion = String(req.body.fecha_devolucion || "").trim();
    if (!Number.isInteger(idAsignacion) || idAsignacion < 1) return res.status(400).json({ mensaje: "La asignacion no es valida" });
    if (!Array.isArray(detalles) || !detalles.length) return res.status(400).json({ mensaje: "Selecciona al menos un activo para devolver" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDevolucion)) return res.status(400).json({ mensaje: "La fecha de devolucion no es valida" });

    const ids = new Set();
    const normalizados = [];
    for (const detalle of detalles) {
      const idDetalle = Number(detalle.id_detalle);
      if (!Number.isInteger(idDetalle) || idDetalle < 1) return res.status(400).json({ mensaje: "Cada activo debe tener un id_detalle valido" });
      if (ids.has(idDetalle)) return res.status(400).json({ mensaje: "No puedes devolver el mismo activo dos veces" });
      ids.add(idDetalle);
      normalizados.push({
        id_detalle: idDetalle,
        estado_fisico_devolucion: textoOpcional(detalle.estado_fisico_devolucion) || "Buen estado",
        accesorios_devueltos: textoOpcional(detalle.accesorios_devueltos),
        observaciones_devolucion: textoOpcional(detalle.observaciones_devolucion),
      });
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [asignaciones] = await conexion.query(
        `SELECT a.id_asignacion, a.estado, c.nombre_completo, c.num_colaborador, c.correo
         FROM asignaciones a JOIN colaboradores c ON c.id_colaborador = a.id_colaborador
         WHERE a.id_asignacion = ? LIMIT 1 FOR UPDATE`, [idAsignacion]
      );
      if (!asignaciones.length) { await conexion.rollback(); return res.status(404).json({ mensaje: "Asignacion no encontrada" }); }
      if (asignaciones[0].estado !== "activa") { await conexion.rollback(); return res.status(409).json({ mensaje: "La asignacion ya no esta activa" }); }

      const marcadores = normalizados.map(() => "?").join(", ");
      const idsDetalle = normalizados.map((detalle) => detalle.id_detalle);
      const [detallesActivos] = await conexion.query(
        `SELECT id_detalle, id_equipo FROM asignacion_detalles
         WHERE id_asignacion = ? AND id_detalle IN (${marcadores}) AND estado_detalle = 'activo' FOR UPDATE`,
        [idAsignacion, ...idsDetalle]
      );
      if (detallesActivos.length !== normalizados.length) {
        await conexion.rollback();
        return res.status(409).json({ mensaje: "Uno o mas activos ya fueron devueltos o no pertenecen a la asignacion" });
      }

      for (const detalle of normalizados) {
        await conexion.query(
          `UPDATE asignacion_detalles SET fecha_devolucion_real = CONCAT(?, ' ', CURTIME()),
             estado_fisico_devolucion = ?, accesorios_devueltos = ?, observaciones_devolucion = ?,
             estado_detalle = 'devuelto', fecha_actualizacion = NOW()
           WHERE id_detalle = ? AND id_asignacion = ? AND estado_detalle = 'activo'`,
          [fechaDevolucion, detalle.estado_fisico_devolucion, detalle.accesorios_devueltos,
            detalle.observaciones_devolucion, detalle.id_detalle, idAsignacion]
        );
      }

      const idsEquipo = detallesActivos.map((detalle) => detalle.id_equipo);
      const marcadoresEquipo = idsEquipo.map(() => "?").join(", ");
      await conexion.query(`UPDATE equipos SET estado = 'disponible', fecha_actualizacion = NOW() WHERE id_equipo IN (${marcadoresEquipo})`, idsEquipo);
      const [[pendientes]] = await conexion.query("SELECT COUNT(id_detalle) AS total FROM asignacion_detalles WHERE id_asignacion = ? AND estado_detalle = 'activo'", [idAsignacion]);
      const devolucionTotal = Number(pendientes.total) === 0;
      await conexion.query("UPDATE asignaciones SET estado = ?, fecha_actualizacion = NOW() WHERE id_asignacion = ?", [devolucionTotal ? "devuelta" : "activa", idAsignacion]);

      const [usuarios] = await conexion.query("SELECT nombre_completo, correo FROM usuarios WHERE id_usuario = ? LIMIT 1", [req.usuario.id_usuario]);
      const responsable = usuarios[0] || {};
      const folio = `DEV-${String(idAsignacion).padStart(6, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const [resguardo] = await conexion.query(
        `INSERT INTO resguardos
          (id_asignacion, id_usuario_responsable, tipo_documento, fecha_documento,
           nombre_colaborador_snapshot, num_colaborador_snapshot, nombre_responsable_snapshot,
           folio, firma_colaborador, firma_responsable, correo_colaborador,
           correo_responsable, correo_enviado, estado)
         VALUES (?, ?, 'devolucion', CONCAT(?, ' ', CURTIME()), ?, ?, ?, ?, ?, ?, ?, ?, 0, 'generado')`,
        [idAsignacion, req.usuario.id_usuario || null, fechaDevolucion, asignaciones[0].nombre_completo,
          asignaciones[0].num_colaborador, responsable.nombre_completo || req.usuario.correo || null,
          folio, textoOpcional(req.body.firma_colaborador), textoOpcional(req.body.firma_responsable),
          asignaciones[0].correo || null, responsable.correo || req.usuario.correo || null]
      );

      await conexion.commit();
      void registrarLogActividad({
        usuario: req.usuario, accion: "Asignacion", modulo: "Devoluciones", entidad: "asignaciones",
        idEntidad: idAsignacion,
        descripcion: `Devolución ${devolucionTotal ? "total" : "parcial"} registrada para: ${asignaciones[0].nombre_completo}`, req,
        detalles: { id_asignacion: idAsignacion, nombre_colaborador: asignaciones[0].nombre_completo,
          cantidad_devuelta: normalizados.length, tipo_devolucion: devolucionTotal ? "total" : "parcial" },
      });
      return res.status(201).json({
        mensaje: devolucionTotal ? "Devolucion total registrada correctamente" : "Devolucion parcial registrada correctamente",
        id_asignacion: idAsignacion, id_resguardo: resguardo.insertId, folio,
        tipo_devolucion: devolucionTotal ? "total" : "parcial",
        activos_devueltos: normalizados.length, activos_pendientes: Number(pendientes.total),
      });
    } catch (error) {
      await conexion.rollback();
      console.error("Error al registrar devolucion:", error);
      return res.status(500).json({ mensaje: "Error al registrar la devolucion" });
    } finally { conexion.release(); }
  }
);
app.get("/api/resguardos", verificarToken, async (req, res) => {
  try {
    const [resguardos] = await pool.query(
      `SELECT r.id_resguardo, r.id_asignacion, r.tipo_documento,
        r.nombre_colaborador_snapshot, r.num_colaborador_snapshot,
        r.fecha_documento, r.estado
      FROM resguardos r
      JOIN asignaciones a ON a.id_asignacion = r.id_asignacion
      ORDER BY r.fecha_documento DESC, r.id_resguardo DESC`
    );
    if (!resguardos.length) return res.json({ resguardos: [] });

    const idsAsignacion = [...new Set(resguardos.map((item) => item.id_asignacion))];
    const marcadores = idsAsignacion.map(() => "?").join(", ");
    const [detalles] = await pool.query(
      `SELECT d.id_asignacion, d.id_detalle,
        COALESCE(NULLIF(d.codigo_equipo_snapshot, ''), e.codigo_equipo) AS codigo_equipo,
        COALESCE(NULLIF(d.nombre_equipo_snapshot, ''), e.nombre_equipo) AS nombre_equipo,
        COALESCE(NULLIF(d.tipo_equipo_snapshot, ''), e.tipo_equipo) AS tipo_equipo,
        COALESCE(NULLIF(d.marca_snapshot, ''), e.marca) AS marca,
        COALESCE(NULLIF(d.modelo_snapshot, ''), e.modelo) AS modelo,
        COALESCE(NULLIF(d.numero_serie_snapshot, ''), e.numero_serie) AS numero_serie,
        d.tipo_asignacion
      FROM asignacion_detalles d
      LEFT JOIN equipos e ON e.id_equipo = d.id_equipo
      WHERE d.id_asignacion IN (${marcadores})
      ORDER BY d.id_asignacion, d.id_detalle`,
      idsAsignacion
    );
    const equiposPorAsignacion = new Map();
    for (const detalle of detalles) {
      if (!equiposPorAsignacion.has(detalle.id_asignacion)) equiposPorAsignacion.set(detalle.id_asignacion, []);
      equiposPorAsignacion.get(detalle.id_asignacion).push(detalle);
    }
    return res.json({
      resguardos: resguardos.map((item) => {
        const equipos = equiposPorAsignacion.get(item.id_asignacion) || [];
        const tipos = [...new Set(equipos.map((equipo) => equipo.tipo_asignacion).filter(Boolean))];
        return {
          ...item,
          cantidad_equipos: equipos.length,
          tipo_asignacion: tipos.length > 1 ? "mixto" : tipos[0] || null,
          equipos,
        };
      }),
    });
  } catch (error) {
    console.error("Error al listar resguardos:", error);
    return res.status(500).json({ mensaje: "Error al listar los resguardos" });
  }
});
app.get("/api/resguardos/:id_resguardo", verificarToken, async (req, res) => {
  try {
    const [resguardos] = await pool.query(
      "SELECT id_asignacion FROM resguardos WHERE id_resguardo = ? LIMIT 1",
      [req.params.id_resguardo]
    );
    if (!resguardos.length) return res.status(404).json({ mensaje: "Resguardo no encontrado" });
    const detalle = await consultarAsignacionCompleta(pool, resguardos[0].id_asignacion);
    return res.json(detalle);
  } catch (error) {
    console.error("Error al consultar resguardo:", error);
    return res.status(500).json({ mensaje: "Error al consultar el resguardo" });
  }
});

app.put("/api/resguardos/:id_resguardo/firmas", verificarToken, async (req, res) => {
  const firmaColaborador = textoOpcional(req.body.firma_colaborador);
  const firmaResponsable = textoOpcional(req.body.firma_responsable);
  try {
    const [resultado] = await pool.query(
      "UPDATE resguardos SET firma_colaborador = ?, firma_responsable = ?, fecha_actualizacion = NOW() WHERE id_resguardo = ?",
      [firmaColaborador, firmaResponsable, req.params.id_resguardo]
    );
    if (!resultado.affectedRows) return res.status(404).json({ mensaje: "Resguardo no encontrado" });
    return res.json({ mensaje: "Firmas guardadas correctamente" });
  } catch (error) {
    console.error("Error al guardar firmas:", error);
    return res.status(500).json({ mensaje: "Error al guardar las firmas" });
  }
});
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
    "SELECT " + camposColaborador + ", (SELECT COUNT(*) FROM asignaciones a INNER JOIN asignacion_detalles ad ON ad.id_asignacion = a.id_asignacion WHERE a.id_colaborador = colaboradores.id_colaborador AND a.estado = 'activa' AND ad.estado_detalle = 'activo') AS equipos_asignados FROM colaboradores WHERE id_colaborador = ? LIMIT 1",
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
        "SELECT " + camposColaborador + ", (SELECT COUNT(*) FROM asignaciones a INNER JOIN asignacion_detalles ad ON ad.id_asignacion = a.id_asignacion WHERE a.id_colaborador = colaboradores.id_colaborador AND a.estado = 'activa' AND ad.estado_detalle = 'activo') AS equipos_asignados FROM colaboradores" + condicion +
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

app.get(
  "/api/colaboradores/buscar",
  verificarToken,
  autorizarRoles("admin", "capturista"),
  async (req, res) => {
    const termino = String(req.query.q ?? "").trim();
    if (termino.length < 2) {
      return res.status(400).json({ mensaje: "Escribe al menos 2 caracteres para buscar" });
    }

    const offsetSolicitado = Number.parseInt(req.query.offset, 10);
    const offset = Number.isInteger(offsetSolicitado) && offsetSolicitado > 0
      ? offsetSolicitado
      : 0;
    const limiteSolicitado = Number.parseInt(req.query.limit, 10);
    const limite = Number.isInteger(limiteSolicitado)
      ? Math.min(Math.max(limiteSolicitado, 1), 20)
      : 20;
    const coincidencia = `%${termino.toLowerCase()}%`;

    try {
      const [filas] = await pool.query(
        `SELECT id_colaborador, num_colaborador, nombre_completo, area, departamento, puesto, correo
        FROM colaboradores
        WHERE activo = 1
          AND (
            LOWER(nombre_completo) LIKE ?
            OR LOWER(COALESCE(puesto, '')) LIKE ?
            OR LOWER(COALESCE(departamento, '')) LIKE ?
            OR LOWER(num_colaborador) LIKE ?
          )
        ORDER BY nombre_completo, id_colaborador
        LIMIT ? OFFSET ?`,
        [coincidencia, coincidencia, coincidencia, coincidencia, limite + 1, offset]
      );

      const tieneMas = filas.length > limite;
      const colaboradores = tieneMas ? filas.slice(0, limite) : filas;
      return res.json({
        colaboradores,
        has_more: tieneMas,
        next_offset: offset + colaboradores.length,
      });
    } catch (error) {
      console.error("Error al buscar colaboradores:", error);
      return res.status(500).json({ mensaje: "Error al buscar colaboradores" });
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

      void registrarLogActividad({
        usuario: req.usuario, accion: "Alta", modulo: "Colaboradores", entidad: "colaboradores",
        idEntidad: resultado.insertId,
        descripcion: `Alta de colaborador: ${colaborador.nombre_completo}`, req,
        detalles: { id: resultado.insertId, nombre: colaborador.nombre_completo },
      });

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

      void registrarLogActividad({
        usuario: req.usuario, accion: "Edicion", modulo: "Colaboradores", entidad: "colaboradores",
        idEntidad: req.params.id_colaborador,
        descripcion: `Colaborador ${activo ? "restaurado" : "ocultado"}: ID ${req.params.id_colaborador}`, req,
        detalles: { id: req.params.id_colaborador, activo },
      });

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

      void registrarLogActividad({
        usuario: req.usuario, accion: "Edicion", modulo: "Colaboradores", entidad: "colaboradores",
        idEntidad: req.params.id_colaborador,
        descripcion: `Edición de colaborador: ${colaborador.nombre_completo}`, req,
        detalles: { id: req.params.id_colaborador, nombre: colaborador.nombre_completo },
      });

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

app.use(
  "/api/mantenimientos",
  crearRouterMantenimientos({ verificarToken, autorizarRoles })
);

app.use(
  "/api/logs-actividad",
  crearRouterLogsActividad({ pool, verificarToken, autorizarRoles })
);

app.use(
  "/api/equipos-imagenes",
  crearRouterImagenesEquipos({ pool, verificarToken, autorizarRoles, registrarLogActividad })
);
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
