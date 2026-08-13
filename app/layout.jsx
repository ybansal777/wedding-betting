import "./globals.css";
import { ToastProvider } from "../components/Toast";

export const metadata = {
  title: {
    default: "Wedding Bets — a live prediction game for your reception",
    template: "%s · Wedding Bets",
  },
  description:
    "Guests get play money, predict the chaos, and climb a live leaderboard. Set it up in twenty minutes, share one QR code.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf5e9",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
