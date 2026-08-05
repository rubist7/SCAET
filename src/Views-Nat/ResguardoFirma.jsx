import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eraser, Mail, PenLine, Plus, Send, Trash2, X } from "lucide-react";
import DateInput from "./DateInput";
import { formatDate, formatResguardoDate } from "./dateUtils";
import BackButton from "../components/BackButton";
import Signature from "../components/Signature";
import { descargarPdfResguardo, generarPdfResguardo } from "../utils/resguardoPdf";

const RESGUARDO_OPTIONS = [
  { value: "equipo", label: "Equipo tecnologico" },
  { value: "tarjeta", label: "Tarjeta comedor" },
  { value: "yubikey", label: "Yubikey" },
];

const RESPONSIBILITY_TEXTS = {
  equipo:
    "Sirva este como comprobante de entrega del equipo descrito a continuacion propiedad de PUENTE CALINDA S. DE R.L. DE C.V. para uso exclusivo de las funciones asignadas en mi area de trabajo, quedando en el entendido que:\n\nEstara bajo mi resguardo y cuidado durante el tiempo que labore con la empresa, y lo entregare al momento de rescision laboral al departamento de IT, procurando darle el mejor uso posible, quedando estrictamente prohibido el uso indebido del mismo. Asi tambien debere mostrarlo cada vez que se me requiera y reportar de inmediato la falla que tenga para pronto arreglo, a su vez acepto que en caso de extravio o dano por negligencia se me descuente en su totalidad o parcialidad segun sea el caso.",
  tarjeta:
    "Por medio del presente, se hace entrega al(la) colaborador(a) de 1 (uno) Tarjeta de Comedor destinada exclusivamente para el uso del torniquete de acceso al comedor y el consumo personal de alimentos, conforme a las politicas internas de la empresa.\n\n3) Condiciones de uso y responsabilidad\nEl(la) colega acepta y reconoce lo siguiente:\n1. Uso personal e intransferible: La tarjeta es de uso estrictamente personal, por lo que no podra prestarse, compartirse, transferirse ni permitir su uso por terceros.\n2. Prohibicion de consumo para terceros: La tarjeta no debera utilizarse para dar acceso o alimentos a otras personas.\n3. Cuidado y resguardo: El(la) colaborador(a) se compromete a mantenerla en buen estado, evitando danos, mal uso o alteraciones.\n4. Devolucion: En caso de baja, cambio de puesto, cambio de sede o cuando la empresa lo solicite, debera devolver la tarjeta de forma inmediata.\n5. Extravio, robo o dano: En caso de extravio o no devolucion, el(la) colaborador(a) autoriza el cobro de $500.00 (quinientos pesos 00/100 M.N.) por reposicion o pieza.\n6. Notificacion inmediata: Ante robo o extravio, debera reportarse de inmediato a RH / Seguridad / TI para su bloqueo.",
  yubikey:
    "CON MI FIRMA AL CALCE DEL PRESENTE, RECIBO EL YUBIKEY DESCRITO ARRIBA PROPIEDAD DE PUENTE CALINDA S. DE R.L. DE C.V., PARA USO EXCLUSIVO DE LAS FUNCIONES ASIGNADAS EN MI AREA DE TRABAJO, QUEDANDO EN EL ENTENDIDO QUE:\n\nESTARA BAJO MI RESGUARDO Y CUIDADO DURANTE EL TIEMPO QUE LABORE CON LA EMPRESA, Y LO ENTREGARE AL MOMENTO DE RESCISION LABORAL A LA GERENCIA ADMINISTRATIVA, PROCURANDO DARLE EL MEJOR USO POSIBLE, QUEDANDO ESTRICTAMENTE PROHIBIDO EL USO INDEBIDO DEL MISMO. ASI TAMBIEN DEBERE MOSTRARLO CADA VEZ QUE SE ME REQUIERA Y REPORTAR DE INMEDIATO LA FALLA QUE TENGA PARA PRONTO ARREGLO, A SU VEZ ACEPTO QUE EN CASO DE EXTRAVIO O DANO POR NEGLIGENCIA SE ME DESCUENTE LA CANTIDAD DE $100 USD EN SU TOTALIDAD.",
};

const defaultResguardo = {
  folio: "",
  fecha: "",
  colaborador: { id: null, numero: "", nombre: "", area: "", departamento: "", puesto: "", correo: "" },
  equipo: { id: null, codigo: "", nombre: "", tipo: "", marca: "", modelo: "", serie: "", proveedor: "" },
  tipo: "Permanente",
  fechaDev: "",
  observaciones: "",
  tipoResguardo: "equipo",
  numeroEmpleado: "",
  activoInventario: "",
  accesorios: "",
  estadoFisico: "Buen estado",
  ubicacionTrabajo: "",
  responsableEntrega: "Responsable de entrega",
  idTarjeta: "",
  cantidad: "1",
  estadoEntrega: "Buen estado",
  departamentoTarjeta: "",
  puestoTarjeta: "",
  fechaEntregaTarjeta: "",
  motivoTarjeta: "Entrega",
  yubikey: "",
  serieYubikey: "",
  modeloYubikey: "",
  userId: "",
  pin: "",
  correoAsociado: "",
  sistemasAutorizados: "",
  ligasSeguridad: "",
  ligasTrabajo: "",
  items: [],
};

