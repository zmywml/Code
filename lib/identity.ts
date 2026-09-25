import { env } from "cloudflare:workers";
import { jwtVerify, SignJWT } from "jose";

export type AuthenticatedUser = { id: string; name: string; role: "teacher" | "student"; classroom?: string };
type RuntimeEnv = Cloudflare.Env & { LOCAL_PREVIEW?: string; APP_SESSION_SECRET?: string };
const COOKIE = "wenxu_session", maxAge = 60 * 60 * 24 * 7;

function secret() {
  const value = (env as RuntimeEnv).APP_SESSION_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("APP_SESSION_SECRET 未配置或长度不足");
  return new TextEncoder().encode(value);
}

function cookies(request: Request) {
  return Object.fromEntries((request.headers.get("cookie") || "").split(";").map(part => { const value=part.trim(),at=value.indexOf("=");return at<0?[value,""]:[value.slice(0,at),value.slice(at+1)]; }).filter(([key]) => key));
}

export async function authenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const runtime = env as RuntimeEnv;
  if (runtime.LOCAL_PREVIEW === "true" && request.headers.get("x-preview-user")) {
    const id = request.headers.get("x-preview-user")!;
    return { id, name: id, role: "teacher" };
  }
  const token = cookies(request)[COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: "wenxu-lab", issuer: "wenxu" });
    if (typeof payload.sub !== "string" || typeof payload.name !== "string" || (payload.role !== "teacher" && payload.role !== "student")) return null;
    return { id: payload.sub, name: payload.name, role: payload.role, classroom: typeof payload.classroom === "string" ? payload.classroom : undefined };
  } catch { return null; }
}

export async function sessionCookie(user: AuthenticatedUser) {
  const token = await new SignJWT({ name: user.name, role: user.role, classroom: user.classroom }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuer("wenxu").setAudience("wenxu-lab").setIssuedAt().setExpirationTime(`${maxAge}s`).sign(secret());
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export const clearSessionCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export async function stableStudentId(classroom: string, studentNo: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${classroom}:${studentNo}`));
  return `student:${Array.from(new Uint8Array(bytes)).map(n => n.toString(16).padStart(2, "0")).join("").slice(0, 32)}`;
}
