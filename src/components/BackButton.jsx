import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function BackButton({
  onBack,
  fallback = "/dashboard",
  hasUnsavedChanges = false,
  label = "Regresar",
  className = "",
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (
      hasUnsavedChanges
      && !window.confirm("Tienes cambios sin guardar. ¿Deseas salir de esta pantalla?")
    ) {
      return;
    }

    if (onBack) {
      onBack();
      return;
    }

    if (location.key && location.key !== "default") {
      navigate(-1);
      return;
    }

    navigate(fallback, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[#e2d9c9] bg-[#fbf7ef] text-[#6f6584] shadow-sm transition hover:bg-[#f2ece0] focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-[#30273b] dark:bg-[#241c2d] dark:text-[#c9bdd5] dark:hover:border-[#493a59] dark:hover:bg-[#2c2236] ${className}`}
      aria-label={label}
      title={label}
    >
      <ArrowLeft size={15} aria-hidden="true" />
    </button>
  );
}