function normalizeResguardoItem(data) {
  if (data.tipoResguardo === "tarjeta") {
    return {
      key: `tarjeta-${data.idTarjeta || "actual"}`,
      isOriginal: false,
      isNew: true,
      tipoResguardo: "tarjeta",
      tipoLabel: "Tarjeta comedor",
      codigo: data.idTarjeta,
      nombre: "Tarjeta comedor",
      tipoActivo: "Tarjeta comedor",
      marca: "SCAET",
      modelo: "Comedor",
      serie: data.idTarjeta,
      fechaAsignacion: data.fechaEntregaTarjeta || data.fecha,
      tipoAsignacion: data.tipo,
      fechaDev: data.fechaDev,
      estadoEntrega: data.estadoEntrega,
    };
  }

  if (data.tipoResguardo === "yubikey") {
    return {
      key: `yubikey-${data.serieYubikey || data.yubikey || "actual"}`,
      isOriginal: false,
      isNew: true,
      tipoResguardo: "yubikey",
      tipoLabel: "Yubikey",
      codigo: data.serieYubikey,
      nombre: data.yubikey,
      tipoActivo: "Yubikey",
      marca: "Yubico",
      modelo: data.modeloYubikey,
      serie: data.serieYubikey,
      fechaAsignacion: data.fecha,
      tipoAsignacion: data.tipo,
      fechaDev: data.fechaDev,
      estadoEntrega: data.estadoEntrega,
    };
  }

  return {
    key: `equipo-${data.equipo.codigo}`,
    isOriginal: false,
    isNew: true,
    tipoResguardo: "equipo",
    tipoLabel: "Equipo tecnologico",
    codigo: data.activoInventario || data.equipo.codigo,
    nombre: data.equipo.nombre,
    tipoActivo: data.equipo.tipo,
    marca: data.equipo.marca,
    modelo: data.equipo.modelo,
    serie: data.equipo.serie,
    proveedor: data.equipo.proveedor,
    fechaAsignacion: data.fecha,
    tipoAsignacion: data.tipo,
    fechaDev: data.fechaDev,
    estadoEntrega: data.estadoFisico,
  };
}

function mergeResguardoItems(originalItems = [], editedItems = []) {
  const mergedItems = [...originalItems];
  const knownKeys = new Set(originalItems.map((item) => item.key));
  const knownIds = new Set(
    originalItems
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id)),
  );

  editedItems.forEach((item) => {
    const itemId = Number(item.id);
    const hasKnownId = Number.isFinite(itemId) && knownIds.has(itemId);
    if (knownKeys.has(item.key) || hasKnownId) return;

    mergedItems.push({
      ...item,
      isOriginal: item.isNew ? false : true,
      isNew: item.isNew === true,
    });
    knownKeys.add(item.key);
    if (Number.isFinite(itemId)) knownIds.add(itemId);
  });

  return mergedItems;
}

function itemResguardoName(item) {
  if (item.tipoResguardo === "tarjeta") return "tarjeta comedor";
  if (item.tipoResguardo === "yubikey") return "yubikey";

  return item.tipoActivo?.toLowerCase() || item.nombre?.toLowerCase() || "equipo tecnologico";
}

function documentTitle(data) {
  if (data.items.length !== 1) return "Resguardo";

  return `Resguardo de ${itemResguardoName(data.items[0])}`;
}

function responsibilityForItems(items) {
  const types = [...new Set(items.map((item) => item.tipoResguardo))];

  return types.map((type) => RESPONSIBILITY_TEXTS[type]).filter(Boolean).join("\n\n");
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold text-blue-300">{label}</span>
      {children}
    </label>
  );
}

function SoftInput({ value, onChange, placeholder, icon, inputMode, maxLength, pattern }) {
  return (
    <div className="relative">
      <input
        value={value}
        readOnly={!onChange}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        className="h-10 w-full min-w-0 rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 pr-9 text-sm font-normal text-[#3c3445] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
      {icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6f6584]">{icon}</div>}
    </div>
  );
}

function tipoResguardoLabel(value) {
  const selected = RESGUARDO_OPTIONS.find((option) => option.value === value);

  return selected?.label || "Equipo tecnologico";
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

function Segmented({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {["Temporal", "Permanente"].map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`flex h-10 items-center gap-2 rounded-[8px] border px-4 text-sm font-normal transition ${
            value === option
              ? "border-blue-300 bg-blue-50 text-[#0F83F0]"
              : "border-[#ded6c8] bg-[#eee8dc] text-[#6f6584]"
          }`}
        >
          <span className={`h-3 w-3 rounded-full border ${value === option ? "border-blue-600 bg-blue-600" : "border-[#8b8196]"}`} />
          {option}
        </button>
      ))}
    </div>
  );
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

function OfficialHeader({ title, data }) {
  return (
    <header className="pb-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-black tracking-[0.08em] text-blue-600">Puente Calinda</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8f879b]">Gerencia de Sistemas</p>
        </div>
        <p className="pt-2 text-right text-[10px] font-normal text-[#6f6584]">{formatDate(data.fecha)}</p>
      </div>
      <h2 className="mt-6 text-center text-base font-black uppercase text-[#21192c]">{title}</h2>
    </header>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(88px,0.45fr)_minmax(0,1fr)] gap-2 border-b border-[#eee8f6] py-2 text-xs sm:grid-cols-[150px_1fr]">
      <span className="text-[#8f879b]">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-[#21192c]">{value || "-"}</span>
    </div>
  );
}

