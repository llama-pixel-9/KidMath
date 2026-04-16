# Kid Math Explorer

A touch-friendly, interactive math game for kids (K-3) built with React, Tailwind CSS, and Framer Motion.

## Features

- **Three modes**: Addition, Subtraction, Multiplication
- **Adaptive difficulty**: 10 levels that adjust automatically based on speed and accuracy
- **Bubble buttons**: Large, colorful touch targets (80×80px minimum) with satisfying animations
- **Circular progress ring**: Visual progress tracking per session
- **Star rewards**: Earn gold stars for first-try correct answers
- **Mistake replay**: Wrong answers get banked and re-prompted 5 questions later for reinforcement
- **Printable worksheets**: Generate kid-friendly, print-optimized problem sheets with answer keys
- **Four themes**: Soft Play, Super Mario, Adventure Quest, Block Builder
- **Sound effects**: Web Audio tones for correct answers, streaks, level-ups, and session completion
- **Cloud sync**: Optional Google sign-in via Supabase to save progress across devices
- **Login prompt**: Gentle 10-minute nudge to save progress (dismissible, non-intrusive)
- **PWA manifest**: Installable on tablet/phone home screens

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── mathEngine.js          # Pure JS: question generation, adaptive difficulty, mistake bank
├── progressStore.js       # Persistence: localStorage + Supabase cloud sync
├── MathExplorer.jsx       # Interactive game UI
├── PrintableWorksheet.jsx # Printable worksheet generator with answer keys
├── HomePage.jsx           # Marketing landing page
├── Navbar.jsx             # Navigation with theme picker & auth
├── App.jsx                # View router (home / game / worksheet)
├── AuthContext.jsx         # Google OAuth via Supabase
├── ThemeContext.jsx        # Theme state (persisted to localStorage)
├── themes.js              # Four theme presets with full styling configs
├── sounds.js              # Web Audio sound effects
├── supabaseClient.js      # Supabase client (graceful null if not configured)
├── main.jsx               # Entry point
└── index.css              # Tailwind import, theme fonts, print styles
```

## Supabase Integration

The app works fully without Supabase configured (falls back to localStorage). To enable cloud sync:

1. Create a Supabase project
2. Create a `progress` table with columns: `user_id`, `mode`, `level`, `mistake_bank`, `total_sessions`, `lifetime_stars`, `updated_at`
3. Enable Google OAuth in Authentication settings
4. Set environment variables:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

Key integration points:
- `progressStore.js` — handles read/write to Supabase `progress` table and local-to-cloud merge on first sign-in
- `AuthContext.jsx` — Google OAuth flow with `onAuthStateChange` listener
- `supabaseClient.js` — creates shared client, returns `null` if env vars are missing
