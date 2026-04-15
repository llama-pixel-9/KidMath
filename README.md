# Kid Math Explorer

A touch-friendly, interactive math game for kids (K-3) built with React, Tailwind CSS, and Framer Motion.

## Features

- **Three modes**: Addition, Subtraction, Multiplication
- **Two difficulty levels**: Easy and Boss Level
- **Bubble buttons**: Large, colorful touch targets with satisfying animations
- **Rocket progress bar**: Visual progress tracking per question set
- **Star rewards**: Earn gold stars for correct answers
- **Printable worksheets**: Generate kid-friendly, print-optimized problem sheets with answer keys
- **Login prompt**: Gentle 10-minute nudge to save progress (Supabase-ready)
- **PWA-ready**: Installable full-screen on tablets and phones

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── mathEngine.js          # Pure JS math logic (no React dependency)
├── MathExplorer.jsx       # Interactive game UI
├── PrintableWorksheet.jsx # Printable worksheet generator
├── App.jsx                # View router (game ↔ worksheet)
├── main.jsx               # Entry point
└── index.css              # Tailwind import + print styles
```

## Supabase Integration

The codebase is pre-wired for Supabase. Search for `Supabase Integration Point` in `MathExplorer.jsx` for hook points covering:

- Progress saving after each completed set
- Progress loading on mount
- Auth flow triggered by the 10-minute login prompt
