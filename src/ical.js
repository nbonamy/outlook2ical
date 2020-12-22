'use strict';
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
    );

    // save this
    this.calendarName = options.calendarName;

  }

  upload(events) {

    return new Promise((resolve, _) => {

      // do it
      console.log('* Loading iCloud calendars');
      dav.createAccount({ server: ICLOUD_CAL_URL, xhr: this.xhr, loadCollections: true, loadObjects: true }).then((account) => {

        account.calendars.forEach((calendar) => {

          // find calendar
          if (calendar.displayName == this.calendarName) {

            // debug
            //console.dir(calendar, {depth: 3});

            // all promises
            let promises = [];

            // create/update events
            console.log('* Processing events (' + (events.length) + ')');
            events.forEach(event => {

              // ical version
              ics.createEvent(event, (err, value) => {

                // if error
                if (err) {
                  console.log('  - Error: ' + event.title + ', ' + err);
                  return;
                }

                // look for it
                let updated = false;
                if (calendar.objects != null) {
                  calendar.objects.forEach((object) => {
                    if (object.calendarData != null && object.calendarData.indexOf(event.uid) != -1) {
                      object.calendarData = value;
                      promises.push(dav.updateCalendarObject(object, { xhr: this.xhr }).then((_) => {
                        console.log('  - Updated: ' + event.title);
                      }).catch((err) => {
                        console.log('  - Error: ' + event.title + ', ' + err);
                      }));
                      updated = true;
                    }
                  });
                }

                // create
                if (updated == false) {
                  promises.push(dav.createCalendarObject(calendar, {
                    filename: event.uid + '.ics',
                    data: value,
                    xhr: this.xhr
                  }).then((_) => {
                    console.log('  - Created: ' + event.title);
                  }).catch((err) => {
                    console.log('  - Error: ' + event.title + ', ' + err);
                  }));
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
                        promises.push(dav.deleteCalendarObject(object, { xhr: this.xhr }).catch((err) => {
                        }));
                      }
                    }
                  }
                }
              });
            }

            // done
            Promise.all(promises).then((_) => resolve()).catch((_) => resolve());
            return;

          }

        });

      });

    });

  }

}

module.exports = iCalUploader;
