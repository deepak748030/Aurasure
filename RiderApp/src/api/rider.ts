"use strict";

import { apiGet, apiPatch, apiPost } from "./client";

export type RiderStatus =
  | "onboarding"
  | "submitted"
  | "under_review"
  | "needs_info"
  | "approved"
  | "rejected"
  | "suspended";

export type RiderDutyState = "offline" | "online" | "on_task" | "break";

export interface RiderDoc {
  key: string;
  label: string;
  uri: string;
  verified: boolean;
  note: string;
}

export interface Rider {
  id: string;
  userId: string;
  phone: string;
  status: RiderStatus;
  name: string;
  email: string;
  city: string;
  pincode: string;
  address: string;
  vehicleType: "bike" | "scooter" | "cycle" | "ev" | "";
  vehicleNumber: string;
  pan: string;
  aadhaar: string;
  drivingLicense: string;
  rcNumber: string;
  trainingCompleted: boolean;
  quizCompleted: boolean;
  bank: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    upi: string;
  };
  documents: RiderDoc[];
  reviewNote: string;
  reviewedAt: string | null;
  reviewedBy: string;
  submittedAt: string | null;
  dutyState: RiderDutyState;
  lastLat: number | null;
  lastLng: number | null;
  lastPingAt: string | null;
  codInHand: number;
  maxCodLimit: number;
  payoutBalance: number;
  totalTrips: number;
  totalEarnings: number;
  currentDayTrips: number;
  currentDayEarnings: number;
  currentDayDate: string;
  rating: number;
  ratingCount: number;
  offerCount: number;
  acceptanceCount: number;
  issues: {
    id: string;
    title: string;
    body: string;
    status: string;
    createdAt: string;
  }[];
  incidents: {
    id: string;
    type: string;
    lat: number | null;
    lng: number | null;
    note: string;
    createdAt: string;
  }[];
  codDeposits: {
    id: string;
    amount: number;
    method: string;
    refId: string;
    status: string;
    note: string;
    createdAt: string;
  }[];
  pushToken: string;
  referralCode: string;
}

export type DeliveryState =
  | "available"
  | "accepted"
  | "at_pickup"
  | "picked_up"
  | "at_drop"
  | "delivered"
  | "failed"
  | "cancelled";

export interface DeliveryStop {
  name: string;
  phone: string;
  address: string;
  landmark: string;
  otp: string;
  lat: number | null;
  lng: number | null;
}

