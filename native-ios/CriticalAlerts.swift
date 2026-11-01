// Critical Alerts opt-in. ONLY add this to the app target AFTER Apple approves the entitlement
// (com.apple.developer.usernotifications.critical-alerts) and it is in App.entitlements. Without the entitlement
// the request below fails and nothing changes. Call CriticalAlerts.ask() from the app (for example from a button
// in Settings → Alerts), never at launch: iOS shows its own extra prompt for it.
import Capacitor
import UserNotifications

@objc(CriticalAlertsPlugin)
public class CriticalAlertsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CriticalAlertsPlugin"
    public let jsName = "CriticalAlerts"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ask", returnType: CAPPluginReturnPromise)
    ]

    @objc func status(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { s in
            call.resolve(["granted": s.criticalAlertSetting == .enabled])
        }
    }

    @objc func ask(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge, .criticalAlert]) { ok, _ in
            call.resolve(["granted": ok])
        }
    }
}
// Then in AppDelegate.swift's MainViewController.capacitorDidLoad(): bridge?.registerPluginInstance(CriticalAlertsPlugin())
