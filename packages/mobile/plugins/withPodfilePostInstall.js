const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withPodfilePostInstall = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');
      
      const patch = `
# Workaround for Xcode 14+ resource bundle signing error
post_install do |installer|
  installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
    target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
      resource_bundle_target.build_configurations.each do |config|
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
      end
    end
  end
end
`;

      if (!contents.includes("resource_bundle_targets")) {
        contents += patch;
        fs.writeFileSync(podfilePath, contents, 'utf-8');
        console.log('Successfully appended resource bundle signing workaround to Podfile');
      }
      return config;
    },
  ]);
};

module.exports = withPodfilePostInstall;
