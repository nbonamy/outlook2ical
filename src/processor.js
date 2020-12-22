
module.exports = class {

  constructor(options) {

    // default options
    const defaults = {
      allday: false,
      alarm: null,
      select: [ 'busy' ]
    };

    // save
    this.options = { ...defaults, ...options };
  }

  process(events) {

    return new Promise((resolve, _) => {

      // filter
      console.log('* Filtering Outlook events');
      let filteredEvents = events.filter((ev) => this._selectEvent(ev));

      // now transform
      console.log('* Transforming Outlook events');
      resolve(filteredEvents.map((ev) => this._convertEvent(ev)));

    });

  }

  _selectEvent(ev) {

    // skip cancelled
    if (ev.isCancelled) {
      console.log('  - Skipped (cancelled): ' + ev.subject);
      return false;
    }

    // skip all day
    if (this.options.allday === false && ev.isAllDay) {
      console.log('  - Skipped (all day): ' + ev.subject);
      return false;
    }

    // show only busy ones
    if (this.options.select.indexOf(ev.showAs) == -1) {
      console.log('  - Skipped (' + ev.showAs + '): ' + ev.subject);
      return false;
    }

    // default
    console.log('  - Preserved: ' + ev.subject);
    return true;

  }

  _convertEvent(ev) {

    // calc the id (make it unique using date)
    let uid = ev.iCalUId.slice(-16);
    uid += ev.start.dateTime.substr(0, 16).replace(/[\-T:]/g, '');

    // organizer
    let organizer = null;
    if (ev.organizer != null && ev.organizer.emailAddress != null) {
      organizer = {
        name: ev.organizer.emailAddress.name,
        email: ev.organizer.emailAddress.address,
      };
    }

    // alarm
    let alarm = null;
    if (this.options.alarm != null) {
      alarm = [{
        action: 'display',
        trigger: {
          minutes: this.options.alarm,
          before: true,
        },
        repeat: 0,
      }];
    }

    // status
    let status = 'BUSY';
    if (ev.showAs == 'tentative') {
      status = 'FREE';
    } else if (ev.showAs == 'free') {
      status = 'FREE';
    } else if (ev.showAs == 'oof') {
      status = 'OOF';
    }

    // done
    return {
      uid: uid,
      title: ev.subject,
      description: ev.bodyPreview,
      start: this._extractDateTime(ev, ev.start.dateTime),
      end: this._extractDateTime(ev, ev.end.dateTime),
      location: ev.location == null ? null : ev.location.displayName,
      url: this._calcOnlineUrl(ev),
      organizer: organizer,
      busyStatus: status,
      alarms: alarm,
      startInputType: 'utc',
      endInputType: 'utc',
    };
  
  }

  _isValidUrl(url) {
    return url != null && url.length > 0;
  }

  _calcOnlineUrl(ev) {

    // url is tricky
    let url = ev.onlineMeetingUrl;
    if (this._isValidUrl(url) == false && ev.onlineMeeting != null) {
      url = ev.onlineMeeting.joinUrl;
    }

    // now look in various places
    if (this._isValidUrl(url) == false) {
      url = this._extractOnlineUrl(ev, /https:\/\/teams.microsoft.com\/l\/meetup-join\/[^ \"\.<]*/);
    }
    if (this._isValidUrl(url) == false) {
      url = this._extractOnlineUrl(ev, /https:\/\/.*\.webex.com\/.*\/j.php[^ \"\.<]*/);
    }
    if (this._isValidUrl(url) == false) {
      url = this._extractOnlineUrl(ev, /https:\/\/.*\.webex.com\/join\/[^ \"\.<]*/);
    }
    if (this._isValidUrl(url) == false) {
      url = this._extractOnlineUrl(ev, /https:\/\/.*\.webex.com\/meet\/[^ \"\.<]*/);
    }
    if (this._isValidUrl(url) == false) {
      url = this._extractOnlineUrl(ev, /https:\/\/zoom.us\/j\/[^ \"\.<]*/);
    }
    if (this._isValidUrl(url) == false) {
      url = this._extractOnlineUrl(ev, /https:\/\/meet.google.com\/[^ \"\.<]*/);
    }

    // fallback
    if (this._isValidUrl(url) == false) {
      url = ev.webLink;
    }

    // done
    return url;
  
  }

  _extractOnlineUrl(ev, regex) {

    // in location
    if (ev.location != null && ev.location.displayName != null) {
      let match = ev.location.displayName.match(regex);
      if (match != null && this._isValidUrl(match[0])) {
        return match[0];
      }
    }

    // in body
    if (ev.body != null && ev.body.content != null) {
      let match = ev.body.content.match(regex);
      if (match != null && this._isValidUrl(match[0])) {
        return match[0];
      }
    }

    // too bad
    return null;

  }

  _extractDateTime(ev, datetime) {
    if (ev.isAllDay) {
      return [
        parseInt(datetime.substr(0, 4)),
        parseInt(datetime.substr(5, 2)),
        parseInt(datetime.substr(8, 2)),
      ];
    } else {
      return [
        parseInt(datetime.substr(0, 4)),
        parseInt(datetime.substr(5, 2)),
        parseInt(datetime.substr(8, 2)),
        parseInt(datetime.substr(11, 2)),
        parseInt(datetime.substr(14, 2)),
      ];
    }
  }

}
