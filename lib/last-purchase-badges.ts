/**
 * localStorage: tg_last_voucher_purchase / tg_last_checker_purchase
 * — header pill state separate from API "pending" (no stock yet).
 */

export type HeaderBadgeState = "off" | "pending" | "ready";

export type LastVoucherStored = {
  kind?: "form_voucher";
  email?: string;
  schoolId?: string | null;
  reference?: string;
  voucher?: { serial: string; pin: string } | null;
  pending?: boolean;
  createdAt?: string;
  /** Client: user hit a queued state (no voucher yet) for this reference */
  everQueued?: boolean;
  /** Drives the header pill: off = hidden */
  headerBadge?: HeaderBadgeState;
};

export type LastCheckerStored = {
  email?: string;
  reference?: string;
  pending?: boolean;
  everQueued?: boolean;
  headerBadge?: HeaderBadgeState;
};

/** Whether to show the header pill and which label. */
export function getVoucherPillVisibility(
  raw: LastVoucherStored | null,
): { show: true; label: "pending" | "ready" } | { show: false } {
  if (!raw || !raw.reference) return { show: false };

  const hb = raw.headerBadge;
  if (hb === "off") return { show: false };
  if (hb === "pending") return { show: true, label: "pending" };
  if (hb === "ready") return { show: true, label: "ready" };

  // Legacy: no headerBadge
  if (raw.pending) return { show: true, label: "pending" };
  // Legacy: fulfilled without our fields — treat as instant (no pill)
  return { show: false };
}

export function getCheckerPillVisibility(
  raw: LastCheckerStored | null,
): { show: true; label: "pending" | "ready" } | { show: false } {
  if (!raw || !raw.reference) return { show: false };

  const hb = raw.headerBadge;
  if (hb === "off") return { show: false };
  if (hb === "pending") return { show: true, label: "pending" };
  if (hb === "ready") return { show: true, label: "ready" };

  if (raw.pending) return { show: true, label: "pending" };
  return { show: false };
}

/**
 * Build next voucher storage from success page verify result. Respects sticky headerBadge: "off" for same reference.
 * Any time the success page is showing a voucher, the header pill is hidden (acknowledged on page).
 * Only the Header poll can set "ready" when fulfillment happens off this page.
 */
export function buildVoucherLastPurchasePayload(params: {
  email: string;
  schoolId: string | null;
  reference: string;
  voucher: { serial: string; pin: string } | null;
  pending: boolean;
  previous: LastVoucherStored | null;
}): LastVoucherStored {
  const { email, schoolId, reference, voucher, pending, previous } = params;

  const sameRef = previous?.reference === reference;
  if (sameRef && previous?.headerBadge === "off") {
    return {
      kind: "form_voucher",
      email,
      schoolId,
      reference,
      voucher: voucher ?? previous?.voucher ?? null,
      pending,
      everQueued: Boolean(previous.everQueued),
      headerBadge: "off",
      createdAt: previous?.createdAt ?? new Date().toISOString(),
    };
  }

  let everQueued = false;
  if (sameRef) {
    everQueued = Boolean(previous?.everQueued);
  }
  if (pending) {
    everQueued = true;
  }

  let headerBadge: HeaderBadgeState;
  if (pending) {
    headerBadge = "pending";
  } else if (voucher) {
    headerBadge = "off";
  } else {
    headerBadge = "pending";
  }

  return {
    kind: "form_voucher",
    email,
    schoolId,
    reference,
    voucher,
    pending,
    everQueued,
    headerBadge,
    createdAt: new Date().toISOString(),
  };
}

/**
 * When header poll finds voucher is ready, merge into existing localStorage object.
 */
export function mergeVoucherAfterPollFulfilled(
  existing: LastVoucherStored,
): LastVoucherStored {
  return {
    ...existing,
    pending: false,
    everQueued: true,
    headerBadge: "ready",
  };
}

/**
 * Dismiss / navigate from header: hide pill, keep a minimal record so success page does not re-enable.
 */
export function mergeVoucherHeaderDismiss(
  existing: LastVoucherStored,
): LastVoucherStored {
  return {
    ...existing,
    headerBadge: "off" as const,
  };
}

export function buildCheckerLastPurchaseFromVerify(params: {
  email: string;
  reference: string;
  pending: boolean;
  previous: LastCheckerStored | null;
}): LastCheckerStored {
  const { email, reference, pending, previous } = params;
  const sameRef = previous?.reference === reference;
  if (sameRef && previous?.headerBadge === "off") {
    return {
      email,
      reference,
      pending,
      everQueued: Boolean(previous.everQueued),
      headerBadge: "off",
    };
  }

  let everQueued = false;
  if (sameRef) {
    everQueued = Boolean(previous?.everQueued);
  }
  if (pending) {
    everQueued = true;
  }

  const headerBadge: HeaderBadgeState = pending ? "pending" : "off";

  return {
    email,
    reference,
    pending,
    everQueued,
    headerBadge,
  };
}

export function mergeCheckerAfterPollFulfilled(
  existing: LastCheckerStored,
): LastCheckerStored {
  return {
    ...existing,
    pending: false,
    everQueued: true,
    headerBadge: "ready",
  };
}

export function mergeCheckerHeaderDismiss(
  existing: LastCheckerStored,
): LastCheckerStored {
  return {
    ...existing,
    headerBadge: "off" as const,
  };
}
