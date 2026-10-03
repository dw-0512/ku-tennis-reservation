import crypto from "node:crypto";
import { NextResponse } from "next/server";

const DEVICE_COOKIE_NAME = "kutc_device_id";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function hashPassword(password: string) {
  const secret = process.env.RESERVATION_PASSWORD_SECRET;

  if (!secret) {
    throw new Error("RESERVATION_PASSWORD_SECRET is missing");
  }

  return crypto
    .createHash("sha256")
    .update(`${password}:${secret}`)
    .digest("hex");
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.trim().split("=");

    if (cookieName === name) {
      try {
        return decodeURIComponent(valueParts.join("="));
      } catch {
        return null;
      }
    }
  }

  return null;
}

function isValidDeviceId(deviceId: string | null): deviceId is string {
  if (!deviceId) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    deviceId,
  );
}

export function getOrCreateDeviceId(request: Request): string {
  const existingDeviceId = getCookieValue(
    request.headers.get("cookie"),
    DEVICE_COOKIE_NAME,
  );

  if (isValidDeviceId(existingDeviceId)) {
    return existingDeviceId;
  }

  return crypto.randomUUID();
}

export function withDeviceCookie(response: NextResponse, deviceId: string) {
  response.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value: deviceId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });

  return response;
}
