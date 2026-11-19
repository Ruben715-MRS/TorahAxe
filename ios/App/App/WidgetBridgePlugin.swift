import Foundation
import Capacitor
import WebKit
import WidgetKit

// Le pont entre l'app (JavaScript) et ses widgets (enregistré dans MainViewController.capacitorDidLoad, sans paquet npm) :
//  - setData : js/app/widgets.js prépare les données des jours qui viennent (js/widgetDataCore.js) ; le plugin les dépose dans l'espace
//    partagé de l'app et de ses widgets (App Group), puis demande à iOS de redessiner les widgets ;
//  - takeRoute : l'écran demandé par le dernier widget touché. Le lien torahaxe://widget/<écran> est reçu par SceneDelegate (receive), gardé
//    ici, et la page est prévenue par l'événement « axewidgetroute ». Ce chemin ne dépend pas du plugin App : le lien n'est jamais perdu,
//    que l'app soit lancée à froid ou déjà ouverte.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takeRoute", returnType: CAPPluginReturnPromise)
    ]

    // À garder identiques à TorahAxeWidgets/TodayData.swift (WidgetShared).
    static let appGroup = "group.com.torahaxe.app"
    static let dataFile = "widget-data.json"
    static let scheme = "torahaxe"

    // L'écran du dernier lien de widget, en attente que la page le reprenne (lu et écrit sur le fil principal).
    private static var pendingRoute: String?

    // Pour chaque lien reçu par l'app : garde l'écran d'un lien de widget et prévient la page. Vrai si c'en était un.
    @discardableResult
    static func receive(_ url: URL, webView: WKWebView?) -> Bool {
        guard url.scheme == scheme, url.host == "widget" else { return false }
        let route = url.pathComponents.first { $0 != "/" } ?? "today"
        pendingRoute = route
        webView?.evaluateJavaScript("window.dispatchEvent(new Event('axewidgetroute'))", completionHandler: nil)
        return true
    }

    @objc func setData(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8) else {
            call.reject("Données du widget absentes")
            return
        }
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroup) else {
            call.reject("App Group indisponible (vérifier la capacité App Groups de la cible App)")
            return
        }
        do {
            try data.write(to: dir.appendingPathComponent(Self.dataFile), options: .atomic)
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        } catch {
            call.reject("Écriture des données du widget impossible", nil, error)
        }
    }

    @objc func takeRoute(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let route = Self.pendingRoute
            Self.pendingRoute = nil
            if let route {
                call.resolve(["route": route])
            } else {
                call.resolve()
            }
        }
    }
}
