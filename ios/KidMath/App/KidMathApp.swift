import SwiftUI

/// Process-wide access to the single AppModel. SwiftUI's EnvironmentObject
/// can't reach into a view's init (SessionView needs dependencies to build
/// its StateObject), so the instance is also published here.
@MainActor
enum AppEnvironment {
    static let current = AppModel()
}

@main
struct KidMathApp: App {
    @StateObject private var app = AppEnvironment.current

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(app)
                .environment(\.theme, app.theme)
                .preferredColorScheme(app.theme.isDark ? .dark : .light)
                .onOpenURL { url in
                    // kidmath://preview?v=2 (or v=1): the v2 preview marker,
                    // as the web's ?preview=v2 link. Anything else is auth.
                    if BankService.handlePreviewURL(url) {
                        app.bankService?.applyPreview()
                        return
                    }
                    app.supabase.handleAuthCallback(url)
                }
        }
    }
}
