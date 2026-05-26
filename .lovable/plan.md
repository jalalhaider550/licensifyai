
This is a large, multi-system change. Here's the plan before I start touching code.

## 1. Pricing page (`src/components/landing/PricingSection.tsx`)

- Remove the 3 platform plans (Starter/Professional/Enterprise placeholders).
- Remove both £2,000 and £4,000 contract plans.
- Show only 3 cards:
  - **Starter** — £25/month — "15 contracts/month" — CTA "Subscribe" → Stripe checkout (`starter_monthly`)
  - **Professional** — £50/month — "30 contracts/month" — CTA "Subscribe" → Stripe checkout (`pro_monthly`)
  - **Law Firm** — "Custom" — CTA "Contact Us" → `mailto:licensifyai@gmail.com`

## 2. Plan model rewrite

New plans: `pending | starter | professional | law_firm`. Legacy `free_trial` / `pro` migrated → `pending`.

- DB migration on `profiles`:
  - `plan` text default `'pending'`
  - `contracts_used` int default 0
  - `contracts_limit` int default 0
  - `contracts_bonus` int default 0 (top-ups, reset each billing cycle)
  - `billing_cycle_start` timestamptz
  - `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`
- New `contract_usage_log` table (one row per generated contract, for audit).
- New `subscriptions` table per Stripe webhook spec (sandbox/live env-scoped).
- RPC `consume_contract(_user_id)` — atomic increment + limit check, returns `{allowed, used, limit}`.
- RPC `reset_billing_cycle()` — runs on `invoice.paid` webhook.
- Update `usePlan` hook → returns `{ plan, status, used, limit, bonus, isActive }`.

## 3. Gating

- New `PlanGate` wrapper around `AppShell` content.
- If `plan === 'pending'` or `subscription_status !== 'active'` → full-screen "Payment pending" view with link to checkout.
- For `starter` / `professional`: only `/contracts` (active contracts) and the dashboard contract widget are accessible. Every other route renders a `<LockedFeature />` panel with the exact copy:
  > Upgrade your plan to unlock this feature. Contact us at licensifyai@gmail.com
- Sidebar items for locked routes get a lock icon + greyed style (but remain clickable so the locked panel can show).
- `law_firm` keeps full access (manual provisioning).

## 4. Usage counter + limit block

- Dashboard widget: `{used + bonusUsed}/{limit + bonus} contracts used this month`.
- Contract generation entry point calls `consume_contract` RPC first. On `allowed:false` → show "Plan limit reached" modal:
  - Single CTA: **Buy 10 extra contracts — £20** → Stripe one-off checkout (`contract_topup_10`).
  - Below: `licensifyai@gmail.com`.
- Webhook on top-up success: `contracts_bonus += 10`.

## 5. Stripe integration

- `payments--batch_create_product`:
  - `starter_plan` → `starter_monthly` £25 GBP recurring monthly
  - `professional_plan` → `professional_monthly` £50 GBP recurring monthly
  - `contract_topup` → `contract_topup_10` £20 GBP one-time
- Edge functions:
  - `create-checkout` — already exists, extend to pass `userId` metadata + resolve customer.
  - `payments-webhook` — handle `customer.subscription.created/updated/deleted`, `invoice.paid` (reset cycle + activate), `invoice.payment_failed` (lock), `checkout.session.completed` for top-up (credit 10).
- `supabase/config.toml`: add `[functions.payments-webhook] verify_jwt = false` and same for `create-checkout`.
- Test/live switch already handled by `VITE_PAYMENTS_CLIENT_TOKEN`.

**Tax handling question for the user:** before wiring checkout I need to know which of these you want:
1. Full compliance handling (Stripe handles tax + fraud + disputes + support) — **+3.5%** per transaction. Note: customer bank statements show `LINK.COM*`.
2. Tax calculation & collection only — **+0.5%** per transaction. You file/remit.
3. No tax automation.

I'll ask via the question tool when implementation reaches that step.

## 6. Contract generation rewrite

- New flow on `/generate-contract`:
  1. **Country picker** — full ISO 3166-1 list (~250 sovereign + territories) from a static `src/data/countries.ts`.
  2. **Jurisdiction picker** — from `src/data/jurisdictions.ts` keyed by ISO code:
     - US: 50 states + DC + Federal
     - CA: 13 provinces/territories
     - AU: 8 states/territories
     - GB: England & Wales, Scotland, Northern Ireland
     - DE: 16 Länder; CH: 26 cantons; IN: 28 states + 8 UTs; etc.
     - Single-jurisdiction countries skip this step.
  3. **Contract type + facts form** (existing).
- Edge function `generate-contract` (new, or extends existing):
  - Calls `consume_contract` first.
  - Prompt rewrite: senior solicitor persona, jurisdiction-locked, must produce 20–30 page document with recitals, definitions, all operative clauses, governing law, dispute resolution, schedules, annexures, execution block. No placeholders.
  - Model: `google/gemini-2.5-pro` (long context, strong reasoning).
  - Streams or returns full doc; saved into existing documents table.

## Technical notes

- Honors `mem://style/legal-document-formatting` — no markdown, no quotes, plain numbered headings.
- Honors `mem://constraints/functional-preservation` — additive only; existing Licensing workspace untouched except via the gating wrapper, which leaves logic intact and just decides whether to render.
- Honors `mem://features/document-export/naming-convention` — `[Type]_[Client]_[Date]`.
- All UI uses existing semantic tokens; no hardcoded colors.

## Open questions before I start

1. **Tax handling option (1/2/3 above).** Required before Stripe products go in.
2. **Existing users on `pro`** — keep them as `professional` (grandfathered, no payment) or force them into `pending`? I'd suggest grandfather to `professional`.
3. **Law Firm tier access level** — full access like old `pro`, or also gated? You said "contact us only", implying manual provisioning → I'll treat `law_firm` as full access set by admin.
4. **Existing `Admin` page** — keep, and add `law_firm` to the plan toggle? Yes unless you say otherwise.

Confirm answers (especially #1 and #2) and I'll execute the plan end-to-end.
