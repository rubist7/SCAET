import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Eraser, Mail, PenLine, X } from "lucide-react";
import { formatDate, formatResguardoDate } from "./dateUtils";
import BackButton from "../components/BackButton";
import Signature from "../components/Signature";
import { descargarPdfResguardo, generarPdfResguardo } from "../utils/resguardoPdf";

const defaultDevolucion = {
  idAsignacion: null,
  idResguardo: null,
  folio: "",
  fecha: new Date().toISOString().slice(0, 10),
  colaborador: { id: null, numero: "", nombre: "", area: "", departamento: "", puesto: "", correo: "" },
  equipo: { id: null, codigo: "", nombre: "", tipo: "", marca: "", modelo: "", serie: "" },
  tipo: "Permanente",
  estado: "Buen estado / Funcional",
  observaciones: "",
  responsableEntrega: "-",
  items: [],
};

const estadoOptionsByType = {
  equipo: ["Bueno", "Regular", "Danado", "Incompleto"],
  tarjeta: ["Entregada", "Danada", "Extraviada", "No devuelta"],
  yubikey: ["Entregada", "Funcional", "Danada", "Extraviada", "No devuelta"],
  mixto: ["Completa", "Parcial", "Con danios", "Incompleta"],
};
function fallbackItem(data) {
  if (data.tipoResguardo === "tarjeta") {
    return {
      key: `tarjeta-${data.idTarjeta || "actual"}`,
      tipoResguardo: "tarjeta",
      tipoLabel: "Tarjeta comedor",
      codigo: data.idTarjeta,
      nombre: "Tarjeta comedor",
      marca: "SCAET",
      modelo: "Comedor",
      serie: data.idTarjeta,
      tipoAsignacion: data.tipo,
      fechaAsignacion: data.fechaEntregaTarjeta || data.fecha,
    };
  }

  if (data.tipoResguardo === "yubikey") {
    return {
      key: `yubikey-${data.serieYubikey || data.yubikey || "actual"}`,
      tipoResguardo: "yubikey",
      tipoLabel: "Yubikey",
      codigo: data.serieYubikey,
      nombre: data.yubikey,
      marca: "Yubico",
      modelo: data.modeloYubikey,
      serie: data.serieYubikey,
      tipoAsignacion: data.tipo,
      fechaAsignacion: data.fecha,
    };
  }

  return {
    key: `equipo-${data.equipo.codigo}`,
    tipoResguardo: "equipo",
    tipoLabel: "Equipo tecnologico",
    codigo: data.activoInventario || data.equipo.codigo,
    nombre: data.equipo.nombre,
    tipoActivo: data.equipo.tipo,
    marca: data.equipo.marca,
    modelo: data.equipo.modelo,
    serie: data.equipo.serie,
    tipoAsignacion: data.tipo,
    fechaAsignacion: data.fecha,
  };
}

function itemTitle(item) {
  if (item.tipoResguardo === "tarjeta") return "tarjeta comedor";
  if (item.tipoResguardo === "yubikey") return "Yubikey";

  return item.tipoActivo?.toLowerCase() || "equipo tecnologico";
}

function selectionTitle(items) {
  if (items.length === 1) return itemTitle(items[0]);

  return `${items.length} activos`;
}

function returnStateLabel(items) {
  if (items.length > 1) return "Estado general de la devolucion";
  const item = items[0];

  if (item.tipoResguardo === "tarjeta") return "Estado de la tarjeta al regresar";
  if (item.tipoResguardo === "yubikey") return "Estado de la Yubikey al regresar";

  return "Estado del equipo al regresar";
}

function returnObservationsPlaceholder(items) {
  if (items.length > 1) return "Describe el estado general de los activos seleccionados, faltantes, danios o piezas no devueltas...";
  const item = items[0];

  if (item.tipoResguardo === "tarjeta") return "Describe si la tarjeta se entrega fisicamente, si esta danada o si no fue devuelta...";
  if (item.tipoResguardo === "yubikey") return "Describe si la Yubikey funciona, si presenta dano fisico o si no fue devuelta...";

  return "Describe el estado del equipo, accesorios devueltos, danios observados...";
}

