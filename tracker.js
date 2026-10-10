(function() {
  "use strict";
  let lastTrackedPath;
  const maximumFaviconUrlLength = 2048;
  const reservedEventNames = /* @__PURE__ */ new Set(["pageview"]);
  const customEventNamePattern = /^[a-z][a-z0-9_]{0,99}$/;
  const maximumUtmValueLength = 100;
  const utmParamNames = ["utm_source", "utm_medium", "utm_campaign"];
  const CLIENT_ID_COOKIE = "_lienks_vid";
  let consent = "unknown";
  let lastKnownMode;
  function readClientId() {
    const match = document.cookie.match(new RegExp(`(?:^|; )${CLIENT_ID_COOKIE}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : void 0;
  }
  function generateClientId() {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  function ensureClientId() {
    if (readClientId()) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CLIENT_ID_COOKIE}=${generateClientId()}; max-age=86400; path=/; SameSite=Lax${secure}`;
  }
  function deleteClientId() {
    document.cookie = `${CLIENT_ID_COOKIE}=; max-age=0; path=/`;
  }
  function activeClientId() {
    if (consent !== "granted") return void 0;
    const existing = readClientId();
    if (existing) return existing;
    if (lastKnownMode === "cookie") {
      ensureClientId();
      return readClientId();
    }
    return void 0;
  }
  function readUtmParams() {
    var _a;
    const result = {};
    try {
      const params = new URLSearchParams(window.location.search);
      for (const name of utmParamNames) {
        const value = (_a = params.get(name)) == null ? void 0 : _a.trim().slice(0, maximumUtmValueLength);
        if (value) {
          result[name] = value;
        }
      }
    } catch {
    }
    return result;
  }
  function handleTrackingResponse(response) {
    return response.status === 200 ? response.json().catch(() => null) : Promise.resolve(null);
  }
  function applyTrackingResponse(data) {
    if (!data || typeof data.mode !== "string") return;
    lastKnownMode = data.mode;
    if (consent === "granted" && lastKnownMode !== "cookie") {
      deleteClientId();
    }
  }
  function setConsent(granted) {
    if (typeof granted !== "boolean") return;
    if (!granted) {
      consent = "denied";
      deleteClientId();
      return;
    }
    consent = "granted";
  }
  function toSameOriginFaviconUrl(href, baseUrl = document.baseURI) {
    try {
      const url = new URL(href, baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:" || url.username || url.password || url.host.toLowerCase() !== window.location.host.toLowerCase()) {
        return void 0;
      }
      url.hash = "";
      return url.href.length <= maximumFaviconUrlLength ? url.href : void 0;
    } catch {
      return void 0;
    }
  }
  function findFaviconUrl() {
    const selectors = ['link[rel~="icon"][href]', 'link[rel="apple-touch-icon"][href]'];
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const href = element.getAttribute("href");
        const faviconUrl = href ? toSameOriginFaviconUrl(href) : void 0;
        if (faviconUrl) {
          return faviconUrl;
        }
      }
    }
    return toSameOriginFaviconUrl("/favicon.ico", window.location.href);
  }
  function sendPageview(siteId, endpoint) {
    if (typeof window === "undefined" || typeof document === "undefined" || typeof window.fetch !== "function" || typeof siteId !== "string" || siteId.trim().length === 0 || typeof endpoint !== "string" || endpoint.trim().length === 0) {
      return;
    }
    const path = window.location.pathname;
    if (path === lastTrackedPath) {
      return;
    }
    lastTrackedPath = path;
    try {
      const clientId = activeClientId();
      void window.fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "omit",
        body: JSON.stringify({
          siteId,
          eventName: "pageview",
          path,
          referrer: document.referrer || "",
          faviconUrl: findFaviconUrl(),
          ...readUtmParams(),
          ...clientId ? { clientId } : {}
        })
      }).then(handleTrackingResponse).then(applyTrackingResponse).catch(() => void 0);
    } catch {
    }
  }
  function sendCustomEvent(siteId, endpoint, eventName) {
    if (typeof window === "undefined" || typeof document === "undefined" || typeof window.fetch !== "function" || typeof siteId !== "string" || siteId.trim().length === 0 || typeof endpoint !== "string" || endpoint.trim().length === 0 || typeof eventName !== "string" || reservedEventNames.has(eventName) || !customEventNamePattern.test(eventName)) {
      return;
    }
    try {
      const clientId = activeClientId();
      void window.fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "omit",
        body: JSON.stringify({
          siteId,
          eventName,
          path: window.location.pathname,
          referrer: document.referrer || "",
          ...readUtmParams(),
          ...clientId ? { clientId } : {}
        })
      }).then(handleTrackingResponse).then(applyTrackingResponse).catch(() => void 0);
    } catch {
    }
  }
  let initialized = false;
  function setupSpaTracking(siteId, endpoint) {
    const track = () => sendPageview(siteId, endpoint);
    const originalPushState = history.pushState.bind(history);
    history.pushState = (...args) => {
      originalPushState(...args);
      track();
    };
    window.addEventListener("popstate", track);
  }
  function initializeFromCurrentScript() {
    try {
      if (typeof document === "undefined" || typeof HTMLScriptElement === "undefined") {
        return;
      }
      const script = document.currentScript;
      if (!(script instanceof HTMLScriptElement)) {
        return;
      }
      const siteId = script.getAttribute("data-site");
      if (!siteId || siteId.trim().length === 0 || !script.src) {
        return;
      }
      if (initialized) {
        return;
      }
      initialized = true;
      const endpoint = new URL("/api/events", script.src).href;
      sendPageview(siteId, endpoint);
      setupSpaTracking(siteId, endpoint);
      window.lienks = {
        event: (eventName) => sendCustomEvent(siteId, endpoint, eventName),
        setConsent
      };
    } catch {
    }
  }
  initializeFromCurrentScript();
})();
