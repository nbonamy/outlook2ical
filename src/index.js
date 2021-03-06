
const OutlookLoader = require('./outlook.js');
const EventProcessor = require('./processor.js');
const iCalUploader = require('./ical.js');
const yamlConfig = require('config-yaml');
const process = require('process');

const CONFIG_PATH = '../config/config.yml';

// log
console.log('* ' + new Date().toString());

// load config
let config = null;
try {
  config = yamlConfig(__dirname + '/' + CONFIG_PATH);
} catch {}

// check
if (config == null || config.icloud == null || config.icloud.username == null || config.icloud.password == null || config.icloud.calendarName == null) {
  console.log('Invalid configuration in ' + CONFIG_PATH);
  return;
}

// init outlook
let outlook = new OutlookLoader(config.outlook);
outlook.auth().then(() => {

  // get events
  outlook.getEvents().then((events) => {

    if (events != null) {

      // process
      let processor = new EventProcessor(config.process);
      processor.process(events).then((events) => {

        // ical uploader
        let ical = new iCalUploader(config.icloud);
        ical.upload(events).then(() => {

          // explicit exit as express may have been started
          // and even a stop on the server leaves main process hanging
          process.exit(0);
        
        });
      
      });

    } else {

      // explicit exit as express may have been started
      // and even a stop on the server leaves main process hanging
      process.exit(0);

    }

  });

});
