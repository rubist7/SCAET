export function parseCurrencyValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const number = Number(String(value).replace(/[$,]/g, ""));
  return Number.isNaN(number) ? 0 : number;
}

export function formatCurrency(value) {
  return parseCurrencyValue(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
