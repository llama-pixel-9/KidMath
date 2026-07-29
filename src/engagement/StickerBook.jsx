import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X } from "lucide-react";
import { useTheme } from "../useTheme.js";
import { STICKERS } from "./stickers.js";
import { loadEngagement, starBalance, buySticker } from "./engagementStore.js";

/**
 * The sticker book: what stars are FOR. Owned stickers show full-color at the
 * top; the rest can be bought when the balance covers them.
 */
export default function StickerBook({ open, onClose }) {
  const { theme } = useTheme();
  const [state, setState] = useState(loadEngagement);
  const [justBought, setJustBought] = useState(null);

  if (!open) return null;
  const balance = starBalance(state);
  const owned = new Set(state.stickers);

  const buy = (sticker) => {
    const next = buySticker(sticker);
    if (next) {
      setState(next);
      setJustBought(sticker.id);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`${theme.cardBg} rounded-3xl shadow-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto`}
          initial={{ scale: 0.8, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-2xl font-extrabold ${theme.textPrimary}`}>Sticker Book</h2>
            <button
              type="button"
              className={`p-2 rounded-full ${theme.textMuted} cursor-pointer`}
              onClick={onClose}
              aria-label="Close sticker book"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className={`text-sm ${theme.textSecondary} mb-4 flex items-center gap-1`}>
            You have
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
            <span className="font-extrabold">{balance}</span>
            stars to spend. Earn more by playing!
          </p>

          <div className="grid grid-cols-4 gap-3">
            {STICKERS.map((s) => {
              const has = owned.has(s.id);
              const canBuy = !has && balance >= s.cost;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  className={`relative rounded-2xl p-2 flex flex-col items-center gap-0.5 shadow-sm cursor-pointer disabled:cursor-default
                    ${has ? "bg-yellow-50 ring-2 ring-yellow-300" : canBuy ? "bg-white" : "bg-slate-100 opacity-70"}`}
                  whileTap={canBuy ? { scale: 0.9 } : undefined}
                  animate={justBought === s.id ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : {}}
                  onClick={() => buy(s)}
                  disabled={!canBuy}
                  aria-label={has ? `${s.name} — owned` : `Buy ${s.name} for ${s.cost} stars`}
                  title={has ? s.name : `${s.name} — ${s.cost} stars`}
                >
                  <span className={`text-3xl ${has || canBuy ? "" : "grayscale"}`} aria-hidden="true">
                    {s.emoji}
                  </span>
                  {has ? (
                    <span className="text-[10px] font-bold text-yellow-600">{s.name}</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-400" />
                      {s.cost}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
