/** Small shared bits for the world's DOM layer. */

/** The Sun diamond — larkit's reward star (a rotated square, never five points). */
export function Diamond({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 1.5 L22.5 12 L12 22.5 L1.5 12 Z" fill="#f26b3a" />
      <path d="M12 6 L15.5 10.5 L11 12 L8.5 9.5 Z" fill="#ffd6b8" opacity="0.9" />
    </svg>
  );
}

/** Bottom sheet frame shared by the dialog and panels. */
/**
 * The card lives in the SKY (top of the screen): the ground band, where every
 * tap target is, stays clear. `bottom` opts a panel back to the bottom edge.
 */
export function Sheet({ children, label, className = "", bottom = false }) {
  return (
    <div className={`absolute inset-x-0 ${bottom ? "bottom-0" : "top-[54px]"} z-20 flex justify-center p-3 sm:p-4 pointer-events-none`}>
      <div role="dialog" aria-label={label} className={`pointer-events-auto w-full max-w-md rounded-3xl bg-cream/95 shadow-xl backdrop-blur border-[1.5px] border-ink/10 ${className}`}>
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick, label = "Close" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-full w-9 h-9 flex items-center justify-center bg-ink/5 text-ink text-xl font-bold hover:bg-ink/10 active:scale-95"
    >
      ×
    </button>
  );
}
