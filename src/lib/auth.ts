import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@/models/User";

const JWT_SECRET_STRING =
  process.env.JWT_SECRET || "velox_skate_rink_secret_jwt_2026_super_secure_key_12345";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const COOKIE_NAME = "velox_token";

export interface SessionUser {
  userId: string;
  name: string;
  phone: string;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    userId: user.userId,
    name: user.name,
    phone: user.phone,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      phone: payload.phone as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

/**
 * Server-side helper to read the current authenticated user from cookies.
 * Note: Next.js 15 requires awaiting cookies()
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Normalizes phone numbers (e.g., converts +251911223344 or 0911223344 to standard 0911223344)
 */
export function normalizePhoneNumber(raw: string): string {
  const cleaned = raw.trim().replace(/[\s-]/g, "");
  if (cleaned.startsWith("+251")) {
    return "0" + cleaned.slice(4);
  }
  if (cleaned.startsWith("251")) {
    return "0" + cleaned.slice(3);
  }
  return cleaned;
}
