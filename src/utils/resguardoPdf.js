import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const MARGEN_PUNTOS = 36;
const TIEMPO_MAXIMO_PDF_MS = 45_000;
const ESCALA_CAPTURA = 2;
const TAMANO_MINIMO_TEXTO_PT = 7;
const PIXELES_CSS_POR_PULGADA = 96;
const PUNTOS_POR_PULGADA = 72;

function crearErrorTimeout() {
  const error = new Error("No se pudo generar el PDF del resguardo. Intenta descargarlo primero.");
  error.code = "PDF_GENERATION_TIMEOUT";
  return error;
}

function crearErrorPdf(errorOriginal) {
  console.error("Error técnico al generar el PDF del resguardo:", errorOriginal);
  const error = new Error("No se pudo generar el PDF del resguardo.");
  error.code = "PDF_GENERATION_FAILED";
  return error;
}

function esperarConTimeout(promesa, tiempoMaximo, crearError) {
  let temporizador;
  const timeout = new Promise((_, reject) => {
    temporizador = window.setTimeout(() => reject(crearError()), tiempoMaximo);
  });

  return Promise.race([promesa, timeout]).finally(() => window.clearTimeout(temporizador));
}

async function esperarFuentes() {
  console.info("Esperando fuentes");
  if (document.fonts?.ready) await document.fonts.ready;
}

async function esperarImagenes(elemento) {
  console.info("Esperando imágenes");
  const imagenes = [...elemento.querySelectorAll("img")];
  await Promise.all(imagenes.map((imagen) => {
    if (imagen.complete) return Promise.resolve();
    return new Promise((resolve) => {
      imagen.addEventListener("load", resolve, { once: true });
      imagen.addEventListener("error", resolve, { once: true });
    });
  }));
}

function crearCopiaImprimible(elemento, anchoImprimiblePuntos) {
  const copia = elemento.cloneNode(true);
  const ancho = Math.max(
    1,
    Math.round((anchoImprimiblePuntos * PIXELES_CSS_POR_PULGADA) / PUNTOS_POR_PULGADA)
  );

  copia.style.position = "fixed";
  copia.style.left = "-100000px";
  copia.style.top = "0";
  copia.style.width = `${ancho}px`;
  copia.style.maxWidth = "none";
  copia.style.overflow = "visible";
  copia.style.background = "#ffffff";
  copia.setAttribute("aria-hidden", "true");

  copia.querySelectorAll("[data-pdf-excluir]").forEach((nodo) => nodo.remove());
  copia.querySelectorAll("table").forEach((tabla) => {
    tabla.style.width = "100%";
    tabla.style.minWidth = "0";
    tabla.style.tableLayout = "auto";
  });
  copia.querySelectorAll("*").forEach((nodo) => {
    if (nodo.scrollWidth > nodo.clientWidth || nodo.scrollHeight > nodo.clientHeight) {
      nodo.style.overflow = "visible";
    }
  });

  document.body.appendChild(copia);
  return copia;
}

function obtenerCortesProtegidos(copia, escala) {
  const limite = copia.getBoundingClientRect().top;
  const crearRango = (rectangulo) => ({
    inicio: Math.max(0, Math.round((rectangulo.top - limite) * escala)),
    fin: Math.max(0, Math.round((rectangulo.bottom - limite) * escala)),
  });
  const elementosProtegidos = [...copia.querySelectorAll("tr, thead, img, canvas, svg, h1, h2, h3, h4, h5, h6")]
    .map((nodo) => nodo.getBoundingClientRect())
    .filter((rectangulo) => rectangulo.height > 0)
    .map(crearRango);
  const encabezadosConContenido = [...copia.querySelectorAll("h1, h2, h3, h4, h5, h6, thead")]
    .map((encabezado) => {
      const contenido = encabezado.tagName === "THEAD"
        ? encabezado.parentElement?.querySelector("tbody tr")
        : encabezado.nextElementSibling;
      if (!contenido) return null;
      const rectanguloEncabezado = encabezado.getBoundingClientRect();
      const rectanguloContenido = contenido.getBoundingClientRect();
      if (!rectanguloEncabezado.height || !rectanguloContenido.height) return null;
      return crearRango({
        top: rectanguloEncabezado.top,
        bottom: Math.max(rectanguloEncabezado.bottom, rectanguloContenido.bottom),
      });
    })
    .filter(Boolean);

  return [...elementosProtegidos, ...encabezadosConContenido];
}

function obtenerTamanoMinimoFuente(copia) {
  const tamanos = [...copia.querySelectorAll("*")]
    .map((nodo) => Number.parseFloat(window.getComputedStyle(nodo).fontSize))
    .filter((tamano) => Number.isFinite(tamano) && tamano > 0);
  return tamanos.length ? Math.min(...tamanos) : 10;
}

function agregarCanvasEnUnaPagina(pdf, canvas, copia, forzarUnaPagina = false) {
  const anchoPagina = pdf.internal.pageSize.getWidth();
  const altoPagina = pdf.internal.pageSize.getHeight();
  const anchoContenido = anchoPagina - (MARGEN_PUNTOS * 2);
  const altoContenido = altoPagina - (MARGEN_PUNTOS * 2);
  const escala = Math.min(anchoContenido / canvas.width, altoContenido / canvas.height);
  const tamanoTextoPt = obtenerTamanoMinimoFuente(copia) * ESCALA_CAPTURA * escala;

  if (!forzarUnaPagina && tamanoTextoPt < TAMANO_MINIMO_TEXTO_PT) return false;

  const anchoPdf = canvas.width * escala;
  const altoPdf = canvas.height * escala;
  const posicionX = (anchoPagina - anchoPdf) / 2;
  const posicionY = (altoPagina - altoPdf) / 2;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", posicionX, posicionY, anchoPdf, altoPdf, undefined, "FAST");
  return true;
}

