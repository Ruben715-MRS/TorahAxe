import Foundation
import Capacitor
import WidgetKit

// Le pont entre l'app (JavaScript) et ses widgets : js/app/widgets.js prépare les données des jours qui viennent (js/widgetDataCore.js),
// ce plugin les dépose dans l'espace partagé de l'app et de ses widgets (App Group), puis demande à iOS de redessiner les widgets.
// Enregistré dans MainViewController.capacitorDidLoad (un plugin propre à l'app, sans paquet npm).
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setTodayData", returnType: CAPPluginReturnPromise)
    ]

    // À garder identiques à TorahAxeWidgets/TodayData.swift (WidgetShared).
    static let appGroup = "group.com.torahaxe.app"
    static let todayFile = "widget-today.json"

    @objc func setTodayData(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8) else {
            call.reject("Données du widget absentes")
            return
        }
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroup) else {
            call.reject("App Group indisponible (vérifier la capacité App Groups de la cible App)")
            return
        }
        do {
            try data.write(to: dir.appendingPathComponent(Self.todayFile), options: .atomic)
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        } catch {
            call.reject("Écriture des données du widget impossible", nil, error)
        }
    }
}
