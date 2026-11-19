import SwiftUI
import WidgetKit

// T3 « Chabbat et fêtes » (petit, moyen, écran verrouillé) : le prochain Chabbat ou la prochaine fête — ou celui qui est en cours —, avec
// l'allumage des bougies, la havdala, la paracha et la haftara. Toucher ouvre les Zmanim, vue Chabbat.
struct ShabbatWidget: Widget {
    let kind = "TorahAxeShabbat"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            ShabbatWidgetView(entry: entry)
        }
        .configurationDisplayName("Chabbat et fêtes")
        .description("L'allumage des bougies et la sortie du prochain Chabbat ou de la prochaine fête.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

// « vendredi 20 novembre » → « ven. »
private func shortWeekday(_ label: String) -> String {
    let first = label.split(separator: " ").first.map(String.init) ?? label
    return first.count > 4 ? String(first.prefix(3)) + "." : first
}

struct ShabbatWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    var body: some View {
        content
            .widgetURL(WidgetShared.shabbatURL)
            .axeContainerBackground(for: family)
    }

    private var ongoing: Bool {
        guard let holy = entry.holy, let start = holy.startDate else { return false }
        return start <= entry.date
    }

    @ViewBuilder
    private var content: some View {
        if entry.state == .ready, !entry.hasPlace {
            if family == .accessoryRectangular {
                Text("Choisissez un lieu dans les Zmanim de TorahAxe.").font(.caption).lineLimit(3)
            } else {
                PlaceNeededView()
            }
        } else if let holy = entry.holy, entry.state == .ready {
            switch family {
            case .accessoryRectangular: rectangular(holy)
            case .systemMedium: medium(holy)
            default: small(holy)
            }
        } else {
            TodayMessageView(state: entry.state == .ready ? .stale : entry.state, family: family)
        }
    }

    private func title(_ holy: TodayFile.Holy) -> String {
        ongoing ? (holy.kind == "shabbat" ? "Chabbat Chalom" : "Bonne fête") : (holy.kind == "shabbat" ? "Chabbat" : "Fête")
    }

    private func small(_ holy: TodayFile.Holy) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title(holy))
                .font(.caption2.weight(.semibold))
                .textCase(.uppercase)
                .axeGold()
            Text(holy.parasha ?? holy.name)
                .font(.headline)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 4)
            if !ongoing, let time = holy.startTime {
                TimeLine(symbol: "flame.fill", day: shortWeekday(holy.startDay), time: time)
            }
            if let time = holy.endTime {
                TimeLine(symbol: "sparkles", day: shortWeekday(holy.endDay), time: time)
            }
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func medium(_ holy: TodayFile.Holy) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline) {
                Text(title(holy))
                    .font(.caption2.weight(.semibold))
                    .textCase(.uppercase)
                    .axeGold()
                Spacer(minLength: 4)
                if let place = entry.placeName {
                    Text(place).font(.caption2).foregroundStyle(Color.white.opacity(0.7)).lineLimit(1)
                }
            }
            Text(holy.name)
                .font(.title3.weight(.bold))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            if !ongoing, let time = holy.startTime {
                DetailLine(symbol: "flame.fill", text: "Allumage · \(holy.startDay)", time: time)
            }
            if let time = holy.endTime {
                DetailLine(symbol: "sparkles", text: "Sortie · \(holy.endDay)", time: time)
            }
            Spacer(minLength: 0)
            if let haftara = holy.haftara {
                Text("Haftara : \(haftara)")
                    .font(.caption2)
                    .foregroundStyle(Color.white.opacity(0.7))
                    .lineLimit(1)
            } else if !ongoing, let start = holy.startDate, start.timeIntervalSince(entry.date) < 2 * 86400 {
                (Text("Allumage dans ") + Text(start, style: .relative))
                    .font(.caption2)
                    .foregroundStyle(Color.white.opacity(0.7))
                    .lineLimit(1)
            }
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func rectangular(_ holy: TodayFile.Holy) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(holy.name)
                .font(.headline)
                .widgetAccentable()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if !ongoing, let time = holy.startTime {
                Text("Allumage \(shortWeekday(holy.startDay)) \(time)").font(.caption.monospacedDigit()).lineLimit(1)
            }
            if let time = holy.endTime {
                Text("Sortie \(shortWeekday(holy.endDay)) \(time)").font(.caption.monospacedDigit()).lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct TimeLine: View {
    let symbol: String
    let day: String
    let time: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: symbol)
                .font(.caption2)
                .axeGold()
            Text(day)
                .font(.caption)
                .foregroundStyle(Color.white.opacity(0.75))
            Spacer(minLength: 2)
            Text(time)
                .font(.callout.weight(.semibold).monospacedDigit())
        }
    }
}

private struct DetailLine: View {
    let symbol: String
    let text: String
    let time: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: symbol)
                .font(.caption)
                .axeGold()
                .frame(width: 14)
            Text(text)
                .font(.caption)
                .foregroundStyle(Color.white.opacity(0.85))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 4)
            Text(time)
                .font(.callout.weight(.semibold).monospacedDigit())
        }
    }
}

#Preview("Chabbat, petit", as: .systemSmall) {
    ShabbatWidget()
} timeline: {
    TodayEntry.sample
}

#Preview("Chabbat, moyen", as: .systemMedium) {
    ShabbatWidget()
} timeline: {
    TodayEntry.sample
}