export interface DeliveryTask {
  id: string;
  code: string;
  orderId: string;
  orderCode: string;
  module: "food" | "shop" | "";
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  pickup: DeliveryStop;
  drop: DeliveryStop;
  items: { name: string; qty: number; price: number }[];
  total: number;
  codAmount: number;
  deliveryFee: number;
  riderPayout: number;
  state: DeliveryState;
  riderId: string;
  riderName: string;
  riderPhone: string;
  distanceKm: number | null;
  podUrl: string;
  note: string;
  failReason: string;
  acceptedAt: string | null;
  arrivedPickupAt: string | null;
  pickedUpAt: string | null;
  arrivedDropAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

export interface EarningsData {
  range: string;
  trips: number;
  payout: number;
  codCollected: number;
  incentives: number;
  incentiveRows: {
    id: string;
    title: string;
    points: number;
    amount: number;
  }[];
  total: number;
  tasks: DeliveryTask[];
}

export interface LeaderboardData {
  rank: number;
  riders: {
    id: string;
    name: string;
    trips: number;
    rating: number;
    ratingCount: number;
  }[];
}

export interface PayoutsData {
  balance: number;
  codInHand: number;
  totalEarnings: number;
  totalTrips: number;
  history: {
    id: string;
    code: string;
    orderCode: string;
    amount: number;
    codAmount: number;
    deliveredAt: string;
  }[];
  deposits: Rider["codDeposits"];
}

export async function uploadRiderFile(
  file: Blob,
  name: string,
): Promise<{ url: string; image: { kind: "uri"; uri: string } }> {
  const { getApiBaseUrl } = await import("./config");
  const { getToken } = await import("./session");
  const { ApiError } = await import("./client");
  const base = getApiBaseUrl();
  if (!base)
    throw new ApiError(0, "API_DISABLED", "No Aurasure API URL configured");
  const token = await getToken();
  const form = new FormData();
  form.append("image", file, name);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/rider/uploads`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(
      0,
      error instanceof Error && error.name === "AbortError"
        ? "TIMEOUT"
        : "NETWORK_ERROR",
      error instanceof Error && error.name === "AbortError"
        ? "Image upload took too long"
        : "Could not reach the Aurasure upload server",
    );
  } finally {
    clearTimeout(timeout);
  }
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { url: string; image: { kind: "uri"; uri: string } };
    error?: { code: string; message: string };
  } | null;
  if (!res.ok || !json?.success || !json.data) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? "UPLOAD_FAILED",
      json?.error?.message ?? "Upload failed",
    );
  }
  return json.data;
}

export interface OfferResponse {
  offers: DeliveryTask[];
  activeTask: DeliveryTask | null;
  dutyState: RiderDutyState;
  codInHand: number;
  maxCodLimit: number;
}

export const riderApi = {
  me: () => apiGet<{ rider: Rider }>("/rider/me", { auth: true }),
  save: (body: Record<string, unknown>) =>
    apiPatch<{ rider: Rider }>("/rider/onboarding", body, { auth: true }),
  setDoc: (key: string, uri: string, label?: string) =>
    apiPatch<{ rider: Rider }>(
      "/rider/documents",
      { key, uri, label },
      { auth: true },
    ),
  submit: () => apiPost<{ rider: Rider }>("/rider/submit", {}, { auth: true }),
  setDuty: (state: "online" | "offline" | "break") =>
    apiPatch<{ rider: Rider }>("/rider/duty", { state }, { auth: true }),
  locationBatch: (
    points: {
      lat: number;
      lng: number;
      at?: string;
      accuracy?: number | null;
      speed?: number | null;
    }[],
  ) =>
    apiPost<{ rider: Rider; received: number }>(
      "/rider/location/batch",
      { points },
      { auth: true },
    ),
  offers: () => apiGet<OfferResponse>("/rider/offers", { auth: true }),
  task: (id: string) =>
    apiGet<{ task: DeliveryTask }>(`/rider/tasks/${id}`, { auth: true }),
  accept: (id: string) =>
    apiPost<{ task: DeliveryTask }>(
      `/rider/tasks/${id}/accept`,
      {},
      { auth: true },
    ),
  reject: (id: string, reason?: string) =>
    apiPost<{ rejected: boolean }>(
      `/rider/tasks/${id}/reject`,
      { reason },
      { auth: true },
    ),
  activeTask: () =>
    apiGet<{ task: DeliveryTask | null }>("/rider/tasks/active", {
      auth: true,
    }),
  arrivedPickup: (id: string) =>
    apiPost<{ task: DeliveryTask }>(
      `/rider/tasks/${id}/arrived-pickup`,
      {},
      { auth: true },
    ),
  pickup: (id: string, otp: string) =>
    apiPost<{ task: DeliveryTask }>(
      `/rider/tasks/${id}/pickup`,
      { otp },
      { auth: true },
    ),
  arrivedDrop: (id: string) =>
    apiPost<{ task: DeliveryTask }>(
      `/rider/tasks/${id}/arrived-drop`,
      {},
      { auth: true },
    ),
  deliver: (id: string, otp: string, podUrl?: string, note?: string) =>
    apiPost<{ task: DeliveryTask; orderCode: string }>(
      `/rider/tasks/${id}/deliver`,
      { otp, podUrl, note },
      { auth: true },
    ),
  fail: (id: string, reason: string, note?: string) =>
    apiPost<{ task: DeliveryTask }>(
      `/rider/tasks/${id}/fail`,
      { reason, note },
      { auth: true },
    ),
  tasks: (status?: string) =>
    apiGet<{ tasks: DeliveryTask[] }>(
      `/rider/tasks${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      { auth: true },
    ),
  earnings: (range: "today" | "week" | "all" = "today") =>
    apiGet<EarningsData>(`/rider/earnings?range=${range}`, { auth: true }),
  leaderboard: () =>
    apiGet<LeaderboardData>("/rider/leaderboard", { auth: true }),
  payouts: () => apiGet<PayoutsData>("/rider/payouts", { auth: true }),
  codDeposit: (
    amount: number,
    method: "upi" | "hub" | "bank",
    refId?: string,
  ) =>
    apiPost<{ rider: Rider }>(
      "/rider/cod/deposit",
      { amount, method, refId },
      { auth: true },
    ),
  incentives: () =>
    apiGet<{
      todayTrips: number;
      rows: { id: string; title: string; amount: number }[];
    }>("/rider/incentives", { auth: true }),
  sos: (body: {
    lat?: number | null;
    lng?: number | null;
    type?: string;
    note?: string;
  }) => apiPost<{ rider: Rider }>("/rider/sos", body, { auth: true }),
  pushToken: (token: string) =>
    apiPost<{ rider: Rider }>("/rider/push-token", { token }, { auth: true }),
  issue: (title: string, body: string) =>
    apiPost<{ rider: Rider }>("/rider/issues", { title, body }, { auth: true }),
};
