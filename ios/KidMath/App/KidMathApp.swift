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
                .onOpenURL { url in
                    app.supabase.handleAuthCallback(url)
                }
        }
    }
}
