import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook, createStripeClient } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function priceIdToPlan(priceId: string | undefined | null): string | null {
  if (priceId === "starter_monthly") return "starter";
  if (priceId === "professional_monthly") return "professional";
  return null;
}

async function resolvePriceLookupKey(env: StripeEnv, internalPriceId: string): Promise<string | null> {
  try {
    const stripe = createStripeClient(env);
    const p = await stripe.prices.retrieve(internalPriceId);
    return p.lookup_key ?? (p.metadata?.lovable_external_id as string | undefined) ?? null;
  } catch (e) {
    console.error("[payments-webhook] resolvePriceLookupKey failed:", e);
    return null;
  }
}

async function handleSubscriptionEvent(subscription: any, env: StripeEnv, resetUsage: boolean) {
  const userId = subscription.metadata?.userId;
  const item = subscription.items?.data?.[0];
  const internalPriceId = item?.price?.id;
  const lookupKey = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || (internalPriceId ? await resolvePriceLookupKey(env, internalPriceId) : null);

  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  // Mirror into subscriptions table
  await getSupabase().from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    product_id: productId,
    price_id: lookupKey,
    status: subscription.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });

  const plan = priceIdToPlan(lookupKey);
  if (userId && plan) {
    await getSupabase().rpc("apply_subscription_state", {
      _user_id: userId,
      _plan: plan,
      _status: subscription.status,
      _stripe_customer_id: subscription.customer,
      _stripe_subscription_id: subscription.id,
      _period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      _reset_usage: resetUsage,
    });
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  const userId = subscription.metadata?.userId;
  if (userId) {
    await getSupabase()
      .from("profiles")
      .update({ subscription_status: "canceled", plan: "pending", updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }
}

async function handleInvoiceFailed(invoice: any) {
  const customerId = invoice.customer;
  if (!customerId) return;
  await getSupabase()
    .from("profiles")
    .update({ subscription_status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_customer_id", customerId);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // Top-up: one-off payment with price_id metadata == contract_topup_10
  const priceMetaId = session.metadata?.price_id;
  const userId = session.metadata?.userId;
  if (priceMetaId === "contract_topup_10" && userId && session.payment_status === "paid") {
    await getSupabase().rpc("credit_contract_topup", { _user_id: userId, _amount: 10 });
    console.log(`[payments-webhook] Credited 10 contracts to ${userId}`);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  console.log(`[payments-webhook] ${env} event: ${event.type}`);

  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionEvent(event.data.object, env, true);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionEvent(event.data.object, env, false);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const inv = event.data.object as any;
      const subId = inv.subscription;
      if (subId) {
        // Re-fetch subscription to get fresh period and reset usage on renewal.
        const stripe = createStripeClient(env);
        const sub = await stripe.subscriptions.retrieve(subId);
        await handleSubscriptionEvent(sub as any, env, true);
      }
      break;
    }
    case "invoice.payment_failed":
      await handleInvoiceFailed(event.data.object);
      break;
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    default:
      console.log("[payments-webhook] Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Invalid env query param:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[payments-webhook] error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
