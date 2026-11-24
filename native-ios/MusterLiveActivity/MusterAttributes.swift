// Shared by the app target (plugin) and the widget extension target. iOS 16.2+.
import ActivityKit
import Foundation

struct MusterAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var accounted: Int
        var total: Int
    }
    var unit: String
    var kind: String   // "drill" or "real"
    var start: Date
}
