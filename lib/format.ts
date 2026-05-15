const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
])

export function formatSquareMoney(
  amount?: number | string | null,
  currency: string = "JPY"
) {
  if (amount == null || amount === "") {
    return "-"
  }

  const numericAmount = Number(amount)

  if (Number.isNaN(numericAmount)) {
    return "-"
  }

  const upperCurrency = currency.toUpperCase()
  const divisor = ZERO_DECIMAL_CURRENCIES.has(upperCurrency) ? 1 : 100
  const value = numericAmount / divisor

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: upperCurrency,
  }).format(value)
}

export function formatDateTime(date?: string | null) {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date))
}

export function formatDateOnly(date?: string | null) {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(date))
}

export function formatShortId(id?: string | number | null, length = 8) {
  if (id == null || id === "") {
    return "-"
  }

  const value = String(id)

  if (value.length <= length) {
    return value
  }

  return `${value.slice(0, length)}...`
}

export function formatStatus(status?: string | null) {
  if (!status) {
    return "-"
  }

  return status.replaceAll("_", " ").toLowerCase()
}