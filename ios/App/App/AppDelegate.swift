import UIKit
import Capacitor
import LocalAuthentication
import Security

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    // Hand the Apple push token (or the error) to the Capacitor push plugin.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

// Main screen: the standard Capacitor web view, plus the app's own Face ID plugin.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(BiometricPlugin())
    }
}

// Face ID / Touch ID unlock. Keeps the PIN in the iOS Keychain, readable only after a
// successful Face ID or Touch ID check on this phone, and never synced to iCloud.
@objc(BiometricPlugin)
public class BiometricPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricPlugin"
    public let jsName = "Biometric"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "has", returnType: CAPPluginReturnPromise)
    ]
    private let service = "com.antoniotyler.accountedfor.pin"
    private let account = "unlock"

    @objc func available(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        let ok = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &err)
        var type = "none"
        if ok { type = ctx.biometryType == .faceID ? "faceID" : (ctx.biometryType == .touchID ? "touchID" : "biometric") }
        call.resolve(["available": ok, "type": type])
    }

    @objc func has(_ call: CAPPluginCall) {
        let ctx = LAContext()
        ctx.interactionNotAllowed = true
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                kSecAttrAccount as String: account, kSecUseAuthenticationContext as String: ctx]
        let st = SecItemCopyMatching(q as CFDictionary, nil)
        call.resolve(["has": st == errSecSuccess || st == errSecInteractionNotAllowed])
    }

    @objc func save(_ call: CAPPluginCall) {
        guard let pin = call.getString("pin"), !pin.isEmpty, let data = pin.data(using: .utf8) else { call.reject("No PIN"); return }
        deleteItem()
        var cfErr: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, &cfErr) else {
            call.reject("Face ID needs a phone passcode"); return
        }
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                kSecAttrAccount as String: account, kSecAttrAccessControl as String: access, kSecValueData as String: data]
        let st = SecItemAdd(q as CFDictionary, nil)
        if st == errSecSuccess { call.resolve() } else { call.reject("Couldn't save (\(st))") }
    }

    @objc func load(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Unlock Accounted For"
        DispatchQueue.global(qos: .userInitiated).async {
            let ctx = LAContext()
            ctx.localizedFallbackTitle = "Use PIN"
            ctx.localizedReason = reason
            let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: self.service,
                                    kSecAttrAccount as String: self.account, kSecReturnData as String: true,
                                    kSecMatchLimit as String: kSecMatchLimitOne, kSecUseAuthenticationContext as String: ctx]
            var out: AnyObject?
            let st = SecItemCopyMatching(q as CFDictionary, &out)
            if st == errSecSuccess, let d = out as? Data, let pin = String(data: d, encoding: .utf8) {
                call.resolve(["pin": pin])
            } else if st == errSecItemNotFound {
                call.reject("Face ID changed or not set up. Use your PIN.", "NOT_FOUND")
            } else {
                call.reject("Cancelled", "CANCELLED")
            }
        }
    }

    @objc func remove(_ call: CAPPluginCall) { deleteItem(); call.resolve() }

    private func deleteItem() {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
        SecItemDelete(q as CFDictionary)
    }
}
