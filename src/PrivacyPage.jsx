import { useTheme } from "./useTheme";
import MathMarks from "./components/MathMarks.jsx";

/**
 * Privacy policy — one page covering the web app and the iOS app. The App
 * Store listing points here (privacy policy URL is required for review,
 * doubly so in the Kids category). Keep in sync with the iOS privacy
 * manifest (ios/KidMath/Resources/PrivacyInfo.xcprivacy) and the App Store
 * nutrition labels (docs/ios-appstore-checklist.md).
 */
const SECTIONS = [
  {
    title: "What we collect",
    body: [
      "Account details: an email address and account ID when a parent signs in with Apple, Google, or email. Children never need to create an account to practice on the free web tier.",
      "Learning progress: practice levels, stars, answered questions, and mistake-review items, stored so a child can pick up where they left off across devices.",
      "Subscription status: whether your household has an active subscription, granted through the App Store or Stripe. Payment details are handled entirely by Apple or Stripe and never reach our servers.",
    ],
  },
  {
    title: "What we never do",
    body: [
      "No advertising, ever. larkit shows no ads of any kind.",
      "No third-party analytics or behavioral tracking in the iOS app, and no data is ever sold or shared with data brokers.",
      "No tracking across other companies' apps or websites.",
      "No contact from strangers: larkit has no chat, social, or messaging features.",
    ],
  },
  {
    title: "Children's privacy (COPPA)",
    body: [
      "larkit is built for children, so we collect the minimum needed for the product to work: progress data tied to the parent's account.",
      "Accounts are created and managed by parents or guardians. Purchases are protected by a parental gate on iOS.",
      "A parent can ask us to delete the account and all associated data at any time.",
    ],
  },
  {
    title: "Where data lives",
    body: [
      "Progress and account data are stored with our database provider (Supabase) with per-user access rules, encrypted in transit.",
      "On device, recent progress is cached locally so practice works offline.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "Use the free web tier without any account at all — progress then stays on your own device.",
      "Delete your account and data by contacting us at the address below; we complete deletions within 30 days.",
      "Manage or cancel subscriptions in the App Store's Subscriptions settings (iOS) or your Stripe billing portal (web).",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions or deletion requests: privacy@larkit.io.",
      "We will update this page when our practices change and note the date below.",
    ],
  },
];

export default function PrivacyPage() {
  const { theme } = useTheme();
  return (
    <main className="relative min-h-screen px-4 py-10">
      <MathMarks />
      <section className="relative max-w-3xl mx-auto">
        <h1 className={`text-4xl font-extrabold ${theme.textPrimary}`}>Privacy Policy</h1>
        <p className={`mt-2 text-sm font-semibold ${theme.textMuted}`}>Last updated: July 21, 2026</p>
        <p className={`mt-4 text-lg ${theme.textSecondary}`}>
          larkit is a math practice app for kids. Our rule is simple: collect the minimum a
          family needs to save progress, and nothing else.
        </p>
        <div className="mt-8 space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className={`text-xl font-extrabold ${theme.textPrimary}`}>{section.title}</h2>
              <ul className="mt-2 space-y-2">
                {section.body.map((line) => (
                  <li key={line} className={`${theme.textSecondary} leading-relaxed`}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