function estadoOptionsForItems(items) {
  const types = [...new Set(items.map((item) => item.tipoResguardo))];

  if (items.length > 1 || types.length > 1) return estadoOptionsByType.mixto;

  return estadoOptionsByType[types[0]] || estadoOptionsByType.equipo;
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold text-blue-300">{label}</span>
      {children}
    </label>
  );
}

function SoftInput({ value, onChange, placeholder, icon }) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={!onChange}
        placeholder={placeholder}
        className="h-10 w-full min-w-0 rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 pr-9 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
      {icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6f6584]">{icon}</div>}
    </div>
  );
}

function SoftSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 appearance-none rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 pr-9 text-sm font-semibold text-[#3c3445] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => {
          const valueOption = typeof option === "string" ? option : option.value;
          const labelOption = valueOption === "Con danios"
            ? "Con daños"
            : typeof option === "string"
              ? option
              : option.label;

          return (
            <option key={valueOption} value={valueOption}>
              {labelOption}
            </option>
          );
        })}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6f6584]" />
    </div>
  );
}

function Tabs({ onGoResguardo }) {
  return (
    <div className="flex overflow-x-auto border-b border-blue-500">
      <button type="button" onClick={onGoResguardo} className="px-5 py-3 text-xs font-bold text-[#8f879b]">
        Resguardo
      </button>
      <button type="button" className="rounded-t-[8px] bg-blue-50 px-5 py-3 text-xs font-black text-blue-600">
        Devolucion
      </button>
    </div>
  );
}

