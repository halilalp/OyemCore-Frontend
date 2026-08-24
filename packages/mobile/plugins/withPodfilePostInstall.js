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
    target.build_configurations.each do |config|
      config.build_settings['DEVELOPMENT_TEAM'] = 'NY3T5SAC9V'
    end
  end`;

      if (!contents.includes("NY3T5SAC9V")) {
        contents = contents.replace(targetRegex, replacementString);
        fs.writeFileSync(podfilePath, contents, 'utf-8');
        console.log('Successfully injected DEVELOPMENT_TEAM workaround into Podfile');
      } else {
        console.log('Workaround already injected, skipping.');
      }
      return config;
    },
  ]);
};

module.exports = withPodfilePostInstall;
