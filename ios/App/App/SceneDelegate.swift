import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()   // App/MainViewController.swift : la WebView et les plugins de l'app
        window?.makeKeyAndVisible()

        // Lancement à froid par un widget : l'écran demandé attend que la page le reprenne (WidgetBridgePlugin.takeRoute).
        for context in connectionOptions.urlContexts { WidgetBridgePlugin.receive(context.url, webView: nil) }
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        // Un widget touché alors que l'app tourne déjà : la page est prévenue tout de suite.
        let webView = (window?.rootViewController as? CAPBridgeViewController)?.bridge?.webView
        for context in URLContexts { WidgetBridgePlugin.receive(context.url, webView: webView) }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
