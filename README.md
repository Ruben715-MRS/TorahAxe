# TorahAxe
L'application tout-en-un de la vie juive et de l'étude de la Torah.

## Widgets de l'iPhone et de l'iPad (WidgetKit)

Une extension WidgetKit, `ios/App/TorahAxeWidgets` (Swift, SwiftUI), pour iOS 17 et suivants (l'app reste compatible avec iOS 15).
Couleurs de l'app (bleu nuit `#001a4b`, or `#d4a017`) ; en mode teinté ou transparent et sur l'écran verrouillé, iOS retire le fond.

- **« Aujourd'hui » (T1, T8)** : petit, moyen, écran verrouillé (une ligne, rectangle). Date hébraïque (elle change à la sortie des
  étoiles), paracha, Tahanoun, prochaine fête et prochains horaires du lieu choisi dans les Zmanim, avec les opinions des réglages.
- **« Prochain horaire » (T8)** : écran verrouillé (rond qui se remplit jusqu'au prochain zman, rectangle avec le temps restant).

**D'où viennent les données.** Le widget ne calcule rien : `js/widgetDataCore.js` (pur, testé dans `tests/widgetDataCore.test.js`)
prépare les 30 prochains jours, et `js/app/widgets.js` les envoie au plugin natif `WidgetBridge` (`ios/App/App/WidgetBridgePlugin.swift`,
enregistré par `ios/App/App/MainViewController.swift`). Le plugin écrit `widget-today.json` dans l'App Group `group.com.torahaxe.app`, que
lit le widget (`TodayData.swift`). L'envoi a lieu à l'ouverture, à chaque retour au premier plan et quand le lieu ou une opinion des Zmanim
change. Sans ouverture de l'app pendant 30 jours, le widget demande de l'ouvrir.

**Toucher un widget** ouvre `torahaxe://widget/today` (l'accueil, onglet Aujourd'hui) ou `torahaxe://widget/zmanim` (le schéma
`torahaxe` est déclaré dans `Info.plist`).

Première compilation dans Xcode : choisir l'équipe de signature des cibles **App** et **TorahAxeWidgets** ; la capacité **App Groups**
(`group.com.torahaxe.app`) est déjà dans `App/App.entitlements` et `TorahAxeWidgets/TorahAxeWidgets.entitlements`, la signature
automatique l'enregistre auprès d'Apple. La version et le numéro de build de l'extension doivent rester ceux de l'app.
