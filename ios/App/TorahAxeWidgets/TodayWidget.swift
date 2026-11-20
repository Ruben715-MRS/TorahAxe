import SwiftUI
import WidgetKit

// T1 « Aujourd'hui » (écran d'accueil, petit et moyen) et T8 (écran verrouillé : une ligne, rectangle) : la date hébraïque, la paracha,
// Tahanoun et le prochain horaire. Toucher le widget ouvre l'accueil de l'app ; dans le moyen, toucher les horaires ouvre les Zmanim.
struct TodayWidget: Widget {
    let kind = "TorahAxeToday"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            TodayWidgetView(entry: entry)
        }
        .configurationDisplayName("Aujourd'hui")
        .description("La date hébraïque, la paracha, Tahanoun et le prochain horaire.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryInline, .accessoryRectangular])
    }
}

struct TodayWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    var body: some View {
        content
            .widgetURL(WidgetShared.todayURL)
            .axeContainerBackground(for: family)
    }

    @ViewBuilder
    private var content: some View {
        if entry.state != .ready || entry.period == nil {
            TodayMessageView(state: entry.state, family: family)
        } else if let period = entry.period {
            switch family {
            case .systemMedium: TodayMediumView(entry: entry, period: period)
            case .accessoryInline: TodayInlineView(period: period)
            case .accessoryRectangular: TodayRectangularView(entry: entry, period: period)
            default: TodaySmallView(entry: entry, period: period)
            }
        }
    }
}

// Le nom à mettre en grand : la paracha, ou la fête en cours quand ce Chabbat n'a pas de paracha ordinaire.
private func headline(_ period: TodayFile.Period) -> String {
    if let p = period.parasha { return p }
    if let f = period.feast, f.ongoing { return f.name }
    return period.weekday == 6 ? "Chabbat" : ""
}

// --- Petit ----------------------------------------------------------------------------------------------------------------------------------
struct TodaySmallView: View {
    let entry: TodayEntry
    let period: TodayFile.Period

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(period.hebrewShort)
                .font(.caption.weight(.semibold))
                .axeGold()
            Text(headline(period))
                .font(.title3.weight(.bold))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(period.tachanunLabel)
                .font(.caption2)
                .foregroundStyle(Color.white.opacity(0.75))
                .lineLimit(1)
            Spacer(minLength: 4)
            if let z = entry.next.first {
                Text(z.label)
                    .font(.caption2)
                    .foregroundStyle(Color.white.opacity(0.75))
                    .lineLimit(1)
                Text(z.time)
                    .font(.title2.weight(.semibold).monospacedDigit())
            } else if !entry.hasPlace {
                Text("Choisissez un lieu dans les Zmanim pour les horaires.")
                    .font(.caption2)
                    .foregroundStyle(Color.white.opacity(0.75))
                    .lineLimit(3)
            }
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// --- Moyen ----------------------------------------------------------------------------------------------------------------------------------
struct TodayMediumView: View {
    let entry: TodayEntry
    let period: TodayFile.Period

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(period.hebrewShort)
                        .font(.caption.weight(.semibold))
                        .axeGold()
                    Text(period.hebrewLetters)
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.75))
                }
                .lineLimit(1)
                Text(headline(period))
                    .font(.title2.weight(.bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text(period.tachanunLabel)
                    .font(.caption)
                    .foregroundStyle(Color.white.opacity(0.75))
                    .lineLimit(1)
                Spacer(minLength: 2)
                if let feast = period.feast {
                    Text(feast.ongoing ? feast.name : "\(feast.name) · \(feast.when.lowercased())")
                        .font(.caption2)
                        .foregroundStyle(Color.white.opacity(0.75))
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

            Link(destination: WidgetShared.zmanimURL) {
                VStack(alignment: .leading, spacing: 4) {
                    if let place = entry.placeName {
                        Label(place, systemImage: "location.fill")
                            .font(.caption2.weight(.semibold))
                            .labelStyle(.titleAndIcon)
                            .axeGold()
                            .lineLimit(1)
                    }
                    if entry.next.isEmpty {
                        Text(entry.hasPlace ? "Plus d'horaire préparé : ouvrez TorahAxe." : "Choisissez un lieu dans les Zmanim pour les horaires.")
                            .font(.caption2)
                            .foregroundStyle(Color.white.opacity(0.75))
                    }
                    ForEach(Array(entry.next.enumerated()), id: \.offset) { index, z in
                        HStack(spacing: 6) {
                            Text(z.label)
                                .font(index == 0 ? .caption.weight(.semibold) : .caption)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                            Spacer(minLength: 2)
                            Text(z.time)
                                .font((index == 0 ? Font.callout.weight(.bold) : Font.caption).monospacedDigit())
                        }
                        .foregroundStyle(Color.white.opacity(index == 0 ? 1 : 0.75))
                    }
                    Spacer(minLength: 0)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .foregroundStyle(.white)
    }
}

// --- Écran verrouillé -----------------------------------------------------------------------------------------------------------------------
// Une ligne au-dessus de l'heure : « 10 Kislev · Vayétsé ».
struct TodayInlineView: View {
    let period: TodayFile.Period

    var body: some View {
        let name = headline(period)
        Text(name.isEmpty ? period.hebrewShort : "\(period.hebrewShort) · \(name)")
    }
}

struct TodayRectangularView: View {
    let entry: TodayEntry
    let period: TodayFile.Period

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(headline(period).isEmpty ? period.hebrewShort : "\(period.hebrewShort) · \(headline(period))")
                .font(.headline)
                .widgetAccentable()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(period.tachanunLabel)
                .font(.caption)
                .lineLimit(1)
            if let z = entry.next.first {
                Text("\(z.label) \(z.time)")
                    .font(.caption.monospacedDigit())
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// --- Rien à montrer --------------------------------------------------------------------------------------------------------------------------
struct TodayMessageView: View {
    let state: TodayEntry.State
    let family: WidgetFamily

    private var text: String {
        state == .stale ? "Ouvrez TorahAxe pour mettre à jour." : "Ouvrez TorahAxe une fois pour afficher le jour."
    }

    var body: some View {
        switch family {
        case .accessoryInline:
            Text("TorahAxe : ouvrez l'app")
        case .accessoryRectangular, .accessoryCircular:
            Text(text).font(.caption).lineLimit(3)
        default:
            VStack(alignment: .leading, spacing: 4) {
                Text("TorahAxe").font(.caption.weight(.semibold)).axeGold()
                Text(text).font(.footnote).foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

#Preview("Petit", as: .systemSmall) {
    TodayWidget()
} timeline: {
    TodayEntry.sample
}

#Preview("Moyen", as: .systemMedium) {
    TodayWidget()
} timeline: {
    TodayEntry.sample
}

#Preview("Rectangle", as: .accessoryRectangular) {
    TodayWidget()
} timeline: {
    TodayEntry.sample
}
