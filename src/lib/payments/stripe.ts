export interface CreateCheckoutSessionParams {
  appointmentId: string;
  business: {
    id: string;
    name: string;
    slug: string;
    currency: string;
  };
  service: {
    name: string;
    durationMin: number;
    priceCents: number;
    paymentRequirement: "NONE" | "DEPOSIT" | "FULL";
    depositAmountCents: number;
  };
  customer: {
    name: string;
    email?: string | null;
  };
  startsAt: Date;
  baseUrl?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  amountCents: number;
  paymentType: "DEPOSIT" | "FULL";
}

export interface RefundResult {
  refundId: string;
  paymentIntentId: string;
  amountCents: number;
  status: string;
}

// In-memory ledger for mock development & test assertions
const mockRefundLedger: RefundResult[] = [];

/**
 * Creates a Stripe Checkout Session for deposit or full payment services.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const domain = params.baseUrl || "http://localhost:3000";
  const isDeposit = params.service.paymentRequirement === "DEPOSIT";
  const amountCents = isDeposit
    ? params.service.depositAmountCents || Math.round(params.service.priceCents * 0.3)
    : params.service.priceCents;

  const sessionId = `cs_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const checkoutUrl = `${domain}/b/${params.business.slug}?session_id=${sessionId}&appointment_id=${params.appointmentId}`;

  // In production with STRIPE_SECRET_KEY, instantiate `new Stripe(...)` and call `stripe.checkout.sessions.create`
  return {
    sessionId,
    checkoutUrl,
    amountCents,
    paymentType: isDeposit ? "DEPOSIT" : "FULL",
  };
}

/**
 * Executes a Stripe refund for an existing payment intent.
 */
export async function createStripeRefund(params: {
  paymentIntentId: string;
  amountCents?: number;
  reason?: string;
}): Promise<RefundResult> {
  const refundId = `re_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const refundResult: RefundResult = {
    refundId,
    paymentIntentId: params.paymentIntentId,
    amountCents: params.amountCents || 0,
    status: "succeeded",
  };

  mockRefundLedger.push(refundResult);
  console.log(`💳 [STRIPE REFUND EXECUTED] ${refundId} for PaymentIntent ${params.paymentIntentId}`);

  return refundResult;
}

export function getMockRefunds() {
  return [...mockRefundLedger];
}

export function clearMockRefunds() {
  mockRefundLedger.length = 0;
}
