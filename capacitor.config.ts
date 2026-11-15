import type { CapacitorConfig } from '@capacitor/cli';

// webDir = « www » : la sortie de `npm run build:native` (scripts/build.js), qui ne copie que ce que l'app
// embarque. Pointer sur la racine embarquerait scripts/, node_modules/… dans le binaire.
const config: CapacitorConfig = {
  appId: 'com.torahaxe.app',
  appName: 'TorahAxe',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    // Domaine du site Vercel de TorahAxe, à ajuster une fois déployé.
    allowNavigation: ['torahaxe.vercel.app'],
  },
  ios: {
    // Les marges de sécurité sont gérées par le CSS (body, env(safe-area-inset-*)) :
    // ne pas les ajouter une seconde fois côté WebView.
    contentInset: 'never',
    backgroundColor: '#F2F4F7',
    allowsLinkPreview: false,
    handleApplicationURL: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#001a4b',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#d4a017',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DEFAULT',
      overlaysWebView: true
    },
    Haptics: {
      enabled: true
    }
  }
};

export default config;
