const express = require("express");
const pool = require("../config/db");

const TIPOS_VALIDOS = ["falla", "correctivo", "preventivo"];
const ESTADOS_VALIDOS = ["en_proceso", "resuelto", "cancelado"];
const TIPOS_EXCLUIDOS = ["yubikey", "tarjeta", "teclado", "mouse", "cargador"];

const CAMPOS_MANTENIMIENTO =
  "m.id_mantenimiento, m.id_equipo, m.id_usuario_registro, m.id_colaborador_contexto, " +
  "m.tipo_mantenimiento, m.titulo, m.descripcion, m.tecnico_responsable, m.proveedor_servicio, " +
  "m.costo, m.estado_mantenimiento, m.estado_equipo_anterior, m.estado_equipo_posterior, " +
  "m.fecha_mantenimiento, m.fecha_resolucion, m.observaciones, m.fecha_creacion, m.fecha_actualizacion, " +
  "COALESCE(m.codigo_equipo_snapshot,e.codigo_equipo) AS codigo_equipo, " +
  "COALESCE(m.nombre_equipo_snapshot,e.nombre_equipo) AS nombre_equipo, " +
  "COALESCE(m.tipo_equipo_snapshot,e.tipo_equipo) AS tipo_equipo, " +
  "COALESCE(m.marca_snapshot,e.marca) AS marca, COALESCE(m.modelo_snapshot,e.modelo) AS modelo, " +
  "COALESCE(m.numero_serie_snapshot,e.numero_serie) AS numero_serie, " +
  "m.nombre_colaborador_snapshot, m.num_colaborador_snapshot";

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}

function textoOpcional(valor) {
  return limpiarTexto(valor) || null;
}

function parsearCosto(valor) {
  if (valor === "" || valor === null || valor === undefined) return 0;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0
    ? Number(numero.toFixed(2))
    : Number.NaN;
}

function generarTitulo(tipo, descripcion) {
  const etiqueta = {
    falla: "Falla reportada",
    correctivo: "Mantenimiento correctivo",
    preventivo: "Preventivo",
  }[tipo] || "Mantenimiento";
  const detalle = limpiarTexto(descripcion).replace(/\s+/g, " ");
  if (!detalle) return etiqueta;
  const corto = detalle.length > 80
    ? detalle.slice(0, 77).trim() + "..."
    : detalle;
  return (etiqueta + " - " + corto).slice(0, 150);
}

function normalizarMantenimiento(body = {}, parcial = false) {
  const resultado = {};
  const incluir = (campo, convertir) => {
    if (!parcial || Object.prototype.hasOwnProperty.call(body, campo)) {
      resultado[campo] = convertir(body[campo]);
    }
  };

  incluir("id_equipo", Number);
  incluir("fecha_mantenimiento", limpiarTexto);
  incluir("tipo_mantenimiento", (valor) => limpiarTexto(valor).toLowerCase());
  incluir("titulo", limpiarTexto);
  incluir("descripcion", limpiarTexto);
  incluir("tecnico_responsable", textoOpcional);
  incluir("proveedor_servicio", textoOpcional);
  incluir("estado_mantenimiento", (valor) => limpiarTexto(valor).toLowerCase());
  incluir("costo", parsearCosto);
  incluir("observaciones", textoOpcional);

  if (!parcial && !resultado.titulo) {
    resultado.titulo = generarTitulo(
      resultado.tipo_mantenimiento,
      resultado.descripcion
    );
  }

  return resultado;
}

function validarMantenimiento(mantenimiento, parcial = false) {
  if (
    !parcial &&
    (!Number.isInteger(mantenimiento.id_equipo) ||
      mantenimiento.id_equipo < 1)
  ) return "El equipo es obligatorio";

  if (!parcial && !mantenimiento.fecha_mantenimiento) {
    return "La fecha de mantenimiento es obligatoria";
  }
  if (!parcial && !mantenimiento.descripcion) {
    return "La descripcion es obligatoria";
  }
  if (!parcial && !mantenimiento.titulo) {
    return "El titulo es obligatorio";
  }
  if (
    (!parcial || mantenimiento.tipo_mantenimiento !== undefined) &&
    !TIPOS_VALIDOS.includes(mantenimiento.tipo_mantenimiento)
  ) return "El tipo de mantenimiento no es valido";

  if (
    (!parcial || mantenimiento.estado_mantenimiento !== undefined) &&
    !ESTADOS_VALIDOS.includes(mantenimiento.estado_mantenimiento)
  ) return "El estado del mantenimiento no es valido";

  if (
    mantenimiento.costo !== undefined &&
    !Number.isFinite(mantenimiento.costo)
  ) return "El costo debe ser numerico o cero";

  return null;
}

