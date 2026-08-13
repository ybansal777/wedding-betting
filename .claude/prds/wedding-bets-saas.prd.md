# Wedding Bets — Self-Serve Prediction Game for Weddings

*Status: DRAFT — requirements only. Implementation planning pending via `/plan`.*
*Owner: Yash · Created 2026-08-12 · Source: generalization of the single-tenant app in this repo*

---

## Problem

A wedding reception has two or three hours of structural dead time — cocktail hour, the gap between courses, the lull before dancing — where guests who mostly don't know each other sit at assigned tables with their phones out. Couples want a shared activity that makes strangers talk, but the available options are quizzes and photo walls, and neither creates the thing that actually works: a running, competitive, public stake in what happens next.

One couple solved this by having a software engineer in the family build a custom sportsbook for their wedding. That is not a repeatable solution. The cost of leaving this unsolved is that every other couple either buys a generic trivia app that doesn't fit the moment, or does nothing.

## Evidence

- **Direct, first-party:** this app was built and run live at a real wedding (see repo history and `README.md`). The couple specified it, used it, and it worked — including a live leaderboard, an admin console for settling questions, and QR distribution. This is the strongest evidence available and it is real, but n = 1.
- **Observed product shape:** the built version converged on sportsbook mechanics rather than quiz mechanics — American odds, a bet slip, a bankroll, staged-then-confirmed wagers, instant payout on settlement. That the builder independently landed on betting-UI conventions suggests the metaphor is doing real work, not decoration.
- **Assumption — needs validation via customer interviews (target: 15 engaged couples, 4–10 weeks pre-wedding):** that couples other than the founder want this, will pay for it, and will trust a third-party app with a moment of their reception.
- **Assumption — needs validation via analytics on the first 20 live events:** that guest participation clears the bar where the game feels alive rather than empty. Below roughly a third of guests, a leaderboard reads as dead.
- **Assumption — needs validation via landing-page smoke test before build completes:** willingness to pay at the $29 / $59 price points. Run a priced landing page with a real checkout button and measure click-to-checkout.

> No competitive teardown, keyword volume data, or pricing research exists yet. Anything below stated as a market fact is flagged. Treat the whole demand side as unvalidated until the interviews and the smoke test run.

## Users

**Primary — the Host.** One member of an engaged couple, typically 27–38, planning a reception of 60–200 guests, already paying for wedding software (a wedding website, a photo-sharing app, an RSVP tool). Not technical. The trigger moment is 4–8 weeks before the wedding, while building the reception timeline and searching some variant of *"fun things for guests at a wedding reception."* They will spend 20–40 minutes setting this up, once, probably at 11pm, on a laptop. They will not read documentation.

**Secondary — the Deputy.** The maid of honor, best man, or planner the Host hands operational control to on the day. The Host is getting married and cannot be settling questions between the toasts. This person needs to run the console from a phone, in low light, possibly after a drink, without training. *In v1 this is served by sharing host credentials; a real second-seat role is out of scope (see Scope).*

**Tertiary — the Guest.** Scans a QR at a table. Gives the product 30 seconds of patience before deciding it isn't worth it. Is the entire reason the product has value, and has zero investment in it succeeding.

**Not for:** anyone wagering real money; corporate or sports-league betting pools; venues or planners running events at scale under one account; non-wedding parties in v1 (see Open Questions on when that opens up).

## Hypothesis

We believe **a self-serve product that lets a non-technical couple build and run their own live prediction game** will **convert reception dead time into a shared competitive event** for **engaged couples and their guests**.

We'll know we're right when **at least 45% of guests who scan the QR place at least one bet, at least 70% of created events reach the day with a settled question, and at least 12% of hosts who create a free event upgrade to a paid tier.**

## Success Metrics

| Metric | Target | How measured |
|---|---|---|
| **Paid events completed** *(north star)* | 40 in the first full wedding season | Stripe payments joined to events with ≥1 settled question |
| **Guest activation** | ≥45% of QR scans place ≥1 bet | Scan-to-first-bet funnel, per event |
| **Guest signup completion** | ≥80% of guests who begin auth finish it | Auth funnel drop-off by method (Apple / Google / phone / email) |
| **Free→paid conversion** | ≥12% of hosts with a created event | Stripe checkout completions ÷ events created |
| **Event completion rate** | ≥70% of created events settle ≥1 question | Events with `settled_at` on any question |
| **Host setup completion** | ≥60% of signups publish ≥3 questions | Funnel from account creation to published event |
| **Day-of incident rate** | Zero events with an outage during their window | Uptime + error monitoring, alerted per active event |

