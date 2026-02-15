import { AUTH_COOKIE } from "./constants";

export function setAuthCookie(rememberMe: boolean) {
  const base = `${AUTH_COOKIE}=1; path=/; SameSite=Lax`;
  document.cookie = rememberMe ? `${base}; max-age=${60 * 60 * 24 * 30}` : base;
}

export function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}
