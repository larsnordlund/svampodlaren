export type NetworkConfig = {
  publicOrigin?: string;
  trustProxy?: boolean;
  lanOrigin?: string;
};
export function publicOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.hostname.includes("*")
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
// Direct HTTP access is opt-in and restricted to one private IPv4 address.
export function privateLanOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const parts = url.hostname.split(".").map(Number);
    const privateIp =
      parts.length === 4 &&
      parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
      (parts[0] === 10 ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168));
    return privateIp &&
      url.protocol === "http:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
function authority(value: string | null): URL | null {
  if (!value || /[\s,@/\\?#]/.test(value)) return null;
  try {
    const url = new URL("http://" + value);
    return url.host.toLowerCase() === value.toLowerCase() ? url : null;
  } catch {
    return null;
  }
}
// Proxy headers are trusted only when explicitly enabled. The production listener
// must stay on loopback so clients cannot impersonate the HTTPS reverse proxy.
export function requestOrigin(
  request: Request,
  config: NetworkConfig = {
    lanOrigin: process.env.APP_LAN_ORIGIN,
    publicOrigin: process.env.APP_PUBLIC_ORIGIN,
    trustProxy: process.env.APP_TRUST_PROXY === "1",
  },
): string | null {
  const host = authority(request.headers.get("host"));
  if (!host) return null;
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(host.hostname);
  const configured = publicOrigin(config.publicOrigin);
  const forwardedHost = request.headers.get("x-forwarded-host"),
    forwardedProto = request.headers.get("x-forwarded-proto");
  const lan = privateLanOrigin(config.lanOrigin);
  if (!config.trustProxy && lan && host.host === new URL(lan).host) return lan;
  if (config.trustProxy && configured) {
    const expected = new URL(configured).host;
    if (
      forwardedHost === expected &&
      forwardedProto === "https" &&
      (loopback || host.host === expected)
    )
      return configured;
    // Next also supplies these headers for direct localhost requests.
    if (
      !loopback ||
      (forwardedHost && forwardedHost !== host.host) ||
      (forwardedProto && forwardedProto !== "http")
    )
      return null;
  }
  if (!loopback) return null;
  return (
    (new URL(request.url).protocol === "https:" ? "https:" : "http:") +
    "//" +
    host.host
  );
}
export function allowedLocalRequest(
  request: Request,
  mutation = false,
  config?: NetworkConfig,
): boolean {
  const expected = requestOrigin(request, config);
  if (!expected) return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (
        new URL(origin).origin !== expected ||
        new URL(origin).username ||
        new URL(origin).password ||
        new URL(origin).pathname !== "/" ||
        new URL(origin).search ||
        new URL(origin).hash
      )
        return false;
    } catch {
      return false;
    }
  } else if (mutation) return false;
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}
export function secureRequest(request: Request): boolean {
  return requestOrigin(request)?.startsWith("https://") || false;
}
