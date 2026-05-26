import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  customerName?: string;
  userId?: string;
  companyName?: string;
  notes?: string;
  returnUrl: string;
  environment: StripeEnv;
  metadata?: Record<string, string>;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string; name?: string },
): Promise<string | undefined> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  if (!options.email && !options.userId) return undefined;
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.name && { name: options.name }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.priceId || !/^[a-zA-Z0-9_-]+$/.test(body.priceId)) throw new Error("Invalid priceId");
    if (!body.returnUrl) throw new Error("Missing returnUrl");
    if (body.environment !== "sandbox" && body.environment !== "live") throw new Error("Invalid environment");

    const stripe = createStripeClient(body.environment);

    const prices = await stripe.prices.list({ lookup_keys: [body.priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const customerId = await resolveOrCreateCustomer(stripe, {
      email: body.customerEmail,
      userId: body.userId,
      name: body.customerName,
    });

    // Resolve product name for one-off description (managed payments dashboard label).
    let productDescription: string | undefined;
    if (!isRecurring) {
      const productId = typeof stripePrice.product === "string"
        ? stripePrice.product
        : (stripePrice.product as any).id;
      const product = await stripe.products.retrieve(productId);
      productDescription = product.name;
    }

    const metadata: Record<string, string> = {
      ...(body.userId && { userId: body.userId }),
      ...(body.companyName && { company_name: body.companyName }),
      ...(body.notes && { notes: body.notes.slice(0, 500) }),
      ...(body.metadata ?? {}),
      price_id: body.priceId,
    };

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: body.quantity ?? 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: body.returnUrl,
      ...(customerId && { customer: customerId }),
      ...(!isRecurring && { payment_intent_data: { description: productDescription, metadata } }),
      metadata,
      ...(isRecurring && {
        subscription_data: { metadata },
      }),
      managed_payments: { enabled: true },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
