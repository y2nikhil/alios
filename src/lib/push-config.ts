// VAPID public key — safe to expose to the browser.
export const VAPID_PUBLIC_KEY =
  "BMj2OJXpbzc561qDZlVcTj7fW_iiHQ19I1cCkTLpe_zhubdRHHteDr1GHVU7PVJOCC-MGgRoSYv8K1-Fq-YRT9w";

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const b64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
