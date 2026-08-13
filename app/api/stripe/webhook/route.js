import { NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "../../../../lib/stripe";
import { serviceClient } from "../../../../lib/supabase";

// The only path that grants a paid tier.
//
// Two things make this trustworthy:
//   1. The signature is verified against the RAW body. Next.js must not parse
//      it first, hence request.text() — a re-serialised body fails the check.
//   2. apply_purchase() is idempotent on the session id. Stripe retries
//      deliveries, and a couple must never be charged twice or see their tier
//      applied twice.
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isStripeConfigured) {
    return NextResponse.json({ error: "payments_unavailable" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const raw = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    // Unverified payload — never act on it.
    return NextResponse.json(
      { error: "invalid_signature", detail: err?.message ?? "unknown" },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge everything else so Stripe stops retrying it.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const eventId = session?.metadata?.event_id;
  const tier = session?.metadata?.tier;

  if (!eventId || !tier) {
    // Nothing actionable, but a 200 stops an infinite retry loop over a payment
    // we can't attribute. Worth alerting on in a real deployment.
    return NextResponse.json({ received: true, unattributed: true });
  }

  try {
    const supabase = serviceClient();
    const { error } = await supabase.rpc("apply_purchase", {
      p_event_id: eventId,
      p_tier: tier,
      p_session_id: session.id,
      p_payment_intent: session.payment_intent ?? null,
      p_amount_cents: session.amount_total ?? null,
    });

    if (error) {
      // 500 so Stripe retries — the customer has paid and the entitlement is
      // not yet applied, which is the one case worth retrying hard.
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
