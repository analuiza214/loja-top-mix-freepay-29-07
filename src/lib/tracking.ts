declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export function saveTrackingParams(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  const params = new URLSearchParams(window.location.search);
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid",
    "ttclid",
  ];
  keys.forEach((key) => {
    const value = params.get(key);
    if (value) localStorage.setItem(key, value);
  });
}

export function getTrackingParams(): Record<string, string | null> {
  return {
    utm_source: localStorage.getItem("utm_source"),
    utm_medium: localStorage.getItem("utm_medium"),
    utm_campaign: localStorage.getItem("utm_campaign"),
    utm_content: localStorage.getItem("utm_content"),
    utm_term: localStorage.getItem("utm_term"),
    gclid: localStorage.getItem("gclid"),
    fbclid: localStorage.getItem("fbclid"),
    ttclid: localStorage.getItem("ttclid"),
  };
}

export function getGaClientId(): string | null {
  const match = document.cookie.match(/_ga=GA1\.1\.(\d+\.\d+)/);
  if (match && match[1]) return match[1];
  return null;
}

export function pushEcommerceEvent(
  eventName: string,
  ecommerceData: Record<string, unknown>,
  extraData: Record<string, unknown> = {}
): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({
    event: eventName,
    ...extraData,
    ecommerce: ecommerceData,
  });
}
