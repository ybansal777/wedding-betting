import { NextResponse } from "next/server";
import { stripe, isStripeConfigured, TIER_COPY } from "../../../../lib/stripe";
import { serverClient } from "../../../../lib/supabase";

// Creates a one-time Checkout session for an event upgrade.
//
// Price and entitlements are read from the database, never from the request —
// a client that posts {tier:"premium", price:0} gets premium's real price or an
// error. The event id travels in metadata so the webhook knows what to unlock.
export async function POST(request) {
  if (!isStripeConfigured) {
    return NextResponse.json({ error: "payments_unavailable" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { eventId, tier } = body || {};
  if (!eventId || !TIER_COPY[tier]) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // RLS means this only returns the event if the caller owns it. No separate
  // ownership check needed — a stranger's event id simply comes back empty.
  const { data: event } = await supabase
    .from("events")
    .select("id, title, owner_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: tierRow } = await supabase
    .from("tiers")
    .select("key, price_cents, label")
    .eq("key", tier)
    .maybeSingle();

  if (!tierRow || tierRow.price_cents <= 0) {
    return NextResponse.json({ error: "not_purchasable" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: tierRow.price_cents,
            product_data: {
              name: TIER_COPY[tier].name,
              description: TIER_COPY[tier].description,
            },
          },
        },
      ],
      // The webhook is the only thing that grants entitlements, and it trusts
      // only these two values.
      metadata: { event_id: event.id, tier: tierRow.key },
      success_url: `${origin}/dashboard/${event.id}?upgraded=1`,
      cancel_url: `${origin}/dashboard/${event.id}?upgrade=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: "stripe_error", detail: err?.message ?? "unknown" },
      { status: 502 }
    );
  }
}
