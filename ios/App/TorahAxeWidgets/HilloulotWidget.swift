import SwiftUI
import WidgetKit

// T7 « Hilloulot » (petit, moyen) : les maîtres dont c'est la hilloula aujourd'hui (le jour hébraïque, qui commence à la sortie des étoiles),
// sinon les prochaines. Toucher ouvre l'accueil de l'app, où la carte des hilloulot les présente.
struct HilloulotWidget: Widget {
    let kind = "TorahAxeHilloulot"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            HilloulotView(entry: entry)
        }
        .configurationDisplayName("Hilloulot")
        .description("Les tsadikim dont c'est aujourd'hui la hilloula, ou les prochains.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct NextHilloula: Identifiable {
    var id: String { item.fr + item.day }
    let item: TodayFile.Hilloula
    let days: Int

    var when: String { days == 0 ? "aujourd'hui" : (days == 1 ? "demain" : "dans \(days) jours") }
}

struct HilloulotView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    private var today: [TodayFile.HilloulaName] { entry.period?.hilloulot ?? [] }

    // Les prochaines, sans celles d'aujourd'hui.
    private var upcoming: [NextHilloula] {
        guard let file = entry.file else { return [] }
        let todayNames = Set(today.map(\.fr))
        return (file.hilloulotNext ?? []).compactMap { h in
            guard let days = file.daysUntil(h.day, from: entry.date), days >= 0, !(days <= 1 && todayNames.contains(h.fr)) else { return nil }
            return NextHilloula(item: h, days: days)
        }
    }

    var body: some View {
        content
            .widgetURL(WidgetShared.todayURL)
            .axeContainerBackground(for: family)
    }

    @ViewBuilder
    private var content: some View {
        if entry.state != .ready {
            TodayMessageView(state: entry.state, family: family)
        } else {
            VStack(alignment: .leading, spacing: 4) {
                Text(today.isEmpty ? "Prochaine hilloula" : "Hilloula aujourd'hui")
                    .font(.caption2.weight(.semibold))
                    .textCase(.uppercase)
                    .axeGold()
                    .lineLimit(1)
                if let first = today.first {
                    Text(first.fr)
                        .font(family == .systemSmall ? Font.subheadline.weight(.bold) : Font.headline)
                        .lineLimit(family == .systemSmall ? 4 : 2)
                        .minimumScaleFactor(0.8)
                    Text(first.he)
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.75))
                    if family == .systemMedium {
                        Text(first.bio)
                            .font(.caption)
                            .foregroundStyle(Color.white.opacity(0.75))
                            .lineLimit(2)
                        if today.count > 1 {
                            Text("Et aussi : " + today.dropFirst().map(\.fr).joined(separator: ", "))
                                .font(.caption2)
                                .foregroundStyle(Color.white.opacity(0.65))
                                .lineLimit(1)
                        } else if let next = upcoming.first {
                            Text("Ensuite : \(next.item.fr), \(next.item.hebrew)")
                                .font(.caption2)
                                .foregroundStyle(Color.white.opacity(0.65))
                                .lineLimit(1)
                        }
                    }
                } else if let next = upcoming.first {
                    Text(next.item.fr)
                        .font(family == .systemSmall ? Font.subheadline.weight(.bold) : Font.headline)
                        .lineLimit(family == .systemSmall ? 3 : 2)
                        .minimumScaleFactor(0.8)
                    Text("\(next.item.hebrew) · \(next.when)")
                        .font(.caption.weight(.semibold))
                        .axeGold()
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    if family == .systemMedium {
                        Text(next.item.bio)
                            .font(.caption)
                            .foregroundStyle(Color.white.opacity(0.75))
                            .lineLimit(2)
                    }
                } else {
                    Text("Ouvrez TorahAxe pour mettre à jour.").font(.footnote)
                }
                Spacer(minLength: 0)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

#Preview("Hilloulot, moyen", as: .systemMedium) {
    HilloulotWidget()
} timeline: {
    Lot3Sample.entry()
}
