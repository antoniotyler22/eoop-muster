// "I'm safe" control for the Lock Screen, Control Center and the Action button (iOS 18+).
// Add as a new Widget Extension target (see native-ios/README.md). Tapping it opens Accounted For and checks in as On Hand.
import AppIntents
import SwiftUI
import WidgetKit

struct SafeCheckInIntent: AppIntent {
    static var title: LocalizedStringResource = "I'm safe"
    static var description = IntentDescription("Check in as safe with Accounted For.")

    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(URL(string: "accountedfor://safe")!))
    }
}

struct SafeControl: ControlWidget {
    static let kind = "com.antoniotyler.accountedfor.safe"

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(action: SafeCheckInIntent()) {
                Label("I'm safe", systemImage: "checkmark.shield.fill")
            }
        }
        .displayName("I'm safe")
        .description("One tap to check in with Accounted For.")
    }
}

@main
struct AccountedForControlsBundle: WidgetBundle {
    var body: some Widget {
        SafeControl()
    }
}
