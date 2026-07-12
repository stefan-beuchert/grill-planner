import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// No accounts, no session table — the admin cookie's value is an HMAC of a
// fixed string keyed by ADMIN_PASSCODE. It can only be produced by someone
// who knows the passcode server-side, so it can't be forged by just setting
// a cookie in devtools, without needing anywhere to store session state.
const COOKIE_NAME = "admin_session";

function sessionToken(): string {
  return createHmac("sha256", process.env.ADMIN_PASSCODE ?? "")
    .update("grill-planner-admin")
    .digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_PASSCODE) return false;
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const expected = sessionToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
