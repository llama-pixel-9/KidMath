import { motion } from "framer-motion";
import {
  Brain,
  Target,
  Shuffle,
  RefreshCw,
  BarChart3,
  Accessibility,
  Sparkles,
} from "lucide-react";
import { useTheme } from "./useTheme";

const PRINCIPLES = [
  {
    icon: Target,
    title: "Standards-Aligned Skills",
    description:
      "Questions are mapped to K-5 learning progressions so practice matches what kids should learn next.",
  },
  {
    icon: Brain,
    title: "Concept + Fluency + Application",
    description:
      "We balance understanding, speed, and real use. Kids see number patterns, practice facts, and solve story contexts.",
  },
  {
    icon: Shuffle,
    title: "Smarter Mixed Practice",
    description:
      "Question families rotate so students do not only drill one type. This builds flexible thinking, not memorization only.",
  },
  {
    icon: RefreshCw,
    title: "Spaced Review",
    description:
      "Tricky questions come back later at spaced intervals to strengthen memory over time.",
  },
  {
    icon: BarChart3,
    title: "Diagnostic Adaptivity",
    description:
      "KidMath tracks subskills and targets weaker areas so each child gets practice that fits their needs.",
  },
  {
    icon: Accessibility,
    title: "Accessible by Design",
    description:
      "Word problems can be limited for early readers, and visual/symbolic questions stay central for foundational levels.",
  },
];

export default function AboutPage() {
  const { theme } = useTheme();

  return (
    <main className={`min-h-screen ${theme.bg} px-4 py-10`}>
      <section className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 rounded-full px-4 py-2 shadow-sm mb-4">
            <Sparkles className={`h-4 w-4 ${theme.textSecondary}`} />
            <span className={`text-sm font-bold ${theme.textSecondary}`}>
              How KidMath Helps Kids Learn
            </span>
          </div>
          <h1 className={`text-4xl sm:text-5xl font-extrabold ${theme.textPrimary}`}>
            Our Learning Principles
          </h1>
          <p className={`mt-3 text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
            KidMath is built with research-backed teaching and assessment practices so kids get
            practice that is joyful, targeted, and effective.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          {PRINCIPLES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`${theme.cardBg} rounded-3xl p-5 shadow-sm border ${theme.cardBorder}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`bg-gradient-to-br ${theme.ctaPrimary} p-2 rounded-xl`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-extrabold ${theme.textPrimary}`}>{item.title}</h2>
                    <p className={`mt-1 ${theme.textSecondary}`}>{item.description}</p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
