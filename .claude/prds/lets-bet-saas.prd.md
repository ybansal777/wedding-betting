# Let's Bet — Self-Serve Prediction Game for Group Events

*Status: DRAFT — requirements only. Implementation planning pending via `/plan`.*
*Owner: Yash · Created 2026-08-12 · Revised 2026-08-21 (generalized from a
weddings-only product to any group event) · Source: generalization of the
single-tenant app in this repo*

---

## Problem

A wedding reception, a bachelor/ette party, a milestone birthday, a family
reunion — all of them have the same structural dead time: cocktail hour, the
drive between activities, the lull before the cake or the toasts, where a group
of people who don't all know each other sit around with their phones out. Hosts
want a shared activity that makes the group interact, but the available options
are quizzes and photo walls, and neither creates the thing that actually works:
a running, competitive, public stake in what happens next.

One couple solved this for their own wedding by having a software engineer in
the family build a custom sportsbook for the reception. That is not a
repeatable solution, and it is not specific to weddings — the same dead time,
and the same fix, shows up at a bachelor party, a 30th birthday, or a family
reunion. The cost of leaving this unsolved is that every other host either buys
a generic trivia app that doesn't fit the moment, or does nothing.

## Evidence

- **Direct, first-party:** this app was built and run live at a real wedding
  (see repo history and `README.md`). The couple specified it, used it, and it
  worked — including a live leaderboard, an admin console for settling
  questions, and QR distribution. This is the strongest evidence available and
  it is real, but n = 1, and it is evidence for the *mechanic* (odds, a bet
  slip, live settlement), not for demand at other event types.
- **Observed product shape:** the built version converged on sportsbook
  mechanics rather than quiz mechanics — American odds, a bet slip, a
  bankroll, staged-then-confirmed wagers, instant payout on settlement. That
  the builder independently landed on betting-UI conventions suggests the
  metaphor is doing real work, not decoration, and nothing about it is
  wedding-specific.
- **Assumption — needs validation via customer interviews (target: 15 hosts
  spread across at least three event types, 2–10 weeks pre-event):** that hosts
  of bachelor/ette parties, birthdays, and reunions want this, will pay for it,
  and will trust a third-party app with a moment of their event, the same way
  the founding couple did for their wedding.
- **Assumption — needs validation via analytics on the first 20 live events
  across event types:** that guest participation clears the bar where the game
  feels alive rather than empty, and that this bar doesn't vary meaningfully by
  event type (a reunion skews older than a bachelor party, for instance).
