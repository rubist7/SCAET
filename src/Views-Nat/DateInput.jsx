import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatDate, parseDateInput } from "./dateUtils";

const defaultInputClassName =
  "h-10 w-full min-w-0 rounded-[8px] border border-[#ded6c8] bg-[#eee8dc] px-4 pr-10 text-sm font-semibold text-[#3c3445] outline-none transition placeholder:text-[#9b927f] focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

function formatDraft(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function DateInput({
  value,
  onChange,
  disabled = false,
  placeholder = "dd/mm/aaaa",
  className = defaultInputClassName,
}) {
  const pickerRef = useRef(null);
  const [draft, setDraft] = useState(formatDate(value));
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDraft(formatDate(value));
      setError("");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [value]);

  const commitValue = (nextDraft) => {
    const iso = parseDateInput(nextDraft);

    if (iso === "") {
      onChange?.("");
      setDraft("");
      setError("");
      return true;
    }

    if (!iso) {
      setError("Fecha invalida");
      return false;
    }

    onChange?.(iso);
    setDraft(formatDate(iso));
    setError("");
    return true;
  };

  const handleTextChange = (event) => {
    const formatted = formatDraft(event.target.value);
    setDraft(formatted);
    setError("");

    if (formatted.length === 10) {
      commitValue(formatted);
    }
  };

  const handleBlur = () => {
    if (!draft) {
      commitValue("");
      return;
    }

    const committed = commitValue(draft);
    if (!committed && value) {
      setDraft(formatDate(value));
    }
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;

    if (picker.showPicker) {
      picker.showPicker();
      return;
    }

    picker.click();
  };

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} ${error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[6px] text-[#6f6584] transition hover:bg-white/60 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Seleccionar fecha"
          title="Seleccionar fecha"
        >
          <CalendarDays size={16} />
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={parseDateInput(value) || ""}
          onChange={(event) => {
            onChange?.(event.target.value);
            setDraft(formatDate(event.target.value));
            setError("");
          }}
          disabled={disabled}
          className="pointer-events-none absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      {error && <p className="mt-1 text-[11px] font-semibold text-red-500">{error}</p>}
    </div>
  );
}
