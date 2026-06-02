import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, isConfigured } from "./lib/supabase";
import { balanceFor, buildLeaderboard } from "./lib/odds";
import FloralCorners from "./components/FloralCorners";
import Header from "./components/Header";
import BalanceCard from "./components/BalanceCard";
import BetCard from "./components/BetCard";
import Leaderboard from "./components/Leaderboard";
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
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState(false);
  const [adminInput, setAdminInput] = useState("");

  // ---- data loading + realtime -------------------------------------------
  const load = useCallback(async () => {
    if (!supabase) return;
    const [{ data: qs }, { data: bs }] = await Promise.all([
      supabase.from("questions").select("*").order("sort").order("created_at"),
      supabase.from("bets").select("*"),
    ]);
    setQuestions(qs || []);
    setBets(bs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    load();
    const channel = supabase
      .channel("wedding-bets")
      .on("postgres_changes", { event: "*", schema: "public", table: "bets" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, load)
      .subscribe();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const onChangeName = (v) => setName(v);

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

  const trimmed = name.trim().toLowerCase();
  const myBets = useMemo(
    () => bets.filter((b) => b.guest_name.trim().toLowerCase() === trimmed),
    [bets, trimmed]
  );
  const myBalance = useMemo(
    () => balanceFor(myBets.map(enrich)),
    [myBets, enrich]
  );
  // Full standings (every player with at least one bet) — used by the admin.
  const standings = useMemo(
    () => buildLeaderboard(bets.map(enrich)),
    [bets, enrich]
  );
  // Public leaderboard: only players who have bet on EVERY question.
  const leaderboard = useMemo(
    () =>
      questions.length === 0
        ? []
        : standings.filter((e) => e.bets.length >= questions.length),
    [standings, questions.length]
  );
  const pendingCount = myBets.filter((b) => !winnerById[b.question_id]).length;
  const myBetByQ = useMemo(() => {
    const m = {};
    for (const b of myBets) m[b.question_id] = b;
    return m;
  }, [myBets]);

  const nameReady = trimmed.length > 0;

  // ---- mutations ----------------------------------------------------------
  const confirmBet = async (questionId, pick, wager, oddsAtBet, pickLabel) => {
    const { error } = await supabase.from("bets").insert({
      guest_name: name.trim(),
      question_id: questionId,
      pick,
      pick_label: pickLabel,
      wager,
      odds_at_bet: oddsAtBet,
    });
    if (error) {
      notify(
        error.code === "23505"
          ? "You've already placed a bet on this one!"
          : `Couldn't save your bet: ${error.message}`,
        { tone: "error" }
      );
      return false;
    }
    await load();
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
    await load();
    return true;
  };

  const setWinner = async (questionId, opt) => {
    const { error } = await supabase
      .from("questions")
      .update({ winner: opt })
      .eq("id", questionId);
    if (error)
      notify(`Couldn't set the winner: ${error.message}`, { tone: "error" });
    else await load();
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
    await load();
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
    await load();
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
          leaderboard={standings}
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
        balance={myBalance}
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
              balance={myBalance}
              nameReady={nameReady}
              onConfirm={confirmBet}
              index={i}
            />
          ))}
        </div>
      )}

      <Leaderboard
        entries={leaderboard}
        currentName={name}
        totalQuestions={questions.length}
        myBetCount={nameReady ? myBets.length : null}
      />

      <Footer
        adminInput={adminInput}
        setAdminInput={setAdminInput}
        tryAdmin={tryAdmin}
      />
    </Shell>
  );
}

// Phone-width column on the cream field, with floral corners behind it.
function Shell({ children }) {
  return (
    <div className="relative min-h-[100dvh]">
      <FloralCorners />
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col gap-5 px-4 pb-10">
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
