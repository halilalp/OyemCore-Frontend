const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// iOS: uygulama tamamen kapalıyken/arka plandayken PushKit VoIP push ile native CallKit tam
// ekran arama arayüzünü uyandırmak için gereken native kanca. react-native-callkeep JS API'si
// (CallProvider.tsx -> nativeCallBridge.ts, wireNativeCallEvents) zaten answerCall/endCall
// olaylarını platform bağımsız dinliyor — burada eksik olan TEK şey, PKPushRegistry'nin
// AppDelegate'in EN ERKEN yaşam döngüsünde kurulup RNCallKeep.reportNewIncomingCall'a
// bağlanması (bu, uygulama tamamen kapalıyken bile OS'un uygulamayı uyandırıp push'u teslim
// etmesi için ŞART — JS tarafından SONRADAN kurulması güvenilmez).
//
// RNVoipPushNotificationManager kendi voipRegistration() metodunda PKPushRegistry.delegate'i
// DOĞRUDAN AppDelegate'e atıyor (bkz. RNVoipPushNotificationManager.m) — bu yüzden AppDelegate'in
// kendisi PKPushRegistryDelegate'e uymalı. RNCallKeep Swift'ten `import RNCallKeep` ile
// GÖRÜNMÜYOR (bilinen kütüphane kısıtı) — bunun yerine bir Objective-C bridging header üzerinden
// erişiliyor (bkz. react-native-webrtc/react-native-callkeep#856 topluluk çözümü).
//
// NOT: Bu dosyanın regex'leri, Expo'nun ios/ klasörünü YALNIZCA EAS Build'in macOS
// çalıştırıcılarında ÜRETTİĞİ AppDelegate.swift'in gerçek içeriğini GÖRMEDEN yazıldı (Windows'ta
// prebuild çalıştırılamıyor). Eşleşmezse SESSİZCE YANLIŞ bir dosya üretmek yerine anlaşılır bir
// hatayla ve GERÇEK dosya içeriğini log'a basarak durur — bu sayede bir sonraki denemede kesin
// doğru regex yazılabilir.

const BRIDGING_HEADER_CONTENT = `// withIosVoipPushDelegate tarafından oluşturuldu.
// RNCallKeep ve RNVoipPushNotificationManager Swift'ten "import" ile görünmüyor (bilinen kütüphane
// kısıtı) — bu bridging header üzerinden Objective-C sınıfları olarak erişiliyor.
#import <RNCallKeep/RNCallKeep.h>
#import <RNVoipPushNotification/RNVoipPushNotificationManager.h>
`;

function findAppDelegateSwift(iosRoot) {
  const entries = fs.readdirSync(iosRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'Pods' && entry.name !== 'build') {
      const candidate = path.join(iosRoot, entry.name, 'AppDelegate.swift');
      if (fs.existsSync(candidate)) {
        return { filePath: candidate, dirName: entry.name };
      }
    }
  }
  return null;
}

