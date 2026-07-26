import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Enable the standard iOS edge-swipe "back" gesture on the webview.
        if let vc = self.window?.rootViewController as? CAPBridgeViewController {
            vc.webView?.allowsBackForwardNavigationGestures = true
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Fallback in case the webview wasn't ready yet at launch.
        if let vc = self.window?.rootViewController as? CAPBridgeViewController {
            vc.webView?.allowsBackForwardNavigationGestures = true
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if url.scheme == "medclarivo", url.host == "auth" {
            let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
            if let token = components?.queryItems?.first(where: { $0.name == "token" })?.value {
                if let vc = self.window?.rootViewController as? CAPBridgeViewController,
                   let webView = vc.webView {
                    let escapedToken = token.replacingOccurrences(of: "'", with: "\\'")
                    let js = "localStorage.setItem('mc_token', '\(escapedToken)'); window.location.href = 'dashboard.html';"
                    webView.evaluateJavaScript(js, completionHandler: nil)
                }
            }
        }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
