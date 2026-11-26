import AppIntents

// "Hey Siri, I'm safe" (4.148.0). An App Shortcut that opens accountedfor://safe, which checks the person in as On Hand
// through the app's existing one-tap check-in (features/quick-safe.js). Add this file to the App target (not the widget
// extension). Written without being able to build iOS here: treat it as untested until it has run once on a device.
@available(iOS 16.0, *)
struct ImSafeIntent: AppIntent {
    static var title: LocalizedStringResource = "I'm safe"
    static var description = IntentDescription("Check in as On Hand in Accounted For.")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "accountedfor://safe") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct AccountedForShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ImSafeIntent(),
            phrases: [
                "I'm safe in \(.applicationName)",
                "Check in with \(.applicationName)",
                "\(.applicationName) I'm safe"
            ],
            shortTitle: "I'm safe",
            systemImageName: "checkmark.circle.fill"
        )
    }
}
