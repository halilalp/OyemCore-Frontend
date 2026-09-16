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
// AYNI KÖK NEDEN RNCallKeep/RNVoipPushNotification İÇİN DE GEÇERLİ: bu pod'lar modül
// tanımlamıyor, bu yüzden withIosVoipPushDelegate.js'in oluşturduğu Objective-C bridging
// header üzerinden import edilseler bile statik framework linkajında Swift derleyicisi
// sembollerini göremiyor ("cannot find 'RNCallKeep' in scope" hatası). Aynı :modular_headers
// => true çözümü buraya da uygulanıyor.
const MODULAR_HEADER_PODS = [
  'GoogleUtilities',
  'GoogleDataTransport',
  'nanopb',
  'FirebaseCore',
  'FirebaseCoreInternal',
  'FirebaseCoreExtension',
  'FirebaseInstallations',
  'RNCallKeep',
  'RNVoipPushNotification',
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
