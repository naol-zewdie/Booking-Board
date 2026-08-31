import crypto from "crypto";

const SECRET_KEY =
  process.env.APPOINTMENT_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "booking-board-hmac-secure-token-secret-key-2026";

export interface AppointmentTokenPayload {
  appointmentId: string;
  businessId: string;
  exp: number; // Unix timestamp in seconds
  nonce: string; // Random cryptographic nonce
}

export type TokenVerificationResult =
  | { valid: true; payload: AppointmentTokenPayload }
  | {
      valid: false;
      reason: "MALFORMED_TOKEN" | "INVALID_SIGNATURE" | "EXPIRED" | "MISMATCHED_BUSINESS";
      message: string;
    };

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Generates a tamper-proof, time-bounded HMAC-SHA256 signed token for customer self-service actions.
 * Expiry is set to appointment start time + 24 hours (so the token naturally expires shortly after the service).
 */
export function generateAppointmentToken(params: {
  appointmentId: string;
  businessId: string;
  startsAt: Date;
}): string {
  // exp = startsAt + 24 hours
  const expSeconds = Math.floor(params.startsAt.getTime() / 1000) + 86400;
  const nonce = crypto.randomBytes(8).toString("hex");

  const payload: AppointmentTokenPayload = {
    appointmentId: params.appointmentId,
    businessId: params.businessId,
    exp: expSeconds,
    nonce,
  };

  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadStr);

  const hmac = crypto.createHmac("sha256", SECRET_KEY);
  hmac.update(encodedPayload);
  const encodedSignature = base64UrlEncode(hmac.digest("hex"));

  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies the integrity, signature, time bounds, and business scoping of a customer token.
 */
export function verifyAppointmentToken(
  token: string,
  expectedBusinessId?: string
): TokenVerificationResult {
  if (!token || !token.includes(".")) {
    return {
      valid: false,
      reason: "MALFORMED_TOKEN",
      message: "The provided link is invalid or malformed.",
    };
  }

  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return {
      valid: false,
      reason: "MALFORMED_TOKEN",
      message: "The provided link is missing token components.",
    };
  }

  // 1. Verify HMAC Signature
  const hmac = crypto.createHmac("sha256", SECRET_KEY);
  hmac.update(encodedPayload);
  const expectedSignature = base64UrlEncode(hmac.digest("hex"));

  // Constant-time comparison to prevent timing attacks
  const isSignatureValid =
    encodedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(encodedSignature),
      Buffer.from(expectedSignature)
    );

  if (!isSignatureValid) {
    return {
      valid: false,
      reason: "INVALID_SIGNATURE",
      message: "This link is invalid or has been modified.",
    };
  }

  // 2. Decode Payload
  let payload: AppointmentTokenPayload;
  try {
    const payloadJson = base64UrlDecode(encodedPayload);
    payload = JSON.parse(payloadJson);
  } catch (err) {
    return {
      valid: false,
      reason: "MALFORMED_TOKEN",
      message: "Unable to parse token data.",
    };
  }

  // 3. Verify Expiry (Time-bounded check)
  const currentUnix = Math.floor(Date.now() / 1000);
  if (payload.exp && currentUnix > payload.exp) {
    return {
      valid: false,
      reason: "EXPIRED",
      message: "This cancellation link has expired as the appointment time has passed.",
    };
  }

  // 4. Verify Business Scoping
  if (expectedBusinessId && payload.businessId !== expectedBusinessId) {
    return {
      valid: false,
      reason: "MISMATCHED_BUSINESS",
      message: "This link does not match the requested business.",
    };
  }

  return { valid: true, payload };
}
