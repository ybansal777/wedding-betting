# Wedding Betting App

A React app for managing wedding betting pools with a guest interface and admin panel.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (usually `http://localhost:5173`)

## Features

- **Guest View**: Enter your name, place bets on wedding questions, and manage your bankroll
- **Admin Panel**: Access with the admin key (`wedding-admin-2026` by default) to:
  - Add new betting questions
  - Set winners for each question
  - View the leaderboard
  - Generate QR codes for guests

## Notes

- The app uses Tailwind CSS for styling
- If you want to add a logo image, place it in the `public` folder as `Untitled_Artwork.png`
- Remember to change the `ADMIN_KEY` and `siteUrl` before deploying to production


