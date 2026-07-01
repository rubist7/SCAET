import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eraser, Mail, PenLine, Plus, Send, Trash2, X } from "lucide-react";
import DateInput from "./DateInput";
import { formatDate } from "./dateUtils";
import { colaboradores, equipos } from "./asignacionData";

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
  folio: "RSG-20260508-001",
  fecha: "2026-05-08",
  colaborador: colaboradores[0],
  equipo: equipos[1],
  tipo: "Permanente",
  fechaDev: "",
  observaciones: "",
  tipoResguardo: "equipo",
  numeroEmpleado: colaboradores[0].numero,
  activoInventario: equipos[1].codigo,
  accesorios: "",
  estadoFisico: "Buen estado",
  ubicacionTrabajo: "Gerencia de Sistemas",
  responsableEntrega: "Ing. Javier",
  idTarjeta: "TC-3612",
  cantidad: "1",
  estadoEntrega: "Nueva / Buen estado",
  departamentoTarjeta: colaboradores[0].departamento,
  puestoTarjeta: colaboradores[0].puesto,
  fechaEntregaTarjeta: "2026-05-08",
  motivoTarjeta: "Entrega",
  yubikey: "YubiKey 5 NFC",
  serieYubikey: "",
  modeloYubikey: "YubiKey 5 NFC",
  userId: "ana.lopez",
  pin: "Asignado de forma confidencial",
  correoAsociado: "",
  sistemasAutorizados: "",
  ligasSeguridad: "https://security.example.com",
  ligasTrabajo: "https://workspace.example.com",
};