function AssetsTable({ items }) {
  return (
    <div className="mt-5 max-w-full overflow-x-auto rounded-[8px] border border-[#ded6c8]">
      <table className="w-full min-w-[680px] border-collapse text-[10px]">
        <thead className="bg-[#eee8dc] text-[#6f6584]">
          <tr>
            {["Tipo", "Equipo / Activo", "Marca", "Modelo", "No. Serie", "Inventario", "Asignacion", "Devolucion", "Estado / Accesorios", "Observaciones"].map((heading) => (
              <th key={heading} className="border-b border-[#ded6c8] px-3 py-2 text-left font-black uppercase tracking-[0.12em]">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key} className="border-b border-[#eee8f6] last:border-0">
              <td className="px-3 py-2 font-semibold text-[#21192c]">{item.tipoLabel}</td>
              <td className="px-3 py-2 text-[#6f6584]">{item.nombre}</td>
              <td className="px-3 py-2 text-[#6f6584]">{item.marca || "-"}</td>
              <td className="px-3 py-2 text-[#6f6584]">{item.modelo || "-"}</td>
              <td className="px-3 py-2 text-[#6f6584]">{item.serie || "-"}</td>
              <td className="px-3 py-2 text-[#6f6584]">{item.codigo || "-"}</td>
              <td className="px-3 py-2 text-[#6f6584]">
                {item.tipoAsignacion || "-"} {item.fechaAsignacion ? `- ${formatResguardoDate(item.fechaAsignacion)}` : ""}
              </td>
              <td className="px-3 py-2 text-[#6f6584]">{item.fechaDev ? formatResguardoDate(item.fechaDev) : "Permanente"}</td>
              <td className="px-3 py-2 text-[#6f6584]">{item.estadoEntrega || "-"}{item.accesorios ? ` / ${item.accesorios}` : ""}</td>
              <td className="px-3 py-2 text-[#6f6584]">{item.observaciones || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponsibilityText({ children }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Condiciones y responsabilidad</p>
      <p className="whitespace-pre-line text-justify text-[10px] font-normal leading-5 text-[#6f6584]">{children}</p>
    </div>
  );
}

function SignatureImage({ value, fallback }) {
  if (!value) {
    return <p className="flex min-h-12 items-end justify-center text-sm font-semibold text-[#b7ab9b]">{fallback}</p>;
  }

  return <img src={value} alt="Firma del colaborador" className="mx-auto h-12 w-full object-contain dark:brightness-0 dark:invert" />;
}

function ReceiverSignatureDetails({ colaborador }) {
  const areaDepartamento = `${colaborador?.area || "-"} - ${colaborador?.departamento || "-"}`;

  return (
    <div className="mt-1 text-[9px] text-[#6f6584]">
      <p className="font-semibold">{colaborador?.nombre || "-"}</p>
      <p className="font-bold">{areaDepartamento}</p>
      <p className="font-bold">{colaborador?.puesto || "-"}</p>
    </div>
  );
}

function SignatureSection({ signature, colaborador }) {
  return (
    <div className="mx-auto mt-7 grid max-w-2xl gap-8 text-center sm:grid-cols-2">
      <div>
        <div className="flex h-32 items-center justify-center overflow-hidden">
          <SignatureImage value={signature} fallback="Pendiente" />
        </div>
        <div className="mt-2 border-t border-[#b7ab9b] pt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#b7ab9b]">Firma de recibe</div>
        <ReceiverSignatureDetails colaborador={colaborador} />
      </div>
      <Signature type="entrega" />
    </div>
  );
}

function ResguardoEquipo({ data, signature }) {
  return (
    <>
      <OfficialHeader title={documentTitle(data)} data={data} />
      <div className="mt-4">
        <PreviewRow label="Responsable" value={data.colaborador.nombre} />
        <PreviewRow label="Numero de empleado" value={data.numeroEmpleado} />
        <PreviewRow label="Departamento" value={data.colaborador.departamento || data.colaborador.area} />
        <PreviewRow label="Puesto" value={data.colaborador.puesto} />
        <PreviewRow label="Centro de trabajo" value={data.ubicacionTrabajo} />
        <PreviewRow label="Accesorios" value={data.accesorios} />
        <PreviewRow label="Estado fisico" value={data.estadoFisico} />
      </div>
      <AssetsTable items={data.items} />
      <ResponsibilityText>{responsibilityForItems(data.items)}</ResponsibilityText>
      <SignatureSection signature={signature} colaborador={data.colaborador} />
    </>
  );
}

function ResguardoGeneral({ data, signature }) {
  return (
    <>
      <OfficialHeader title={documentTitle(data)} data={data} />
      <div className="mt-4">
        <PreviewRow label="Responsable" value={data.colaborador.nombre} />
        <PreviewRow label="Numero de empleado" value={data.numeroEmpleado} />
        <PreviewRow label="Departamento" value={data.colaborador.departamento || data.colaborador.area} />
        <PreviewRow label="Puesto" value={data.colaborador.puesto} />
        <PreviewRow label="Centro de trabajo" value={data.ubicacionTrabajo} />
      </div>
      <AssetsTable items={data.items} />
      <ResponsibilityText>{responsibilityForItems(data.items)}</ResponsibilityText>
      <SignatureSection signature={signature} colaborador={data.colaborador} />
    </>
  );
}

function ResguardoTarjetaComedor({ data, signature }) {
  return (
    <>
      <OfficialHeader title="Resguardo de tarjeta de comedor" data={data} />
      <div className="mt-4">
        <PreviewRow label="Colaborador" value={data.colaborador.nombre} />
        <PreviewRow label="Numero de empleado" value={data.numeroEmpleado} />
        <PreviewRow label="Area / Depto." value={data.departamentoTarjeta} />
        <PreviewRow label="Puesto" value={data.puestoTarjeta} />
        <PreviewRow label="Fecha de entrega" value={formatDate(data.fechaEntregaTarjeta)} />
        <PreviewRow label="ID / Num. tarjeta" value={data.idTarjeta} />
        <PreviewRow label="Cantidad" value={data.cantidad} />
        <PreviewRow label="Motivo" value={data.motivoTarjeta} />
      </div>
      <ResponsibilityText>{RESPONSIBILITY_TEXTS.tarjeta}</ResponsibilityText>
      <SignatureSection signature={signature} colaborador={data.colaborador} />
    </>
  );
}

function ResguardoYubikey({ data, signature }) {
  return (
    <>
      <OfficialHeader title="Resguardo de Yubikey" data={data} />
      <div className="mt-4">
        <PreviewRow label="Responsable" value={data.colaborador.nombre} />
        <PreviewRow label="Posicion / Area" value={`${data.colaborador.puesto} / ${data.colaborador.area}`} />
        <PreviewRow label="Yubikey" value={data.serieYubikey || data.yubikey} />
        <PreviewRow label="User ID" value={data.userId} />
        <PreviewRow label="PIN" value={data.pin} />
        <PreviewRow label="Liga de seguridad" value={data.ligasSeguridad} />
        <PreviewRow label="Liga de trabajo" value={data.ligasTrabajo} />
      </div>
      <ResponsibilityText>{RESPONSIBILITY_TEXTS.yubikey}</ResponsibilityText>
      <SignatureSection signature={signature} colaborador={data.colaborador} />
    </>
  );
}

function DocumentPreview({ data, signature }) {
  if (data.items.length > 1) {
    return (
      <div className="min-w-0 rounded-2xl border border-[#eee8f6] bg-white px-4 py-6 shadow-sm sm:px-7">
        <ResguardoGeneral data={data} signature={signature} />
      </div>
    );
  }

  const formats = {
    equipo: <ResguardoEquipo data={data} signature={signature} />,
    tarjeta: <ResguardoTarjetaComedor data={data} signature={signature} />,
    yubikey: <ResguardoYubikey data={data} signature={signature} />,
  };

  return <div className="min-w-0 rounded-2xl border border-[#eee8f6] bg-white px-4 py-6 shadow-sm sm:px-7">{formats[data.tipoResguardo]}</div>;
}

function GeneratedResguardoModal({ data, signature, idResguardo, onClose }) {
  const TIEMPO_MAXIMO_ENVIO_MS = 60_000;
  const documentRef = useRef(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState(Boolean(data.correoEnviado));
  const [mensajeCorreo, setMensajeCorreo] = useState("");
  const [errorCorreo, setErrorCorreo] = useState(false);

  const crearPdf = async () => {
    if (!documentRef.current) throw new Error("No se encontro el documento del resguardo");
    return generarPdfResguardo(documentRef.current, { cantidadEquipos: data.items?.length || 1 });
  };

  const downloadPdf = async () => {
    setGenerandoPdf(true);
    setMensajeCorreo("");
    try {
      descargarPdfResguardo(await crearPdf(), data.folio);
    } catch (error) {
      setErrorCorreo(true);
      setMensajeCorreo(error.message || "No se pudo generar el PDF");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const enviarCorreo = async () => {
    if (!idResguardo) {
      setErrorCorreo(true);
      setMensajeCorreo("No se encontro el identificador del resguardo");
      return;
    }
    if (correoEnviado && !window.confirm("Este resguardo ya fue enviado. ¿Deseas enviarlo nuevamente?")) return;

    setEnviandoCorreo(true);
    setErrorCorreo(false);
    setMensajeCorreo("");
    try {
      const pdf = await crearPdf();
      const formData = new FormData();
      formData.append("pdf", pdf, `${data.folio || "resguardo"}.pdf`);
      const controller = new AbortController();
      const timeoutEnvio = window.setTimeout(() => controller.abort(), TIEMPO_MAXIMO_ENVIO_MS);
      let response;
      console.info("Iniciando fetch de correo");
      try {
        response = await fetch(`/api/resguardos/${idResguardo}/enviar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("scaet-token")}` },
          body: formData,
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutEnvio);
        console.info("Fetch de correo finalizado");
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.mensaje || "No se pudo enviar el resguardo por correo");

      setCorreoEnviado(true);
      setMensajeCorreo("Resguardo enviado correctamente al colaborador y con copia al responsable.");
    } catch (error) {
      setErrorCorreo(true);
      setMensajeCorreo(
        error.name === "AbortError"
          ? "El resguardo está guardado, pero el servicio de correo no respondió."
          : error.message || "No se pudo enviar el resguardo por correo"
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
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">Resguardo generado</p>
              <h2 className="truncate text-sm font-black text-[#21192c]">{documentTitle(data)}</h2>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee8dc] text-[#6f6584] transition hover:bg-[#e4dccf]" aria-label="Cerrar resguardo generado"><X size={16} /></button>
          </div>
          <div className="p-4 sm:p-5">
            <div ref={documentRef}><DocumentPreview data={data} signature={signature} /></div>
            {mensajeCorreo && <p className={`mt-3 rounded-[8px] px-3 py-2 text-xs font-bold ${errorCorreo ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{mensajeCorreo}</p>}
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={enviarCorreo} disabled={enviandoCorreo || generandoPdf} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3A9AF2] text-xs font-black text-[#FFFFFF] transition hover:bg-[#238BEA] disabled:cursor-not-allowed disabled:opacity-60"><Mail size={14} />{enviandoCorreo ? "Enviando..." : correoEnviado ? "Reenviar por correo" : "Enviar por correo"}</button>
              <button type="button" onClick={downloadPdf} disabled={enviandoCorreo || generandoPdf} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#eee8dc] text-xs font-black text-[#6f6584] disabled:cursor-not-allowed disabled:opacity-60"><Download size={14} />{generandoPdf ? "Generando..." : "Descargar PDF"}</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResguardoItemsSummary({ items, selectedItemKey, onSelectItem, onAddItem, onRemoveItem }) {
  const handleRemoveItem = (item) => {
    if (item.isOriginal || !item.isNew) return;
    onRemoveItem?.(item.key);
  };

  return (
    <div className="rounded-[8px] border border-[#eee8f6] bg-blue-50/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">
          Activos dentro de este resguardo
        </p>
        <button
          type="button"
          onClick={onAddItem}
          disabled={!onAddItem}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#3A9AF2] text-[#FFFFFF] transition hover:bg-[#238BEA]"
          aria-label="Agregar otro activo al resguardo"
          title="Agregar otro activo"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.key}
            role="button"
            tabIndex={0}
            onClick={() => onSelectItem?.(item)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelectItem?.(item);
            }}
            className={`flex min-w-0 cursor-pointer items-start gap-2 rounded-[8px] border px-3 py-2 text-xs transition ${
              selectedItemKey === item.key ? "border-blue-300 bg-blue-50" : "border-transparent bg-white"
            }`}
          >
            <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] sm:items-center">
              <span className="min-w-0 break-words font-semibold text-[#21192c]">
                {item.nombre} {item.codigo ? `#${item.codigo}` : ""}
              </span>
              <span className="min-w-0 break-words text-[#8f879b]">
                {item.tipoLabel} - {item.marca || "-"} {item.modelo || ""} - {item.serie || "Sin serie"} - {item.tipoAsignacion || "-"} - {item.fechaDev ? `Dev. ${formatResguardoDate(item.fechaDev)}` : "Permanente"}
              </span>
            </div>
            {item.isNew && !item.isOriginal && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemoveItem(item);
                }}
                disabled={!onRemoveItem}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-red-50 text-red-500 transition hover:bg-red-100"
                aria-label={`Eliminar ${item.nombre} del resguardo`}
                title="Eliminar activo"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionalFields({ data, setters }) {
  if (data.tipoResguardo === "tarjeta") {
    return (
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Field label="ID / Numero de tarjeta">
          <SoftInput value={data.idTarjeta} onChange={setters.setIdTarjeta} />
        </Field>
        <Field label="Cantidad">
          <SoftInput value={data.cantidad} onChange={setters.setCantidad} />
        </Field>
        <Field label="Área / Depto.">
          <SoftInput value={data.departamentoTarjeta} onChange={setters.setDepartamentoTarjeta} />
        </Field>
        <Field label="Puesto">
          <SoftInput value={data.puestoTarjeta} onChange={setters.setPuestoTarjeta} />
        </Field>
        <Field label="Fecha de entrega">
          <DateInput value={data.fechaEntregaTarjeta} onChange={setters.setFechaEntregaTarjeta} />
        </Field>
        <Field label="Motivo de entrega o reposicion">
          <SoftInput value={data.motivoTarjeta} onChange={setters.setMotivoTarjeta} />
        </Field>
      </div>
    );
  }

  if (data.tipoResguardo === "yubikey") {
    return (
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Field label="Yubikey">
          <SoftInput value={data.serieYubikey || data.yubikey} onChange={setters.setSerieYubikey} />
        </Field>
        <Field label="User ID">
          <SoftInput value={data.userId} onChange={setters.setUserId} />
        </Field>
        <Field label="PIN">
          <SoftInput
            value={data.pin}
            onChange={(value) => setters.setPin(value.replace(/\D/g, "").slice(0, 4))}
            placeholder="2510"
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
          />
        </Field>
        <Field label="Liga de seguridad">
          <SoftInput value={data.ligasSeguridad} onChange={setters.setLigasSeguridad} />
        </Field>
        <Field label="Liga de trabajo">
          <SoftInput value={data.ligasTrabajo} onChange={setters.setLigasTrabajo} />
        </Field>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <Field label="Equipo a asignar">
        <SoftInput value={`${data.equipo.nombre} (#${data.equipo.codigo})`} />
      </Field>
      <Field label="Numero de activo / Inventario">
        <SoftInput value={data.activoInventario} onChange={setters.setActivoInventario} />
      </Field>
      <Field label="Accesorios entregados">
        <SoftInput value={data.accesorios} onChange={setters.setAccesorios} />
      </Field>
      <Field label="Estado fisico del equipo">
        <SoftInput value={data.estadoFisico} onChange={setters.setEstadoFisico} />
      </Field>
      <Field label="Tipo de asignacion">
        <Segmented value={data.tipo} onChange={setters.setTipo} />
      </Field>
      <Field label="Fecha de devolucion">
        <DateInput
          value={data.tipo === "Permanente" || !data.fechaDev ? "" : String(data.fechaDev).slice(0, 10)}
          onChange={setters.setFechaDev}
          disabled={data.tipo === "Permanente"}
        />
      </Field>
    </div>
  );
}

function ResguardoEditor({ resguardo, onBack, onAddItem, onRemoveItem, onGenerate, backLabel = "Volver a asignaciones" }) {
  const source = useMemo(() => ({ ...defaultResguardo, ...resguardo }), [resguardo]);
  const canCaptureSignature = useCanCaptureTouchSignature();
  const initialItems = useMemo(
    () => (source.items?.length ? source.items : [normalizeResguardoItem(source)]),
    [source],
  );
  const [items, setItems] = useState(initialItems);
  const [selectedItemKey, setSelectedItemKey] = useState(initialItems[0]?.key || "");
  const selectedItem = items.find((item) => item.key === selectedItemKey) || items[0];
  const tipoResguardo = selectedItem?.tipoResguardo || source.tipoResguardo;
  const tipo = selectedItem?.tipoAsignacion || source.tipo;
  const fechaDev = selectedItem?.fechaDev || "";
  const [observacionesGenerales] = useState(source.observaciones);
  const [observaciones, setObservaciones] = useState(selectedItem?.observaciones || "");
  const [numeroEmpleado, setNumeroEmpleado] = useState(source.numeroEmpleado);
  const [activoInventario, setActivoInventario] = useState(selectedItem?.codigo || source.activoInventario);
  const [accesorios, setAccesorios] = useState(selectedItem?.accesorios || source.accesorios);
  const [estadoFisico, setEstadoFisico] = useState(selectedItem?.estadoEntrega || source.estadoFisico);
  const [ubicacionTrabajo, setUbicacionTrabajo] = useState(source.ubicacionTrabajo);
  const [responsableEntrega, setResponsableEntrega] = useState(source.responsableEntrega);
  const [idTarjeta, setIdTarjeta] = useState(
    selectedItem?.tipoResguardo === "tarjeta" ? selectedItem.codigo || "" : source.idTarjeta,
  );
  const [cantidad, setCantidad] = useState(source.cantidad);
  const [departamentoTarjeta, setDepartamentoTarjeta] = useState(
    source.departamentoTarjeta
      || `${source.colaborador?.area || "-"} - ${source.colaborador?.departamento || "-"}`,
  );
  const [puestoTarjeta, setPuestoTarjeta] = useState(source.puestoTarjeta || source.colaborador?.puesto || "");
  const [fechaEntregaTarjeta, setFechaEntregaTarjeta] = useState(source.fechaEntregaTarjeta);
  const [motivoTarjeta, setMotivoTarjeta] = useState(source.motivoTarjeta);
  const [yubikey, setYubikey] = useState(
    selectedItem?.tipoResguardo === "yubikey" ? selectedItem.nombre || "" : source.yubikey,
  );
  const [serieYubikey, setSerieYubikey] = useState(
    selectedItem?.tipoResguardo === "yubikey" ? selectedItem.serie || "" : source.serieYubikey,
  );
  const [modeloYubikey, setModeloYubikey] = useState(
    selectedItem?.tipoResguardo === "yubikey" ? selectedItem.modelo || "" : source.modeloYubikey,
  );
  const [userId, setUserId] = useState(source.userId);
  const [pin, setPin] = useState(source.pin);
  const [correoAsociado, setCorreoAsociado] = useState(source.correoAsociado);
  const [sistemasAutorizados, setSistemasAutorizados] = useState(source.sistemasAutorizados);
  const [ligasSeguridad, setLigasSeguridad] = useState(source.ligasSeguridad);
  const [ligasTrabajo, setLigasTrabajo] = useState(source.ligasTrabajo);
  const [signature, setSignature] = useState(source.firmaColaborador || "");
  const [generatedOpen, setGeneratedOpen] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const updateSelectedItem = (changes) => {
    setItems((currentItems) => currentItems.map((item) => (
      item.key === selectedItemKey ? { ...item, ...changes } : item
    )));
  };

  const handleSelectItem = (item) => {
    setSelectedItemKey(item.key);
    setActivoInventario(item.codigo || "");
    setAccesorios(item.accesorios || "");
    setEstadoFisico(item.estadoEntrega || "Buen estado");
    setObservaciones(item.observaciones || "");
    if (item.tipoResguardo === "tarjeta") setIdTarjeta(item.codigo || "");
    if (item.tipoResguardo === "yubikey") {
      setYubikey(item.nombre || "");
      setSerieYubikey(item.serie || "");
      setModeloYubikey(item.modelo || "");
    }
  };

  const selectedEquipo = tipoResguardo === "equipo"
    ? {
        ...source.equipo,
        id: selectedItem?.id ?? source.equipo?.id,
        codigo: selectedItem?.codigo || source.equipo?.codigo,
        nombre: selectedItem?.nombre || source.equipo?.nombre,
        tipo: selectedItem?.tipoActivo || source.equipo?.tipo,
        marca: selectedItem?.marca || source.equipo?.marca,
        modelo: selectedItem?.modelo || source.equipo?.modelo,
        serie: selectedItem?.serie || source.equipo?.serie,
        proveedor: selectedItem?.proveedor || source.equipo?.proveedor,
      }
    : source.equipo;

  const editableSource = {
    ...source,
    equipo: selectedEquipo,
    tipoResguardo,
    tipo,
    fechaDev,
    observaciones: observacionesGenerales,
    numeroEmpleado,
    activoInventario,
    accesorios,
    estadoFisico,
    ubicacionTrabajo,
    responsableEntrega,
    idTarjeta,
    cantidad,
    departamentoTarjeta,
    puestoTarjeta,
    fechaEntregaTarjeta,
    motivoTarjeta,
    yubikey,
    serieYubikey,
    modeloYubikey,
    userId,
    pin,
    correoAsociado,
    sistemasAutorizados,
    ligasSeguridad,
    ligasTrabajo,
  };

  const data = {
    ...editableSource,
    items,
  };
  const editableFields = [
    "numeroEmpleado", "ubicacionTrabajo", "responsableEntrega",
    "idTarjeta", "cantidad", "departamentoTarjeta", "puestoTarjeta",
    "fechaEntregaTarjeta", "motivoTarjeta", "yubikey", "serieYubikey",
    "modeloYubikey", "userId", "pin", "correoAsociado", "sistemasAutorizados",
    "ligasSeguridad", "ligasTrabajo",
  ];
  const hasUnsavedChanges = editableFields.some(
    (field) => String(editableSource[field] ?? "") !== String(source[field] ?? ""),
  )
    || JSON.stringify(items) !== JSON.stringify(initialItems)
    || signature !== (source.firmaColaborador || "");

  const setters = {
    setTipo: (value) => {
      updateSelectedItem({
        tipoAsignacion: value,
        fechaDev: value === "Permanente" ? "" : fechaDev,
      });
    },
    setFechaDev: (value) => {
      updateSelectedItem({ fechaDev: value });
    },
    setActivoInventario: (value) => {
      setActivoInventario(value);
      updateSelectedItem({ codigo: value });
    },
    setAccesorios: (value) => {
      setAccesorios(value);
      updateSelectedItem({ accesorios: value });
    },
    setEstadoFisico: (value) => {
      setEstadoFisico(value);
      updateSelectedItem({ estadoEntrega: value });
    },
    setIdTarjeta,
    setCantidad,
    setDepartamentoTarjeta,
    setPuestoTarjeta,
    setFechaEntregaTarjeta,
    setMotivoTarjeta,
    setYubikey,
    setSerieYubikey,
    setModeloYubikey,
    setUserId,
    setPin,
    setCorreoAsociado,
    setSistemasAutorizados,
    setLigasSeguridad,
    setLigasTrabajo,
  };

  const handleGenerate = async () => {
    setSaving(true);
    setMessage("");
    try {
      let result = generatedResult;
      const hasNewItems = data.items.some((item) => item.isNew || item.isOriginal === false);
      if (source.persisted && !hasNewItems) {
        throw new Error("Agrega al menos un activo nuevo antes de generar el resguardo");
      }
      if ((!source.persisted || hasNewItems) && !result) {
        result = await onGenerate?.(data);
        setGeneratedResult(result);
      }
      const idResguardo = source.idResguardo || result?.id_resguardo;
      if (idResguardo && signature) {
        const response = await fetch(`/api/resguardos/${idResguardo}/firmas`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${localStorage.getItem("scaet-token")}`, "Content-Type": "application/json" },
          body: JSON.stringify({ firma_colaborador: signature, firma_responsable: source.firmaResponsable || null }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.mensaje || "No se pudo guardar la firma");
      }
      setGeneratedOpen(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      <BackButton onBack={onBack} hasUnsavedChanges={hasUnsavedChanges} label={backLabel} />
      <h1 className="text-sm font-bold text-blue-300">Resguardo - Firma Digital</h1>

      <div className="grid min-w-0 gap-4">
        <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex overflow-x-auto border-b border-blue-500">
            <button type="button" className="rounded-t-[8px] bg-blue-50 px-5 py-3 text-xs font-black text-blue-600">
              Resguardo
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <p className="border-b border-[#eee8f6] pb-3 text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">Datos del resguardo</p>
            <Field label="Colaborador">
              <SoftInput value={`${data.colaborador.nombre} - ${data.colaborador.numero}`} />
            </Field>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Numero de empleado">
                <SoftInput value={numeroEmpleado} onChange={setNumeroEmpleado} />
              </Field>
              <Field label="Ubicacion / Centro de trabajo">
                <SoftInput value={ubicacionTrabajo} onChange={setUbicacionTrabajo} />
              </Field>
              <Field label="Responsable de entrega">
                <SoftInput value={responsableEntrega} onChange={setResponsableEntrega} />
              </Field>
              <Field label="Tipo de resguardo">
                <SoftInput value={tipoResguardoLabel(tipoResguardo)} />
              </Field>
            </div>
            <ConditionalFields data={data} setters={setters} />
            <ResguardoItemsSummary
              items={data.items}
              selectedItemKey={selectedItemKey}
              onSelectItem={handleSelectItem}
              onAddItem={onAddItem ? () => onAddItem(data) : undefined}
              onRemoveItem={onRemoveItem}
            />
            <Field label="Observaciones">
              <textarea
                value={observaciones}
                onChange={(event) => {
                  const value = event.target.value;
                  setObservaciones(value);
                  updateSelectedItem({ observaciones: value });
                }}
                placeholder="Estado, accesorios, condiciones u observaciones..."
                className="h-24 w-full min-w-0 resize-none rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 py-3 text-sm font-normal text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </Field>
          </div>

          <div className="mt-5">
            <p className="mb-4 border-b border-[#eee8f6] pb-3 text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">Firmas del documento</p>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <Field label="Firma del colaborador *">
                <SignaturePad
                  value={signature}
                  onChange={setSignature}
                  disabled={!canCaptureSignature}
                />
              </Field>
              <Field label={responsableEntrega}>
                <div className="mb-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-500 dark:bg-amber-400/15 dark:text-amber-300">Por defecto</div>
                <AutoSignature signerName={responsableEntrega} />
              </Field>
            </div>
          </div>

          {message && <p className="mt-4 rounded-[8px] bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{message}</p>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3A9AF2] px-5 text-xs font-black text-[#FFFFFF] transition hover:bg-[#238BEA]"
            >
              <Send size={14} />
              {saving ? "Generando..." : "Generar resguardo"}
            </button>
          </div>
        </section>
      </div>

      {generatedOpen && <GeneratedResguardoModal data={{ ...data, folio: generatedResult?.folio || data.folio }} signature={signature} idResguardo={source.idResguardo || generatedResult?.id_resguardo} onClose={() => { setGeneratedOpen(false); if (generatedResult) onBack?.(); }} />}
    </div>
  );
}
function mapApiResguardo(payload) {
  const first = payload.activos?.[0] || {};
  const tipoResguardo = first.tipo_equipo === "Tarjeta" ? "tarjeta" : first.tipo_equipo === "YubiKey" ? "yubikey" : "equipo";
  const colaborador = {
    id: Number(payload.colaborador.id_colaborador),
    numero: payload.colaborador.num_colaborador,
    nombre: payload.colaborador.nombre_completo,
    area: payload.colaborador.area,
    departamento: payload.colaborador.departamento,
    puesto: payload.colaborador.puesto,
    correo: payload.colaborador.correo,
  };
  const items = (payload.activos || []).map((item) => ({
    key: `detalle-${item.id_detalle}`,
    isOriginal: true,
    isNew: false,
    id: Number(item.id_equipo),
    idDetalle: item.id_detalle,
    tipoResguardo: item.tipo_equipo === "Tarjeta" ? "tarjeta" : item.tipo_equipo === "YubiKey" ? "yubikey" : "equipo",
    tipoLabel: item.tipo_equipo,
    codigo: item.codigo_equipo,
    nombre: item.nombre_equipo,
    tipoActivo: item.tipo_equipo,
    marca: item.marca,
    modelo: item.modelo,
    serie: item.numero_serie,
    fechaAsignacion: item.fecha_asignacion,
    tipoAsignacion: `${item.tipo_asignacion[0].toUpperCase()}${item.tipo_asignacion.slice(1)}`,
    fechaDev: item.fecha_devolucion_programada || "",
    accesorios: item.accesorios_entregados || "",
    estadoEntrega: item.estado_fisico_entrega || "Buen estado",
    observaciones: item.observaciones || "",
  }));

  return {
    persisted: true,
    idResguardo: payload.resguardo.id_resguardo,
    idAsignacion: payload.asignacion.id_asignacion,
    folio: payload.resguardo.folio,
    fecha: String(payload.asignacion.fecha_resguardo || "").slice(0, 10),
    colaborador,
    equipo: {
      id: Number(first.id_equipo), codigo: first.codigo_equipo, nombre: first.nombre_equipo,
      tipo: first.tipo_equipo, marca: first.marca, modelo: first.modelo, serie: first.numero_serie,
    },
    tipo: first.tipo_asignacion ? `${first.tipo_asignacion[0].toUpperCase()}${first.tipo_asignacion.slice(1)}` : "Permanente",
    fechaDev: first.fecha_devolucion_programada || "",
    tipoResguardo,
    numeroEmpleado: colaborador.numero,
    activoInventario: first.codigo_equipo || "",
    accesorios: first.accesorios_entregados || "",
    estadoFisico: first.estado_fisico_entrega || "Buen estado",
    ubicacionTrabajo: colaborador.area || colaborador.departamento || "-",
    responsableEntrega: payload.responsable?.nombre_completo || "-",
    observaciones: payload.asignacion.observaciones_generales || "",
    firmaColaborador: payload.resguardo.firma_colaborador || "",
    firmaResponsable: payload.resguardo.firma_responsable || "",
    correoEnviado: Boolean(payload.resguardo.correo_enviado),
    items,
  };
}

export default function ResguardoFirma(props) {
  const [loadedResguardo, setLoadedResguardo] = useState(null);
  const [loadError, setLoadError] = useState("");
  const idResguardo = props.resguardo?.idResguardo;

  useEffect(() => {
    if (!idResguardo) return;
    fetch(`/api/resguardos/${idResguardo}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("scaet-token")}` },
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.mensaje || "No se pudo cargar el resguardo");
      setLoadedResguardo(mapApiResguardo(payload));
    }).catch((error) => setLoadError(error.message));
  }, [idResguardo]);

  if (idResguardo && !loadedResguardo) {
    return <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-gray-500 shadow-sm">{loadError || "Cargando resguardo..."}</div>;
  }

  const editorResguardo = loadedResguardo
    ? {
        ...props.resguardo,
        ...loadedResguardo,
        items: mergeResguardoItems(loadedResguardo.items, props.resguardo?.items),
      }
    : props.resguardo;

  return <ResguardoEditor key={idResguardo || "draft"} {...props} resguardo={editorResguardo} />;
}
