import Foundation

// Les données d'exemple des widgets du lot 3 (Omer, dates personnelles, hilloulot, À venir), pour la galerie des widgets et les aperçus
// d'Xcode : un fichier comme celui de l'app, écrit autour d'aujourd'hui pour que les « dans N jours » restent justes.
enum Lot3Sample {
    static func file(now: Date = Date(), omer: Int = 0) -> TodayFile? {
        let cal = Calendar.current
        func key(_ days: Int) -> String {
            let d = cal.date(byAdding: .day, value: days, to: now) ?? now
            let c = cal.dateComponents([.year, .month, .day], from: d)
            return String(format: "%04ld-%02ld-%02ld", c.year ?? 2026, c.month ?? 1, c.day ?? 1)
        }
        let ms = now.timeIntervalSince1970 * 1000
        let omerText = omer > 0 ? "\"\(omer) jours, soit 3 semaines et 2 jours\"" : "null"
        let json = """
        {"v":3,"generatedAt":\(ms),"place":{"name":"Marseille","tz":"\(TimeZone.current.identifier)","israel":false},"tz":"\(TimeZone.current.identifier)",
         "periods":[{"start":\(ms - 3_600_000),"end":\(ms + 72_000_000),"weekday":0,"hebrew":"19 Kislev 5787","hebrewShort":"19 Kislev",
           "hebrewLetters":"י״ט כסלו","parasha":"Vayéchev","parashaHe":"וישב","tachanun":"yes","tachanunLabel":"Avec Tahanoun","feast":null,
           "omer":\(omer),"omerText":\(omerText),
           "hilloulot":[{"fr":"Rabbi Dov Ber, le Maguid de Mézéritch","he":"המגיד ממזריטש","bio":"Successeur du Baal Chem Tov et maître de la deuxième génération 'hassidique."}]}],
         "zmanim":[],
         "omerStart":{"day":"\(key(150))","label":"jeudi 22 avril"},
         "feasts":[{"name":"Hanouka","kind":"minor","day":"\(key(6))","label":"samedi 5 décembre","ongoing":false},
                   {"name":"Jeûne du 10 Tévet","kind":"fast","day":"\(key(21))","label":"dimanche 20 décembre","ongoing":false},
                   {"name":"Tou Bichvat","kind":"minor","day":"\(key(55))","label":"samedi 23 janvier","ongoing":false}],
         "levana":{"firstDay":"\(key(-3))","firstLabel":"lundi 16 novembre","lastDay":"\(key(4))","lastLabel":"lundi 23 novembre",
                   "start":\(ms - 259_200_000),"end":\(ms + 345_600_000)},
         "hilloulotNext":[{"fr":"Rabbi Dov Ber, le Maguid de Mézéritch","he":"המגיד ממזריטש","bio":"Successeur du Baal Chem Tov.","hebrew":"19 Kislev","day":"\(key(0))","label":"aujourd'hui"},
                          {"fr":"Rabbi Moché ben Maïmon (Rambam)","he":"הרמב\\"ם","bio":"Médecin, philosophe et codificateur.","hebrew":"20 Tévet","day":"\(key(31))","label":"mercredi 30 décembre"}],
         "dates":[{"name":"Grand-père Élie","type":"hazkara","kind":"Hazkara","years":"17 ans depuis le décès","hebrew":"3 Tévet","day":"\(key(14))","label":"dimanche 13 décembre"},
                  {"name":"Sarah","type":"birthday","kind":"Anniversaire","years":"9 ans","hebrew":"2 Chevat","day":"\(key(42))","label":"lundi 11 janvier"}]}
        """
        return try? JSONDecoder().decode(TodayFile.self, from: Data(json.utf8))
    }

    static func entry(now: Date = Date(), omer: Int = 0) -> TodayEntry {
        let file = file(now: now, omer: omer)
        var e = TodayEntry.make(from: file, at: now)
        if file == nil { e = TodayEntry.sample }
        return e
    }
}