**Kill criterion on guest accounts:** if guest signup completion lands below **65%**, or guest activation below **30%**, the mandatory-account decision is wrong and the product ships a name-only or device-token guest mode. This is pre-committed so the call gets made on data, not on defending the original spec.

## Scope

### MVP — the minimum that tests the hypothesis

1. **Host accounts.** Email + password, plus Google and Apple SSO. Password reset. One host, one or more events.
2. **Event creation.** Couple names, wedding date, event window, a URL slug, and a starting bankroll for guests.
3. **Question builder.** Create, edit, reorder, and delete questions with 2–6 options each and host-set American odds. Seeded from a **wedding question template library** so a Host is never staring at an empty box — this is the single highest-leverage setup feature.
4. **Guest accounts.** Sign up and sign in with Apple, Google, phone OTP, or email. Optimized ruthlessly for time-to-first-bet: SSO buttons first, phone OTP second, email last. A guest belongs to one event at a time.
5. **Live play.** Bankroll, bet slip with multiple staged bets, confirm-to-place, one bet per guest per question, bets final once placed.
6. **Live leaderboard.** Per event, updating during play.
7. **Settlement.** Host or Deputy declares a winning option; payouts apply instantly and the leaderboard reflects them.
8. **Distribution.** Auto-generated QR code and short share link per event, printable at table-card size.
9. **Tenant isolation.** Every question, bet, guest, and leaderboard row is scoped to one event, enforced at the database layer — not in the client. **This is a correctness and privacy requirement, not an optimization.**
10. **Monetization.** Stripe Checkout, one-time payment per event, three tiers, with entitlements enforced server-side.
11. **Theming.** Tier-gated: a small set of preset themes, plus logo upload and accent color on the top tier.
12. **Marketing site.** Public pages that can rank and convert: what it is, how it works, pricing, an example event, FAQ covering "is this gambling" and "do my guests need an app."

### Tiers (prices are hypotheses — validate before locking)

| | **Free** | **Classic — $29** | **Grand — $59** |
|---|---|---|---|
| Guests | 15 | 75 | Unlimited *(fair-use cap)* |
| Questions | 5 | 20 | Unlimited *(fair-use cap)* |
| Preset themes | 1 | All | All |
| Logo + custom accent color | — | — | ✓ |
| Custom URL slug | — | — | ✓ |
| Post-event recap page | — | ✓ | ✓ |
| Guest list / results export | — | — | ✓ |

The Free tier exists to let a Host build the whole thing and feel it work before paying. **The paywall must sit at share/publish time, never mid-event** — a wedding that hits a limit during the reception is a refund, a support ticket, and a bad review, all on the worst possible day.

### Out of scope

- **Real money, cash prizes, or cash-out of any kind** — permanently, not just for v1. See Risks; this is a positioning and legal boundary, not a backlog item.
- **Native iOS/Android apps** — the entire distribution model is a QR to a mobile web page. An app store install at a reception is a non-starter.
- **Subscriptions and multi-event accounts** — deferred; contradicts the one-time-purchase decision and serves planners, who are explicitly not the v1 user.
- **Non-wedding event types** — deferred to keep positioning, templates, and marketing sharp.
- **Separate Deputy role with its own login** — v1 ships credential sharing. Real second-seat permissions land only if interviews say couples won't share a password.
- **Pari-mutuel or dynamic odds** — host-set fixed odds only. Dynamic odds are a meaningfully harder product and math problem.
- **Guest chat, photo sharing, or a social feed** — different product, and a moderation liability at someone's wedding.
- **Custom domains, white-label, RSVP or seating-chart integrations** — post-launch at the earliest.

## Delivery Milestones