function calcularAlturaPagina(inicio, maximo, altoTotal, cortesProtegidos) {
  const limite = Math.min(inicio + maximo, altoTotal);
  if (limite >= altoTotal) return altoTotal - inicio;

  const corteInterrumpido = cortesProtegidos.find(({ inicio: inicioCorte, fin }) => inicioCorte < limite && fin > limite);
  if (!corteInterrumpido) return limite - inicio;

  const alturaAntes = corteInterrumpido.inicio - inicio;
  if (alturaAntes >= maximo * 0.55) return alturaAntes;

  const alturaDespues = corteInterrumpido.fin - inicio;
  if (alturaDespues <= maximo) return alturaDespues;

  return limite - inicio;
}

function agregarCanvasPaginado(pdf, canvas, copia) {
  const anchoPagina = pdf.internal.pageSize.getWidth();
  const altoPagina = pdf.internal.pageSize.getHeight();
  const anchoContenido = anchoPagina - (MARGEN_PUNTOS * 2);
  const altoContenido = altoPagina - (MARGEN_PUNTOS * 2);
  const escalaPdf = anchoContenido / canvas.width;
  const maximoAltoFuente = Math.max(1, Math.floor(altoContenido / escalaPdf));
  const escalaCanvas = canvas.height / Math.max(copia.scrollHeight, 1);
  const cortesProtegidos = obtenerCortesProtegidos(copia, escalaCanvas);
  let inicio = 0;
  let pagina = 0;

  while (inicio < canvas.height) {
    const altoFuente = calcularAlturaPagina(inicio, maximoAltoFuente, canvas.height, cortesProtegidos);
    if (altoFuente < 1) break;

    const fragmento = document.createElement("canvas");
    fragmento.width = canvas.width;
    fragmento.height = altoFuente;
    const contexto = fragmento.getContext("2d");
    contexto.drawImage(canvas, 0, inicio, canvas.width, altoFuente, 0, 0, canvas.width, altoFuente);

    if (pagina > 0) pdf.addPage();
    pdf.addImage(
      fragmento.toDataURL("image/png"),
      "PNG",
      MARGEN_PUNTOS,
      MARGEN_PUNTOS,
      anchoContenido,
      altoFuente * escalaPdf,
      undefined,
      "FAST"
    );
    fragmento.width = 0;
    fragmento.height = 0;
    inicio += altoFuente;
    pagina += 1;
  }
}

export function crearNombrePdfResguardo(folio) {
  const folioSeguro = String(folio || "resguardo")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${folioSeguro || "resguardo"}.pdf`;
}

export async function generarPdfResguardo(elemento, { cantidadEquipos = 1 } = {}) {
  if (!elemento) throw new Error("No se encontro el documento del resguardo");

  console.info("Iniciando generación PDF");
  let copiaImprimible;
  let canvas;
  const generar = async () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "letter",
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const cantidadEquiposNormalizada = Math.max(1, Number(cantidadEquipos) || 1);

      console.info("Dimensiones PDF", {
        pageWidth,
        pageHeight,
        orientation: pageHeight > pageWidth ? "portrait" : "landscape",
        cantidadEquipos: cantidadEquiposNormalizada,
      });
      if (pageHeight <= pageWidth) {
        throw new Error("El PDF no se creo en orientacion vertical");
      }

      await esperarFuentes();
      await esperarImagenes(elemento);
      copiaImprimible = crearCopiaImprimible(elemento, pageWidth - (MARGEN_PUNTOS * 2));
      await esperarImagenes(copiaImprimible);
      console.info("Captura DOM iniciada");
      canvas = await html2canvas(copiaImprimible, {
        backgroundColor: "#ffffff",
        scale: ESCALA_CAPTURA,
        useCORS: true,
        logging: false,
        removeContainer: true,
        windowWidth: Math.ceil(copiaImprimible.scrollWidth),
        windowHeight: Math.ceil(copiaImprimible.scrollHeight),
      });
      console.info("Captura DOM finalizada");

      const forzarUnaPagina = cantidadEquiposNormalizada <= 3;

      if (!agregarCanvasEnUnaPagina(pdf, canvas, copiaImprimible, forzarUnaPagina)) {
        agregarCanvasPaginado(pdf, canvas, copiaImprimible);
      }
      const pdfBlob = pdf.output("blob");
      if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
        throw new Error("No se pudo generar un PDF valido del resguardo");
      }
      console.info("PDF Blob generado");
      return pdfBlob;
    } catch (error) {
      if (error?.code === "PDF_GENERATION_TIMEOUT") throw error;
      throw crearErrorPdf(error);
    }
  };

  try {
    return await esperarConTimeout(generar(), TIEMPO_MAXIMO_PDF_MS, crearErrorTimeout);
  } finally {
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    copiaImprimible?.remove();
    document.querySelectorAll(".html2canvas-container").forEach((contenedor) => contenedor.remove());
  }
}

export function descargarPdfResguardo(pdfBlob, folio) {
  const url = URL.createObjectURL(pdfBlob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = crearNombrePdfResguardo(folio);
  enlace.click();
  URL.revokeObjectURL(url);
}
