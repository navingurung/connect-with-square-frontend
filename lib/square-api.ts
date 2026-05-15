import { api } from "@/lib/api";
import type {
  SquareConnection,
  SquareLocation,
  SquareMerchant,
  SquareOAuthUrlResponse,
  SquareOrder,
  SquarePayment,
} from "@/lib/square-types";

export async function getSquareOAuthUrl() {
  const response = await api.get<SquareOAuthUrlResponse>(
    "/api/square/oauth/url",
  );

  return response.data;
}

export async function getSquareConnections() {
  const response = await api.get<SquareConnection[]>("/api/square/connections");

  return response.data;
}


export async function updateSquareSyncSettings(
  merchantId: string,
  autoSyncEnabled: boolean,
) {
  const response = await api.patch(
    `/api/square/connections/${merchantId}/sync-settings`,
    { auto_sync_enabled: autoSyncEnabled },
  );

  return response.data;
}

export async function disconnectSquareConnection(merchantId: string) {
  const response = await api.post(
    `/api/square/connections/${merchantId}/disconnect`,
  );

  return response.data;
}

export async function deleteSquareConnection(merchantId: string) {
  const response = await api.delete(
    `/api/square/connections/${merchantId}`,
  );

  return response.data;
}


export async function getSquareMerchant(merchantId: string) {
  const response = await api.get<SquareMerchant>(
    `/api/square/merchant/${merchantId}`,
  );

  return response.data;
}

export async function getSquareLocations(merchantId: string) {
  const response = await api.get<
    SquareLocation[] | { locations?: SquareLocation[]; data?: SquareLocation[] }
  >(`/api/square/locations/${merchantId}`)

  const data = response.data

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data.locations)) {
    return data.locations
  }

  if (Array.isArray(data.data)) {
    return data.data
  }

  return []
}

export async function getSquarePayments(
  merchantId: string,
  locationId: string,
) {
  const response = await api.get<{
    merchant_id: string;
    location_id: string;
    count: number;
    cursor?: string | null;
    payments?: SquarePayment[];
    raw?: unknown;
  }>(`/api/square/payments/${merchantId}`, {
    params: {
      location_id: locationId,
    },
  });

  return response.data.payments ?? [];
}

export async function getSquareOrder(merchantId: string, orderId: string) {
  const response = await api.get<
    SquareOrder | { order?: SquareOrder; data?: SquareOrder; raw?: SquareOrder }
  >(`/api/square/orders/${merchantId}/${orderId}`)

  const data = response.data

  if ("order" in data && data.order) {
    return data.order
  }

  if ("data" in data && data.data) {
    return data.data
  }

  if ("raw" in data && data.raw) {
    return data.raw
  }

  return data as SquareOrder
}

export function formatSquareMoney(amount?: number, currency: string = "JPY") {
  if (amount == null) {
    return "-";
  }

  const value = amount / 100;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export function formatDateTime(date?: string) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date));
}

export function formatDateOnly(date?: string) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(date));
}
