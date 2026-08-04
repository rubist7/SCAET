const nodemailer = require("nodemailer");

const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor) {
  return String(valor ?? "").trim();
}

function obtenerConfiguracionCorreo() {
  const host = texto(process.env.MAIL_HOST);
  const port = Number.parseInt(texto(process.env.MAIL_PORT), 10);
  const user = texto(process.env.MAIL_USER);
  const password = texto(process.env.MAIL_PASSWORD);
  const fromName = texto(process.env.MAIL_FROM_NAME);
  const cc = texto(process.env.MAIL_CC).toLowerCase();

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !fromName || !cc) {
    return null;
  }

  return {
    host,
    port,
    secure: texto(process.env.MAIL_SECURE).toLowerCase() === "true",
    auth: { user, pass: password },
    from: `${fromName} <${user}>`,
    cc,
  };
}

const configuracionCorreo = obtenerConfiguracionCorreo();
const transporter = configuracionCorreo ? nodemailer.createTransport({
  host: configuracionCorreo.host,
  port: configuracionCorreo.port,
  secure: configuracionCorreo.secure,
  auth: configuracionCorreo.auth,
}) : null;

function verificarTransporterCorreo() {
  if (!transporter) {
    console.warn("Advertencia: la configuracion de correo no esta completa");
    return;
  }

  void transporter.verify().catch((error) => {
    console.warn("Advertencia: no se pudo verificar el transporte de correo:", error.code || error.message);
  });
}

function normalizarCorreo(valor) {
  return texto(valor).toLowerCase();
}

function esCorreoValido(valor) {
  return correoValido.test(normalizarCorreo(valor));
}

function normalizarEquipos(equipos) {
  return (equipos || []).map((equipo) => ({
    codigo: texto(equipo.codigo_equipo).toUpperCase(),
    tipoAsignacion: texto(equipo.tipo_asignacion).toLowerCase(),
    fechaDevolucion: texto(equipo.fecha_devolucion_programada),
  }));
}

function formatearCodigosEquipo(codigosEquipo) {
  if (codigosEquipo.length === 1) return codigosEquipo[0];
  if (codigosEquipo.length === 2) return `${codigosEquipo[0]} y ${codigosEquipo[1]}`;
  return `${codigosEquipo.slice(0, -1).join(", ")} y ${codigosEquipo.at(-1)}`;
}

function crearNombreAdjunto(folio, codigosEquipo) {
  const folioSeguro = texto(folio)
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const codigoSeguro = texto(codigosEquipo[0])
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (codigosEquipo.length === 1) return `resguardo-${codigoSeguro}-${folioSeguro || "resguardo"}.pdf`;
  return `resguardo-${folioSeguro || "resguardo"}.pdf`;
}

function crearNombreAdjuntoDevolucion(folio, codigosEquipo) {
  const folioSeguro = texto(folio)
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const codigoSeguro = texto(codigosEquipo[0])
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (codigosEquipo.length === 1) return `devolucion-${codigoSeguro}-${folioSeguro || "devolucion"}.pdf`;
  return `devolucion-${folioSeguro || "devolucion"}.pdf`;
}

function formatearFechaDevolucion(fecha) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(fecha));
  return coincidencia ? `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}` : "";
}

function crearMensajeResguardo({ folio, nombreColaborador, equipos }) {
  const equiposNormalizados = normalizarEquipos(equipos);
  const codigosEquipo = equiposNormalizados.map((equipo) => equipo.codigo).filter(Boolean);
  const codigosCompletos = equiposNormalizados.length > 0 && codigosEquipo.length === equiposNormalizados.length;
  const listaCodigos = codigosCompletos ? formatearCodigosEquipo(codigosEquipo) : "";
  const unSoloEquipo = equiposNormalizados.length === 1;
  const equiposTemporales = equiposNormalizados.filter((equipo) => equipo.tipoAsignacion === "temporal");
  const soloTemporales = equiposNormalizados.length > 0 && equiposTemporales.length === equiposNormalizados.length;
  const temporalesConFecha = equiposTemporales
    .map((equipo) => ({ ...equipo, fechaFormateada: formatearFechaDevolucion(equipo.fechaDevolucion) }))
    .filter((equipo) => equipo.fechaFormateada);

  equiposTemporales
    .filter((equipo) => !formatearFechaDevolucion(equipo.fechaDevolucion))
    .forEach((equipo) => console.warn("Advertencia: equipo temporal sin fecha de devolución programada", {
      codigo_equipo: equipo.codigo || null,
      folio,
    }));

  const asunto = codigosCompletos
    ? soloTemporales
      ? unSoloEquipo
        ? `Resguardo temporal del equipo ${listaCodigos}`
        : `Resguardo temporal de equipos ${listaCodigos}`
      : unSoloEquipo
        ? `Resguardo del equipo ${listaCodigos}`
        : `Resguardo de equipos ${listaCodigos}`
    : `Resguardo de equipo ${folio}`;

  const lineas = [`Hola ${texto(nombreColaborador) || "colaborador"},`, ""];
  if (codigosCompletos) {
    const destinatario = unSoloEquipo ? `al equipo ${listaCodigos}` : `a los equipos ${listaCodigos}`;
    const tipo = soloTemporales ? " temporal" : "";
    lineas.push(`Adjuntamos el resguardo${tipo} correspondiente ${destinatario}.`);
  } else {
    lineas.push("Adjuntamos tu resguardo de equipo.");
  }

  if (temporalesConFecha.length === 1) {
    const temporal = temporalesConFecha[0];
    lineas.push("", `Te recordamos que la fecha acordada para la devolución del equipo ${temporal.codigo || "temporal"} es el ${temporal.fechaFormateada}.`);
  } else if (temporalesConFecha.length > 1) {
    const fechas = [...new Set(temporalesConFecha.map((equipo) => equipo.fechaFormateada))];
    if (fechas.length === 1) {
      lineas.push("", `Te recordamos que la fecha acordada para la devolución de los equipos es el ${fechas[0]}.`);
    } else {
      lineas.push("", "Fechas acordadas de devolución:", "");
      temporalesConFecha.forEach((equipo, indice) => {
        lineas.push(`- ${equipo.codigo || `Equipo temporal ${indice + 1}`}: ${equipo.fechaFormateada}`);
      });
    }
  }

  lineas.push("", `Folio del resguardo: ${folio}.`);
  return { asunto, contenido: lineas.join("\n"), codigosEquipo };
}

