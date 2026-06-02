import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isConfigured } from "./lib/supabase";
import { balanceFor } from "./lib/odds";
import FloralCorners from "./components/FloralCorners";
import Header from "./components/Header";
import BalanceCard from "./components/BalanceCard";
import BetCard from "./components/BetCard";
import Leaderboard from "./components/Leaderboard";
import BetSlip from "./components/BetSlip";
import AdminPanel from "./components/AdminPanel";
import { useToast } from "./components/Toast";

const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "wedding-admin-2026";
const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const optionId = () =>
  globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);

// Normalize an option draft list before saving: trim, default odds, keep ids
// stable, and drop options with no label.
const cleanOptions = (opts = []) =>
  opts
    .map((o) => ({
      id: o.id || optionId(),
      label: (o.label || "").trim(),
      odds: (o.odds || "").trim() || "+100",
    }))
    .filter((o) => o.label);

export default function App() {
  const notify = useToast();

  // Name is intentionally NOT persisted — each page load starts "logged out".
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]); // aggregated, from the DB view
  const [myBets, setMyBets] = useState([]); // only THIS guest's confirmed bets
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  // Staged (not-yet-placed) bets, keyed by question id:
  // { [questionId]: { optionId, wager, odds, label } }
  const [staged, setStaged] = useState({});

  const trimmed = name.trim().toLowerCase();
  const nameReady = trimmed.length > 0;

  // ---- data loading (polling, no persistent websockets) ------------------
  // Each resource is fetched through guarded() so polls never stack (skip while
  // a request is in flight) and rapid triggers coalesce (throttle window). This
  // is the polling-world version of "don't refetch the world on every event".
  const inFlight = useRef({});
  const lastFetch = useRef({});

  const guarded = useCallback(async (key, throttleMs, force, fn) => {
    if (!supabase || inFlight.current[key]) return;
    const now = Date.now();
    if (!force && now - (lastFetch.current[key] || 0) < throttleMs) return;
    inFlight.current[key] = true;
    try {
      await fn();
      lastFetch.current[key] = Date.now();
    } finally {
      inFlight.current[key] = false;
    }
  }, []);

  // Questions change rarely (admin adds/settles) → polled slowly.
  const fetchQuestions = useCallback(
    (force = false) =>
      guarded("questions", 10000, force, async () => {
        const { data } = await supabase
          .from("questions")
          .select("*")
          .order("sort")
          .order("created_at");
        if (data) setQuestions(data);
        setLoading(false);
      }),
    [guarded]
  );

  // The small aggregated leaderboard (one row per player) → polled a bit faster.
  const fetchLeaderboard = useCallback(
    (force = false) =>
      guarded("leaderboard", 8000, force, async () => {
        const { data } = await supabase.from("leaderboard").select("*");
        if (data) setLeaderboard(data);
      }),
    [guarded]
  );

  // Just the current guest's own confirmed bets (tiny — at most one per question).
  const loadMine = useCallback(
    () =>
      guarded("mine", 0, true, async () => {
        const who = name.trim();
        if (!who) {
          setMyBets([]);
          return;
        }
        const { data } = await supabase
          .from("bets")
          .select("*")
          .ilike("guest_name", who);
        setMyBets(data || []);
      }),
    [guarded, name]
  );

  // Initial load + gentle, split-cadence polling. Everything pauses while the
  // tab is hidden (most phones at a wedding are backgrounded) and refreshes
  // when it returns — the throttle stops that from double-firing with the timer.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchQuestions(true);
    fetchLeaderboard(true);
    const lbId = setInterval(() => {
      if (document.visibilityState === "visible") fetchLeaderboard();
    }, 30000);
    const qId = setInterval(() => {
      if (document.visibilityState === "visible") fetchQuestions();
    }, 60000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      fetchLeaderboard();
      fetchQuestions();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(lbId);
      clearInterval(qId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchQuestions, fetchLeaderboard]);

  // Refetch the guest's own bets whenever they log in / change name.
  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const onChangeName = (v) => {
    setName(v);
    setStaged({}); // switching identity clears the in-progress slip
  };

  // ---- derived state ------------------------------------------------------
  const winnerById = useMemo(() => {
    const m = {};
    for (const q of questions) m[q.id] = q.winner;
    return m;
  }, [questions]);

  const enrich = useCallback(
    (b) => ({ ...b, winner: winnerById[b.question_id] ?? null }),
    [winnerById]
  );

  // Balance from CONFIRMED bets (what's actually in the DB).
  const confirmedBalance = useMemo(
    () => balanceFor(myBets.map(enrich)),
    [myBets, enrich]
  );
  const pendingCount = myBets.filter((b) => !winnerById[b.question_id]).length;
  const myBetByQ = useMemo(() => {
    const m = {};
    for (const b of myBets) m[b.question_id] = b;
    return m;
  }, [myBets]);

  // Staged-bet math. Available balance falls live as the slip grows.
  const stagedTotal = useMemo(
    () => Object.values(staged).reduce((s, v) => s + (v.wager || 0), 0),
    [staged]
  );
  const availableBalance = confirmedBalance - stagedTotal;
  // The most a given question may stake = balance minus everything staged
  // elsewhere (so it can reclaim its own staked amount when adjusting).
  const maxWagerFor = (qid) =>
    Math.max(0, confirmedBalance - (stagedTotal - (staged[qid]?.wager || 0)));

  const slipItems = useMemo(
    () =>
      Object.entries(staged).map(([questionId, s]) => ({
        questionId,
        prompt: questions.find((q) => q.id === questionId)?.prompt || "",
        label: s.label,
        odds: s.odds,
        wager: s.wager,
      })),
    [staged, questions]
  );

  // ---- staging (local, not yet persisted) --------------------------------
  const clampWager = (qid, w) =>
    Math.max(1, Math.min(Math.floor(w) || 1, maxWagerFor(qid)));

  const stageBet = (questionId, optionId, odds, label) => {
    setStaged((prev) => {
      const existing = prev[questionId];
      // Keep the prior wager when just switching option; otherwise default to 10.
      const desired = existing?.wager ?? Math.min(10, maxWagerFor(questionId));
      const wager = clampWager(questionId, desired);
      return { ...prev, [questionId]: { optionId, odds, label, wager } };
    });
  };

  const setStageWager = (questionId, w) =>
    setStaged((prev) =>
      prev[questionId]
        ? { ...prev, [questionId]: { ...prev[questionId], wager: clampWager(questionId, w) } }
        : prev
    );

  const unstageBet = (questionId) =>
    setStaged((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });

  // ---- mutations ----------------------------------------------------------
  // Persist every staged bet (the "Place Bets" action). Happy path is a single
  // batch insert; if that hits a duplicate (e.g. the guest already bet on one
  // of these from another device), fall back to per-row inserts so one conflict
  // doesn't sink the whole slip.
  const placeBets = async () => {
    const entries = Object.entries(staged);
    if (entries.length === 0) return false;
    const rowFor = ([questionId, s]) => ({
      guest_name: name.trim(),
      question_id: questionId,
      pick: s.optionId,
      pick_label: s.label,
      wager: s.wager,
      odds_at_bet: s.odds,
    });

    const { error } = await supabase.from("bets").insert(entries.map(rowFor));

    if (!error) {
      setStaged({});
      await Promise.all([loadMine(), fetchLeaderboard(true)]);
      notify("Bets placed — good luck!", { tone: "success" });
      return true;
    }
    if (error.code !== "23505") {
      notify(`Couldn't place your bets: ${error.message}`, { tone: "error" });
      return false;
    }

    // Duplicate in the batch (batch is atomic, so nothing was inserted). Retry
    // each row on its own; new ones land, already-placed ones report 23505.
    const results = await Promise.all(
      entries.map(async (e) => {
        const { error: err } = await supabase.from("bets").insert(rowFor(e));
        return { questionId: e[0], err };
      })
    );
    const failed = results.filter((r) => r.err && r.err.code !== "23505");
    const placed = results.filter((r) => !r.err).length;
    const dupes = results.filter((r) => r.err && r.err.code === "23505").length;

    // Keep only rows that hit a real (non-duplicate) error so they can retry.
    setStaged((prev) => {
      const next = {};
      for (const r of failed) if (prev[r.questionId]) next[r.questionId] = prev[r.questionId];
      return next;
    });
    await Promise.all([loadMine(), fetchLeaderboard(true)]);

    if (failed.length) {
      notify(`Placed ${placed}. Couldn't place ${failed.length} — try again.`, {
        tone: "error",
      });
      return false;
    }
    if (placed > 0) {
      notify(
        `Placed ${placed} bet${placed === 1 ? "" : "s"}${
          dupes ? ` · ${dupes} already on the board` : ""
        }.`,
        { tone: "success" }
      );
    } else {
      notify("Those bets were already on the board.", { tone: "info" });
    }
    return true;
  };

  const addQuestion = async (form) => {
    const options = cleanOptions(form.options);
    if (!form.prompt.trim() || options.length < 2) {
      notify("Add a question and at least two options.", { tone: "error" });
      return false;
    }
    const { error } = await supabase.from("questions").insert({
      prompt: form.prompt.trim(),
      options,
      sort: questions.length,
    });
    if (error) {
      notify(`Couldn't add the question: ${error.message}`, { tone: "error" });
      return false;
    }
    await Promise.all([fetchQuestions(true), fetchLeaderboard(true)]);
    return true;
  };

  const setWinner = async (questionId, opt) => {
    const { error } = await supabase
      .from("questions")
      .update({ winner: opt })
      .eq("id", questionId);
    if (error)
      notify(`Couldn't set the winner: ${error.message}`, { tone: "error" });
    else await Promise.all([fetchQuestions(true), fetchLeaderboard(true)]);
  };

  const updateQuestion = async (questionId, fields) => {
    const options = cleanOptions(fields.options);
    if (!fields.prompt.trim() || options.length < 2) {
      notify("Add a question and at least two options.", { tone: "error" });
      return false;
    }
    const { error } = await supabase
      .from("questions")
      .update({ prompt: fields.prompt.trim(), options })
      .eq("id", questionId);
    if (error) {
      notify(`Couldn't save the question: ${error.message}`, { tone: "error" });
      return false;
    }
    await Promise.all([fetchQuestions(true), fetchLeaderboard(true)]);
    return true;
  };

  const deleteQuestion = async (questionId) => {
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", questionId);
    if (error) {
      notify(`Couldn't delete the question: ${error.message}`, { tone: "error" });
      return false;
    }
    await Promise.all([fetchQuestions(true), fetchLeaderboard(true)]);
    return true;
  };

  const tryAdmin = () => {
    if (adminInput === ADMIN_KEY) {
      setAdminView(true);
      setAdminInput("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      notify("That code isn't right.", { tone: "error" });
    }
  };

  // ---- not configured -----------------------------------------------------
  if (!isConfigured) {
    return (
      <Shell>
        <Header />
        <section className="card p-6 text-center animate-slide-up">
          <h2 className="font-serif text-2xl text-mauve-deep">Almost there!</h2>
          <p className="mt-2 text-sm text-mauve/90 leading-relaxed">
            Connect a free Supabase database to go live. Add
            <code className="mx-1 rounded bg-cream-deep px-1">VITE_SUPABASE_URL</code>
            and
            <code className="mx-1 rounded bg-cream-deep px-1">
              VITE_SUPABASE_ANON_KEY
            </code>
            to your <code className="rounded bg-cream-deep px-1">.env</code> file.
            See the README for the 3-minute setup.
          </p>
        </section>
        <Footer />
      </Shell>
    );
  }

  // ---- admin --------------------------------------------------------------
  if (adminView) {
    return (
      <Shell>
        <AdminPanel
          questions={questions}
          leaderboard={leaderboard}
          onAddQuestion={addQuestion}
          onSetWinner={setWinner}
          onUpdateQuestion={updateQuestion}
          onDeleteQuestion={deleteQuestion}
          onExit={() => setAdminView(false)}
          siteUrl={SITE_URL}
        />
        <Footer />
      </Shell>
    );
  }

  // ---- guest --------------------------------------------------------------
  const openCount = questions.filter((q) => !q.winner && !myBetByQ[q.id]).length;

  return (
    <Shell>
      <Header />

      <BalanceCard
        name={name}
        onChangeName={onChangeName}
        balance={availableBalance}
        nameLocked={myBets.length > 0}
        pendingCount={pendingCount}
      />

      {/* Questions */}
      {loading ? (
        <p className="py-8 text-center text-mauve/70">Shuffling the deck…</p>
      ) : questions.length === 0 ? (
        <section className="card p-6 text-center">
          <p className="font-serif text-xl text-mauve-deep">No bets are open yet</p>
          <p className="mt-1 text-sm text-mauve/80">
            Check back soon — the couple is cooking up some questions.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {nameReady && openCount > 0 && (
            <p className="eyebrow text-center text-mauve">
              {openCount} bet{openCount === 1 ? "" : "s"} open
            </p>
          )}
          {questions.map((q, i) => (
            <BetCard
              key={q.id}
              question={q}
              myBet={myBetByQ[q.id] || null}
              staged={staged[q.id] || null}
              maxWager={maxWagerFor(q.id)}
              nameReady={nameReady}
              onStage={stageBet}
              onWager={setStageWager}
              onClear={unstageBet}
              index={i}
            />
          ))}
        </div>
      )}

      <Leaderboard entries={leaderboard} currentName={name} />

      <Footer
        adminInput={adminInput}
        setAdminInput={setAdminInput}
        tryAdmin={tryAdmin}
      />

      <BetSlip
        items={slipItems}
        total={stagedTotal}
        onRemove={unstageBet}
        onPlace={placeBets}
      />
    </Shell>
  );
}