async function obtenerAsignacionActiva(conexion, idEquipo, bloquear = false) {
  const bloqueo = bloquear ? " FOR UPDATE" : "";
  const [filas] = await conexion.query(
    "SELECT a.id_asignacion, a.id_colaborador, c.nombre_completo, " +
      "c.num_colaborador, c.puesto, c.area, c.departamento " +
    "FROM asignacion_detalles d " +
    "JOIN asignaciones a ON a.id_asignacion=d.id_asignacion " +
      "AND a.estado='activa' " +
    "JOIN colaboradores c ON c.id_colaborador=a.id_colaborador " +
    "WHERE d.id_equipo=? AND d.estado_detalle='activo' " +
    "ORDER BY d.fecha_asignacion DESC,d.id_detalle DESC LIMIT 1" +
    bloqueo,
    [idEquipo]
  );
  return filas[0] || null;
}

function resolverEstadoEquipo(
  estadoMantenimiento,
  estadoAnterior,
  tieneAsignacionActiva
) {
  if (estadoMantenimiento === "en_proceso") return "mantenimiento";
  if (estadoMantenimiento === "resuelto") {
    return tieneAsignacionActiva ? "asignado" : "disponible";
  }
  if (estadoMantenimiento === "cancelado") {
    if (tieneAsignacionActiva && estadoAnterior === "disponible") {
      return "asignado";
    }
    return estadoAnterior || null;
  }
  return null;
}

