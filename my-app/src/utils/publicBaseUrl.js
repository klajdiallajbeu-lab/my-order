export function getPublicBaseUrl() {
  const envUrl = import.meta.env.VITE_PUBLIC_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();

  const lanHost = import.meta.env.VITE_LAN_HOST;
  if (lanHost) {
    const proto = window.location.protocol || "http:";
    return `${proto}//${lanHost}:5173`;
  }

  return window.location.origin;
}