const withIosVoipPushDelegate = (config) => {
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const found = findAppDelegateSwift(iosRoot);

      if (!found) {
        const listing = fs.readdirSync(iosRoot).join(', ');
        throw new Error(
          `CRITICAL ERROR: withIosVoipPushDelegate - AppDelegate.swift bulunamadi. ios/ icerigi: ${listing}`
        );
      }

      const { filePath, dirName } = found;
      let contents = fs.readFileSync(filePath, 'utf-8');

      const marker = '// withIosVoipPushDelegate';
      if (contents.includes(marker)) {
        return config;
      }

      // --- Bridging header dosyasını oluştur (AppDelegate.swift ile aynı klasöre) ---
      const bridgingHeaderPath = path.join(iosRoot, dirName, 'OyemCoreVoip-Bridging-Header.h');
      fs.writeFileSync(bridgingHeaderPath, BRIDGING_HEADER_CONTENT, 'utf-8');

      // --- PKPushRegistryDelegate uyumu class bildirimine ekle ---
      const classDeclRegex = /class\s+AppDelegate\s*:\s*([^\{]+)\{/;
      const classMatch = contents.match(classDeclRegex);
      if (!classMatch) {
        console.log('ERROR: withIosVoipPushDelegate - "class AppDelegate : ..." bildirimi bulunamadi. Dosya icerigi:');
        console.log(contents);
        throw new Error('CRITICAL ERROR: withIosVoipPushDelegate could not find AppDelegate class declaration!');
      }
      if (!classMatch[1].includes('PKPushRegistryDelegate')) {
        const newDecl = classMatch[0].replace(classMatch[1], `${classMatch[1].trim()}, PKPushRegistryDelegate `);
        contents = contents.replace(classDeclRegex, newDecl);
      }

      // --- import PushKit ekle (ilk "import" satırından hemen sonra) ---
      if (!contents.includes('import PushKit')) {
        contents = contents.replace(/^(import .+\n)/m, `$1import PushKit\n`);
      }

      // --- didFinishLaunchingWithOptions içine CallKeep + VoIP push kurulumunu ekle ---
      // Anchor: "return true" veya "return super.application(...didFinishLaunchingWithOptions...)"
      // satırından hemen ÖNCE — Expo şablonlarında didFinishLaunchingWithOptions'ın SON satırı budur.
      const returnAnchorRegex = /(\n[ \t]*)(return (?:true|super\.application\([^\n]*didFinishLaunchingWithOptions[^\n]*\)))/;
      const returnMatch = contents.match(returnAnchorRegex);
      if (!returnMatch) {
        console.log('ERROR: withIosVoipPushDelegate - didFinishLaunchingWithOptions icindeki "return" satiri bulunamadi. Dosya icerigi:');
        console.log(contents);
        throw new Error('CRITICAL ERROR: withIosVoipPushDelegate could not find the return statement in didFinishLaunchingWithOptions!');
      }

      const setupBlock = `${marker}
    let __oyemAppName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "OyemCore"
    RNCallKeep.setup([
      "appName": __oyemAppName,
      "supportsVideo": true,
      "includesCallsInRecents": false,
      "maximumCallGroups": 1,
      "maximumCallsPerCallGroup": 1,
    ])
    RNVoipPushNotificationManager.voipRegistration()
`;

      contents = contents.replace(returnAnchorRegex, `${returnMatch[1]}${setupBlock}${returnMatch[1]}${returnMatch[2]}`);

      // --- PKPushRegistryDelegate metodlarını sınıfın SONUNA (son "}" öncesine) ekle ---
      const delegateMethods = `
    // MARK: - ${marker}: PushKit
    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        RNVoipPushNotificationManager.didUpdate(pushCredentials, forType: type.rawValue)
    }

    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        RNVoipPushNotificationManager.addCompletionHandler(UUID().uuidString, completionHandler: completion)
        RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: type.rawValue)

        let data = payload.dictionaryPayload
        let uuid = UUID().uuidString
        let callerSicilNo = data["callerSicilNo"] as? String ?? ""
        let callerName = data["callerName"] as? String ?? "Arayan"

        RNCallKeep.reportNewIncomingCall(
            uuid,
            handle: callerSicilNo,
            handleType: "generic",
            hasVideo: true,
            localizedCallerName: callerName,
            supportsHolding: true,
            supportsDTMF: true,
            supportsGrouping: true,
            supportsUngrouping: true,
            fromPushKit: true,
            payload: data,
            withCompletionHandler: nil
        )
    }
`;

      // AppDelegate class'ının GERÇEK kapanış parantezini bulmak için, dosyanın SON "}"'ını
      // varsaymak yerine (Expo şablonlarında AppDelegate'ten SONRA başka class'lar da olabiliyor —
      // bkz. ReactNativeDelegate/ExpoReactNativeFactoryDelegate — bu varsayım yanlış yere ekleme
      // yapıp "does not conform to protocol" hatasına yol açtı), class'ın açılış parantezinden
      // itibaren parantez derinliğini SAYARAK gerçek kapanışı buluyoruz. String literal içindeki
      // süslü parantezleri (ör. interpolasyon olmayan düz string'ler) yanlış saymamak için basit
      // bir "çift tırnak içindeyiz" takibi de var.
      const freshClassMatch = classDeclRegex.exec(contents);
      if (!freshClassMatch) {
        console.log('ERROR: withIosVoipPushDelegate - kapanis parantezi icin AppDelegate class bildirimi tekrar bulunamadi. Dosya icerigi:');
        console.log(contents);
        throw new Error('CRITICAL ERROR: withIosVoipPushDelegate could not re-find AppDelegate class declaration for brace counting!');
      }
      const bodyStart = freshClassMatch.index + freshClassMatch[0].length;
      let depth = 1;
      let i = bodyStart;
      let inString = false;
      while (i < contents.length && depth > 0) {
        const ch = contents[i];
        if (inString) {
          if (ch === '\\') { i += 2; continue; }
          if (ch === '"') inString = false;
        } else {
          if (ch === '"') inString = true;
          else if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        i++;
      }
      if (depth !== 0) {
        console.log('ERROR: withIosVoipPushDelegate - AppDelegate class kapanis parantezi dengelenemedi. Dosya icerigi:');
        console.log(contents);
        throw new Error('CRITICAL ERROR: withIosVoipPushDelegate could not balance braces to find AppDelegate class closing brace!');
      }
      const classCloseIndex = i - 1;
      contents = contents.slice(0, classCloseIndex) + delegateMethods + '\n' + contents.slice(classCloseIndex);

      fs.writeFileSync(filePath, contents, 'utf-8');
      console.log(`withIosVoipPushDelegate: AppDelegate.swift (${dirName}/AppDelegate.swift) ve bridging header basariyla guncellendi.`);

      return config;
    },
  ]);

  // --- SWIFT_OBJC_BRIDGING_HEADER build ayarını ekle ---
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const iosRoot = config.modRequest.platformProjectRoot;
    const found = findAppDelegateSwift(iosRoot);
    if (!found) {
      // withDangerousMod zaten bu durumda throw etmiş olmalı; buraya asla ulaşmamalı.
      return config;
    }
    const bridgingHeaderRelativePath = `${found.dirName}/OyemCoreVoip-Bridging-Header.h`;

    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const buildSettings = configurations[key]?.buildSettings;
      if (buildSettings && buildSettings.PRODUCT_NAME && !buildSettings.SWIFT_OBJC_BRIDGING_HEADER) {
        buildSettings.SWIFT_OBJC_BRIDGING_HEADER = `"${bridgingHeaderRelativePath}"`;
      }
    }

    return config;
  });

  return config;
};

module.exports = withIosVoipPushDelegate;
