import SwiftUI
import WidgetKit

// T8 « Prochain horaire » (écran verrouillé, et mode En veille par le rectangle) : le prochain zman et le temps qui reste.
// Le rond se remplit de l'horaire précédent au suivant ; iOS l'anime seul (ProgressView(timerInterval:)), sans réveiller le widget.
// Toucher ouvre les Zmanim.
struct NextZmanWidget: Widget {
    let kind = "TorahAxeNextZman"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            NextZmanView(entry: entry)
        }
        .configurationDisplayName("Prochain horaire")
        .description("Le prochain zman de votre lieu et le temps qui reste.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular])
    }
}

struct NextZmanView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    var body: some View {
        content
            .widgetURL(WidgetShared.zmanimURL)
            .axeContainerBackground(for: family)
    }

    @ViewBuilder
    private var content: some View {
        if let next = entry.next.first {
            if family == .accessoryCircular {
                NextZmanCircular(next: next, previous: entry.previous)
            } else {
                NextZmanRectangular(next: next, following: entry.next.dropFirst().first)
            }
        } else if entry.state == .ready && !entry.hasPlace {
            if family == .accessoryCircular {
                ZStack {
                    AccessoryWidgetBackground()
                    Image(systemName: "location.slash")
                }
            } else {
                Text("Choisissez un lieu dans les Zmanim de TorahAxe.").font(.caption).lineLimit(3)
            }
        } else {
            TodayMessageView(state: entry.state == .ready ? .stale : entry.state, family: family)
        }
    }
}

struct NextZmanCircular: View {
    let next: TodayFile.Zman
    let previous: TodayFile.Zman?

    var body: some View {
        // Sans horaire précédent (premier jour préparé), la jauge part d'une heure avant.
        let start = previous?.date ?? next.date.addingTimeInterval(-3600)
        ZStack {
            AccessoryWidgetBackground()
            ProgressView(timerInterval: start...max(next.date, start.addingTimeInterval(60)), countsDown: false) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .progressViewStyle(.circular)
            .widgetAccentable()
            VStack(spacing: 0) {
                Text(next.short)
                    .font(.system(size: 10, weight: .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(next.time)
                    .font(.system(size: 14, weight: .bold).monospacedDigit())
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .padding(.horizontal, 6)
        }
    }
}

struct NextZmanRectangular: View {
    let next: TodayFile.Zman
    let following: TodayFile.Zman?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(next.label)
                    .font(.headline)
                    .widgetAccentable()
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Spacer(minLength: 2)
                Text(next.time)
                    .font(.headline.monospacedDigit())
            }
            Text(next.date, style: .relative)
                .font(.caption)
                .lineLimit(1)
            if let following {
                Text("puis \(following.label.lowercased()) \(following.time)")
                    .font(.caption.monospacedDigit())
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview("Rond", as: .accessoryCircular) {
    NextZmanWidget()
} timeline: {
    TodayEntry.sample
}

#Preview("Rectangle", as: .accessoryRectangular) {
    NextZmanWidget()
} timeline: {
    TodayEntry.sample
}
