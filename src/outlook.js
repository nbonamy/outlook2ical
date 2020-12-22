
const msal = require('@azure/msal-node');
const express = require('express');
const axios = require('axios');
const fs = require('fs');

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

module.exports = class {

  constructor(options) {

    // default options
    const defaults = {
      count: 100,
      before: 0,
      after: 1,
    };

    // save
    this.options = { ...defaults, ...options };

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

    return new Promise((resolve, reject) => {

      // if already auth
      if (this.isAuth()) {
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

        this.cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
          res.redirect(response);
        }).catch((err) => reject(err));

      });

      app.get('/redirect', (req, res) => {

        const tokenRequest = {
          code: req.query.code,
          scopes: SCOPES,
          redirectUri: REDIRECT_URI,
        };

        this.cca.acquireTokenByCode(tokenRequest).then((response) => {

          // save account info
          this.accountId = response.account.homeAccountId;
          fs.writeFileSync(ACCOUNT_ID_CACHE, this.accountId);

          // close server
          this.server.close();

          // tell
          res.status(200).send('You can close this window now!');
          console.log('Authentication successful!');
          resolve();

        }).catch((err) => {
          res.status(500).send(err);
          reject(err);
        });

      });

      // now listen
      this.server = app.listen(SERVER_PORT, () => console.log(`Open a browser and navigate to http://localhost:${SERVER_PORT}!`));

    });

  }

  getEvents() {

    return new Promise((resolve, _) => {
      this._downloadEvents().then((events) => {
        resolve(events);
      });
    });

  }

  _downloadEvents() {

    return new Promise(async (resolve, reject) => {

      // check we have an account
      if (this.accountId == null) {
        reject(new Error('No account'));
        return;
      }

      // load account from cache
      let account = await this.cca.getTokenCache().getAccountByHomeId(this.accountId);
      if (account == null) {
        reject(new Error('No account'));
        return;
      }

      // log
      console.log('* Downloading Outlook events');

      // date
      let today = new Date();
      today.setDate(today.getDate() - this.options.before);
      if (this.options.timezone != null) {
        today = today.toLocaleString("en-US", { timeZone: this.options.timezone });
        today = new Date(today);
      }

      // tomorrow
      let tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + this.options.after);

      // url
      let graphEndpoint = 'https://graph.microsoft.com/v1.0/me/calendar/calendarView';
      graphEndpoint += '?startDateTime=' + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + 'T00:00';
      graphEndpoint += '&endDateTime=' + tomorrow.getFullYear() + '-' + (tomorrow.getMonth() + 1) + '-' + tomorrow.getDate() + 'T23:59';
      graphEndpoint += '&$orderBy=start/dateTime';
      graphEndpoint += '&$top=' + this.options.count;
      console.log('  - ' + graphEndpoint);

      // build silent request
      const silentRequest = {
        account: account,
        scopes: SCOPES,
      };

      // do it
      this.cca.acquireTokenSilent(silentRequest).then((response) => {
        this._callMSGraph(graphEndpoint, response.accessToken).then((response) => {
          resolve(response.value);
        });
      });

    });

  }

  _callMSGraph(endpoint, accessToken) {

    return new Promise((resolve, reject) => {

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