// Phone-width column on the cream field, with floral corners behind it.
function Shell({ children }) {
  return (
    <div className="relative min-h-[100dvh]">
      <FloralCorners />
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col gap-5 px-4 pb-28">
        {children}
      </main>
    </div>
  );
}

function Footer({ adminInput, setAdminInput, tryAdmin }) {
  const showAdmin = setAdminInput && tryAdmin;
  return (
    <footer className="mt-auto pt-6 text-center">
      <div className="scallop-divider mb-4">
        <span className="text-blush text-xs">✦</span>
      </div>
      <p className="font-serif text-xl tracking-wide text-mauve-deep">
        #NIKUGOTRICH
      </p>
      <p className="mt-1 text-xs text-mauve/70">
        fake money · real bragging rights
      </p>

      {/* Admin code field, tucked at the very bottom for the couple. */}
      {showAdmin && (
        <div className="mx-auto mt-5 max-w-xs">
          <label className="eyebrow text-mauve/60">Admin Console</label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="password"
              className="flex-1 rounded-xl border border-mauve/25 bg-cream/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blush/40"
              placeholder="Enter Code"
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryAdmin()}
            />
            <button
              onClick={tryAdmin}
              className="rounded-xl bg-mauve px-3 py-2 text-sm font-semibold text-cream-card"
            >
              Enter
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
