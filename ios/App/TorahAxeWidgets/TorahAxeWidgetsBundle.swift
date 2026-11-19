import SwiftUI
import WidgetKit

// Les widgets de TorahAxe (extension WidgetKit, iOS 17 et suivants). Les données viennent de l'app : voir TodayData.swift et
// js/widgetDataCore.js. Lot 1 : « Aujourd'hui » (T1, et T8 en une ligne et en rectangle) et « Prochain horaire » (T8, rond et rectangle).
@main
struct TorahAxeWidgetsBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        NextZmanWidget()
    }
}