- **Assumption — needs validation via analytics once both bet types have
  live volume:** that the `line` (Over/Under) bet type is used at all, and
  whether it drives activation up (a lower-friction "guess a number" ask) or
  down (a mechanic guests don't immediately understand) relative to `guess`.
- **Assumption — needs validation via landing-page smoke test before build
  completes:** willingness to pay at the $29 / $59 price points, across event
  types, not just weddings.

> No competitive teardown, keyword volume data, or pricing research exists yet.
> Anything below stated as a market fact is flagged. Treat the whole demand
> side as unvalidated outside the one wedding pilot until the interviews and
> the smoke test run.

## Users

**Primary — the Host.** Whoever is organizing the event and willing to spend
20–40 minutes setting up software for it: one member of an engaged couple, the
person planning a bachelor/ette party, whoever's throwing the birthday, the
relative organizing the reunion. Typically not technical. The trigger moment is
1–8 weeks before the event, while planning logistics and searching some variant
of *"fun things for guests at a [event type]."* They will spend 20–40 minutes
setting this up, once, probably at night, on a laptop. They will not read
documentation.

**Secondary — the Deputy.** The maid of honor, best man, designated planner, or
just a trusted friend the Host hands operational control to on the day. The
Host is busy running the actual event and cannot be settling questions
between toasts, shots, or the cake cutting. This person needs to run the
console from a phone, in low light, possibly after a drink, without training.
*In v1 this is served by sharing host credentials; a real second-seat role is
out of scope (see Scope).*

**Tertiary — the Guest.** Scans a QR at a table. Gives the product 30 seconds
of patience before deciding it isn't worth it. Is the entire reason the product
has value, and has zero investment in it succeeding.

**Not for:** anyone wagering real money; corporate or sports-league betting
pools; venues or planners running events at scale under one account.

## Hypothesis

We believe **a self-serve product that lets a non-technical host build and run
their own live prediction game, for any group event, with either fixed-odds
multiple choice or an Over/Under line** will **convert dead time into a shared
competitive event** for **hosts and their guests, across weddings, bachelor/ette
parties, birthdays, and family reunions.**

We'll know we're right when **at least 45% of guests who scan the QR place at
least one bet, at least 70% of created events reach the day with a settled
question, and at least 12% of hosts who create a free event upgrade to a paid
tier — and none of those numbers is meaningfully worse for non-wedding event
types than for weddings.**

## Success Metrics

| Metric | Target | How measured |
|---|---|---|
| **Paid events completed** *(north star)* | 40 in the first two full quarters | Stripe payments joined to events with ≥1 settled question |
| **Guest activation** | ≥45% of QR scans place ≥1 bet | Scan-to-first-bet funnel, per event |
| **Guest signup completion** | ≥80% of guests who begin auth finish it | Auth funnel drop-off by method (Google / phone / email) |
| **Free→paid conversion** | ≥12% of hosts with a created event | Stripe checkout completions ÷ events created |
| **Event completion rate** | ≥70% of created events settle ≥1 question | Events with `settled_at` on any question |
| **Host setup completion** | ≥60% of signups publish ≥3 questions | Funnel from account creation to published event |
| **Bet-type mix** | Tracked, no target yet | Share of settled questions that are `line` vs `guess`, per event type |
| **Day-of incident rate** | Zero events with an outage during their window | Uptime + error monitoring, alerted per active event |

**Kill criterion on guest accounts:** if guest signup completion lands below
**65%**, or guest activation below **30%**, the mandatory-account decision is
wrong and the product ships a name-only or device-token guest mode. This is
pre-committed so the call gets made on data, not on defending the original
spec.

**Kill criterion on non-wedding expansion:** if guest activation or host setup
completion for any non-wedding event type lands more than 15 points below the
wedding baseline after 20 live events of that type, that event type's
templates and positioning need rework before further marketing spend against
it — the mechanic may not transfer as cleanly as the Evidence section assumes.

## Scope

### MVP — the minimum that tests the hypothesis

1. **Host accounts.** Email + password, plus Google and phone SSO. Password
   reset. One host, one or more events.
2. **Event creation.** Event name, an event type (`wedding`,
   `bachelor_bachelorette`, `birthday`, `family_reunion`, or `other`), an
   optional subtitle, an event date, and a starting bankroll for guests. The
   event type selects which question template library the Host sees; it has no
   other effect on behavior.
3. **Question builder.** Create, edit, reorder, and delete questions, each
   either:
   - **`guess`** — 2–6 options with host-set American odds, or
   - **`line`** — a single host-set numeric baseline with Over/Under odds,
     settled by the Host later reporting the real number (a tie refunds every
     bet on that question in full).
   Seeded from an **event-type-specific question template library** so a Host
   is never staring at an empty box — this is the single highest-leverage setup
   feature, and it now has to earn its keep across five event types instead of
   one.
4. **Guest accounts.** Sign up and sign in with Google, phone OTP, or email.
   Optimized ruthlessly for time-to-first-bet: SSO buttons first, phone OTP
   second, email last. A guest belongs to one event at a time.
5. **Live play.** Bankroll, bet slip with multiple staged bets, confirm-to-place,
   one bet per guest per question, bets final once placed.
6. **Live leaderboard.** Per event, updating during play.
7. **Settlement.** Host or Deputy declares a winning option (`guess`) or enters
   the actual value (`line`); payouts apply instantly and the leaderboard
   reflects them.
8. **Distribution.** Auto-generated QR code and short share link per event,
   printable at table-card size.
9. **Tenant isolation.** Every question, bet, guest, and leaderboard row is
   scoped to one event, enforced at the database layer — not in the client.
   **This is a correctness and privacy requirement, not an optimization.**
10. **Monetization.** Stripe Checkout, one-time payment per event, three tiers,
    with entitlements enforced server-side.
11. **Theming.** Tier-gated: a small set of preset themes, plus logo upload and
    accent color on the top tier. Themes are cosmetic and independent of event
    type — a birthday host can use the "midnight" theme just as easily as a
    wedding host.
12. **Marketing site.** Public pages that can rank and convert: what it is, how
    it works (for any event type), pricing, an example event, FAQ covering "is
    this gambling" and "do my guests need an app."

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

Tier limits are identical across event types and bet types — a `line` question
counts against the same question cap as a `guess` question. The Free tier
exists to let a Host build the whole thing and feel it work before paying.
**The paywall must sit at share/publish time, never mid-event** — an event that
hits a limit while it's happening is a refund, a support ticket, and a bad
review, all on the worst possible day.

### Out of scope

- **Real money, cash prizes, or cash-out of any kind** — permanently, not just
  for v1. See Risks; this is a positioning and legal boundary, not a backlog
  item.
- **Native iOS/Android apps** — the entire distribution model is a QR to a
  mobile web page. An app store install at someone's event is a non-starter.
- **Subscriptions and multi-event accounts for planners** — deferred;
  contradicts the one-time-purchase decision and serves professional planners
  running many events, who are explicitly not the v1 user even though the
  product itself now supports multiple event types.
- **Separate Deputy role with its own login** — v1 ships credential sharing.
  Real second-seat permissions land only if interviews say hosts won't share a
  password.
- **Pari-mutuel or dynamic odds, and any bet type beyond `guess` and `line`** —
  host-set fixed odds only, on exactly two bet-type shapes. Parlays,
  combination bets, live in-play odds movement, and pool-the-stakes payouts
  are meaningfully harder product and math problems.
- **Guest chat, photo sharing, or a social feed** — different product, and a
  moderation liability at someone's event.
- **Custom domains, white-label, RSVP or seating-chart integrations** —
  post-launch at the earliest.
- **Event-type-specific theming or branding** (e.g. a "bachelor party" visual
  skin distinct from a "wedding" one) — the current theme system is
  event-type-agnostic by design; revisit only if template usage data shows
  hosts of a given event type consistently reject the available themes.

## Delivery Milestones

Business outcomes, not engineering tasks. `/plan` turns each into an
implementation plan.

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | **Tenancy & host accounts** | A stranger can sign up and create their own event, fully isolated from every other event | done | — |
| 2 | **Secure play** | Guests authenticate and bet; no guest can read or alter another event's data, and no client can forge a settlement | done | — |
| 3 | **Host console, templates & bet types** | A non-technical Host builds a 10-question event — mixing multiple-choice and Over/Under questions, in whichever event-type template set fits — in under 20 minutes without help | done | — |
| 4 | **Monetization** | A Host pays once via Stripe and their tier limits are enforced server-side | done | — |
| 5 | **Customization** | Paid Hosts apply a theme, logo, and accent color that guests visibly see | done | — |
| 6 | **Day-of hardening** | A 200-guest event survives its window with no incident and no data loss, and a simulated peak load holds at the capacity targets | pending | — |
| 7 | **Launch surface** | Public marketing site live, indexable, converting to signup, speaking to all five event types | pending | — |
| 8 | **Recap & referral** | Post-event recap page that guests want to share, carrying attribution back | done | — |
| 9 | **Multi-event generalization** | An event can be any of the five supported types, and a question can be `guess` or `line`, with no event-type- or bet-type-specific code path outside the template library and the settlement UI | done | — |

Milestone 6 is not optional polish. Every other product gets a second chance
with a user; a live event does not.

## Technical Direction

*Included at the Host's request as a decision record. Deliberately at the
level of "what shape and why" — file-level decomposition belongs in `/plan`.*

**Recommendation: Next.js on Vercel, Supabase for Postgres and Auth. Already
built; this section is the record of why, kept for the next major decision.**

The framing of "evolve versus rebuild" was misleading for the original
weddings-only port, and stays misleading for this generalization. Multi-event
and the second bet type were both additive: new `event_type`, `bet_type`,
`line_value`, and `actual_value` columns, one extended settlement function, and
a template library keyed by event type. Nothing about tenancy, money movement,
or the leaderboard changed shape. Three things justified the original Next.js
port and still hold:

1. **Server-side secrets and authorization.** Stripe webhooks, entitlement
   checks, and settlement authorization all need a trusted server — including
   the `line` bet type's settlement, which computes the winner (or a push)
   from a host-reported number rather than trusting a client-passed pick, for
   exactly the reason the original admin gate had to move server-side.
2. **Organic acquisition.** For a direct-to-consumer product with a one-time
   purchase, search is a primary channel and paid acquisition has to pay back
   in a single transaction — more true, not less, now that the addressable
   search terms span five event types instead of one. A client-rendered SPA
   hands crawlers an empty page.
3. **Share mechanics.** Per-event link previews and recap-page share images are
   the referral loop, and they require server-rendered metadata.

**Two design decisions from the original single-tenant app were treated as
hard blockers, and both are still fixed:**

- **Row Level Security is enforced in the database**, not the client — every
  table hangs off an event, and RLS decides who sees it. This mattered before
  multi-event and matters identically after: nothing about generalizing the
  event model touches the isolation boundary.
- **The admin gate is server-side.** Settlement — which moves everyone's
  balance, for either bet type — is authorized on the server against the
  event's real owner.

**Carried forward unchanged since the Next.js port:** the American-odds math
(`lib/odds.js`), the staged-bet/bet-slip model, the aggregated leaderboard
maintained incrementally rather than recomputed, and the visibility-aware
throttled polling. The `line` bet type deliberately reuses this math and the
same `options` jsonb shape rather than introducing a parallel code path — see
`README.md`'s "Event types & bet types" section for how.

## Capacity & Infrastructure

*Original figures were derived from a single event type's traffic shape
(synchronized reception start times, mostly-evening weddings clustering on
Saturdays) and have not been re-derived for the broader mix. Treat the numbers
below as directional, not current, until Milestone 6's load test runs against
real multi-event-type traffic.*

**Platform decision: stay on Supabase and Vercel.** Unchanged by
generalization — the stack covers Postgres for a relational leaderboard, Auth
for guest sign-in, RLS for tenant isolation, Storage for logo uploads, and a
CRUD layer nobody has to write, regardless of what event type or bet type is
running on top of it.

### Scale ceiling — needs re-derivation

The original estimate (~400 weddings on a peak Saturday, ~20,000 concurrent
guests after time-zone staggering) assumed a single event type with a strongly
synchronized peak. Bachelor/ette parties, birthdays, and reunions do not share
weddings' Saturday-evening concentration — birthdays and reunions skew toward
weekend afternoons and summer, bachelor/ette parties skew Friday/Saturday
night year-round. **This likely smooths the peak-to-average ratio rather than
worsening it**, but that is a hypothesis, not a measurement — re-derive the
scale ceiling once real multi-event-type traffic exists, rather than assuming
the wedding-only estimate still holds.

### Required before real traffic

Unchanged in substance from the wedding-only version — none of these five
items are event-type- or bet-type-specific:

1. **Cache the leaderboard at the edge.** Byte-identical for every guest in an
   event regardless of what event type it is.
2. **Maintain balances incrementally.** Already the case — `event_guests.balance`
   is updated on bet insert and on settlement (including `line` pushes, which
   net to zero).
3. **Jitter the poll intervals.**
4. **Colocate regions.**
5. **Use Supavisor in transaction mode** for server-side database access.

### Auth burst is peak load, regardless of event type

Mandatory guest accounts convert a trivially cacheable read workload into an
auth burst, at whatever event is running: ~150 guests signing up within the
same 20 minutes. The SMS cost and A2P 10DLC registration lead time discussed
below apply identically whether that burst comes from a wedding, a birthday,
or a reunion — **the fix is not event-type-specific.**

**SMS is the operational landmine.** At peak volumes, phone OTP costs roughly
$600–1,200 per busy evening in message fees — survivable at ~5% of revenue —
but **US A2P 10DLC registration takes weeks and carriers rate-limit
unregistered senders hard.** Start registration well before it is needed, and
bring your own SMS provider rather than relying on built-in defaults.

### Cost shape

Polling is right for venue wifi and should stay, but it fights per-invocation
billing. Served from edge cache that is rounding-error bandwidth; served by a
function per request, the bill scales with *guests* while revenue scales with
*events* — the margin inverts precisely at the biggest events, of any type.
Set a billing alert before the first real high-traffic period.

### Blast radius

A platform incident during a peak window does not degrade N customers; it
ruins N events simultaneously, with no retry, whatever those events are. This
warrants boring dependencies and an explicit **degraded read-only mode** where
cached standings keep rendering when writes fail — designed under Milestone 6,
not discovered during an incident.

## Open Questions

- [ ] **Does the mechanic that worked for one wedding actually transfer to
      other event types?** The founding evidence is a single wedding. Validate
      with a live pilot per event type before marketing spend against that
      type, and hold the non-wedding kill criterion above.
- [ ] **Does mandatory guest signup survive contact with a real event, of any
      type?** Highest-risk assumption in the document, unchanged by
      generalization.
- [ ] **Will hosts share one login with their Deputy, or does that break
      trust?** Determines whether a second-seat role moves into MVP. Ask in
      interviews, across event types.
- [ ] **Are $29 / $59 the right prices, for every event type?** No pricing
      research exists. A wedding may be a low-price-sensitivity context in a
      way a birthday isn't — smoke-test per event type before assuming one
      price fits all.
- [ ] **Does the `line` bet type actually get used, and does it help or hurt
      activation?** No usage data exists yet — it's a new mechanic as of this
      revision. Watch the bet-type-mix metric above once live.
- [ ] **What happens to guest data after the event?** Retention window,
      deletion policy, and whether guests can be marketed to. Has legal weight
      (GDPR/CCPA) and trust weight, and mandatory guest accounts make it
      unavoidable, regardless of event type.
- [ ] **How does a Host recover from a mistake mid-event** — a wrong winner
      declared, a question deleted with live bets on it? Currently deleting a
      question destroys its bets. Settlement itself is already reversible
      (re-settling or clearing reverses the prior payout) for both bet types;
      deletion is not.
- [ ] **Does the game need an ending?** A final-standings moment, a winner
      announcement someone can read out loud. May be the difference between a
      fun app and a memorable one, at any event type.
- [ ] **Should event-type selection do more than pick a template set** — e.g.
      influence default theme, default starting bankroll, or marketing copy
      shown mid-setup? Currently it does nothing but select templates,
      deliberately, until there's data suggesting more is warranted.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Guest auth friction kills participation** — an empty leaderboard makes the product worthless regardless of how good the console is | High | Critical | SSO-first ordering, phone OTP, no passwords for guests, one-tap where the platform allows; pre-committed kill criterion at 65% signup completion; live pilot before launch, per event type |
| **Day-of failure is unrecoverable** — there is no second chance at most of these events, and a failure is a public one in front of everyone attending | Medium | Critical | Milestone 6 as a gate, not a nice-to-have; load test at 200 concurrent guests; per-event health alerting during active windows; no paywall or limit can trigger mid-event |
| **Cross-event data leak via permissive RLS** | Low (mitigated) | Critical | Tenant isolation enforced in the database and treated as a release blocker; explicit isolation tests already exist |
| **Perceived as gambling** — by payment processors, app stores, ad platforms, or a guest's relative | Medium | High | Play-money only, no cash-out, no entry fee for guests (the Host buys software, guests never buy chips); prominent framing; get a legal read before launch, and note that a paid entry plus a prize is the line that must never be crossed — for both bet types |
| **One-time purchase forces every acquisition to pay back in one transaction** — no recurring revenue to amortize CAC, and this is the Host's chosen model | High | High | Organic-first acquisition; recap-page referral loop; measure payback per channel, and per event type, before any paid spend |
| **Seasonality, though likely reduced by generalization** — the wedding calendar clusters hard; birthdays, bachelor/ette parties, and reunions plausibly spread more evenly across the year, but this is a hypothesis, not a measurement | Medium (was High) | Medium | Track paid-events-completed by event type and by month once live; treat the diversification benefit as unproven until a full year of mixed data exists |
| **Non-wedding expansion doesn't transfer** — the entire evidence base is one wedding, and the mechanic, templates, and positioning were tuned for it | High | High | Non-wedding kill criterion above; interviews and template usage data per event type before further investment in any one type |
| **`line` bet type confuses guests** — Over/Under is a familiar mechanic to sports bettors and may not be to a wedding or birthday guest with zero betting context | Medium | Medium | Watch bet-type-mix and per-question activation rate for `line` vs `guess`; the UI shows the line value and both odds up front, and a push refunds in full — but this is design intent, not measured comprehension |
| **Setup abandonment** — a Host facing an empty question box closes the tab | Medium | High | Template library as an MVP requirement, not a v2 feature, now spanning five event types; measured via host setup completion, per event type |
| **n = 1 demand evidence** — the only validated customer is the founder, and only for one event type | High | High | Every assumption in Evidence flagged; interviews and a priced smoke test across event types before full build-out of any one |
| **Support load at emotional peak** — a Host with a problem during their event is the most urgent support ticket that will ever exist | Medium | Medium | Pre-event checklist and a rehearsal mode; staffed support windows during known high-traffic periods |
| **SMS carrier registration blocks launch** — US A2P 10DLC approval takes weeks, and unregistered senders are rate-limited into uselessness | Medium | High | Start registration months ahead; bring your own SMS provider; keep Google/email as a working fallback so phone is never the only path in |
| **Per-invocation billing scales with guests, not events** — the polling design multiplies cost by attendance while revenue is fixed per event | Medium | High | Edge-cache the leaderboard as a release requirement; billing alerts before the first high-traffic period; watch cost-per-event as a tracked metric |
| **Correlated failure across simultaneous events** — one platform incident during a peak window ruins many events at once, each unrecoverable | Low | Critical | Degraded read-only mode serving cached standings; boring dependencies only; no exotic infrastructure in the request path |

---

## Validation status

| | |
|---|---|
| Problem | **Partially validated** — real, first-party, n = 1, and only for one event type |
| Users | **Concrete for weddings, assumed for other event types** — Host / Deputy / Guest with triggers |
| Metrics | **Defined**, with pre-committed kill criteria for guest accounts and non-wedding expansion |
| Bet types | **`guess` validated (the original wedding pilot); `line` unvalidated** — no live usage data yet |
| Pricing | **Assumption** — needs smoke test, per event type |
| Demand | **Assumption outside weddings** — needs interviews across at least three event types |

*Next step: `/plan .claude/prds/lets-bet-saas.prd.md` — the tenancy, secure
play, host console, monetization, customization, and recap milestones are
already built; remaining work is Milestone 6 (day-of hardening) and Milestone 7
(launch surface speaking to all five event types).*
