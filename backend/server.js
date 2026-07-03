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

function verificarToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  const partes = authorization.split(" ");

  if (partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
    return res.status(401).json({ mensaje: "Formato de token inválido" });
  }

  try {
    req.usuario = jwt.verify(partes[1], process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}

app.post("/api/register", async (req, res) => {
  const { nombre_completo, correo, contrasena } = req.body;

  if (
    typeof nombre_completo !== "string" ||
    !nombre_completo.trim() ||
    typeof correo !== "string" ||
    !correo.trim() ||
    typeof contrasena !== "string" ||
    !contrasena
  ) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  const correoNormalizado = correo.trim().toLowerCase();

  try {
    const [usuariosExistentes] = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1",
      [correoNormalizado]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({ mensaje: "El correo ya está registrado" });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);
    const correosAdmin = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const rol = correosAdmin.includes(correoNormalizado) ? "admin" : "usuario";

    const [resultado] = await pool.query(
      "INSERT INTO usuarios " +
        "(nombre_completo, correo, contrasena_hash, rol, activo, debe_cambiar_contrasena) " +
        "VALUES (?, ?, ?, ?, 1, 0)",
      [nombre_completo.trim(), correoNormalizado, contrasenaHash, rol]
    );

    return res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      usuario: {
        id_usuario: resultado.insertId,
        nombre_completo: nombre_completo.trim(),
        correo: correoNormalizado,
        rol,
        activo: 1,
        debe_cambiar_contrasena: 0,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "El correo ya está registrado" });
    }

    console.error("Error al registrar usuario:", error);
    return res.status(500).json({ mensaje: "Error al registrar usuario" });
  }
});

app.post("/api/login", async (req, res) => {
  const { correo, contrasena } = req.body;

  if (
    typeof correo !== "string" ||
    !correo.trim() ||
    typeof contrasena !== "string" ||
    !contrasena
  ) {
    return res.status(400).json({ mensaje: "Correo y contraseña son obligatorios" });
  }

  const correoNormalizado = correo.trim().toLowerCase();

  try {
    const [usuarios] = await pool.query(
      "SELECT id_usuario, nombre_completo, correo, contrasena_hash, rol, activo, " +
        "debe_cambiar_contrasena FROM usuarios WHERE correo = ? LIMIT 1",
      [correoNormalizado]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    const usuario = usuarios[0];

    if (Number(usuario.activo) !== 1) {
      return res.status(403).json({ mensaje: "El usuario está inactivo" });
    }

    const contrasenaCorrecta = await bcrypt.compare(
      contrasena,
      usuario.contrasena_hash
    );

    if (!contrasenaCorrecta) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
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

app.put("/api/usuarios/correo", verificarToken, async (req, res) => {
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
      return res.status(409).json({ mensaje: "El correo ya está en uso" });
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
      return res.status(409).json({ mensaje: "El correo ya está en uso" });
    }

    console.error("Error al actualizar correo:", error);
    return res.status(500).json({ mensaje: "Error al actualizar correo" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