function AssetReturnSelector({ items, selectedKeys, returnDetails, onChange, onDetailChange }) {
  const toggleAll = () => {
    onChange(items.map((item) => item.key));
  };

  const toggleItem = (itemKey) => {
    const nextKeys = selectedKeys.includes(itemKey)
      ? selectedKeys.filter((key) => key !== itemKey)
      : [...selectedKeys, itemKey];

    onChange(nextKeys.length ? nextKeys : [itemKey]);
  };

  return (
    <div className="rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-black text-[#3c3445]">{selectedKeys.length} de {items.length} seleccionados</span>
        {items.length > 1 && selectedKeys.length !== items.length && (
          <button
            type="button"
            onClick={toggleAll}
            className="h-8 rounded-[8px] bg-white px-3 text-[11px] font-black text-blue-600 transition hover:bg-blue-50"
          >
            Seleccionar todo
          </button>
        )}
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const checked = selectedKeys.includes(item.key);

          return (
            <div key={item.key} className="rounded-[8px] bg-white px-3 py-2 text-xs">
              <div className="flex min-w-0 items-start gap-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleItem(item.key)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                aria-label={`Seleccionar ${item.nombre} para devolucion`}
              />
              <span className="min-w-0">
                <span className="block break-words font-black text-[#21192c]">
                  {item.nombre} {item.codigo ? `#${item.codigo}` : ""}
                </span>
                <span className="block break-words text-[#8f879b]">
                  {item.tipoLabel} - {item.marca || "-"} {item.modelo || ""} - {item.serie || "Sin serie"}
                </span>
              </span>
              </div>
              {checked && (
                <div className="mt-3 grid gap-3 border-t border-[#eee8f6] pt-3 md:grid-cols-2">
                  <Field label="Accesorios devueltos">
                    <SoftInput
                      value={returnDetails[item.key]?.accesoriosDevueltos || ""}
                      onChange={(value) => onDetailChange(item.key, "accesoriosDevueltos", value)}
                      placeholder="Cargador, mouse, cable..."
                    />
                  </Field>
                  <Field label="Observacion de devolucion">
                    <textarea
                      value={returnDetails[item.key]?.observacionesDevolucion || ""}
                      onChange={(event) => onDetailChange(item.key, "observacionesDevolucion", event.target.value)}
                      placeholder={returnObservationsPlaceholder([item])}
                      className="h-20 w-full min-w-0 resize-none rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 py-3 text-sm text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </Field>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function useCanCaptureTouchSignature() {
  const [canCapture, setCanCapture] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const update = () => setCanCapture(mediaQuery.matches);

    update();
    mediaQuery.addEventListener?.("change", update);

    return () => mediaQuery.removeEventListener?.("change", update);
  }, []);

  return canCapture;
}

function SignaturePad({ value, onChange, disabled }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const startPointRef = useRef(null);
  const hasMovedRef = useRef(false);
  const [hasPendingSignature, setHasPendingSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.3;
    context.strokeStyle = "#21192c";
    context.clearRect(0, 0, rect.width, rect.height);

    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = value;
    }
  }, [value]);

  const getPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    onChange(canvas.toDataURL("image/png"));
    setHasPendingSignature(false);
  };

  const handlePointerDown = (event) => {
    if (disabled) return;

    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getPoint(event);

    drawingRef.current = true;
    lastPointRef.current = point;
    startPointRef.current = point;
    hasMovedRef.current = false;
    setHasPendingSignature(true);
    context.beginPath();
    context.arc(point.x, point.y, 1.15, 0, Math.PI * 2);
    context.fillStyle = "#21192c";
    context.fill();
    canvas.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (disabled || !drawingRef.current) return;

    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const nextPoint = getPoint(event);
    const lastPoint = lastPointRef.current;

    if (Math.hypot(nextPoint.x - startPointRef.current.x, nextPoint.y - startPointRef.current.y) >= 1) {
      hasMovedRef.current = true;
    }
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    lastPointRef.current = nextPoint;
  };

  const handlePointerUp = (event) => {
    if (disabled || !drawingRef.current) return;

    event.preventDefault();
    const canvas = canvasRef.current;

    if (!hasMovedRef.current && startPointRef.current) {
      const context = canvas.getContext("2d");
      context.beginPath();
      context.arc(startPointRef.current.x, startPointRef.current.y, 2.3, 0, Math.PI * 2);
      context.fillStyle = "#21192c";
      context.fill();
    }

    drawingRef.current = false;
    lastPointRef.current = null;
    startPointRef.current = null;
    hasMovedRef.current = false;
    if (canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    context.clearRect(0, 0, rect.width, rect.height);
    onChange("");
    setHasPendingSignature(false);
  };

  return (
    <div>
      <div className="relative h-32 overflow-hidden rounded-[8px] border border-dashed border-[#d7cabc] bg-[#eee8dc]">
        {disabled && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#eee8dc]/90 px-4 text-center text-[#8f879b]">
            <PenLine size={20} />
            <span className="text-xs font-semibold">Firma disponible en celular o tablet</span>
            <span className="text-[10px] font-semibold tracking-wide text-[#b9ad9b]">Activa vista movil para probarla</span>
          </div>
        )}
        {!disabled && !value && !hasPendingSignature && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-blue-400">
            <PenLine size={20} />
            <span className="text-xs font-semibold">Firma aqui</span>
            <span className="text-[10px] font-semibold tracking-wide text-[#b9ad9b]">Usa dedo o lapiz tactil</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          aria-label="Campo para firma del colaborador"
          className="h-full w-full touch-none dark:brightness-0 dark:invert"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || (!value && !hasPendingSignature)}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#eee8dc] text-xs font-bold text-[#6f6584] transition hover:bg-[#e4dccf]"
        >
          <Eraser size={14} />
          Limpiar
        </button>
        <button
          type="button"
          onClick={saveSignature}
          disabled={disabled || !hasPendingSignature}
          className="h-9 rounded-[8px] bg-[#3A9AF2] text-xs font-bold text-[#FFFFFF] transition hover:bg-[#238BEA] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? "Bloqueado" : hasPendingSignature ? "Guardar firma" : value ? "Firma guardada" : "Pendiente"}
        </button>
      </div>
    </div>
  );
}

