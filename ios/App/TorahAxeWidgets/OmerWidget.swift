import SwiftUI
import WidgetKit

// T5 « Compte de l'Omer » (petit, écran verrouillé) : pendant les 49 jours, le compte du jour hébraïque en cours (il change à la sortie des
// étoiles, comme le compte se dit le soir) ; le reste de l'année, quand il commence. Toucher ouvre l'écran de l'Omer.
struct OmerWidget: Widget {
    let kind = "TorahAxeOmer"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            OmerView(entry: entry)
        }
        .configurationDisplayName("Compte de l'Omer")
        .description("Le jour du compte de l'Omer, de Pessa'h à Chavouot.")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct OmerView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    var body: some View {
        content
            .widgetURL(WidgetShared.url("omer"))
            .axeContainerBackground(for: family)
    }

    private var day: Int { entry.period?.omer ?? 0 }

    // Les jours avant le premier soir du compte.
    private var daysToStart: Int? {
        guard let start = entry.file?.omerStart else { return nil }
        return entry.file?.daysUntil(start.day, from: entry.date)
    }

    private var waitText: String {
        guard let d = daysToStart, let start = entry.file?.omerStart else { return "Ouvrez TorahAxe" }
        if d <= 0 { return "Premier compte ce soir" }
        return d == 1 ? "Premier compte demain soir" : "Premier compte le \(start.label) au soir"
    }

    @ViewBuilder
    private var content: some View {
        if entry.state != .ready {
            TodayMessageView(state: entry.state, family: family)
        } else if day > 0 {
            switch family {
            case .accessoryCircular:
                Gauge(value: Double(day), in: 0...49) {
                    Text("Omer")
                } currentValueLabel: {
                    Text("\(day)")
                }
                .gaugeStyle(.accessoryCircular)
                .widgetAccentable()
            case .accessoryInline:
                Text("Omer : \(day)\(day == 1 ? "er" : "e") jour")
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 0) {
                    Text("Omer : \(day)\(day == 1 ? "er" : "e") jour").font(.headline).widgetAccentable()
                    Text(entry.period?.omerText ?? "").font(.caption).lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            default:
                VStack(alignment: .leading, spacing: 2) {
                    Text("Omer")
                        .font(.caption2.weight(.semibold))
                        .textCase(.uppercase)
                        .axeGold()
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text("\(day)")
                            .font(.system(size: 40, weight: .bold, design: .rounded).monospacedDigit())
                        Text("/49")
                            .font(.callout)
                            .foregroundStyle(Color.white.opacity(0.6))
                    }
                    ProgressView(value: Double(day), total: 49)
                        .tint(Color.axeGold)
                    Text(entry.period?.omerText ?? "")
                        .font(.caption2)
                        .foregroundStyle(Color.white.opacity(0.8))
                        .lineLimit(3)
                        .minimumScaleFactor(0.8)
                    Spacer(minLength: 0)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        } else {
            switch family {
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 0) {
                        Text("Omer").font(.system(size: 10))
                        Text(daysToStart.map { "J-\($0)" } ?? "—").font(.system(size: 14, weight: .bold))
                    }
                }
            case .accessoryInline:
                Text(daysToStart.map { "Omer dans \($0) jours" } ?? "Omer")
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 0) {
                    Text("Compte de l'Omer").font(.headline).widgetAccentable()
                    Text(waitText).font(.caption).lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            default:
                VStack(alignment: .leading, spacing: 4) {
                    Text("Omer")
                        .font(.caption2.weight(.semibold))
                        .textCase(.uppercase)
                        .axeGold()
                    if let d = daysToStart, d > 0 {
                        Text("Dans \(d) jour\(d > 1 ? "s" : "")")
                            .font(.title3.weight(.bold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    Text(waitText)
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.8))
                        .lineLimit(3)
                    Spacer(minLength: 0)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
    }
}

#Preview("Omer, petit", as: .systemSmall) {
    OmerWidget()
} timeline: {
    Lot3Sample.entry(omer: 23)
    Lot3Sample.entry()
}

#Preview("Omer, rond", as: .accessoryCircular) {
    OmerWidget()
} timeline: {
    Lot3Sample.entry(omer: 23)
}