Business outcomes, not engineering tasks. `/plan` turns each into an implementation plan.

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | **Tenancy & host accounts** | A stranger can sign up and create their own event, fully isolated from every other event | pending | — |
| 2 | **Secure play** | Guests authenticate and bet; no guest can read or alter another event's data, and no client can forge a settlement | pending | — |
| 3 | **Host console & templates** | A non-technical Host builds a 10-question event in under 20 minutes without help | pending | — |
| 4 | **Monetization** | A Host pays once via Stripe and their tier limits are enforced server-side | pending | — |
| 5 | **Customization** | Paid Hosts apply a theme, logo, and accent color that guests visibly see | pending | — |
| 6 | **Day-of hardening** | A 200-guest event survives its window with no incident and no data loss, and a simulated peak Saturday holds at the capacity targets | pending | — |
| 7 | **Launch surface** | Public marketing site live, indexable, converting to signup | pending | — |
| 8 | **Recap & referral** | Post-event recap page that guests want to share, carrying attribution back | pending | — |

Milestone 6 is not optional polish. Every other product gets a second chance with a user; this one does not.

## Technical Direction

*Included at the Host's request as a decision record. Deliberately at the level of "what shape and why" — file-level decomposition belongs in `/plan`.*

**Recommendation: port the front end to Next.js on Vercel; keep Supabase for Postgres and Auth.**

The framing of "evolve versus rebuild" is misleading here. The codebase is about 1,650 lines. The valuable parts — the odds engine, the bet-slip and bet-card interaction model, the Tailwind design system, the polling strategy — are framework-agnostic and port to Next.js as client components close to verbatim. This is a shell swap measured in days, not a rebuild measured in weeks. Three things make it worth doing:

1. **Server-side secrets and authorization.** Today `VITE_ADMIN_KEY` is compared in the browser and, because it's a `VITE_`-prefixed variable, it is **compiled into the public JavaScript bundle** — anyone can read it from the deployed site. Stripe webhooks, entitlement checks, and settlement authorization all need a trusted server. Serverless functions alongside a Vite build could technically cover this, but at that point the framework is fighting the requirement.
2. **Organic acquisition.** For a weddings-only direct-to-consumer product with a one-time purchase, search is a primary channel and paid acquisition has to pay back in a single transaction. A client-rendered SPA hands crawlers an empty page.
3. **Share mechanics.** Per-event link previews and recap-page share images are the referral loop, and they require server-rendered metadata.

**Two existing design decisions must be treated as hard blockers, not tech debt:**

- **Row Level Security is currently fully permissive.** `supabase/schema.sql` grants `for all using (true) with check (true)` on questions and unrestricted insert on bets. In a single-tenant wedding among friends that was a defensible trade-off, and the schema comments say so honestly. In a multi-tenant product holding guest emails and phone numbers, it means any user can read and modify any couple's event. Tenant isolation has to be enforced in the database.
- **The admin gate is client-side only.** A shared string compared in React grants the console. Settlement — which moves everyone's balance — must be authorized on the server against the event's real owner.

**Carried forward largely unchanged:** the American-odds math in `src/lib/odds.js`, the staged-bet/bet-slip model, the aggregated leaderboard computed in SQL rather than shipped to clients (a genuinely good call for a 200-phone event), and the visibility-aware throttled polling. Polling should stay for v1 — it degrades gracefully on bad venue wifi in a way that persistent sockets do not.

**Decided (was an open planning question):** the leaderboard does **not** stay a recomputed SQL view. See Capacity below.

## Capacity & Infrastructure

*Added after a scaling review of the existing schema and traffic shape. Figures are estimates derived from the code, not measurements — the load test in Milestone 6 replaces them with real numbers.*

**Platform decision: stay on Supabase and Vercel.** The stack covers five separate MVP requirements from one vendor — Postgres for an inherently relational leaderboard, Auth for all four guest sign-in methods, RLS for the tenant isolation that Milestone 1 depends on, Storage for premium logo uploads, and a CRUD layer nobody has to write. Alternatives trade one managed dependency for three, and would be paid for now, pre-revenue, against n = 1 demand validation.

Two specific findings support staying rather than merely defaulting:

