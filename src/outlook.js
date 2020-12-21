const fs = require('fs');
const msal = require('@azure/msal-node');
const express = require('express');
const axios = require('axios');

const ACCOUNT_ID_CACHE = './data/outlook.id';
const ACCOUNT_DATA_CACHE = './data/outlook_data.json';
const REDIRECT_URI = 'http://localhost:3000/redirect';
const SCOPES = [ 'User.Read', 'Calendars.Read' ];
const SERVER_PORT = 3000;

const beforeCacheAccess = (cacheContext) => {
  if (fs.existsSync(ACCOUNT_DATA_CACHE)) {
    cacheContext.tokenCache.deserialize(fs.readFileSync(ACCOUNT_DATA_CACHE));
  }
};

const afterCacheAccess = (cacheContext) => {
  if (cacheContext.cacheHasChanged) {
    fs.writeFileSync(ACCOUNT_DATA_CACHE, cacheContext.tokenCache.serialize());
  }
};

const cachePlugin = {
  beforeCacheAccess,
  afterCacheAccess
};

class OutlookLoader {

  constructor(options) {

    // save
    this.options = options;

    // read account id
    if (fs.existsSync(ACCOUNT_ID_CACHE)) {
      this.accountId = fs.readFileSync(ACCOUNT_ID_CACHE, 'utf-8');
    }

    // init app
    this.cca = new msal.ConfidentialClientApplication({
      auth: {
        clientId: this.options.clientId,
        clientSecret: this.options.clientSecret,
        authority: 'https://login.microsoftonline.com/common',
      },
      cache: { cachePlugin }
    });

  }

  isAuth() {
    return this.accountId != null && fs.existsSync(ACCOUNT_DATA_CACHE);
  }

  auth() {

    // save
    var self = this;

    return new Promise(function (resolve, reject) {

      // if already auth
      if (self.isAuth()) {
        resolve();
        return;
      }

      // express server
      let app = express();
      app.get('/', (req, res) => {

        const authCodeUrlParameters = {
          scopes: SCOPES,
          redirectUri: REDIRECT_URI,
        };

        self.cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
          res.redirect(response);
        }).catch((error) => reject(error));

      });

      app.get('/redirect', (req, res) => {

        const tokenRequest = {
          code: req.query.code,
          scopes: SCOPES,
          redirectUri: REDIRECT_URI,
        };

        self.cca.acquireTokenByCode(tokenRequest).then((response) => {

          // save account info
          self.accountId = response.account.homeAccountId;
          fs.writeFileSync(ACCOUNT_ID_CACHE, self.accountId);

          // close server
          self.server.close();

          // tell
          res.status(200).send('You can close this window now!');
          console.log('Authentication successful!')
          resolve();

        }).catch((error) => {
          res.status(500).send(error);
          reject(error);
        });

      });

      // now listen
      self.server = app.listen(SERVER_PORT, () => console.log(`Open a browser and navigate to http://localhost:${SERVER_PORT}!`));

    });

  }

  getEvents() {

    // save
    var self = this;

    return new Promise(function (resolve, reject) {

      self._downloadEvents().then((events) => {

        // filter
        console.log('* Filtering Outlook events')
        let filteredEvents = events.filter((ev) => self._selectEvent(ev));

        // now transform
        console.log('* Transforming Outlook events')
        resolve(filteredEvents.map((ev) => self._convertEvent(ev)));

      });

    });

  }

  _downloadEvents() {

    // save
    var self = this;

    return new Promise(async function (resolve, reject) {

      // check we have an account
      if (self.accountId == null) {
        reject(new Error('No account'));
        return;
      }

      // load account from cache
      let account = await self.cca.getTokenCache().getAccountByHomeId(self.accountId);
      if (account == null) {
        reject(new Error('No account'));
        return;
      }

      // log
      console.log('* Downloading Outlook events');

      // date
      let today = new Date()
      let tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // url
      let graphEndpoint = 'https://graph.microsoft.com/v1.0/me/calendar/calendarView';
      graphEndpoint += '?startDateTime=' + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + 'T00:00';
      graphEndpoint += '&endDateTime=' + tomorrow.getFullYear() + '-' + (tomorrow.getMonth() + 1) + '-' + tomorrow.getDate() + 'T23:59';
      graphEndpoint += '&$orderBy=start/dateTime';
      graphEndpoint += '&$top=100';
      console.log('  - ' + graphEndpoint);

      // build silent request
      const silentRequest = {
        account: account,
        scopes: SCOPES,
      };

      // do it
      self.cca.acquireTokenSilent(silentRequest).then((response) => {
        self._callMSGraph(graphEndpoint, response.accessToken).then((response) => {
          resolve(response.value);
        });
      });

    });

  }

  _selectEvent(ev) {

    // skip cancelled
    if (ev.isCancelled) {
      console.log('  - Skipped (cancelled): ' + ev.subject);
      return false;
    }

    // skip all day
    if (ev.isAllDay) {
      console.log('  - Skipped (all day): ' + ev.subject);
      return false;
    }

    // show only busy ones
    if (ev.showAs !== 'busy') {
      console.log('  - Skipped (not busy): ' + ev.subject);
      return false;
    }

    // default
    console.log('  - Preserved: ' + ev.subject);
    return true;

  }

  _convertEvent(ev) {
    return {
      uid: ev.iCalUId.slice(-32),
      title: ev.subject,
      description: ev.bodyPreview,
      url: ev.webLink,
      location: ev.location.displayName,
      organizer: {
        name: ev.organizer.emailAddress.name,
        email: ev.organizer.emailAddress.address,
      },
      startInputType: 'utc',
      endInputType: 'utc',
      start: this._extractDateTime(ev.start.dateTime),
      end: this._extractDateTime(ev.end.dateTime),
    }
  }

  _extractDateTime(datetime) {
    return [
      parseInt(datetime.substr(0, 4)),
      parseInt(datetime.substr(5, 2)),
      parseInt(datetime.substr(8, 2)),
      parseInt(datetime.substr(11, 2)),
      parseInt(datetime.substr(14, 2)),
    ];
  }

  _callMSGraph(endpoint, accessToken) {

    return new Promise(function (resolve, reject) {

      const options = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"'
        }
      };

      axios.default.get(endpoint, options).then(response => resolve(response.data));

    });

  }

}

module.exports = OutlookLoader;
