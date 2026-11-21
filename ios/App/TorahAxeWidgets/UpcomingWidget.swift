import SwiftUI
import WidgetKit

// T9 « À venir » (petit, moyen, écran verrouillé) : les prochaines fêtes et les jeûnes, avec le compte à rebours, et la fenêtre de Birkat
// haLévana (il faut un lieu). Toucher ouvre le calendrier hébraïque de l'app.
struct UpcomingWidget: Widget {
    let kind = "TorahAxeUpcoming"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            UpcomingView(entry: entry)
        }
        .configurationDisplayName("À venir")
        .description("Les prochaines fêtes et les jeûnes, et Birkat haLévana.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

private struct FeastRow: Identifiable {
    var id: String { item.name + item.day }
    let item: TodayFile.UpcomingFeast
    let days: Int

    var when: String {
        if days <= 0 { return "en ce moment" }
        return days == 1 ? "demain" : "dans \(days) j"
    }
}

struct UpcomingView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    private var feasts: [FeastRow] {
        guard let file = entry.file else { return [] }
        return (file.feasts ?? []).compactMap { f in
            guard let days = file.daysUntil(f.day, from: entry.date) else { return nil }
            // Une fête déjà commencée reste tant que l'app la disait en cours (une semaine au plus) ; un jeûne passé disparaît.
            if days < 0 && !(f.ongoing && days >= -7 && f.kind != "fast") { return nil }
            return FeastRow(item: f, days: days)
        }
    }

    // Birkat haLévana : « Ce soir, jusqu'au soir du … », « À partir du … », ou rien si la fenêtre est passée.
    private var levanaText: String? {
        guard let l = entry.file?.levana else { return nil }
        let now = entry.date.timeIntervalSince1970 * 1000
        if now > l.end { return nil }
        if now >= l.start { return "Jusqu'au soir du \(l.lastLabel)" }
        return "Du soir du \(l.firstLabel) au \(l.lastLabel)"
    }

    var body: some View {
        content
            .widgetURL(WidgetShared.url("calendar"))
            .axeContainerBackground(for: family)
    }

    @ViewBuilder
    private var content: some View {
        if entry.state == .noData {
            TodayMessageView(state: entry.state, family: family)
        } else {
            switch family {
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 0) {
                    if let f = feasts.first {
                        Text(f.item.name).font(.headline).widgetAccentable().lineLimit(1)
                        Text(f.when).font(.caption)
                    }
                    if let l = levanaText {
                        Text("Lévana : \(l)").font(.caption).lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            case .systemMedium:
                HStack(alignment: .top, spacing: 14) {
                    VStack(alignment: .leading, spacing: 5) {
                        heading("À venir")
                        ForEach(feasts.prefix(3)) { f in
                            HStack(alignment: .firstTextBaseline, spacing: 6) {
                                Image(systemName: f.item.kind == "fast" ? "moon.zzz" : "star.fill")
                                    .font(.caption2)
                                    .axeGold()
                                Text(f.item.name)
                                    .font(.caption.weight(.semibold))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.8)
                                Spacer(minLength: 4)
                                Text(f.when)
                                    .font(.caption2.monospacedDigit())
                                    .foregroundStyle(Color.white.opacity(0.75))
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                    if let l = levanaText {
                        VStack(alignment: .leading, spacing: 4) {
                            heading("Birkat haLévana")
                            Image(systemName: "moon.stars.fill")
                                .font(.title3)
                                .axeGold()
                            Text(l)
                                .font(.caption)
                                .lineLimit(4)
                                .minimumScaleFactor(0.85)
                            Spacer(minLength: 0)
                        }
                        .frame(width: 120, alignment: .topLeading)
                    }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            default:
                VStack(alignment: .leading, spacing: 2) {
                    heading("À venir")
                    if let f = feasts.first {
                        Text(f.item.name)
                            .font(.headline)
                            .lineLimit(2)
                            .minimumScaleFactor(0.7)
                        Text(f.days > 1 ? "\(f.days)" : f.when)
                            .font(f.days > 1 ? Font.system(size: 30, weight: .bold, design: .rounded).monospacedDigit() : Font.callout.weight(.bold))
                            .axeGold()
                        if f.days > 1 {
                            Text("jours · \(f.item.label)")
                                .font(.caption2)
                                .foregroundStyle(Color.white.opacity(0.7))
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                    }
                    Spacer(minLength: 0)
                    if let l = levanaText {
                        Label(l, systemImage: "moon.stars.fill")
                            .font(.caption2)
                            .lineLimit(2)
                            .foregroundStyle(Color.white.opacity(0.8))
                    }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
    }

    private func heading(_ text: String) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .textCase(.uppercase)
            .axeGold()
            .lineLimit(1)
    }
}

#Preview("À venir, moyen", as: .systemMedium) {
    UpcomingWidget()
} timeline: {
    Lot3Sample.entry()
}

#Preview("À venir, petit", as: .systemSmall) {
    UpcomingWidget()
} timeline: {
    Lot3Sample.entry()
}
