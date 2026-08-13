"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BalanceCard from "./BalanceCard";
import BetCard from "./BetCard";
import BetSlip from "./BetSlip";
import Leaderboard from "./Leaderboard";
import { useToast } from "./Toast";
import { placeBets, renameGuest } from "../lib/actions";
import { track, EVENTS } from "../lib/analytics";

// Jittered polling.
//
// The original app used a fixed setInterval from page load. That keeps every
// guest who scanned the QR at the same announcement phase-locked into the same
// polling wave forever, and the visibilitychange handler fires them all at once
// when a toast ends. A ±25% jitter spreads the herd out.
const LEADERBOARD_MS = 30000;
const jitter = (ms) => ms * (0.75 + Math.random() * 0.5);

export default function GuestGame({ event, guest, questions, initialBets }) {
  const notify = useToast();
  const router = useRouter();

  const [myBets, setMyBets] = useState(initialBets);
  const [leaderboard, setLeaderboard] = useState([]);
  const [staged, setStaged] = useState({});
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(guest.display_name);
  const timer = useRef(null);

  const rename = async () => {
    const res = await renameGuest(event.slug, guest.id, newName);
    if (!res.ok) return notify(res.error, { tone: "error" });
    setRenaming(false);
    notify("Name updated.", { tone: "success" });
    router.refresh();
    fetchLeaderboard();
  };

  // Server data arrives fresh on every router.refresh(); keep local state in sync.
  useEffect(() => setMyBets(initialBets), [initialBets]);

  // ---------------------------------------------------------- leaderboard poll
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${event.id}/leaderboard`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      // The cached route speaks the database's column names; Leaderboard wants
      // `name`. Mapping here keeps the presentational component untouched.
      setLeaderboard(
        (json.entries ?? []).map((e) => ({
          name: e.display_name,
          balance: e.balance,
          bet_count: e.bets_count,
        }))
      );
    } catch {
      // Offline or a flaky venue connection — keep the last board on screen
      // rather than blanking it. The next tick will catch up.
    }
  }, [event.id]);

  useEffect(() => {
    fetchLeaderboard();
    const schedule = () => {
      timer.current = setTimeout(() => {
        if (document.visibilityState === "visible") fetchLeaderboard();
        schedule();
      }, jitter(LEADERBOARD_MS));
    };
    schedule();

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchLeaderboard();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchLeaderboard]);

  // ---------------------------------------------------------------- derived
  const winnerById = useMemo(() => {
    const m = {};
    for (const q of questions) m[q.id] = q.winner;
    return m;
  }, [questions]);

  const myBetByQ = useMemo(() => {
    const m = {};
    for (const b of myBets) m[b.question_id] = b;
    return m;
  }, [myBets]);

  const pendingCount = myBets.filter((b) => !winnerById[b.question_id]).length;

  // The authoritative balance is the guest row — the database maintains it
  // incrementally, so the client never recomputes it from bet history.
  const confirmedBalance = guest.balance;
  const stagedTotal = useMemo(
    () => Object.values(staged).reduce((s, v) => s + (v.wager || 0), 0),
    [staged]
  );
  const availableBalance = confirmedBalance - stagedTotal;

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

  // ---------------------------------------------------------------- staging
  const clampWager = (qid, w) =>
    Math.max(1, Math.min(Math.floor(w) || 1, maxWagerFor(qid)));

  const stageBet = (questionId, optionId, odds, label) =>
    setStaged((prev) => {
      const existing = prev[questionId];
      const desired = existing?.wager ?? Math.min(10, maxWagerFor(questionId));
      return {
        ...prev,
        [questionId]: {
          optionId,
          odds,
          label,
          wager: clampWager(questionId, desired),
        },
      };
    });

  const setStageWager = (questionId, w) =>
    setStaged((prev) =>
      prev[questionId]
        ? {
            ...prev,
            [questionId]: {
              ...prev[questionId],
              wager: clampWager(questionId, w),
            },
          }
        : prev
    );

  const unstageBet = (questionId) =>
    setStaged((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });

  // ---------------------------------------------------------------- placing
  const place = async () => {
    const slip = Object.entries(staged).map(([questionId, s]) => ({
      questionId,
      optionId: s.optionId,
      label: s.label,
      wager: s.wager,
    }));
    if (slip.length === 0) return false;

    const res = await placeBets(event.id, event.slug, slip);
    if (!res.ok) {
      notify(res.error, { tone: "error" });
      return false;
    }

    setStaged({});
    const { placed, requested } = res.data;

    // Activation, the PRD's headline guest metric. Emitted only on the first
    // bet this guest has ever placed at this event — `myBets` is the state
    // before this slip landed, so an empty list means this was the first.
    if (placed > 0) {
      if (myBets.length === 0) track(EVENTS.firstBet, { eventId: event.id });
      track(EVENTS.betsPlaced, { eventId: event.id, props: { count: placed } });
    }
    notify(
      placed === requested
        ? "Bets placed — good luck!"
        : `Placed ${placed}. ${requested - placed} were already on the board.`,
      { tone: "success" }
    );
    router.refresh();
    fetchLeaderboard();
    return true;
  };

  // ---------------------------------------------------------------- render
  const bettingOpen = event.status === "live";
  const openCount = questions.filter((q) => !q.winner && !myBetByQ[q.id]).length;

  return (
    <>
      <BalanceCard
        displayName={guest.display_name}
        balance={availableBalance}
        bankroll={event.starting_bankroll}
        pendingCount={pendingCount}
        onRename={() => setRenaming(true)}
      />

      {renaming && (
        <section className="card animate-pop-in p-5">
          <label className="eyebrow text-blush-deep" htmlFor="rename">
            Change your name
          </label>
          <p className="mt-1 text-xs text-mauve/70">
            This is what everyone sees on the leaderboard.
          </p>
          <input
            id="rename"
            className="field mt-2 text-lg"
            maxLength={28}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && rename()}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setRenaming(false);
                setNewName(guest.display_name);
              }}
              className="btn-ghost flex-1 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={rename}
              disabled={!newName.trim()}
              className="btn-primary flex-1 py-2.5 text-sm"
            >
              Save
            </button>
          </div>
        </section>
      )}

      {!bettingOpen && (
        <section className="card p-5 text-center">
          <p className="font-serif text-xl text-mauve-deep">
            {event.status === "closed" ? "Betting has closed" : "Not open yet"}
          </p>
          <p className="mt-1 text-sm text-mauve/80">
            {event.status === "closed"
              ? "That's a wrap. Thanks for playing!"
              : "Hang tight — the couple hasn't started the game."}
          </p>
          {event.status === "closed" && (
            <Link
              href={`/e/${event.slug}/recap`}
              className="btn-primary mt-4 block w-full py-3"
            >
              See the final standings
            </Link>
          )}
        </section>
      )}

      {questions.length === 0 ? (
        <section className="card p-6 text-center">
          <p className="font-serif text-xl text-mauve-deep">
            No bets are open yet
          </p>
          <p className="mt-1 text-sm text-mauve/80">
            Check back soon — the couple is cooking up some questions.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {bettingOpen && openCount > 0 && (
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
              nameReady={bettingOpen}
              onStage={stageBet}
              onWager={setStageWager}
              onClear={unstageBet}
              index={i}
            />
          ))}
        </div>
      )}

      <Leaderboard entries={leaderboard} currentName={guest.display_name} />

      <footer className="mt-auto pt-6 text-center">
        <div className="scallop-divider mb-4">
          <span className="text-xs text-blush">✦</span>
        </div>
        <p className="text-xs text-mauve/70">fake money · real bragging rights</p>
      </footer>

      <BetSlip
        items={slipItems}
        total={stagedTotal}
        onRemove={unstageBet}
        onPlace={place}
      />
    </>
  );
}
