import SwiftUI
import WidgetKit

// T6 « Dates personnelles » (petit, moyen, écran verrouillé) : les prochaines Hazkarot (Yahrzeit) et anniversaires hébraïques du registre de
// l'app. Les noms sont marqués « privés » : iOS les masque quand l'iPhone est verrouillé. Toucher ouvre les dates personnelles.
struct DatesWidget: Widget {
    let kind = "TorahAxeDates"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            DatesView(entry: entry)
        }
        .configurationDisplayName("Dates personnelles")
        .description("Les prochaines Hazkarot et anniversaires hébraïques que vous avez enregistrés.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

private struct DateRow: Identifiable {
    var id: String { item.name + item.day }
    let item: TodayFile.PersonalDate
    let days: Int

    var when: String { days == 0 ? "aujourd'hui" : (days == 1 ? "demain" : "dans \(days) jours") }
    // Une Hazkara commence la veille au soir.
    var eve: Bool { item.type == "hazkara" && days <= 1 }
}

struct DatesView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    private var rows: [DateRow] {
        guard let file = entry.file else { return [] }
        return (file.dates ?? []).compactMap { d in
            guard let days = file.daysUntil(d.day, from: entry.date), days >= 0 else { return nil }
            return DateRow(item: d, days: days)
        }
    }

    var body: some View {
        content
            .widgetURL(WidgetShared.url("dates"))
            .axeContainerBackground(for: family)
    }

    @ViewBuilder
    private var content: some View {
        if entry.state == .noData {
            TodayMessageView(state: entry.state, family: family)
        } else if rows.isEmpty {
            if family == .accessoryRectangular {
                Text("Aucune date à venir").font(.caption)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    title
                    Text("Ajoutez vos Hazkarot et anniversaires hébraïques dans TorahAxe : ils s'afficheront ici.")
                        .font(.caption)
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        } else {
            switch family {
            case .accessoryRectangular:
                let r = rows[0]
                VStack(alignment: .leading, spacing: 0) {
                    Text(r.item.name).font(.headline).widgetAccentable().lineLimit(1).privacySensitive()
                    Text("\(r.item.kind) · \(r.when)").font(.caption).lineLimit(1)
                    Text(r.item.hebrew).font(.caption).lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            case .systemMedium:
                VStack(alignment: .leading, spacing: 6) {
                    title
                    ForEach(rows.prefix(3)) { r in
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            VStack(alignment: .leading, spacing: 0) {
                                Text(r.item.name)
                                    .font(.callout.weight(.semibold))
                                    .lineLimit(1)
                                    .privacySensitive()
                                Text("\(r.item.kind) · \(r.item.hebrew)\(r.eve ? " · dès la veille au soir" : "")")
                                    .font(.caption2)
                                    .foregroundStyle(Color.white.opacity(0.7))
                                    .lineLimit(1)
                            }
                            Spacer(minLength: 4)
                            Text(r.when)
                                .font(.caption.weight(.semibold))
                                .axeGold()
                                .lineLimit(1)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            default:
                let r = rows[0]
                VStack(alignment: .leading, spacing: 2) {
                    title
                    Text(r.item.name)
                        .font(.headline)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                        .privacySensitive()
                    Text(r.item.kind)
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.75))
                    Spacer(minLength: 2)
                    Text(r.item.hebrew)
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.75))
                    Text(r.when)
                        .font(.callout.weight(.bold))
                        .axeGold()
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
    }

    private var title: some View {
        Text("Dates personnelles")
            .font(.caption2.weight(.semibold))
            .textCase(.uppercase)
            .axeGold()
            .lineLimit(1)
    }
}

#Preview("Dates, moyen", as: .systemMedium) {
    DatesWidget()
} timeline: {
    Lot3Sample.entry()
}
