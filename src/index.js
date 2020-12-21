
const OutlookLoader = require('./outlook.js');
const iCalUploader = require('./ical.js');
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

  outlook.getEvents().then((events) => {

    if (events != null) {

      // ical uploader
      let ical = new iCalUploader(config.icloud);
      ical.upload(events).then(() => {

        // explicit exit as express may have been started
        // and even a stop on the server leaves main process hanging
        process.exit(0);
      
      });
    
    } else {

      // explicit exit as express may have been started
      // and even a stop on the server leaves main process hanging
      process.exit(0);

    }

  });

});