function AutoSignature({ signerName }) {
  return (
    <div className="flex h-20 items-center justify-center rounded-[8px] border border-[#ded6c8] bg-[#eee8dc]">
      <div className="text-center">
        <p className="font-serif text-2xl text-[#0F83F0]">~{signerName}~</p>
        <p className="mt-1 text-[10px] font-semibold text-[#b1a58f]">Firma cargada automaticamente.</p>
        <p className="text-[10px] font-semibold text-[#b1a58f]">Se aplica a cada documento.</p>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(94px,0.45fr)_minmax(0,1fr)] gap-2 border-b border-[#eee8f6] py-2 text-xs sm:grid-cols-[140px_1fr]">
      <span className="text-[#8f879b]">{label}</span>
      <span className="min-w-0 break-words text-right font-bold text-[#21192c]">{value || "-"}</span>
    </div>
  );
}

function SignatureImage({ value }) {
  if (!value) {
    return <p className="min-h-12 text-[#b7ab9b]">Pendiente</p>;
  }

  return (
    <img
      src={value}
      alt="Firma del colaborador"
      className="mx-auto h-12 w-full object-contain dark:brightness-0 dark:invert"
    />
  );
}

function ReceiverSignatureDetails({ colaborador }) {
  const areaDepartamento = `${colaborador?.area || "-"} - ${colaborador?.departamento || "-"}`;

  return (
    <div className="mt-1 text-[9px] font-semibold text-[#6f6584]">
      <p>{colaborador?.nombre || "-"}</p>
      <p className="font-bold">{areaDepartamento}</p>
      <p className="font-bold">{colaborador?.puesto || "-"}</p>
    </div>
  );
}

