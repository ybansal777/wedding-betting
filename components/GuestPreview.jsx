"use client";

import Header from "./Header";
import GuestGame from "./GuestGame";

// Phone-sized guest board. Hosts sit at a laptop; everyone else plays from
// a pocket, so this is the surface that has to stay honest.

export default function GuestPreview({ event, questions, guests = [] }) {
  const theme = event.theme || {};
  const preset = theme.preset || "classic";
  const accentStyle = theme.accent
    ? {
        "--c-blush": theme.accent,
        "--c-blush-deep": theme.accentDeep || theme.accent,
      }
    : undefined;

  const previewEvent = {
    ...event,
    status: "live",
    published: true,
  };

  const guest = {
    id: "preview-guest",
    display_name: "You",
    balance: event.starting_bankroll ?? 100,
  };

  const leaderboard = [
    ...guests
      .filter((g) => g.display_name?.toLowerCase() !== "you")
      .map((g) => ({
        name: g.display_name,
        balance: g.balance,
        bet_count: g.bets_count || g.bet_count || 0,
      })),
    { name: "You", balance: guest.balance, bet_count: 0 },
  ].sort((a, b) => b.balance - a.balance);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 text-center lg:text-left">
        <p className="eyebrow text-blush">Guest phones</p>
        <p className="mt-1 text-xs text-mauve/70">
          This is the board in their pocket. Try a bet — it stays in this preview.
        </p>
      </div>

      <div
        className="guest-phone relative mx-auto flex min-h-0 w-full max-w-[24rem] flex-1 flex-col overflow-hidden bg-cream"
        data-preset={preset}
        style={accentStyle}
      >
        <div className="guest-phone-notch" aria-hidden />
        <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-28">
          <Header
            title={event.title}
            subtitle={event.subtitle}
            logoUrl={theme.logoUrl}
            bankroll={event.starting_bankroll}
            compact
          />
          <div className="mt-4 flex flex-col gap-5">
            <GuestGame
              key={event.betting_mode}
              event={previewEvent}
              guest={guest}
              questions={questions}
              initialBets={[]}
              initialLeaderboard={leaderboard}
              offline
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  );
}
