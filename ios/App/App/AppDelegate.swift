import UIKit
import Capacitor
import LocalAuthentication
import Security
import StoreKit

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
        bridge?.registerPluginInstance(ProStorePlugin())
        bridge?.registerPluginInstance(ReviewPlugin())
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

// Accounted For Pro: auto-renewing subscription through Apple (StoreKit 2).
// Apple verifies every transaction; the app only trusts verified ones.
@objc(ProStorePlugin)
public class ProStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ProStorePlugin"
    public let jsName = "ProStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "buy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise)
    ]
    private var updates: Task<Void, Never>?

    override public func load() {
        updates = Task.detached { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let t) = result { await t.finish() }
                if let st = await ProStorePlugin.currentStatus() { self?.notifyListeners("change", data: st) }
            }
        }
    }
    deinit { updates?.cancel() }

    static func currentStatus() async -> [String: Any]? {
        var best: Transaction?
        var bestJWS: String?
        for await result in Transaction.currentEntitlements {
            guard case .verified(let t) = result, t.revocationDate == nil, t.productType == .autoRenewable else { continue }
            if let e = t.expirationDate, e < Date() { continue }
            if best == nil || (t.expirationDate ?? .distantFuture) > (best!.expirationDate ?? .distantFuture) { best = t; bestJWS = result.jwsRepresentation }
        }
        guard let t = best else { return ["active": false] }
        var r: [String: Any] = ["active": true, "productId": t.productID]
        if let e = t.expirationDate { r["expires"] = Int(e.timeIntervalSince1970 * 1000) }
        // Apple's signed copy of the transaction: the app sends it to the server, which checks Apple's signature
        // and records the subscription, so server features (Ask, server hub) know this team has Pro.
        if let j = bestJWS { r["jws"] = j }
        return r
    }

    @objc func products(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                let ps = try await Product.products(for: ids)
                var out: [[String: Any]] = []
                for p in ps {
                    var o: [String: Any] = ["id": p.id, "title": p.displayName, "price": p.displayPrice, "amount": NSDecimalNumber(decimal: p.price).doubleValue]
                    if let sub = p.subscription {
                        let u = sub.subscriptionPeriod.unit
                        o["period"] = u == .year ? "year" : (u == .month ? "month" : (u == .week ? "week" : "day"))
                        o["periodCount"] = sub.subscriptionPeriod.value
                        let eligible = await sub.isEligibleForIntroOffer
                        if let intro = sub.introductoryOffer, eligible {
                            let iu = intro.period.unit
                            o["trial"] = intro.paymentMode == .freeTrial
                            o["introDays"] = intro.period.value * (iu == .day ? 1 : iu == .week ? 7 : iu == .month ? 30 : 365)
                        }
                    }
                    out.append(o)
                }
                call.resolve(["products": out])
            } catch { call.reject("Couldn't reach the App Store. Check your connection.") }
        }
    }

    @objc func buy(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("No product"); return }
        Task {
            do {
                guard let p = try await Product.products(for: [id]).first else { call.reject("Not available yet"); return }
                let result = try await p.purchase()
                switch result {
                case .success(let v):
                    guard case .verified(let t) = v else { call.reject("Apple couldn't verify the purchase"); return }
                    await t.finish()
                    var st = await ProStorePlugin.currentStatus() ?? ["active": true]
                    st["result"] = "ok"
                    call.resolve(st)
                case .pending: call.resolve(["active": false, "result": "pending"])
                case .userCancelled: call.resolve(["active": false, "result": "cancelled"])
                @unknown default: call.resolve(["active": false, "result": "unknown"])
                }
            } catch { call.reject("Purchase didn't go through: \(error.localizedDescription)") }
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        Task { call.resolve(await ProStorePlugin.currentStatus() ?? ["active": false]) }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do { try await AppStore.sync() } catch { }
            call.resolve(await ProStorePlugin.currentStatus() ?? ["active": false])
        }
    }

    @objc func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                do { try await AppStore.showManageSubscriptions(in: scene); call.resolve(); return } catch { }
            }
            if let u = URL(string: "https://apps.apple.com/account/subscriptions") { UIApplication.shared.open(u, options: [:], completionHandler: nil) }
            call.resolve()
        }
    }
}


// App Store rating prompt. The web app calls Review.request() right after a 100% check-in.
// iOS decides whether the prompt actually shows (at most 3 times a year per person).
@objc(ReviewPlugin)
public class ReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReviewPlugin"
    public let jsName = "Review"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise)
    ]

    @objc func request(_ call: CAPPluginCall) {
        Task { @MainActor in
            let scene = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first { $0.activationState == .foregroundActive }
            guard let scene = scene else { call.resolve(["shown": false]); return }
            if #available(iOS 16.0, *) {
                AppStore.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve(["asked": true])
        }
    }
}