function PreviewAssetsList({ items }) {
  return (
    <div className="mt-4 rounded-[8px] border border-[#ded6c8]">
      <div className="border-b border-[#ded6c8] bg-[#eee8dc] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#6f6584]">
        Activos devueltos
      </div>
      <div className="divide-y divide-[#eee8f6]">
        {items.map((item) => (
          <div key={item.key} className="grid min-w-0 gap-1 px-3 py-2 text-[10px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <span className="break-words font-black text-[#21192c]">
              {item.nombre} {item.codigo ? `#${item.codigo}` : ""}
            </span>
            <span className="break-words text-[#6f6584]">
              {item.tipoLabel} - {item.marca || "-"} {item.modelo || ""} - {item.serie || "Sin serie"}
              <span className="mt-1 block">Accesorios devueltos: {item.accesoriosDevueltos || "-"}</span>
              <span className="mt-1 block">Observacion: {item.observacionesDevolucion || "-"}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentPreview({ data, items, signature }) {
  const institucion = data.configuracionInstitucional || {};
  const empresa = institucion.nombre_empresa || "Puente Calinda";
  const puesto = institucion.puesto_responsable || "Gerencia de Sistemas";
  return (
    <div className="min-w-0 rounded-2xl border border-[#eee8f6] bg-white px-4 py-6 shadow-sm sm:px-7">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#b7ab9b]">{empresa} - {puesto}</p>
        <h2 className="mt-1 text-sm font-black text-[#21192c]">Devolucion de {selectionTitle(items)}</h2>
        <p className="mt-1 text-[10px] font-semibold text-[#b7ab9b]">
          Folio: {data.folio} - Fecha: {formatDate(data.fecha)}
        </p>
      </div>

      <div className="mt-5 border-t-2 border-blue-100 pt-3">
        <PreviewRow label="Colaborador" value={data.colaborador.nombre} />
        <PreviewRow label="Num. colaborador" value={data.colaborador.numero} />
        <PreviewRow label="Area / Depto." value={`${data.colaborador.area} - ${data.colaborador.departamento || "-"}`} />
        <PreviewRow label="Puesto" value={data.colaborador.puesto} />
        <PreviewRow label="Responsable" value={institucion.nombre_responsable || data.responsableEntrega} />
        <PreviewRow label="Total activos" value={items.length} />
        <PreviewRow label="Fecha devolucion" value={formatDate(data.fecha)} />
        <PreviewRow label="Estado" value={data.estado} />
      </div>
      <PreviewAssetsList items={items} />

      <p className="mx-auto mt-7 max-w-xl border-b border-[#eee8f6] pb-4 text-center text-[10px] font-semibold text-[#9d927f]">
        El colaborador confirma la devolucion de los activos seleccionados en las condiciones indicadas.
      </p>

      <div className="mt-7 grid gap-8 text-center sm:grid-cols-2">
        <div>
          <div className="flex h-32 items-center justify-center overflow-hidden">
            <SignatureImage value={signature} />
          </div>
          <p className="mt-2 border-t border-[#b7ab9b] pt-2 text-[10px] font-semibold tracking-[0.18em] text-[#b7ab9b]">Firma del colaborador</p>
          <ReceiverSignatureDetails colaborador={data.colaborador} />
        </div>
        <Signature type="entrega" institucion={institucion} />
      </div>
    </div>
  );
}

function GeneratedDevolucionModal({ data, items, signature, idResguardo, onClose }) {
  const TIEMPO_MAXIMO_ENVIO_MS = 60_000;
  const documentRef = useRef(null);
  const pdfRef = useRef(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState(false);
  const [mensajeCorreo, setMensajeCorreo] = useState("");
  const [errorCorreo, setErrorCorreo] = useState(false);

  const crearPdf = async () => {
    if (!documentRef.current) throw new Error("No se encontro el documento de devolucion");
    if (!pdfRef.current) {
      pdfRef.current = await generarPdfResguardo(documentRef.current, { cantidadEquipos: items.length || 1 });
    }
    return pdfRef.current;
  };

  const downloadPdf = async () => {
    setGenerandoPdf(true);
    setMensajeCorreo("");
    try {
      descargarPdfResguardo(await crearPdf(), data.folio);
    } catch (error) {
      setErrorCorreo(true);
      setMensajeCorreo(error.message || "No se pudo generar el PDF de devolucion");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const enviarCorreo = async () => {
    if (!idResguardo) {
      setErrorCorreo(true);
      setMensajeCorreo("No se encontro el identificador de la devolucion");
      return;
    }
    if (correoEnviado && !window.confirm("Esta devolucion ya fue enviada. ¿Deseas enviarla nuevamente?")) return;

    setEnviandoCorreo(true);
    setErrorCorreo(false);
    setMensajeCorreo("");
    try {
      const pdf = await crearPdf();
      const formData = new FormData();
      formData.append("pdf", pdf, `${data.folio || "devolucion"}.pdf`);
      const controller = new AbortController();
      const timeoutEnvio = window.setTimeout(() => controller.abort(), TIEMPO_MAXIMO_ENVIO_MS);
      let response;
      try {
        response = await fetch(`/api/resguardos/${idResguardo}/enviar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("scaet-token")}` },
          body: formData,
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutEnvio);
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.mensaje || "No se pudo enviar la devolucion por correo");

      setCorreoEnviado(true);
      setMensajeCorreo("Devolucion enviada correctamente al colaborador y con copia al responsable.");
    } catch (error) {
      setErrorCorreo(true);
      setMensajeCorreo(
        error.name === "AbortError"
          ? "La devolucion esta guardada, pero el servicio de correo no respondio."
          : error.message || "No se pudo enviar la devolucion por correo"
      );
    } finally {
      setEnviandoCorreo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-4 sm:p-5">
      <div className="mx-auto flex min-h-full w-full max-w-4xl items-start">
        <section className="w-full overflow-hidden rounded-2xl bg-[#f4f1ec] shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#e6deef] bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">Devolucion generada</p>
              <h2 className="truncate text-sm font-black text-[#21192c]">Devolucion de {selectionTitle(items)}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee8dc] text-[#6f6584] transition hover:bg-[#e4dccf]"
              aria-label="Cerrar devolucion generada"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <div ref={documentRef}><DocumentPreview data={data} items={items} signature={signature} /></div>
            {mensajeCorreo && <p className={`mt-3 rounded-[8px] px-3 py-2 text-xs font-bold ${errorCorreo ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{mensajeCorreo}</p>}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={enviarCorreo} disabled={enviandoCorreo || generandoPdf} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3A9AF2] px-4 text-xs font-black text-[#FFFFFF] transition hover:bg-[#238BEA] disabled:cursor-not-allowed disabled:opacity-60">
                <Mail size={14} />
                {enviandoCorreo ? "Enviando..." : correoEnviado ? "Reenviar por correo" : "Enviar por correo"}
              </button>
              <button type="button" onClick={downloadPdf} disabled={enviandoCorreo || generandoPdf} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#eee8dc] px-4 text-xs font-black text-[#6f6584] disabled:cursor-not-allowed disabled:opacity-60">
                <Download size={14} />
                {generandoPdf ? "Generando..." : "Descargar PDF"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function DevolucionEditor({ devolucion, initialSelectedItemKeys, onBack, onGoResguardo, onSaved }) {
  const source = useMemo(() => ({ ...defaultDevolucion, ...devolucion }), [devolucion]);
  const canCaptureSignature = useCanCaptureTouchSignature();
  const items = useMemo(() => (source.items?.length ? source.items : [fallbackItem(source)]), [source]);
  const initialKeys = initialSelectedItemKeys?.length ? initialSelectedItemKeys : [items[items.length - 1]?.key];
  const initialReturnDetails = Object.fromEntries(
    items.map((item) => [
      item.key,
      {
        accesoriosDevueltos: item.accesoriosDevueltos || "",
        observacionesDevolucion: item.observacionesDevolucion || "",
      },
    ]),
  );
  const [selectedItemKeys, setSelectedItemKeys] = useState(initialKeys);
  const [returnDetails, setReturnDetails] = useState(initialReturnDetails);
  const selectedItems = items
    .filter((item) => selectedItemKeys.includes(item.key))
    .map((item) => ({ ...item, ...returnDetails[item.key] }));
  const activeItems = selectedItems.length ? selectedItems : [items[0]];
  const selectedItem = activeItems.length === 1 ? activeItems[0] : null;
  const estadoOptions = estadoOptionsForItems(activeItems);
  const [fecha] = useState(source.fecha);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(source.estado || estadoOptions[0]);
  const estado = estadoOptions.includes(estadoSeleccionado) ? estadoSeleccionado : estadoOptions[0];
  const [signature, setSignature] = useState("");
  const [generatedOpen, setGeneratedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState(null);

  const data = {
    ...source,
    fecha,
    estado,
  };

  const handleReturnDetailChange = (itemKey, field, value) => {
    setReturnDetails((current) => ({
      ...current,
      [itemKey]: {
        ...current[itemKey],
        [field]: value,
      },
    }));
  };
  const hasUnsavedChanges = fecha !== source.fecha
    || estado !== (source.estado || estadoOptions[0])
    || Boolean(signature)
    || JSON.stringify([...selectedItemKeys].sort()) !== JSON.stringify([...initialKeys].sort())
    || JSON.stringify(returnDetails) !== JSON.stringify(initialReturnDetails);

  const collaboratorValue = `${data.colaborador.nombre} - ${data.colaborador.numero}`;
  const assetValue = activeItems.length === 1
    ? `${activeItems[0].nombre} ${activeItems[0].codigo ? `(#${activeItems[0].codigo})` : ""} - Asignado`
    : `${activeItems.length} activos seleccionados`;
  const typeValue = activeItems.length === 1 ? activeItems[0].tipoLabel : "Seleccion multiple";
  const seriesValue = activeItems.length === 1 ? activeItems[0].serie || activeItems[0].codigo || "-" : "Ver lista de seleccion";
  const fechaDevValue = !selectedItem
    ? "Seleccion multiple"
    : selectedItem.fechaDev
      ? formatResguardoDate(selectedItem.fechaDev)
      : "Permanente";

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const itemsByAssignment = new Map();
      activeItems.forEach((item) => {
        const assignmentId = item.idAsignacion || source.idAsignacion;
        if (!assignmentId) throw new Error(`No se encontro la asignacion de origen para ${item.nombre}`);
        const assignmentItems = itemsByAssignment.get(assignmentId) || [];
        assignmentItems.push(item);
        itemsByAssignment.set(assignmentId, assignmentItems);
      });

      const results = [];
      for (const [assignmentId, assignmentItems] of itemsByAssignment) {
        const response = await fetch(`/api/asignaciones/${assignmentId}/devoluciones`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("scaet-token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fecha_devolucion: fecha,
            firma_colaborador: signature || null,
            firma_responsable: null,
            detalles: assignmentItems.map((item) => ({
              id_detalle: item.idDetalle,
              estado_fisico_devolucion: estado,
              accesorios_devueltos: item.accesoriosDevueltos || "",
              observaciones_devolucion: item.observacionesDevolucion || "",
            })),
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          const savedMessage = results.length
            ? ` ${results.length} devolucion(es) se guardaron antes del error.`
            : "";
          throw new Error(`${result.mensaje || "No se pudo guardar la devolucion"}.${savedMessage}`);
        }
        results.push(result);
      }

      setSavedResult({
        ...results[0],
        resultados: results,
        totalAsignaciones: results.length,
      });
      setGeneratedOpen(true);
    } catch (error) {
      window.alert(error.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      <BackButton onBack={onBack} hasUnsavedChanges={hasUnsavedChanges} label="Volver a asignaciones" />
      <div>
        <h1 className="mt-1 text-sm font-bold text-blue-300">Resguardo - Firma Digital</h1>
      </div>

      <div className="grid min-w-0 gap-4">
        <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <Tabs onGoResguardo={onGoResguardo} />

          <div className="mt-5">
            <p className="mb-4 border-b border-[#eee8f6] pb-3 text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">
              Datos de la devolucion
            </p>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Colaborador">
                <SoftInput value={collaboratorValue} />
              </Field>
              <Field label="Activo a devolver">
                <SoftInput value={assetValue} />
              </Field>
              <Field label="Tipo de activo">
                <SoftInput value={typeValue} />
              </Field>
              <Field label="Fecha de devolucion">
                <SoftInput value={fechaDevValue} />
              </Field>
              <Field label={returnStateLabel(activeItems)}>
                <SoftSelect value={estado} onChange={setEstadoSeleccionado} options={estadoOptions} />
              </Field>
              <Field label="Serie / ID">
                <SoftInput value={seriesValue} />
              </Field>
            </div>
            <div className="mt-4">
              <AssetReturnSelector
                items={items}
                selectedKeys={selectedItemKeys}
                returnDetails={returnDetails}
                onChange={setSelectedItemKeys}
                onDetailChange={handleReturnDetailChange}
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-white">
            <p className="mb-4 border-b border-[#eee8f6] pb-3 text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">
              Firmas de la devolucion
            </p>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <Field label="Firma del colaborador *">
                <SignaturePad value={signature} onChange={setSignature} disabled={!canCaptureSignature} />
              </Field>
              <Field label={source.responsableEntrega || "Responsable de entrega"}>
                <div className="mb-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-500 dark:bg-amber-400/15 dark:text-amber-300">
                  Por defecto
                </div>
                <AutoSignature signerName={source.responsableEntrega || "Responsable de entrega"} />
              </Field>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="h-10 rounded-[8px] bg-[#3A9AF2] px-5 text-xs font-black text-[#FFFFFF] transition hover:bg-[#238BEA]"
            >
              Confirmar y guardar pdf
            </button>
          </div>
        </section>
      </div>

      {generatedOpen && <GeneratedDevolucionModal data={{ ...data, folio: savedResult?.folio || data.folio }} items={activeItems} signature={signature} idResguardo={savedResult?.id_resguardo} onClose={() => { setGeneratedOpen(false); onSaved?.(savedResult); }} />}
    </div>
  );
}
function mapAssignmentToDevolucion(payload) {
  const items = (payload.activos || []).filter((item) => item.estado_detalle === "activo").map((item) => ({
    key: `detalle-${item.id_detalle}`,
    id: Number(item.id_equipo),
    idEquipo: Number(item.id_equipo),
    idDetalle: Number(item.id_detalle),
    idAsignacion: Number(payload.asignacion.id_asignacion),
    idResguardo: payload.resguardo?.id_resguardo || null,
    tipoResguardo: item.tipo_equipo === "Tarjeta" ? "tarjeta" : item.tipo_equipo === "YubiKey" ? "yubikey" : "equipo",
    tipoLabel: item.tipo_equipo,
    codigo: item.codigo_equipo,
    nombre: item.nombre_equipo,
    tipoActivo: item.tipo_equipo,
    marca: item.marca,
    modelo: item.modelo,
    serie: item.numero_serie,
    tipoAsignacion: item.tipo_asignacion
      ? `${item.tipo_asignacion[0].toUpperCase()}${item.tipo_asignacion.slice(1)}`
      : "",
    fechaDev: item.fecha_devolucion_programada || "",
    accesorios: item.accesorios_entregados || "",
    accesoriosDevueltos: item.accesorios_devueltos || "",
    observacionesDevolucion: item.observaciones_devolucion || "",
    estadoEntrega: item.estado_fisico_entrega || "Buen estado",
  }));
  const first = items[0] || {};
  return {
    idAsignacion: Number(payload.asignacion.id_asignacion),
    idResguardo: payload.resguardo?.id_resguardo || null,
    folio: payload.resguardo?.folio || "",
    fecha: new Date().toISOString().slice(0, 10),
    colaborador: {
      id: Number(payload.colaborador.id_colaborador),
      numero: payload.colaborador.num_colaborador,
      nombre: payload.colaborador.nombre_completo,
      area: payload.colaborador.area,
      departamento: payload.colaborador.departamento,
      puesto: payload.colaborador.puesto,
      correo: payload.colaborador.correo,
    },
    equipo: { id: first.id, codigo: first.codigo, nombre: first.nombre, tipo: first.tipoActivo, marca: first.marca, modelo: first.modelo, serie: first.serie },
    responsableEntrega: payload.configuracion_institucional?.nombre_responsable || payload.responsable?.nombre_completo || "-",
    configuracionInstitucional: payload.configuracion_institucional || null,
    observaciones: "",
    items,
  };
}

export default function DevolucionFirma(props) {
  const [loaded, setLoaded] = useState(null);
  const [loadError, setLoadError] = useState("");
  const idAsignacion = props.devolucion?.idAsignacion;
  const idAsignaciones = [...new Set(
    (props.devolucion?.idAsignaciones?.length
      ? props.devolucion.idAsignaciones
      : [idAsignacion]).filter(Boolean),
  )];
  const assignmentIdsKey = idAsignaciones.join(",");

  useEffect(() => {
    if (!idAsignaciones.length) return;
    const headers = { Authorization: `Bearer ${localStorage.getItem("scaet-token")}` };
    Promise.all(idAsignaciones.map(async (assignmentId) => {
      const response = await fetch(`/api/asignaciones/${assignmentId}`, { headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.mensaje || "No se pudo cargar la asignacion");
      return mapAssignmentToDevolucion(payload);
    })).then((mappedAssignments) => {
      const primary = mappedAssignments[0];
      const itemsByDetail = new Map();
      mappedAssignments.forEach((assignment) => {
        assignment.items.forEach((item) => itemsByDetail.set(item.idDetalle, item));
      });
      const items = [...itemsByDetail.values()];
      if (!items.length) throw new Error("El colaborador ya no tiene activos pendientes de devolucion");
      setLoaded({
        ...primary,
        idAsignaciones,
        items,
      });
    }).catch((error) => setLoadError(error.message));
  }, [assignmentIdsKey]);

  if (!loaded) {
    return <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-gray-500 shadow-sm">{loadError || "Cargando devolucion..."}</div>;
  }

  return <DevolucionEditor key={assignmentIdsKey} {...props} devolucion={loaded} />;
}
