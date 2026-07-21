import Foundation

/// Same Supabase project the web app talks to. The anon key is public by
/// design (it ships in the web bundle too) — row-level security policies are
/// the actual security boundary.
enum SupabaseConfig {
    static let url = URL(string: "https://rmxvevpocgflhaaelbod.supabase.co")!
    static let anonKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteHZldnBvY2dmbGhhYWVsYm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTc3MTYsImV4cCI6MjA5MTkzMzcxNn0.guz65X6RM0HAxUCAiLTQ7GclulCkOrX6ef-jggYhDAU"

    /// OAuth redirect back into the app (registered as a URL scheme in
    /// Info.plist; must also be listed under Auth > Redirect URLs in the
    /// Supabase dashboard).
    static let authRedirectURL = URL(string: "kidmath://auth-callback")!
}
