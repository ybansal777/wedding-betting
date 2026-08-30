import { Syne, Figtree, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "../components/Toast";
import Atmosphere from "../components/Atmosphere";

// Display / body / data faces, self-hosted at build time (no runtime request
// to Google, no layout shift). Wired to the CSS variables every component
// already reads via the `font-serif` / `font-sans` / `font-mono` Tailwind
// utilities — see tailwind.config.js — so no component needed to change to
// pick these up. Syne is the night-board marque; Figtree stays readable on
// a phone in low light.
const display = Syne({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const bodyFont = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Let's Bet — a live prediction game for your next event",
    template: "%s · Let's Bet",
  },
  description:
    "Guests get play money, predict the chaos, and climb a live leaderboard. Weddings, bachelor/ette parties, birthdays, reunions — anything. Set it up in twenty minutes, share one QR code.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16144e",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${bodyFont.variable} ${mono.variable}`}
    >
      <body>
        <Atmosphere />
        <div className="relative z-10 min-h-dvh">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
  );
}