- **Per-MAU auth pricing is structurally wrong for this product.** A guest signs in once, plays for four hours, and never returns — but still counts as a monthly active user. Auth vendors priced per MAU would plausibly cost an order of magnitude more than Supabase's included-MAU tiers, against one-time $29–59 revenue. *Verify current rate cards before committing.*
- **The exit is cheap.** Supabase is Postgres plus conveniences; `pg_dump` moves the data to any Postgres host. Lock-in sits in Auth and RLS policy definitions, not the data model — unlike Firebase or Convex, which would make this decision a one-way door.

### Scale ceiling

At 10,000 events/year — a large business for this category — roughly 400 weddings land on a peak Saturday. That is ~60,000 guests, but start times stagger across four US time zones, so true simultaneous peak is nearer **20,000 concurrent**. With the two fixes below, that is ~80 origin requests/second of reads and **under 30 inserts/second** of writes across every wedding in the country. This is a small managed Postgres instance, not a distributed system.

### Required before real traffic

1. **Cache the leaderboard at the edge.** The leaderboard is byte-identical for every guest in an event, yet is currently computed once per guest per poll. A per-event route with a ~5s TTL and `stale-while-revalidate` collapses ~250 req/s to ~10 req/s at origin. Highest value-to-effort change in the system.
2. **Maintain balances incrementally.** Replace the recomputed view with a `guest_balances` row updated on bet insert and on settlement. Reads become an index scan on `(event_id, balance desc)`. The current view re-joins every bet, hash-aggregates on `lower(guest_name)` (a functional expression no index serves), and calls a plpgsql function per settled row — all of it repeated on every request.
3. **Jitter the poll intervals.** Fixed `setInterval` from page load keeps guests who scanned the QR at the same announcement phase-locked into waves permanently; the `visibilitychange` handler fires them all simultaneously when a toast ends.
4. **Colocate regions.** Vercel functions and the Supabase project in the same region, pinned. A mismatch costs 50–100ms per roundtrip, multiplied by every sequential query.
5. **Use Supavisor in transaction mode** for any server-side database access. Serverless functions each opening a connection is the classic way to exhaust Postgres under exactly this burst pattern. The current PostgREST path pools for free; the migration is where that is lost by accident.

### Auth burst is now the peak load

Mandatory guest accounts convert a trivially cacheable read workload into an auth burst: ~150 guests signing up within the same 20 minutes, times every reception starting at 6pm — roughly **50 signups/second at peak**, against the most expensive operations in the stack.

**SMS is the operational landmine.** At peak volumes, phone OTP costs roughly $600–1,200 per Saturday in message fees — survivable at ~5% of revenue — but **US A2P 10DLC registration takes weeks and carriers rate-limit unregistered senders hard.** Discovering this in May means missing the season. Start registration well before it is needed, and bring your own SMS provider rather than relying on built-in defaults.

*Option not taken, recorded deliberately:* shipping Apple, Google, and email only would eliminate the SMS cost, the carrier lead time, and the most expensive slice of the auth burst in a single decision. Phone remains in scope because the Host specified it; this is the cheapest available launch de-risking lever if that changes.

### Cost shape

Polling is right for venue wifi and should stay, but it fights per-invocation billing: 20,000 guests polling twice a minute for four hours is ~10 million requests in an evening. Served from edge cache that is rounding-error bandwidth; served by a function per request, the bill scales with *guests* while revenue scales with *weddings* — the margin inverts precisely at the biggest events. Set a billing alert before the first real Saturday.

### Blast radius

A platform incident on a peak Saturday does not degrade 400 customers; it ruins 400 weddings simultaneously, with no retry. This warrants boring dependencies and an explicit **degraded read-only mode** where cached standings keep rendering when writes fail — designed under Milestone 6, not discovered during an incident.

## Open Questions

