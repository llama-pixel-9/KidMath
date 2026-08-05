import { Link } from "react-router-dom";

/**
 * Site footer, rendered on every route. The Privacy link here is part of the
 * COPPA §312.4(d) posture (prominent link on the home screen), but a footer
 * alone does not satisfy the rule — the collection points (/signup, the
 * add-a-child screen, the paywall) each carry their own link too.
 */
export default function Footer() {
  return (
    <footer className="no-print bg-transparent">
      <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-center gap-2 text-sm font-semibold text-ink/50">
        <Link to="/privacy" className="underline underline-offset-2 hover:text-teal">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className="underline underline-offset-2 hover:text-teal">Terms</Link>
        <span aria-hidden="true">·</span>
        <Link to="/security" className="underline underline-offset-2 hover:text-teal">Security</Link>
      </div>
    </footer>
  );
}
