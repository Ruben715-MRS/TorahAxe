import UIKit
import Capacitor

// Le contrôleur de la WebView de Capacitor, avec les plugins propres à l'app (ceux qui n'ont pas de paquet npm).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