- [ ] **Does mandatory guest signup survive contact with a real reception?** Highest-risk assumption in the document. Validate with a live pilot before the marketing spend, and hold the kill criterion above.
- [ ] **Will couples share one login with their Deputy, or does that break trust?** Determines whether a second-seat role moves into MVP. Ask in interviews.
- [ ] **Are $29 / $59 the right prices?** No pricing research exists. Smoke-test before locking. Weddings are a low-price-sensitivity context, which argues for testing higher, not lower.
- [ ] **What is the product actually called?** "Wedding Bets" is a placeholder. Naming interacts with the gambling-perception risk — a name leaning on "bets" may be a payment-processor and app-store liability, and may be exactly the hook that sells. Needs a real decision.
- [ ] **What happens to guest data after the wedding?** Retention window, deletion policy, and whether guests can be marketed to. Has legal weight (GDPR/CCPA) and trust weight, and mandatory guest accounts make it unavoidable.
- [ ] **How does a Host recover from a mistake mid-event** — a wrong winner declared, a question deleted with live bets on it? Currently deleting a question destroys its bets. At a wedding this needs an undo, not a confirm dialog.
- [ ] **Does the game need an ending?** A final-standings moment, a winner announcement the DJ can read out. May be the difference between a fun app and a memorable one.
- [ ] **When does non-wedding expansion open, and on what signal?**

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Guest auth friction kills participation** — an empty leaderboard makes the product worthless regardless of how good the console is | High | Critical | SSO-first ordering, phone OTP, no passwords for guests, one-tap where the platform allows; pre-committed kill criterion at 65% signup completion; live pilot before launch |
| **Day-of failure is unrecoverable** — there is no second chance at a wedding, and a failure is a public one in front of 150 people | Medium | Critical | Milestone 6 as a gate, not a nice-to-have; load test at 200 concurrent guests; per-event health alerting during active windows; no paywall or limit can trigger mid-event |
| **Cross-event data leak via permissive RLS** — the current schema is wide open by design, and it now holds guest emails and phone numbers | High if unaddressed | Critical | Tenant isolation enforced in the database and treated as a release blocker; explicit isolation tests |
| **Perceived as gambling** — by payment processors, app stores, ad platforms, or a guest's relative | Medium | High | Play-money only, no cash-out, no entry fee for guests (the Host buys software, guests never buy chips); prominent framing; get a legal read before launch, and note that a paid entry plus a prize is the line that must never be crossed |
| **One-time purchase forces every acquisition to pay back in one transaction** — no recurring revenue to amortize CAC, and this is the Host's chosen model | High | High | Organic-first acquisition; recap-page referral loop; measure payback per channel before any paid spend |
| **Hard seasonality** — the wedding calendar clusters, so a bad season costs a year | High | Medium | Build and validate off-season; treat the first season as the real test; keep fixed costs near zero (current stack is $0 at this scale) |
| **Setup abandonment** — a Host facing an empty question box at 11pm closes the tab | Medium | High | Template library as an MVP requirement, not a v2 feature; measured via host setup completion |
| **n = 1 demand evidence** — the only validated customer is the founder | High | High | Every assumption in Evidence flagged; interviews and a priced smoke test before full build |
| **Support load at emotional peak** — a Host with a problem on their wedding day is the most urgent support ticket that will ever exist | Medium | Medium | Pre-event checklist and a rehearsal mode; staffed support windows on Saturdays in season |
| **SMS carrier registration blocks launch** — US A2P 10DLC approval takes weeks, and unregistered senders are rate-limited into uselessness | Medium | High | Start registration months ahead of the season; bring your own SMS provider; keep Apple/Google/email as a working fallback so phone is never the only path in |
| **Per-invocation billing scales with guests, not weddings** — the polling design multiplies cost by attendance while revenue is fixed per event | Medium | High | Edge-cache the leaderboard as a release requirement; billing alerts before the first peak Saturday; watch cost-per-event as a tracked metric |
| **Correlated failure across simultaneous weddings** — one platform incident on a peak Saturday ruins hundreds of events at once, each unrecoverable | Low | Critical | Degraded read-only mode serving cached standings; boring dependencies only; no exotic infrastructure in the request path |

---

## Validation status

| | |
|---|---|
| Problem | **Partially validated** — real, first-party, n = 1 |
| Users | **Concrete** — Host / Deputy / Guest with triggers |
| Metrics | **Defined**, with a pre-committed kill criterion |
| Pricing | **Assumption** — needs smoke test |
| Demand | **Assumption** — needs 15 interviews |

*Next step: `/plan .claude/prds/wedding-bets-saas.prd.md` — begins with Milestone 1 (Tenancy & host accounts).*
