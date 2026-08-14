import "server-only";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY must be set in environment variables");
}

const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface InitializeTransactionArgs {
  email: string;
  amountPesewas: number;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

export async function initializePaystackTransaction(args: InitializeTransactionArgs) {
  const body = {
    email: args.email,
    amount: args.amountPesewas,
    currency: "GHS",
    metadata: args.metadata ?? {},
    callback_url: args.callbackUrl,
  };

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || !data.status) {
    throw new Error(data?.message || "Failed to initialize Paystack transaction");
  }

  return data.data as {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function verifyPaystackTransaction(reference: string) {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  const data = await res.json();

  if (!res.ok || !data.status) {
    throw new Error(data?.message || "Failed to verify Paystack transaction");
  }

  return data.data as {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer: { email: string };
    metadata?: Record<string, any>;
  };
}
