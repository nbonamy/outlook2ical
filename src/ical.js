const dav = require('dav');
const ics = require('ics');

const ICLOUD_CAL_URL = 'https://caldav.icloud.com/';

class iCalUploader {

  constructor(options) {

    // we will need this a lot
    this.xhr = new dav.transport.Basic(
      new dav.Credentials({
        username: options.username,
        password: options.password
      })
    )

    // save this
    this.calendarName = options.calendarName;

  }

  upload(events) {

    // save
    var self = this;

    return new Promise(function (resolve, reject) {

      // do it
      console.log('* Loading iCloud calendars');
      dav.createAccount({ server: ICLOUD_CAL_URL, xhr: self.xhr, loadCollections: true, loadObjects: true }).then((account) => {

        account.calendars.forEach((calendar) => {

          // find calendar
          if (calendar.displayName == self.calendarName) {

            // debug
            //console.dir(calendar, {depth: 3});

            // create/update events
            console.log('* Processing events (' + (events.length) + ')')
            events.forEach(event => {

              // ical version
              ics.createEvent(event, (error, value) => {

                // if error
                if (error) {
                  console.log('  - Error: ' + event.title + ', ' + error);
                  return;
                }

                // look for it
                let updated = false;
                if (calendar.objects != null) {
                  calendar.objects.forEach((object) => {
                    if (object.calendarData != null && object.calendarData.indexOf(event.uid) != -1) {
                      console.log('  - Updated: ' + event.title);
                      object.calendarData = value;
                      dav.updateCalendarObject(object, { xhr: self.xhr }).catch((err) => {
                        console.log('  - Error: ' + event.title + ', ' + error);
                      });
                      updated = true;
                    }
                  });
                }

                // create
                if (updated === false) {
                  dav.createCalendarObject(calendar, {
                    filename: event.uid + '.ics',
                    data: value,
                    xhr: self.xhr
                  }).then((object) => {
                    console.log('  - Created: ' + event.title);
                  }).catch((error) => {
                    console.log('  - Error: ' + event.title + ', ' + error);
                  });
                }

              });

            });

            // clear current objects
            if (calendar.objects != null) {
              console.log('* Deleting obsolete events')
              calendar.objects.forEach((object) => {
                if (object.calendarData != null) {
                  let uidMatch = object.calendarData.match(/UID:(?<uid>[0-9a-zA-Z]*)/)
                  if (uidMatch != null && uidMatch.groups != null) {
                    let uid = uidMatch.groups.uid;
                    if (uid != null) {
                      let event = events.find(ev => ev.uid === uid);
                      if (event == null) {
                        console.log('  - Deleted: ' + uid);
                        dav.deleteCalendarObject(object, { xhr: self.xhr }).catch((err) => {
                        })
                      }
                    }
                  }
                }
              });
            }

            // done
            resolve();
            return;

          }

        });

      });

    });


  }

}

module.exports = iCalUploader;