module.exports = function crearRouterMantenimientos({
  verificarToken,
  autorizarRoles,
}) {
  const router = express.Router();

  router.get("/equipos", verificarToken, async (req, res) => {
    try {
      const marcadores = TIPOS_EXCLUIDOS.map(() => "?").join(",");
      const [equipos] = await pool.query(
        "SELECT e.id_equipo,e.codigo_equipo,e.nombre_equipo,e.tipo_equipo," +
          "e.marca,e.modelo,e.numero_serie,e.estado, " +
          "COALESCE((SELECT c.area FROM asignacion_detalles d " +
            "JOIN asignaciones a ON a.id_asignacion=d.id_asignacion " +
              "AND a.estado='activa' " +
            "JOIN colaboradores c ON c.id_colaborador=a.id_colaborador " +
            "WHERE d.id_equipo=e.id_equipo AND d.estado_detalle='activo' " +
            "ORDER BY d.fecha_asignacion DESC,d.id_detalle DESC LIMIT 1),'-') " +
            "AS area_asignada, " +
          "(SELECT m.fecha_mantenimiento FROM mantenimientos m " +
            "WHERE m.id_equipo=e.id_equipo " +
            "ORDER BY m.fecha_mantenimiento DESC,m.id_mantenimiento DESC " +
            "LIMIT 1) AS ultimo_mantenimiento_fecha, " +
          "(SELECT m.estado_mantenimiento FROM mantenimientos m " +
            "WHERE m.id_equipo=e.id_equipo " +
            "ORDER BY m.fecha_mantenimiento DESC,m.id_mantenimiento DESC " +
            "LIMIT 1) AS ultimo_mantenimiento_estado " +
        "FROM equipos e WHERE e.activo=1 " +
          "AND LOWER(TRIM(e.tipo_equipo)) NOT IN (" + marcadores + ") " +
        "ORDER BY e.codigo_equipo,e.id_equipo",
        TIPOS_EXCLUIDOS
      );
      return res.json({ equipos });
    } catch (error) {
      console.error("Error al listar equipos para mantenimiento:", error);
      return res.status(500).json({
        mensaje: "Error al listar equipos para mantenimiento",
      });
    }
  });

  router.get("/", verificarToken, async (req, res) => {
    try {
      const [mantenimientos] = await pool.query(
        "SELECT " + CAMPOS_MANTENIMIENTO +
        " FROM mantenimientos m LEFT JOIN equipos e " +
          "ON e.id_equipo=m.id_equipo " +
        "ORDER BY m.fecha_mantenimiento DESC,m.id_mantenimiento DESC"
      );
      return res.json({ mantenimientos });
    } catch (error) {
      console.error("Error al listar mantenimientos:", error);
      return res.status(500).json({
        mensaje: "Error al listar mantenimientos",
      });
    }
  });

  router.get("/equipo/:id_equipo", verificarToken, async (req, res) => {
    const idEquipo = Number(req.params.id_equipo);
    if (!Number.isInteger(idEquipo) || idEquipo < 1) {
      return res.status(400).json({ mensaje: "El equipo no es valido" });
    }

    try {
      const [equipos] = await pool.query(
        "SELECT id_equipo,codigo_equipo,nombre_equipo,tipo_equipo,marca," +
          "modelo,numero_serie,estado FROM equipos " +
        "WHERE id_equipo=? LIMIT 1",
        [idEquipo]
      );
      if (!equipos.length) {
        return res.status(404).json({ mensaje: "Equipo no encontrado" });
      }

      const [mantenimientos] = await pool.query(
        "SELECT " + CAMPOS_MANTENIMIENTO +
        " FROM mantenimientos m LEFT JOIN equipos e " +
          "ON e.id_equipo=m.id_equipo " +
        "WHERE m.id_equipo=? " +
        "ORDER BY m.fecha_mantenimiento DESC,m.id_mantenimiento DESC",
        [idEquipo]
      );

      const [periodos] = await pool.query(
        "SELECT d.id_detalle,a.id_colaborador,c.nombre_completo," +
          "c.num_colaborador,c.puesto,c.area,c.departamento," +
          "COALESCE(d.fecha_asignacion,a.fecha_resguardo) AS fecha_inicio," +
          "d.fecha_devolucion_real," +
          "CASE WHEN a.estado='activa' AND d.estado_detalle='activo' " +
            "THEN 'asignado' ELSE 'devuelto' END AS estado_asignacion " +
        "FROM asignacion_detalles d " +
        "JOIN asignaciones a ON a.id_asignacion=d.id_asignacion " +
        "JOIN colaboradores c ON c.id_colaborador=a.id_colaborador " +
        "WHERE d.id_equipo=? " +
        "ORDER BY COALESCE(d.fecha_asignacion,a.fecha_resguardo) DESC," +
          "d.id_detalle DESC",
        [idEquipo]
      );

      const historial = periodos.map((periodo) => ({
        ...periodo,
        mantenimientos: [],
      }));
      let sinUsuario = null;

      for (const mantenimiento of mantenimientos) {
        const fecha = String(mantenimiento.fecha_mantenimiento).slice(0, 10);
        const porContexto = historial.filter(
          (periodo) =>
            Number(periodo.id_colaborador) ===
            Number(mantenimiento.id_colaborador_contexto)
        );
        const candidatos = porContexto.length ? porContexto : historial;
        const periodo = candidatos.find((item) => {
          const inicio = item.fecha_inicio
            ? String(item.fecha_inicio).slice(0, 10)
            : null;
          const fin = item.fecha_devolucion_real
            ? String(item.fecha_devolucion_real).slice(0, 10)
            : null;
          return inicio && fecha >= inicio && (!fin || fecha <= fin);
        }) || porContexto[0];

        if (periodo) {
          periodo.mantenimientos.push(mantenimiento);
        } else {
          if (!sinUsuario) {
            sinUsuario = {
              id_detalle: "sin-usuario",
              id_colaborador: null,
              nombre_completo: "Sin usuario asignado",
              num_colaborador: "-",
              puesto: "-",
              area: "-",
              departamento: "-",
              fecha_inicio: null,
              fecha_devolucion_real: null,
              estado_asignacion: "devuelto",
              mantenimientos: [],
            };
          }
          sinUsuario.mantenimientos.push(mantenimiento);
        }
      }

      if (sinUsuario) historial.push(sinUsuario);

      return res.json({
        equipo: equipos[0],
        mantenimientos,
        historial_usuarios: historial,
        resumen: {
          total_usuarios: new Set(
            periodos.map((periodo) => periodo.id_colaborador)
          ).size,
          total_mantenimientos: mantenimientos.length,
          costo_total: mantenimientos.reduce(
            (total, item) => total + Number(item.costo || 0),
            0
          ),
        },
      });
    } catch (error) {
      console.error("Error al obtener bitacora de mantenimiento:", error);
      return res.status(500).json({
        mensaje: "Error al obtener la bitacora del equipo",
      });
    }
  });

  router.post(
    "/",
    verificarToken,
    autorizarRoles("admin", "capturista"),
    async (req, res) => {
      const mantenimiento = normalizarMantenimiento(req.body);
      const errorValidacion = validarMantenimiento(mantenimiento);
      if (errorValidacion) {
        return res.status(400).json({ mensaje: errorValidacion });
      }

      let conexion;
      try {
        conexion = await pool.getConnection();
        await conexion.beginTransaction();

        const [equipos] = await conexion.query(
          "SELECT id_equipo,codigo_equipo,nombre_equipo,tipo_equipo,marca," +
            "modelo,numero_serie,estado FROM equipos " +
          "WHERE id_equipo=? LIMIT 1 FOR UPDATE",
          [mantenimiento.id_equipo]
        );
        if (!equipos.length) {
          await conexion.rollback();
          return res.status(404).json({ mensaje: "Equipo no encontrado" });
        }

        const equipo = equipos[0];
        if (equipo.estado === "baja") {
          await conexion.rollback();
          return res.status(409).json({
            mensaje: "No se permite mantenimiento a un equipo en baja",
          });
        }

        const asignacion = await obtenerAsignacionActiva(
          conexion,
          equipo.id_equipo,
          true
        );
        const posterior = resolverEstadoEquipo(
          mantenimiento.estado_mantenimiento,
          equipo.estado,
          Boolean(asignacion)
        );

        const [resultado] = await conexion.query(
          "INSERT INTO mantenimientos (" +
            "id_equipo,id_usuario_registro,id_colaborador_contexto," +
            "tipo_mantenimiento,titulo,descripcion,tecnico_responsable," +
            "proveedor_servicio,costo,estado_mantenimiento," +
            "estado_equipo_anterior,estado_equipo_posterior," +
            "fecha_mantenimiento,fecha_resolucion," +
            "nombre_colaborador_snapshot,num_colaborador_snapshot," +
            "codigo_equipo_snapshot,nombre_equipo_snapshot," +
            "tipo_equipo_snapshot,marca_snapshot,modelo_snapshot," +
            "numero_serie_snapshot,observaciones" +
          ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            equipo.id_equipo,
            req.usuario.id_usuario,
            asignacion?.id_colaborador || null,
            mantenimiento.tipo_mantenimiento,
            mantenimiento.titulo,
            mantenimiento.descripcion,
            mantenimiento.tecnico_responsable,
            mantenimiento.proveedor_servicio,
            mantenimiento.costo,
            mantenimiento.estado_mantenimiento,
            equipo.estado,
            posterior,
            mantenimiento.fecha_mantenimiento,
            mantenimiento.estado_mantenimiento === "resuelto"
              ? new Date()
              : null,
            asignacion?.nombre_completo || null,
            asignacion?.num_colaborador || null,
            equipo.codigo_equipo,
            equipo.nombre_equipo,
            equipo.tipo_equipo,
            equipo.marca,
            equipo.modelo,
            equipo.numero_serie,
            mantenimiento.observaciones,
          ]
        );

        await conexion.query(
          "UPDATE equipos SET estado=?,fecha_actualizacion=NOW() " +
          "WHERE id_equipo=?",
          [posterior, equipo.id_equipo]
        );

        await conexion.commit();

        const [creados] = await pool.query(
          "SELECT " + CAMPOS_MANTENIMIENTO +
          " FROM mantenimientos m LEFT JOIN equipos e " +
            "ON e.id_equipo=m.id_equipo " +
          "WHERE m.id_mantenimiento=?",
          [resultado.insertId]
        );

        return res.status(201).json({
          mensaje: "Mantenimiento registrado correctamente",
          mantenimiento: creados[0],
        });
      } catch (error) {
        if (conexion) await conexion.rollback();
        console.error("Error al registrar mantenimiento:", error);
        return res.status(500).json({
          mensaje: "Error al registrar mantenimiento",
        });
      } finally {
        if (conexion) conexion.release();
      }
    }
  );

  router.put(
    "/:id_mantenimiento",
    verificarToken,
    autorizarRoles("admin", "capturista"),
    async (req, res) => {
      const idMantenimiento = Number(req.params.id_mantenimiento);
      const cambios = normalizarMantenimiento(req.body, true);
      const permitidos = [
        "estado_mantenimiento",
        "descripcion",
        "tecnico_responsable",
        "proveedor_servicio",
        "costo",
        "observaciones",
      ];
      const campos = permitidos.filter((campo) =>
        Object.prototype.hasOwnProperty.call(cambios, campo)
      );
      const errorValidacion = validarMantenimiento(cambios, true);

      if (!Number.isInteger(idMantenimiento) || idMantenimiento < 1) {
        return res.status(400).json({
          mensaje: "El mantenimiento no es valido",
        });
      }
      if (!campos.length) {
        return res.status(400).json({
          mensaje: "No se recibieron cambios validos",
        });
      }
      if (errorValidacion) {
        return res.status(400).json({ mensaje: errorValidacion });
      }
      if (
        cambios.descripcion !== undefined &&
        !cambios.descripcion
      ) {
        return res.status(400).json({
          mensaje: "La descripcion no puede quedar vacia",
        });
      }

      let conexion;
      try {
        conexion = await pool.getConnection();
        await conexion.beginTransaction();

        const [actuales] = await conexion.query(
          "SELECT * FROM mantenimientos " +
          "WHERE id_mantenimiento=? LIMIT 1 FOR UPDATE",
          [idMantenimiento]
        );
        if (!actuales.length) {
          await conexion.rollback();
          return res.status(404).json({
            mensaje: "Mantenimiento no encontrado",
          });
        }

        const actual = actuales[0];
        const [equipos] = await conexion.query(
          "SELECT estado FROM equipos WHERE id_equipo=? LIMIT 1 FOR UPDATE",
          [actual.id_equipo]
        );
        if (!equipos.length) {
          await conexion.rollback();
          return res.status(404).json({ mensaje: "Equipo no encontrado" });
        }
        if (
          equipos[0].estado === "baja" &&
          cambios.estado_mantenimiento &&
          cambios.estado_mantenimiento !== actual.estado_mantenimiento
        ) {
          await conexion.rollback();
          return res.status(409).json({
            mensaje:
              "No se puede actualizar mantenimiento de un equipo en baja",
          });
        }

        let anterior = actual.estado_equipo_anterior;
        let posterior = actual.estado_equipo_posterior;
        let fechaResolucion = actual.fecha_resolucion;

        if (
          cambios.estado_mantenimiento &&
          cambios.estado_mantenimiento !== actual.estado_mantenimiento
        ) {
          const asignacion = await obtenerAsignacionActiva(
            conexion,
            actual.id_equipo,
            true
          );
          if (
            cambios.estado_mantenimiento === "en_proceso" &&
            !anterior
          ) {
            anterior = equipos[0].estado;
          }

          posterior = resolverEstadoEquipo(
            cambios.estado_mantenimiento,
            anterior,
            Boolean(asignacion)
          );
          fechaResolucion =
            cambios.estado_mantenimiento === "resuelto"
              ? new Date()
              : null;

          if (posterior) {
            await conexion.query(
              "UPDATE equipos SET estado=?,fecha_actualizacion=NOW() " +
              "WHERE id_equipo=?",
              [posterior, actual.id_equipo]
            );
          }
        }

        const asignacionesSql = campos.map((campo) => campo + "=?");
        const valores = campos.map((campo) => cambios[campo]);
        asignacionesSql.push(
          "estado_equipo_anterior=?",
          "estado_equipo_posterior=?",
          "fecha_resolucion=?",
          "fecha_actualizacion=NOW()"
        );
        valores.push(
          anterior,
          posterior,
          fechaResolucion,
          idMantenimiento
        );

        await conexion.query(
          "UPDATE mantenimientos SET " +
            asignacionesSql.join(",") +
            " WHERE id_mantenimiento=?",
          valores
        );

        await conexion.commit();

        const [actualizados] = await pool.query(
          "SELECT " + CAMPOS_MANTENIMIENTO +
          " FROM mantenimientos m LEFT JOIN equipos e " +
            "ON e.id_equipo=m.id_equipo " +
          "WHERE m.id_mantenimiento=?",
          [idMantenimiento]
        );

        return res.json({
          mensaje: "Mantenimiento actualizado correctamente",
          mantenimiento: actualizados[0],
        });
      } catch (error) {
        if (conexion) await conexion.rollback();
        console.error("Error al actualizar mantenimiento:", error);
        return res.status(500).json({
          mensaje: "Error al actualizar mantenimiento",
        });
      } finally {
        if (conexion) conexion.release();
      }
    }
  );

  return router;
};

