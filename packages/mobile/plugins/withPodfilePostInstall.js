const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withPodfilePostInstall = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');
      
      const targetRegex = /post_install\s+do\s+\|installer\|/;
      
      console.log('--- withPodfilePostInstall DIAGNOSTICS ---');
      console.log('Checking Podfile for post_install do |installer| block...');
      
      if (!targetRegex.test(contents)) {
        console.log('ERROR: Could not find post_install do |installer| block. Printing Podfile contents:');
        console.log(contents);
        throw new Error('CRITICAL ERROR: withPodfilePostInstall plugin could not find post_install block in Podfile!');
      }

      const replacementString = `post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.respond_to?(:product_type) and target.product_type == "com.apple.product-type.bundle"
      target.build_configurations.each do |config|
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
      end
    end
  end`;

      if (!contents.includes("product-type.bundle")) {
        contents = contents.replace(targetRegex, replacementString);
        fs.writeFileSync(podfilePath, contents, 'utf-8');
        console.log('Successfully injected resource bundle signing workaround into Podfile');
      } else {
        console.log('Workaround already injected, skipping.');
      }
      return config;
    },
  ]);
};

module.exports = withPodfilePostInstall;
