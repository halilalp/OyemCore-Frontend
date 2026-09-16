const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// react-native-firebase (RN >= 0.75) varsayılan olarak Firebase'i Swift Package Manager (SPM)
// üzerinden çözer. Bu proje `use_frameworks! :linkage => :static` kullanıyor (Daily.co/WebRTC
// gereksinimi, bkz. @daily-co/config-plugin-rn-daily-js) — SPM'in "automatic" (statik) ürünleri
// her pod'a kendi Firebase kopyasını gömdüğü için, static linkage ile birleşince link
// aşamasında "duplicate symbol" hatası veriyor (react-native-firebase kendi firebase_spm.rb
// dosyasında bunu açıkça belgeliyor). Çözüm: $RNFirebaseDisableSPM = true ile SPM'i devre dışı
// bırakıp RNFB'yi klasik CocoaPods çözümlemesine zorlamak — Podfile'ın EN BAŞINA eklenmeli ki
// pod install'ın Firebase podspec'lerini değerlendirdiği an bu global değişken tanımlı olsun.
const withRNFirebaseDisableSPM = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      const marker = '$RNFirebaseDisableSPM = true';

      if (contents.includes(marker)) {
        return config;
      }

      contents = `# withRNFirebaseDisableSPM: use_frameworks! :linkage => :static ile SPM duplicate-symbol\n# çakışmasını önler (bkz. @react-native-firebase/app/firebase_spm.rb)\n${marker}\n\n${contents}`;
      fs.writeFileSync(podfilePath, contents, 'utf-8');
      console.log('withRNFirebaseDisableSPM: Podfile basina $RNFirebaseDisableSPM = true eklendi.');

      return config;
    },
  ]);
};

module.exports = withRNFirebaseDisableSPM;
