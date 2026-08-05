import { signatures } from "../config/signatures";

export default function Signature({ type, institucion }) {
  const fallback = signatures[type];

  if (!fallback) return null;

  const signature = {
    image: institucion?.firma_url || fallback.image,
    name: institucion?.nombre_responsable || fallback.name,
    position: institucion?.puesto_responsable || fallback.position,
    label: fallback.label,
    scale: institucion?.firma_url ? 1 : fallback.scale,
  };

  const restaurarFirmaEstatica = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = fallback.image;
  };

  return (
    <div>
      <div className="flex h-32 items-center justify-center overflow-hidden">
        {signature.image ? (
          <img
            src={signature.image}
            alt={signature.label}
            className="mx-auto h-full w-full object-contain"
            style={{ transform: `scale(${signature.scale || 1})` }}
            onError={restaurarFirmaEstatica}
          />
        ) : (
          <p className="font-serif text-2xl text-[#21192c]">{signature.name}</p>
        )}
      </div>
      <div className="mt-2 border-t border-[#b7ab9b] pt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#b7ab9b]">
        {signature.label}
      </div>
      {signature.image && (signature.name || signature.position) && (
        <div className="mt-1 text-[9px] font-semibold text-[#6f6584]">
          {signature.name && <p>{signature.name}</p>}
          {signature.position && <p>{signature.position}</p>}
        </div>
      )}
    </div>
  );
}
