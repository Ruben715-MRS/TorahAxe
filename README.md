# TorahAxe
L'application tout-en-un de la vie juive et de l'étude de la Torah.

## Widgets de l'iPhone et de l'iPad (WidgetKit)

Une extension WidgetKit, `ios/App/TorahAxeWidgets` (Swift, SwiftUI), pour iOS 17 et suivants (l'app reste compatible avec iOS 15).
Couleurs de l'app (bleu nuit `#001a4b`, or `#d4a017`) ; en mode teinté ou transparent et sur l'écran verrouillé, iOS retire le fond.

- **« Aujourd'hui » (T1, T8)** : petit, moyen, écran verrouillé (une ligne, rectangle). Date hébraïque (elle change à la sortie des
  étoiles), paracha, Tahanoun, prochaine fête et prochains horaires du lieu choisi dans les Zmanim, avec les opinions des réglages.
- **« Prochain horaire » (T8)** : écran verrouillé (rond qui se remplit jusqu'au prochain zman, rectangle avec le temps restant).
- **« Zmanim du jour » (T2)** : moyen et grand ; tous les horaires du jour, le prochain en or, ceux qui sont passés estompés.
- **« Chabbat et fêtes » (T3)** : petit, moyen, écran verrouillé ; allumage, sortie, paracha et haftara du prochain Chabbat ou de la
  prochaine fête (une fête qui touche Chabbat forme une seule période).
- **« Étude du jour » (T4)** : moyen et grand ; Daf Yomi, Téhilim, Michna Yomit, Mitsva du jour (les cartes masquées dans les réglages
  le sont aussi) ; chaque ligne ouvre son texte.

- **« Compte de l'Omer » (T5)** : petit, écran verrouillé (jauge 23/49) ; le compte du jour hébraïque en cours, le reste de l'année le
  premier soir du compte.
- **« Dates personnelles » (T6)** : petit, moyen, écran verrouillé ; les prochaines Hazkarot et anniversaires hébraïques du registre. Les
  noms sont marqués privés (`privacySensitive`) : iOS les masque quand l'iPhone est verrouillé.
- **« Hilloulot » (T7)** : petit, moyen ; celles du jour, sinon les prochaines (data/hilloulot/hilloulot.json).
- **« À venir » (T9)** : petit, moyen, écran verrouillé ; prochaines fêtes et jeûnes avec le compte à rebours, fenêtre de Birkat haLévana.
  La Live Activity du vendredi (« Allumage dans 42 min ») n'est pas faite : iOS ne laisse démarrer une Live Activity que par l'app au
  premier plan ou par une notification push d'un serveur.

**D'où viennent les données.** Le widget ne calcule rien : `js/widgetDataCore.js` (pur, testé dans `tests/widgetDataCore.test.js`)
prépare les 30 prochains jours, et `js/app/widgets.js` les envoie au plugin natif `WidgetBridge` (`ios/App/App/WidgetBridgePlugin.swift`,
enregistré par `ios/App/App/MainViewController.swift`). Le plugin écrit `widget-data.json` dans l'App Group `group.com.torahaxe.app`, que
lit le widget (`TodayData.swift`). L'envoi a lieu à l'ouverture, à chaque retour au premier plan et quand le lieu ou une opinion des Zmanim
change. Sans ouverture de l'app pendant 30 jours, le widget demande de l'ouvrir.

**Toucher un widget** ouvre `torahaxe://widget/<écran>` : `today`, `zmanim`, `shabbat`, `daf`, `tehilim`, `mishna`, `mitsva`, `omer`, `dates`, `calendar` (schéma
déclaré dans `Info.plist`). Le lien est reçu par `SceneDelegate`, gardé par le plugin `WidgetBridge` (`takeRoute`) et la page est prévenue
par l'événement `axewidgetroute` ; il arrive aussi par le plugin App (`appUrlOpen`) : `js/app/widgets.js` n'ouvre l'écran qu'une fois.

Première compilation dans Xcode : choisir l'équipe de signature des cibles **App** et **TorahAxeWidgets** ; la capacité **App Groups**
(`group.com.torahaxe.app`) est déjà dans `App/App.entitlements` et `TorahAxeWidgets/TorahAxeWidgets.entitlements`, la signature
automatique l'enregistre auprès d'Apple. La version et le numéro de build de l'extension doivent rester ceux de l'app.