function normalizeResguardoItem(data) {
  if (data.tipoResguardo === "tarjeta") {
    return {
      key: `tarjeta-${data.idTarjeta || "actual"}`,
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

function SoftInput({ value, onChange, placeholder, icon }) {
  return (
    <div className="relative">
      <input
        value={value}
        readOnly={!onChange}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
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

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getPoint(event);

    drawingRef.current = true;
    lastPointRef.current = point;
    setHasPendingSignature(true);
    context.beginPath();
    context.arc(point.x, point.y, 1.15, 0, Math.PI * 2);
    context.fillStyle = "#21192c";
    context.fill();
    canvas.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (disabled || !drawingRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const nextPoint = getPoint(event);
    const lastPoint = lastPointRef.current;

    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    lastPointRef.current = nextPoint;
  };

  const handlePointerUp = (event) => {
    if (disabled || !drawingRef.current) return;

    drawingRef.current = false;
    lastPointRef.current = null;
    canvasRef.current.releasePointerCapture?.(event.pointerId);
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
        {!disabled && !value && (
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
          onPointerLeave={handlePointerUp}
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
            {["Tipo", "Equipo / Activo", "Marca", "Modelo", "No. Serie", "Inventario", "Asignacion"].map((heading) => (
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
                {item.tipoAsignacion || "-"} {item.fechaAsignacion ? `- ${formatDate(item.fechaAsignacion)}` : ""}
              </td>
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

function SignatureSection({ signature, deliveryName, includeApproval = true }) {
  return (
    <div className={`mt-7 grid gap-6 text-center ${includeApproval ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      <div>
        <SignatureImage value={signature} fallback="Pendiente" />
        <div className="mt-2 border-t border-[#b7ab9b] pt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#b7ab9b]">Firma de recibe</div>
      </div>
      <div>
        <p className="min-h-8 font-serif text-2xl text-[#21192c]">~{deliveryName}~</p>
        <div className="mt-2 border-t border-[#b7ab9b] pt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#b7ab9b]">Firma de entrega</div>
      </div>
      {includeApproval && (
        <div>
          <p className="min-h-8 font-serif text-2xl text-[#21192c]">Vo. Bo.</p>
          <div className="mt-2 border-t border-[#b7ab9b] pt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#b7ab9b]">Autorizacion</div>
        </div>
      )}
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
        <PreviewRow label="Observaciones" value={data.observaciones} />
      </div>
      <AssetsTable items={data.items} />
      <ResponsibilityText>{responsibilityForItems(data.items)}</ResponsibilityText>
      <SignatureSection signature={signature} deliveryName={data.responsableEntrega} />
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
        <PreviewRow label="Observaciones" value={data.observaciones} />
      </div>
      <AssetsTable items={data.items} />
      <ResponsibilityText>{responsibilityForItems(data.items)}</ResponsibilityText>
      <SignatureSection signature={signature} deliveryName={data.responsableEntrega} />
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
        <PreviewRow label="Departamento" value={data.departamentoTarjeta} />
        <PreviewRow label="Puesto" value={data.puestoTarjeta} />
        <PreviewRow label="Fecha de entrega" value={formatDate(data.fechaEntregaTarjeta)} />
        <PreviewRow label="ID / Num. tarjeta" value={data.idTarjeta} />
        <PreviewRow label="Cantidad" value={data.cantidad} />
        <PreviewRow label="Motivo" value={data.motivoTarjeta} />
        <PreviewRow label="Observaciones" value={data.observaciones} />
      </div>
      <ResponsibilityText>{RESPONSIBILITY_TEXTS.tarjeta}</ResponsibilityText>
      <SignatureSection signature={signature} deliveryName={data.responsableEntrega} includeApproval={false} />
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
        <PreviewRow label="Yubikey" value={data.yubikey} />
        <PreviewRow label="Numero de serie" value={data.serieYubikey} />
        <PreviewRow label="Modelo" value={data.modeloYubikey} />
        <PreviewRow label="User ID" value={data.userId} />
        <PreviewRow label="PIN" value={data.pin} />
        <PreviewRow label="Correo / Cuenta" value={data.correoAsociado} />
        <PreviewRow label="Sistemas autorizados" value={data.sistemasAutorizados} />
        <PreviewRow label="Liga de seguridad" value={data.ligasSeguridad} />
        <PreviewRow label="Liga de trabajo" value={data.ligasTrabajo} />
      </div>
      <ResponsibilityText>{RESPONSIBILITY_TEXTS.yubikey}</ResponsibilityText>
      <SignatureSection signature={signature} deliveryName={data.responsableEntrega} />
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

function GeneratedResguardoModal({ data, signature, onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-4 sm:p-5">
      <div className="mx-auto flex min-h-full w-full max-w-4xl items-start">
        <section className="w-full overflow-hidden rounded-2xl bg-[#f4f1ec] shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#e6deef] bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">Resguardo generado</p>
              <h2 className="truncate text-sm font-black text-[#21192c]">{documentTitle(data)}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee8dc] text-[#6f6584] transition hover:bg-[#e4dccf]"
              aria-label="Cerrar resguardo generado"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <DocumentPreview data={data} signature={signature} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3A9AF2] text-xs font-black text-[#FFFFFF] transition hover:bg-[#238BEA]">
                <Mail size={14} />
                Enviar por Gmail
              </button>
              <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#eee8dc] text-xs font-black text-[#6f6584]">
                <Download size={14} />
                Descargar PDF
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResguardoItemsSummary({ items, onAddItem, onRemoveItem }) {
  return (
    <div className="rounded-[8px] border border-[#eee8f6] bg-blue-50/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">
          Activos dentro de este resguardo
        </p>
        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#3A9AF2] text-[#FFFFFF] transition hover:bg-[#238BEA]"
          aria-label="Agregar otro activo al resguardo"
          title="Agregar otro activo"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex min-w-0 items-start gap-2 rounded-[8px] bg-white px-3 py-2 text-xs">
            <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] sm:items-center">
              <span className="min-w-0 break-words font-semibold text-[#21192c]">
                {item.nombre} {item.codigo ? `#${item.codigo}` : ""}
              </span>
              <span className="min-w-0 break-words text-[#8f879b]">
                {item.tipoLabel} - {item.marca || "-"} {item.modelo || ""} - {item.serie || "Sin serie"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveItem?.(item.key)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-red-50 text-red-500 transition hover:bg-red-100"
              aria-label={`Eliminar ${item.nombre} del resguardo`}
              title="Eliminar activo"
            >
              <Trash2 size={14} />
            </button>
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
        <Field label="Departamento">
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
          <SoftInput value={data.yubikey} onChange={setters.setYubikey} />
        </Field>
        <Field label="Numero de serie">
          <SoftInput value={data.serieYubikey} onChange={setters.setSerieYubikey} />
        </Field>
        <Field label="Modelo">
          <SoftInput value={data.modeloYubikey} onChange={setters.setModeloYubikey} />
        </Field>
        <Field label="User ID">
          <SoftInput value={data.userId} onChange={setters.setUserId} />
        </Field>
        <Field label="PIN">
          <SoftInput value={data.pin} onChange={setters.setPin} />
        </Field>
        <Field label="Correo / Cuenta asociada">
          <SoftInput value={data.correoAsociado} onChange={setters.setCorreoAsociado} />
        </Field>
        <Field label="Sistemas o plataformas autorizadas">
          <SoftInput value={data.sistemasAutorizados} onChange={setters.setSistemasAutorizados} />
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
          value={data.tipo === "Permanente" ? "" : data.fechaDev}
          onChange={setters.setFechaDev}
          disabled={data.tipo === "Permanente"}
        />
      </Field>
    </div>
  );
}

export default function ResguardoFirma({ resguardo, onBack, onGoDevolucion, onAddItem, onRemoveItem }) {
  const source = useMemo(() => ({ ...defaultResguardo, ...resguardo }), [resguardo]);
  const canCaptureSignature = useCanCaptureTouchSignature();
  const tipoResguardo = source.tipoResguardo;
  const [tipo, setTipo] = useState(source.tipo);
  const [fechaDev, setFechaDev] = useState(source.fechaDev);
  const [observaciones, setObservaciones] = useState(source.observaciones);
  const [numeroEmpleado, setNumeroEmpleado] = useState(source.numeroEmpleado);
  const [activoInventario, setActivoInventario] = useState(source.activoInventario);
  const [accesorios, setAccesorios] = useState(source.accesorios);
  const [estadoFisico, setEstadoFisico] = useState(source.estadoFisico);
  const [ubicacionTrabajo, setUbicacionTrabajo] = useState(source.ubicacionTrabajo);
  const [responsableEntrega, setResponsableEntrega] = useState(source.responsableEntrega);
  const [idTarjeta, setIdTarjeta] = useState(source.idTarjeta);
  const [cantidad, setCantidad] = useState(source.cantidad);
  const [departamentoTarjeta, setDepartamentoTarjeta] = useState(source.departamentoTarjeta);
  const [puestoTarjeta, setPuestoTarjeta] = useState(source.puestoTarjeta);
  const [fechaEntregaTarjeta, setFechaEntregaTarjeta] = useState(source.fechaEntregaTarjeta);
  const [motivoTarjeta, setMotivoTarjeta] = useState(source.motivoTarjeta);
  const [yubikey, setYubikey] = useState(source.yubikey);
  const [serieYubikey, setSerieYubikey] = useState(source.serieYubikey);
  const [modeloYubikey, setModeloYubikey] = useState(source.modeloYubikey);
  const [userId, setUserId] = useState(source.userId);
  const [pin, setPin] = useState(source.pin);
  const [correoAsociado, setCorreoAsociado] = useState(source.correoAsociado);
  const [sistemasAutorizados, setSistemasAutorizados] = useState(source.sistemasAutorizados);
  const [ligasSeguridad, setLigasSeguridad] = useState(source.ligasSeguridad);
  const [ligasTrabajo, setLigasTrabajo] = useState(source.ligasTrabajo);
  const [signature, setSignature] = useState("");
  const [generatedOpen, setGeneratedOpen] = useState(false);

  const editableSource = {
    ...source,
    tipoResguardo,
    tipo,
    fechaDev,
    observaciones,
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
    items: source.items?.length ? source.items : [normalizeResguardoItem(editableSource)],
  };

  const setters = {
    setTipo,
    setFechaDev,
    setActivoInventario,
    setAccesorios,
    setEstadoFisico,
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

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      <h1 className="text-sm font-bold text-blue-300">Resguardo - Firma Digital</h1>

      <div className="grid min-w-0 gap-4">
        <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex overflow-x-auto border-b border-blue-500">
            <button type="button" className="rounded-t-[8px] bg-blue-50 px-5 py-3 text-xs font-black text-blue-600">
              Resguardo
            </button>
            <button type="button" onClick={onGoDevolucion} className="px-5 py-3 text-xs font-bold text-[#8f879b]">
              Devolucion
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
            <ResguardoItemsSummary items={data.items} onAddItem={onAddItem} onRemoveItem={onRemoveItem} />
            <Field label="Observaciones">
              <textarea
                value={observaciones}
                onChange={(event) => setObservaciones(event.target.value)}
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
                <div className="mb-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-500">Por defecto</div>
                <AutoSignature signerName={responsableEntrega} />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onBack} className="h-10 rounded-[8px] bg-[#eee8dc] px-5 text-xs font-black text-[#6f6584]">Cancelar</button>
            <button
              type="button"
              onClick={() => setGeneratedOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3A9AF2] px-5 text-xs font-black text-[#FFFFFF] transition hover:bg-[#238BEA]"
            >
              <Send size={14} />
              Generar resguardo
            </button>
          </div>
        </section>
      </div>

      {generatedOpen && <GeneratedResguardoModal data={data} signature={signature} onClose={() => setGeneratedOpen(false)} />}
    </div>
  );
}
