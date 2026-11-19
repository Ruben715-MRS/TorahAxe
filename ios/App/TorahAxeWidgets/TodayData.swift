import Foundation
import WidgetKit

// Le fichier que l'app dépose pour ses widgets (js/widgetDataCore.js, via App/WidgetBridgePlugin.swift).
enum WidgetShared {
    static let appGroup = "group.com.torahaxe.app"   // à garder identique à WidgetBridgePlugin.appGroup
    static let todayFile = "widget-today.json"
    static let todayURL = URL(string: "torahaxe://widget/today")!
    static let zmanimURL = URL(string: "torahaxe://widget/zmanim")!
}

struct TodayFile: Decodable {
    struct Place: Decodable {
        let name: String
        let tz: String
        let israel: Bool
    }

    struct Feast: Decodable {
        let name: String
        let when: String
        let ongoing: Bool
        let days: Int
    }

    // Un jour hébraïque, de la sortie des étoiles de la veille à celle du jour (instants en millisecondes UTC).
    struct Period: Decodable {
        let start: Double
        let end: Double
        let weekday: Int              // 0 = dimanche … 6 = Chabbat
        let hebrew: String            // « 10 Kislev 5787 »
        let hebrewShort: String       // « 10 Kislev »
        let hebrewLetters: String     // « י׳ כסלו »
        let parasha: String?
        let parashaHe: String?
        let tachanun: String          // yes | morning | no
        let tachanunLabel: String
        let feast: Feast?
    }

    struct Zman: Decodable, Hashable {
        let key: String
        let label: String
        let short: String
        let at: Double
        let time: String              // « 17:49 », dans le fuseau du lieu

        var date: Date { Date(timeIntervalSince1970: at / 1000) }
    }

    let v: Int
    let generatedAt: Double
    let place: Place?
    let tz: String
    let periods: [Period]
    let zmanim: [Zman]

    static func load() -> TodayFile? {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: WidgetShared.appGroup),
              let data = try? Data(contentsOf: dir.appendingPathComponent(WidgetShared.todayFile)) else { return nil }
        return try? JSONDecoder().decode(TodayFile.self, from: data)
    }

    func period(at date: Date) -> Period? {
        let ms = date.timeIntervalSince1970 * 1000
        return periods.first { $0.start <= ms && ms < $0.end }
    }

    func upcoming(after date: Date, count: Int) -> [Zman] {
        let ms = date.timeIntervalSince1970 * 1000
        return Array(zmanim.filter { $0.at > ms }.prefix(count))
    }

    func previous(before date: Date) -> Zman? {
        let ms = date.timeIntervalSince1970 * 1000
        return zmanim.last { $0.at <= ms }
    }
}

// Ce que montre un widget à un instant donné.
struct TodayEntry: TimelineEntry {
    enum State {
        case ready        // tout va bien
        case noData       // l'app n'a encore rien déposé (jamais ouverte depuis l'installation du widget)
        case stale        // les jours préparés sont épuisés : il faut rouvrir l'app
    }

    let date: Date
    let state: State
    let period: TodayFile.Period?
    let placeName: String?
    let next: [TodayFile.Zman]        // les prochains horaires, le premier d'abord
    let previous: TodayFile.Zman?     // le dernier horaire passé (pour la jauge du rond de l'écran verrouillé)

    var hasPlace: Bool { placeName != nil }

    static func make(from file: TodayFile?, at date: Date) -> TodayEntry {
        guard let file else {
            return TodayEntry(date: date, state: .noData, period: nil, placeName: nil, next: [], previous: nil)
        }
        let period = file.period(at: date)
        return TodayEntry(
            date: date,
            state: period == nil ? .stale : .ready,
            period: period,
            placeName: file.place.map { $0.name.isEmpty ? "Mon lieu" : $0.name },
            next: file.upcoming(after: date, count: 3),
            previous: file.previous(before: date)
        )
    }

    // Pour la galerie des widgets et les aperçus : un vendredi de Kislev à Marseille.
    static let sample: TodayEntry = {
        let now = Date()
        func zman(_ key: String, _ label: String, _ short: String, _ minutes: Double, _ time: String) -> TodayFile.Zman {
            TodayFile.Zman(key: key, label: label, short: short, at: (now.timeIntervalSince1970 + minutes * 60) * 1000, time: time)
        }
        let period = TodayFile.Period(
            start: (now.timeIntervalSince1970 - 3600) * 1000, end: (now.timeIntervalSince1970 + 3600 * 20) * 1000, weekday: 5,
            hebrew: "10 Kislev 5787", hebrewShort: "10 Kislev", hebrewLetters: "י׳ כסלו",
            parasha: "Vayétsé", parashaHe: "ויצא", tachanun: "morning", tachanunLabel: "Tahanoun le matin",
            feast: TodayFile.Feast(name: "Hanouka", when: "Dans 15 jours", ongoing: false, days: 15)
        )
        return TodayEntry(
            date: now, state: .ready, period: period, placeName: "Marseille",
            next: [zman("shkia", "Coucher", "Couch.", 72, "17:10"), zman("tzeit", "Sortie des étoiles", "Étoil.", 111, "17:49"),
                   zman("chatzotLayla", "Minuit", "Minuit", 506, "00:24")],
            previous: zman("plag", "Plag haMinha", "Plag", -47, "16:11")
        )
    }()
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry { .sample }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        if context.isPreview, TodayFile.load() == nil { completion(.sample); return }
        completion(TodayEntry.make(from: TodayFile.load(), at: Date()))
    }

    // Une entrée maintenant, puis à chaque horaire et à chaque changement de jour hébraïque des 36 prochaines heures : le widget avance tout
    // seul, sans réveiller l'app. Au-delà, iOS redemande une frise (et l'app en redemande une à chaque mise à jour des données).
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let now = Date()
        let file = TodayFile.load()
        guard let file else {
            completion(Timeline(entries: [TodayEntry.make(from: nil, at: now)], policy: .after(now.addingTimeInterval(6 * 3600))))
            return
        }
        let horizon = now.addingTimeInterval(36 * 3600)
        var dates: Set<Date> = [now]
        for z in file.zmanim where z.date > now && z.date <= horizon { dates.insert(z.date) }
        for p in file.periods {
            let start = Date(timeIntervalSince1970: p.start / 1000)
            let end = Date(timeIntervalSince1970: p.end / 1000)
            if start > now && start <= horizon { dates.insert(start) }
            if end > now && end <= horizon { dates.insert(end) }
        }
        let entries = dates.sorted().prefix(60).map { TodayEntry.make(from: file, at: $0) }
        let last = entries.last?.date ?? now
        completion(Timeline(entries: Array(entries), policy: .after(max(last, now.addingTimeInterval(15 * 60)))))
    }
}
