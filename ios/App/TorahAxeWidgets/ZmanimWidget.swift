import SwiftUI
import WidgetKit

// T2 « Zmanim du jour » (moyen et grand) : tous les horaires du jour civil, le prochain en or, ceux qui sont passés estompés.
// Toucher ouvre l'écran Zmanim.
struct ZmanimWidget: Widget {
    let kind = "TorahAxeZmanim"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            ZmanimWidgetView(entry: entry)
        }
        .configurationDisplayName("Zmanim du jour")
        .description("Tous les horaires du jour pour votre lieu, le prochain mis en avant.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct ZmanimWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    var body: some View {
        content
            .widgetURL(WidgetShared.zmanimURL)
            .axeContainerBackground(for: family)
    }

    @ViewBuilder
    private var content: some View {
        if entry.state == .ready, !entry.hasPlace {
            PlaceNeededView()
        } else if entry.state != .ready || entry.dayZmanim.isEmpty {
            TodayMessageView(state: entry.state == .ready ? .stale : entry.state, family: family)
        } else {
            VStack(alignment: .leading, spacing: family == .systemLarge ? 6 : 3) {
                header
                if family == .systemLarge {
                    ForEach(entry.dayZmanim, id: \.self) { z in
                        ZmanRow(zman: z, state: state(of: z), large: true)
                    }
                    Spacer(minLength: 0)
                } else {
                    let half = (entry.dayZmanim.count + 1) / 2
                    HStack(alignment: .top, spacing: 14) {
                        VStack(spacing: 2) {
                            ForEach(entry.dayZmanim.prefix(half), id: \.self) { z in ZmanRow(zman: z, state: state(of: z), large: false) }
                        }
                        VStack(spacing: 2) {
                            ForEach(entry.dayZmanim.dropFirst(half), id: \.self) { z in ZmanRow(zman: z, state: state(of: z), large: false) }
                        }
                    }
                }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            if let place = entry.placeName {
                Label(place, systemImage: "location.fill")
                    .labelStyle(.titleAndIcon)
                    .font(.caption.weight(.semibold))
                    .axeGold()
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            Text([entry.civilDay?.label, entry.period?.hebrewShort].compactMap { $0 }.joined(separator: " · "))
                .font(.caption2)
                .foregroundStyle(Color.white.opacity(0.75))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }

    private func state(of z: TodayFile.Zman) -> ZmanRow.RowState {
        if z == entry.next.first { return .next }
        return z.date <= entry.date ? .past : .future
    }
}

struct ZmanRow: View {
    enum RowState { case past, next, future }

    let zman: TodayFile.Zman
    let state: RowState
    let large: Bool

    var body: some View {
        let base: Font = large ? .callout : .caption
        HStack(spacing: 6) {
            Text(zman.label)
                .font(state == .next ? base.weight(.bold) : base)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Spacer(minLength: 4)
            Text(zman.time)
                .font((large ? Font.callout : Font.caption).weight(state == .next ? .bold : .regular).monospacedDigit())
        }
        .modifier(ZmanRowStyle(state: state))
    }
}

private struct ZmanRowStyle: ViewModifier {
    let state: ZmanRow.RowState

    @ViewBuilder
    func body(content: Content) -> some View {
        switch state {
        case .next: content.axeGold()
        case .past: content.foregroundStyle(Color.white.opacity(0.4))
        case .future: content.foregroundStyle(Color.white)
        }
    }
}

// Sans lieu choisi, il n'y a pas d'horaires.
struct PlaceNeededView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("TorahAxe").font(.caption.weight(.semibold)).axeGold()
            Text("Choisissez votre lieu dans les Zmanim de TorahAxe pour afficher les horaires.")
                .font(.footnote)
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

#Preview("Zmanim, grand", as: .systemLarge) {
    ZmanimWidget()
} timeline: {
    TodayEntry.sample
}

#Preview("Zmanim, moyen", as: .systemMedium) {
    ZmanimWidget()
} timeline: {
    TodayEntry.sample
}
