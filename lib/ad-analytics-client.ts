const SESSION_KEY = "tg_ad_session";
const SEEN_KEY = "tg_ad_seen";

function sessionKey() {
  if (typeof window === "undefined") return "";
  try {
    let value = window.sessionStorage.getItem(SESSION_KEY);
    if (!value) {
      value =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(SESSION_KEY, value);
    }
    return value;
  } catch {
    return "";
  }
}

function seenSet() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function markSeen(token: string) {
  try {
    const next = seenSet();
    next.add(token);
    window.sessionStorage.setItem(
      SEEN_KEY,
      JSON.stringify([...next].slice(-400)),
    );
  } catch {
    // ignore storage errors
  }
}

export function trackAdAnalytics(opts: {
  kind: "ad" | "explore";
  assetId: string;
  type: "impression" | "view" | "click";
  placement: "homepage" | "blog" | "explore";
}) {
  if (typeof window === "undefined") return;
  if (!opts.assetId || opts.assetId.length < 8) return;

  const token = `${opts.kind}:${opts.assetId}:${opts.type}:${opts.placement}`;
  if (opts.type !== "click") {
    const seen = seenSet();
    if (seen.has(token)) return;
    markSeen(token);
  }

  const payload = JSON.stringify({
    kind: opts.kind,
    assetId: opts.assetId,
    type: opts.type,
    placement: opts.placement,
    sessionKey: sessionKey(),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/ads/track", blob)) return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch("/api/ads/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}
