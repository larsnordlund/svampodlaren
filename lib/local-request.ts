// Restrict the local API to loopback and same-origin browser requests.
export function allowedLocalRequest(
  request: Request,
  mutation = false,
): boolean {
  const host = request.headers.get("host");
  if (!host) return false;
  let hostname: string;
  try {
    hostname = new URL("http://" + host).hostname;
  } catch {
    return false;
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (
        parsed.host !== host ||
        !["http:", "https:"].includes(parsed.protocol)
      )
        return false;
    } catch {
      return false;
    }
  } else if (mutation) return false;
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}
