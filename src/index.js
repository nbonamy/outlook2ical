
const OutlookLoader = require('./outlook.js');
const iCalLoader = require('./ical.js');
const yamlConfig = require('config-yaml');

const CONFIG_PATH = '../config/config.yml';

// load config
let config = null;
try {
  config = yamlConfig(__dirname + '/' + CONFIG_PATH);
} catch {}

// check
if (config == null || config.icloud == null || config.icloud.username == null || config.icloud.password == null || config.icloud.calendarName == null) {
  console.log('Invalid configuration in ' + CONFIG_PATH)
  return;
}

// init outlook
let outlook = new OutlookLoader(config.outlook);
outlook.auth().then(() => {

  outlook.get().then((events) => {

    if (events != null) {
      let ical = new iCalLoader(config.icloud);
      ical.upload(events);  
    }

    // done
    process.exit(0);
  
  });

});
