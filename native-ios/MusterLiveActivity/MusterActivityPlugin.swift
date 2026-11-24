// Capacitor plugin: the web app calls MusterActivity.update({n,t,unit,start,kind}) while a check-in is open and .end() when it closes.
// Add this file to the App target (not the extension) and register it in MainViewController.capacitorDidLoad():
//     bridge?.registerPluginInstance(MusterActivityPlugin())
import Capacitor
import ActivityKit
import WidgetKit

@objc(MusterActivityPlugin)
public class MusterActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MusterActivityPlugin"
    public let jsName = "MusterActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]
    // Shared with the widget extension: add the same App Group to both targets.
    static let group = "group.com.antoniotyler.accountedfor"
    private var activity: Activity<MusterAttributes>?

    @objc func update(_ call: CAPPluginCall) {
        let n = call.getInt("n") ?? 0, t = call.getInt("t") ?? 0
        let unit = call.getString("unit") ?? "Team", kind = call.getString("kind") ?? "drill"
        let start = Date(timeIntervalSince1970: (call.getDouble("start") ?? Date().timeIntervalSince1970 * 1000) / 1000)
        if let d = UserDefaults(suiteName: Self.group) { d.set(n, forKey: "accounted"); d.set(t, forKey: "total"); d.set(unit, forKey: "unit"); WidgetCenter.shared.reloadAllTimelines() }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { call.resolve(); return }
        let state = MusterAttributes.ContentState(accounted: n, total: t)
        if let a = activity {
            Task { await a.update(ActivityContent(state: state, staleDate: nil)); call.resolve() }
        } else {
            do {
                activity = try Activity.request(attributes: MusterAttributes(unit: unit, kind: kind, start: start),
                                                content: ActivityContent(state: state, staleDate: nil))
                call.resolve()
            } catch { call.reject("Live Activity not started: \(error.localizedDescription)") }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        let a = activity; activity = nil
        if let d = UserDefaults(suiteName: Self.group) { d.removeObject(forKey: "accounted"); d.removeObject(forKey: "total"); WidgetCenter.shared.reloadAllTimelines() }
        Task { await a?.end(nil, dismissalPolicy: .immediate); call.resolve() }
    }
}
