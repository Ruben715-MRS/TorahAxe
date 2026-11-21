import Foundation
import WidgetKit

// Le fichier que l'app dépose pour ses widgets (js/widgetDataCore.js et js/app/widgets.js, via App/WidgetBridgePlugin.swift).
enum WidgetShared {
    static let appGroup = "group.com.torahaxe.app"   // à garder identique à WidgetBridgePlugin.appGroup
    static let dataFile = "widget-data.json"         // et à WidgetBridgePlugin.dataFile

    static func url(_ route: String) -> URL { URL(string: "torahaxe://widget/\(route)")! }
    static let todayURL = url("today")
    static let zmanimURL = url("zmanim")
    static let shabbatURL = url("shabbat")
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
        let omer: Int?                // le jour du compte de l'Omer (1 → 49), 0 hors de la période
        let omerText: String?         // « 23 jours, soit 3 semaines et 2 jours »
        let hilloulot: [HilloulaName]?
    }

    struct HilloulaName: Decodable, Hashable {
        let fr: String
        let he: String
        let bio: String
    }

    // --- Lot 3 ---
    struct DayLabel: Decodable {
        let day: String               // « 2027-04-22 »
        let label: String             // « jeudi 22 avril »
    }

    struct UpcomingFeast: Decodable, Hashable {
        let name: String
        let kind: String              // moed | minor | fast
        let day: String
        let label: String
        let ongoing: Bool
    }

    struct Levana: Decodable {
        let firstDay: String
        let firstLabel: String
        let lastDay: String
        let lastLabel: String
        let start: Double
        let end: Double
    }

    struct Hilloula: Decodable, Hashable {
        let fr: String
        let he: String
        let bio: String
        let hebrew: String            // « 19 Kislev »
        let day: String
        let label: String
    }

    struct PersonalDate: Decodable, Hashable {
        let name: String
        let type: String              // hazkara | birthday | other
        let kind: String              // « Hazkara », « Anniversaire »
        let years: String
        let hebrew: String
        let day: String
        let label: String
    }

    struct Zman: Decodable, Hashable {
        let key: String
        let label: String
        let short: String
        let at: Double
        let time: String              // « 17:49 », dans le fuseau du lieu
        let day: String?              // le jour civil auquel il appartient, « 2026-11-19 »

        var date: Date { Date(timeIntervalSince1970: at / 1000) }
    }

    struct StudyItem: Decodable, Hashable {
        let text: String
        let sub: String
        let he: String?
    }

    struct Study: Decodable {
        let daf: StudyItem?
        let tehilim: StudyItem?
        let mishna: StudyItem?
        let mitsva: StudyItem?
    }

    // Un jour civil (de minuit à minuit, dans le fuseau du lieu) : son nom et l'étude du jour.
    struct CivilDay: Decodable {
        let day: String
        let start: Double
        let end: Double
        let label: String             // « jeudi 19 novembre »
        let study: Study
    }

    // Un Chabbat ou une fête, de l'allumage des bougies à la havdala.
    struct Holy: Decodable {
        let name: String              // « Chabbat Vayétsé », « Roch Hachana · Chabbat »
        let kind: String              // shabbat | yomtov | both
        let start: Double?
        let startTime: String?
        let startDay: String
        let end: Double?
        let endTime: String?
        let endDay: String
        let parasha: String?
        let haftara: String?

        var startDate: Date? { start.map { Date(timeIntervalSince1970: $0 / 1000) } }
        var endDate: Date? { end.map { Date(timeIntervalSince1970: $0 / 1000) } }
    }

    struct StudyCards: Decodable {
        let daf: Bool
        let tehilim: Bool
        let mishna: Bool
        let mitsva: Bool
    }

    let v: Int
    let generatedAt: Double
    let place: Place?
    let tz: String
    let periods: [Period]
    let zmanim: [Zman]
    let days: [CivilDay]?
    let holy: [Holy]?
    let studyCards: StudyCards?
    let omerStart: DayLabel?
    let feasts: [UpcomingFeast]?
    let levana: Levana?
    let hilloulotNext: [Hilloula]?
    let dates: [PersonalDate]?

    // Le nombre de jours entre aujourd'hui (dans le fuseau du lieu) et le jour « 2026-12-05 » ; négatif s'il est passé.
    func daysUntil(_ key: String, from date: Date) -> Int? {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: tz) ?? .current
        let p = key.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3, let target = cal.date(from: DateComponents(year: p[0], month: p[1], day: p[2])) else { return nil }
        return cal.dateComponents([.day], from: cal.startOfDay(for: date), to: target).day
    }

    static func load() -> TodayFile? {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: WidgetShared.appGroup),
              let data = try? Data(contentsOf: dir.appendingPathComponent(WidgetShared.dataFile)) else { return nil }
        return try? JSONDecoder().decode(TodayFile.self, from: data)
    }

    func period(at date: Date) -> Period? {
        let ms = date.timeIntervalSince1970 * 1000
        return periods.first { $0.start <= ms && ms < $0.end }
    }

    func civilDay(at date: Date) -> CivilDay? {
        let ms = date.timeIntervalSince1970 * 1000
        return days?.first { $0.start <= ms && ms < $0.end }
    }

    func upcoming(after date: Date, count: Int) -> [Zman] {
        let ms = date.timeIntervalSince1970 * 1000
        return Array(zmanim.filter { $0.at > ms }.prefix(count))
    }

    func previous(before date: Date) -> Zman? {
        let ms = date.timeIntervalSince1970 * 1000
        return zmanim.last { $0.at <= ms }
    }

    // Le Chabbat ou la fête en cours, sinon le prochain.
    func currentHoly(at date: Date) -> Holy? {
        let ms = date.timeIntervalSince1970 * 1000
        return holy?.first { ($0.end ?? .infinity) > ms }
    }

    // Tous les instants où un widget change d'aspect.
    var changeDates: [Date] {
        var ms: [Double] = zmanim.map(\.at)
        ms += periods.flatMap { [$0.start, $0.end] }
        ms += (days ?? []).flatMap { [$0.start, $0.end] }
        ms += (holy ?? []).flatMap { [$0.start, $0.end].compactMap { $0 } }
        return ms.map { Date(timeIntervalSince1970: $0 / 1000) }
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
    let civilDay: TodayFile.CivilDay?
    let dayZmanim: [TodayFile.Zman]   // les horaires du jour civil
    let holy: TodayFile.Holy?
    let studyCards: TodayFile.StudyCards?
    var file: TodayFile? = nil        // tout le fichier, pour les widgets du lot 3

    var hasPlace: Bool { placeName != nil }

    static func make(from file: TodayFile?, at date: Date) -> TodayEntry {
        guard let file else {
            return TodayEntry(date: date, state: .noData, period: nil, placeName: nil, next: [], previous: nil,
                              civilDay: nil, dayZmanim: [], holy: nil, studyCards: nil)
        }
        let period = file.period(at: date)
        let civil = file.civilDay(at: date)
        return TodayEntry(
            date: date,
            state: period == nil ? .stale : .ready,
            period: period,
            placeName: file.place.map { $0.name.isEmpty ? "Mon lieu" : $0.name },
            next: file.upcoming(after: date, count: 3),
            previous: file.previous(before: date),
            civilDay: civil,
            dayZmanim: civil.map { day in file.zmanim.filter { $0.day == day.day } } ?? [],
            holy: file.currentHoly(at: date),
            studyCards: file.studyCards,
            file: file
        )
    }

    // Pour la galerie des widgets et les aperçus : un jeudi de Kislev à Marseille.
    static let sample: TodayEntry = {
        let now = Date()
        let base = now.timeIntervalSince1970
        func zman(_ key: String, _ label: String, _ short: String, _ minutes: Double, _ time: String) -> TodayFile.Zman {
            TodayFile.Zman(key: key, label: label, short: short, at: (base + minutes * 60) * 1000, time: time, day: "2026-11-19")
        }
        let all = [
            zman("alot", "Aube", "Aube", -560, "06:08"), zman("netz", "Lever", "Lever", -471, "07:37"),
            zman("shemaGra", "Fin du Chéma", "Chéma", -328, "10:00"), zman("tefilaGra", "Fin de la Téfila", "Téfila", -281, "10:47"),
            zman("chatzot", "Midi solaire", "Midi", -184, "12:24"), zman("minchaGedola", "Minha Guédola", "Minha", -154, "12:54"),
            zman("plag", "Plag haMinha", "Plag", -47, "16:11"), zman("shkia", "Coucher", "Couch.", 12, "17:10"),
            zman("tzeit", "Sortie des étoiles", "Étoil.", 51, "17:49"), zman("chatzotLayla", "Minuit", "Minuit", 446, "00:24")
        ]
        let period = TodayFile.Period(
            start: (base - 3600) * 1000, end: (base + 3600 * 20) * 1000, weekday: 4,
            hebrew: "9 Kislev 5787", hebrewShort: "9 Kislev", hebrewLetters: "ט׳ כסלו",
            parasha: "Vayétsé", parashaHe: "ויצא", tachanun: "yes", tachanunLabel: "Avec Tahanoun",
            feast: TodayFile.Feast(name: "Hanouka", when: "Dans 16 jours", ongoing: false, days: 16),
            omer: 0, omerText: nil, hilloulot: []
        )
        let study = TodayFile.Study(
            daf: TodayFile.StudyItem(text: "Arakhin 2", sub: "Jours restants dans le traité : 32", he: "ערכין ב׳"),
            tehilim: TodayFile.StudyItem(text: "49–54", sub: "Jour 9 du mois hébraïque", he: nil),
            mishna: TodayFile.StudyItem(text: "Nega’im 1:4-5", sub: "305 jours avant la fin du cycle", he: nil),
            mitsva: TodayFile.StudyItem(text: "Permettre à l'ouvrier de manger de ce qu'il travaille", sub: "Mitsva positive n° 201 · Deutéronome 23:25-26", he: nil)
        )
        let day = TodayFile.CivilDay(day: "2026-11-19", start: (base - 3600 * 17) * 1000, end: (base + 3600 * 7) * 1000, label: "jeudi 19 novembre", study: study)
        let holy = TodayFile.Holy(name: "Chabbat Vayétsé", kind: "shabbat", start: (base + 3600 * 23) * 1000, startTime: "16:52",
                                  startDay: "vendredi 20 novembre", end: (base + 3600 * 48) * 1000, endTime: "17:56", endDay: "samedi 21 novembre",
                                  parasha: "Vayétsé", haftara: "Osée 11:7–12:12")
        return TodayEntry(
            date: now, state: .ready, period: period, placeName: "Marseille",
            next: Array(all[7...9]), previous: all[6], civilDay: day, dayZmanim: all, holy: holy,
            studyCards: TodayFile.StudyCards(daf: true, tehilim: true, mishna: true, mitsva: true)
        )
    }()
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry { .sample }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        let file = TodayFile.load()
        if context.isPreview, file == nil { completion(.sample); return }
        completion(TodayEntry.make(from: file, at: Date()))
    }

    // Une entrée maintenant, puis à chaque instant où quelque chose change (un horaire, un jour hébraïque ou civil, un Chabbat) dans les
    // 36 prochaines heures : le widget avance tout seul, sans réveiller l'app. Au-delà, iOS redemande une frise (et l'app en redemande une
    // à chaque mise à jour des données).
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let now = Date()
        guard let file = TodayFile.load() else {
            completion(Timeline(entries: [TodayEntry.make(from: nil, at: now)], policy: .after(now.addingTimeInterval(6 * 3600))))
            return
        }
        let horizon = now.addingTimeInterval(36 * 3600)
        var dates: Set<Date> = [now]
        for d in file.changeDates where d > now && d <= horizon { dates.insert(d) }
        let entries = dates.sorted().prefix(80).map { TodayEntry.make(from: file, at: $0) }
        let last = entries.last?.date ?? now
        completion(Timeline(entries: Array(entries), policy: .after(max(last, now.addingTimeInterval(15 * 60)))))
    }
}