function crearMensajeDevolucion({ folio, nombreColaborador, equipos }) {
  const codigosEquipo = [...new Set((equipos || [])
    .map((equipo) => texto(equipo.codigo_equipo).toUpperCase())
    .filter(Boolean))]
    .sort((codigoA, codigoB) => codigoA.localeCompare(codigoB, "es"));
  const unSoloEquipo = codigosEquipo.length === 1;
  const listaCodigos = codigosEquipo.length ? formatearCodigosEquipo(codigosEquipo) : "";
  const asunto = codigosEquipo.length
    ? unSoloEquipo
      ? `Devolución del equipo ${listaCodigos}`
      : `Devolución de equipos ${listaCodigos}`
    : `Devolución de equipo ${folio}`;
  const contenido = codigosEquipo.length
    ? `Hola ${texto(nombreColaborador) || "colaborador"},\n\nAdjuntamos el comprobante de devolución correspondiente ${unSoloEquipo ? "al equipo" : "a los equipos"} ${listaCodigos}.\n\nFolio de devolución: ${folio}.`
    : `Hola ${texto(nombreColaborador) || "colaborador"},\n\nAdjuntamos el comprobante de devolución.\n\nFolio de devolución: ${folio}.`;

  return { asunto, contenido, codigosEquipo };
}

async function enviarCorreoConPdf({ correoColaborador, asunto, contenido, nombreAdjunto, pdfBuffer }) {
  if (!transporter || !configuracionCorreo) {
    const error = new Error("El servicio de correo no esta configurado");
    error.code = "CORREO_NO_CONFIGURADO";
    throw error;
  }

  const destinatario = normalizarCorreo(correoColaborador);
  const copia = normalizarCorreo(configuracionCorreo.cc);
  if (!esCorreoValido(destinatario) || !esCorreoValido(copia)) {
    const error = new Error("Los correos configurados para el envio no son validos");
    error.code = "CORREO_INVALIDO";
    throw error;
  }

  const opciones = {
    from: configuracionCorreo.from,
    to: destinatario,
    subject: asunto,
    text: contenido,
    attachments: [{
      filename: nombreAdjunto,
      content: pdfBuffer,
      contentType: "application/pdf",
    }],
  };

  if (copia !== destinatario) opciones.cc = copia;
  return transporter.sendMail(opciones);
}

async function enviarResguardoCorreo({ folio, nombreColaborador, correoColaborador, equipos, pdfBuffer }) {
  const { asunto, contenido, codigosEquipo } = crearMensajeResguardo({ folio, nombreColaborador, equipos });
  return enviarCorreoConPdf({
    correoColaborador,
    asunto,
    contenido,
    nombreAdjunto: crearNombreAdjunto(folio, codigosEquipo),
    pdfBuffer,
  });
}

async function enviarDevolucionCorreo({ folio, nombreColaborador, correoColaborador, equipos, pdfBuffer }) {
  const { asunto, contenido, codigosEquipo } = crearMensajeDevolucion({ folio, nombreColaborador, equipos });
  return enviarCorreoConPdf({
    correoColaborador,
    asunto,
    contenido,
    nombreAdjunto: crearNombreAdjuntoDevolucion(folio, codigosEquipo),
    pdfBuffer,
  });
}

module.exports = {
  enviarDevolucionCorreo,
  enviarResguardoCorreo,
  esCorreoValido,
  verificarTransporterCorreo,
};
