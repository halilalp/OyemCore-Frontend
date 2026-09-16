const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// $RNFirebaseDisableSPM = true (bkz. withRNFirebaseDisableSPM.js) Firebase'i CocoaPods'a
// düşürüyor, ama bu proje `use_frameworks!` (statik) kullandığından CocoaPods artık AYRI bir
// hatayla karşılaşıyor: FirebaseCoreInternal (bir Swift pod) GoogleUtilities'e bağımlı, ama
// GoogleUtilities modül tanımlamıyor — statik kütüphane olarak entegre edilemiyor
// ("The following Swift pods cannot yet be integrated as static libraries").
// Resmi/yaygın çözüm: bu pod'lara :modular_headers => true vermek (CocoaPods'un kendi hata
// mesajının önerdiği çözüm). Podfile'da "post_install do |installer|" satırından hemen önce
// (yani hâlâ target bloğunun içinde) explicit pod bildirimleri olarak ekleniyor —
// withPodfilePostInstall.js'in kullandığı AYNI, güvenilir sabit metin çapası.
//
// NOT: RNCallKeep/RNVoipPushNotification İÇİN AYNI TEKNİK KULLANILAMAZ — bunlar (Firebase
// pod'larının aksine) React Native autolinking tarafından zaten `:path => '../../../node_modules/...'`
// ile bildiriliyor; buraya ikinci bir `pod 'RNCallKeep', ...` satırı eklemek CocoaPods'un
// "multiple dependencies with different sources" hatasıyla durmasına yol açtı (denendi, geri
// alındı). Onlar için withPodfilePostInstall.js'teki CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES
// ayarı kullanılıyor (pod'u yeniden bildirmeden, mevcut autolink edilmiş target'a build setting olarak uygulanıyor).
const MODULAR_HEADER_PODS = [
  'GoogleUtilities',
  'GoogleDataTransport',
  'nanopb',
  'FirebaseCore',
  'FirebaseCoreInternal',
  'FirebaseCoreExtension',
  'FirebaseInstallations',
];

const withFirebaseModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      const marker = '# withFirebaseModularHeaders';
      if (contents.includes(marker)) {
        return config;
      }

      const targetRegex = /post_install\s+do\s+\|installer\|/;
      if (!targetRegex.test(contents)) {
        console.log('ERROR: withFirebaseModularHeaders - post_install do |installer| bloğu bulunamadı. Podfile içeriği:');
        console.log(contents);
        throw new Error('CRITICAL ERROR: withFirebaseModularHeaders plugin could not find post_install block in Podfile!');
      }

      const podLines = `${marker} — bkz. https://github.com/firebase/firebase-ios-sdk static-linkage modular headers gereksinimi\n` +
        MODULAR_HEADER_PODS.map((name) => `  pod '${name}', :modular_headers => true`).join('\n') +
        `\n\n`;

      contents = contents.replace(targetRegex, (match) => podLines + match);
      fs.writeFileSync(podfilePath, contents, 'utf-8');
      console.log('withFirebaseModularHeaders: Firebase modular_headers pod bildirimleri eklendi.');

      return config;
    },
  ]);
};

module.exports = withFirebaseModularHeaders;
