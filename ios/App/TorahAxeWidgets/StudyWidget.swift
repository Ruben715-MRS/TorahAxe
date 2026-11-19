import SwiftUI
import WidgetKit

// T4 « Étude du jour » (moyen et grand) : le Daf Yomi, les Téhilim du mois, la Michna Yomit et la Mitsva du jour, comme les cartes de
// l'accueil (celles masquées dans les réglages de l'app le sont aussi ici). Chaque ligne ouvre son texte dans l'app.
struct StudyWidget: Widget {
    let kind = "TorahAxeStudy"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            StudyWidgetView(entry: entry)
        }
        .configurationDisplayName("Étude du jour")
        .description("Daf Yomi, Téhilim, Michna Yomit et Mitsva du jour ; chaque ligne ouvre son texte.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

private struct StudyLine: Identifiable {
    let id: String          // l'écran à ouvrir (torahaxe://widget/<id>)
    let title: String
    let item: TodayFile.StudyItem
}

struct StudyWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    private var lines: [StudyLine] {
        guard let study = entry.civilDay?.study else { return [] }
        let cards = entry.studyCards
        var out: [StudyLine] = []
        if let daf = study.daf, cards?.daf ?? true { out.append(StudyLine(id: "daf", title: "Daf Yomi", item: daf)) }
        if let t = study.tehilim, cards?.tehilim ?? true { out.append(StudyLine(id: "tehilim", title: "Téhilim", item: t)) }
        if let m = study.mishna, cards?.mishna ?? true { out.append(StudyLine(id: "mishna", title: "Michna Yomit", item: m)) }
        if let m = study.mitsva, cards?.mitsva ?? false { out.append(StudyLine(id: "mitsva", title: "Mitsva du jour", item: m)) }
        return out
    }

    var body: some View {
        content
            .widgetURL(WidgetShared.todayURL)
            .axeContainerBackground(for: family)
    }

    @ViewBuilder
    private var content: some View {
        if entry.state == .noData || entry.civilDay == nil {
            TodayMessageView(state: entry.state == .ready ? .stale : entry.state, family: family)
        } else {
            let large = family == .systemLarge
            VStack(alignment: .leading, spacing: large ? 10 : 4) {
                HStack(alignment: .firstTextBaseline) {
                    Text("Étude du jour")
                        .font(.caption2.weight(.semibold))
                        .textCase(.uppercase)
                        .axeGold()
                    Spacer(minLength: 4)
                    Text(entry.civilDay?.label ?? "")
                        .font(.caption2)
                        .foregroundStyle(Color.white.opacity(0.7))
                        .lineLimit(1)
                }
                if lines.isEmpty {
                    Text("Toutes les cartes d'étude sont masquées dans les réglages de TorahAxe.")
                        .font(.footnote)
                }
                ForEach(lines) { line in
                    Link(destination: WidgetShared.url(line.id)) {
                        StudyRow(line: line, large: large)
                    }
                }
                Spacer(minLength: 0)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

private struct StudyRow: View {
    let line: StudyLine
    let large: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(line.title)
                    .font(.caption.weight(.semibold))
                    .axeGold()
                    .frame(width: large ? 104 : 92, alignment: .leading)
                Text(line.item.text)
                    .font(large ? .callout.weight(.semibold) : .caption.weight(.semibold))
                    .lineLimit(large ? 2 : 1)
                    .minimumScaleFactor(0.85)
                Spacer(minLength: 0)
                if let he = line.item.he {
                    Text(he)
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.7))
                        .lineLimit(1)
                }
            }
            if large {
                Text(line.item.sub)
                    .font(.caption2)
                    .foregroundStyle(Color.white.opacity(0.65))
                    .lineLimit(1)
                    .padding(.leading, 110)
            }
        }
    }
}

#Preview("Étude, moyen", as: .systemMedium) {
    StudyWidget()
} timeline: {
    TodayEntry.sample
}

#Preview("Étude, grand", as: .systemLarge) {
    StudyWidget()
} timeline: {
    TodayEntry.sample
}
