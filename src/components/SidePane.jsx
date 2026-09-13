import { motion, AnimatePresence } from "framer-motion";

/**
 * The session's side pane — home of the work space and the hint.
 *
 * Wide, short screens (the same breakpoint that puts question and answer
 * side by side): a column pinned to the right edge; the play area slides
 * left to make room (`.session--pane-open`). Phones and portrait tablets:
 * a bottom sheet over the answer area with the question still visible above
 * it, and a tap on the dimmed backdrop closes it. Not a modal on wide
 * screens — a kid writes in it while answering.
 */
export default function SidePane({ open, title, icon = null, onClose, children, testId }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="side-pane-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            className="side-pane bg-white"
            initial={{ opacity: 0, x: 40, y: 40 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 40, y: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="complementary"
            aria-label={title}
            data-testid={testId}
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-ink/10 shrink-0">
              <h2 className="font-display font-semibold text-lg text-ink m-0 flex items-center gap-2">
                {icon}
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title.toLowerCase()}`}
                className="w-9 h-9 rounded-full bg-cream text-ink flex items-center justify-center cursor-pointer btn-press"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>
            <div className="side-pane-body">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
