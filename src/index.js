
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

  outlook.getEvents().then((events) => {

    if (events != null) {
      let ical = new iCalLoader(config.icloud);
      ical.upload(events);
    }

    //TODO quit when auth server was launched
    //     process.exit kills process too early as upload is a promise
    //process.exit(0);
  
  });

});
