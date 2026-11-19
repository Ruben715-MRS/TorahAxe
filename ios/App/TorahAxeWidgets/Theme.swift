import SwiftUI
import WidgetKit

// Les couleurs de l'app : le bleu nuit de l'écran de lancement (#001a4b) et l'or (#d4a017).
// En mode teinté ou transparent (iOS 18 et suivants) et sur l'écran verrouillé, iOS retire le fond et recolore le texte : ce qui doit
// ressortir (l'or) est marqué « widgetAccentable ».
extension Color {
    static let axeNight = Color(red: 0 / 255, green: 26 / 255, blue: 75 / 255)
    static let axeNightDeep = Color(red: 0 / 255, green: 12 / 255, blue: 38 / 255)
    static let axeGold = Color(red: 212 / 255, green: 160 / 255, blue: 23 / 255)
}

struct AxeBackground: View {
    var body: some View {
        LinearGradient(colors: [.axeNight, .axeNightDeep], startPoint: .top, endPoint: .bottom)
    }
}

extension View {
    // Le texte en or : accentué dans les modes teinté et transparent.
    func axeGold() -> some View {
        foregroundStyle(Color.axeGold).widgetAccentable()
    }

    // Le fond d'un widget : bleu nuit sur l'écran d'accueil, rien sur l'écran verrouillé.
    @ViewBuilder
    func axeContainerBackground(for family: WidgetFamily) -> some View {
        switch family {
        case .accessoryInline, .accessoryCircular, .accessoryRectangular:
            containerBackground(for: .widget) { Color.clear }
        default:
            containerBackground(for: .widget) { AxeBackground() }
        }
    }
}
