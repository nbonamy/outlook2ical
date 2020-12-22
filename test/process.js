
const chai = require('chai')
const EventProcessor = require('../src/processor.js');
const expect = chai.expect;

describe('event selector', () => {

  beforeEach(() => {
    this.consoleLog = console.log;
    console.log = function() {};
  });

  afterEach(() => {
    console.log = this.consoleLog;
  });

	it('should not select cancelled events', () => {
    let processor = new EventProcessor({});
    expect(processor._selectEvent({
      isCancelled: false,
      showAs: 'busy',
    })).to.be.true;
    expect(processor._selectEvent({
      isCancelled: true,
      showAs: 'busy',
    })).to.be.false;
	});

	it('should not select all day events', () => {
    let processor = new EventProcessor({});
    expect(processor._selectEvent({
      isAllDay: false,
      showAs: 'busy',
    })).to.be.true;
    expect(processor._selectEvent({
      isAllDay: true,
      showAs: 'busy',
    })).to.be.false;
	});

	it('should not select all day events unless told so', () => {
    let processor = new EventProcessor({ allday: true });
    expect(processor._selectEvent({
      isAllDay: false,
      showAs: 'busy',
    })).to.be.true;
    expect(processor._selectEvent({
      isAllDay: true,
      showAs: 'busy',
    })).to.be.true;
	});


	it('should not select events with wrong status', () => {
    let processor = new EventProcessor();
    expect(processor._selectEvent({
      showAs: 'busy',
    })).to.be.true;
    expect(processor._selectEvent({
      showAs: 'tentative',
    })).to.be.false;
    expect(processor._selectEvent({
      showAs: 'free',
    })).to.be.false;
    expect(processor._selectEvent({
      showAs: 'oof',
    })).to.be.false;
    expect(processor._selectEvent({
      showAs: 'random',
    })).to.be.false;
	});

	it('should not select events with wrong status', () => {
    let processor = new EventProcessor({ select: [ 'tentative', 'free' ]});
    expect(processor._selectEvent({
      showAs: 'busy',
    })).to.be.false;
    expect(processor._selectEvent({
      showAs: 'tentative',
    })).to.be.true;
    expect(processor._selectEvent({
      showAs: 'free',
    })).to.be.true;
    expect(processor._selectEvent({
      showAs: 'oof',
    })).to.be.false;
    expect(processor._selectEvent({
      showAs: 'random',
    })).to.be.false;
  });

});

describe('online url', () => {

  let processor = new EventProcessor({});

  it('should valid online url properly', () => {
    expect(processor._isValidUrl()).to.be.false;
    expect(processor._isValidUrl(null)).to.be.false;
    expect(processor._isValidUrl('')).to.be.false;
    expect(processor._isValidUrl('http://')).to.be.true;
	});

  it('should select online url properly', () => {

    expect(processor._calcOnlineUrl({
    })).to.not.exist;

    expect(processor._calcOnlineUrl({
      onlineMeetingUrl: 'http://www.sportyapps.fr',
    })).to.equal('http://www.sportyapps.fr');

    expect(processor._calcOnlineUrl({
      onlineMeeting: { joinUrl: 'http://www.sportyapps.fr' }
    })).to.equal('http://www.sportyapps.fr');

    expect(processor._calcOnlineUrl({
      onlineMeetingUrl: 'http://www.sportyapps.fr',
      onlineMeeting: { joinUrl: 'http://www.sportyapps2.fr' }
    })).to.equal('http://www.sportyapps.fr');

    expect(processor._calcOnlineUrl({
      location: { displayName : 'https://teams.microsoft.com/l/meetup-join/abcdef' },
    })).to.equal('https://teams.microsoft.com/l/meetup-join/abcdef');

    expect(processor._calcOnlineUrl({
      body: { content : 'https://teams.microsoft.com/l/meetup-join/abcdef' },
    })).to.equal('https://teams.microsoft.com/l/meetup-join/abcdef');

    expect(processor._calcOnlineUrl({
      location: { displayName : 'https://teams.microsoft.com/l/meetup-join/abcdef' },
      body: { content : 'https://teams.microsoft.com/l/meetup-join/ghijkl' },
    })).to.equal('https://teams.microsoft.com/l/meetup-join/abcdef');

    expect(processor._calcOnlineUrl({
      onlineMeetingUrl: 'http://www.sportyapps.fr',
      onlineMeeting: { joinUrl: 'http://www.sportyapps2.fr' },
      location: { displayName : 'https://teams.microsoft.com/l/meetup-join/abcdef' },
      body: { content : 'https://teams.microsoft.com/l/meetup-join/ghijkl' },
    })).to.equal('http://www.sportyapps.fr');

	});

  it('should extract teams meeting url properly', () => {

    expect(processor._calcOnlineUrl({
      body: { content : 'lorem https://teams.microsoft.com/l/meetup-join/abcdef ipsum' },
    })).to.equal('https://teams.microsoft.com/l/meetup-join/abcdef');

    expect(processor._calcOnlineUrl({
      body: { content : 'join https://teams.microsoft.com/l/meetup-join/abcdef.' },
    })).to.equal('https://teams.microsoft.com/l/meetup-join/abcdef');

	});

  it('should extract webex j.php url properly', () => {

    expect(processor._calcOnlineUrl({
      body: { content : 'lorem https://capgemini.webex.com/nbonamy/j.php/abcdef ipsum' },
    })).to.equal('https://capgemini.webex.com/nbonamy/j.php/abcdef');

    expect(processor._calcOnlineUrl({
      body: { content : 'join https://capgemini.webex.com/nbonamy/j.php/abcdef.' },
    })).to.equal('https://capgemini.webex.com/nbonamy/j.php/abcdef');

	});

  it('should extract webex join url properly', () => {

    expect(processor._calcOnlineUrl({
      body: { content : 'lorem https://capgemini.webex.com/join/abcdef ipsum' },
    })).to.equal('https://capgemini.webex.com/join/abcdef');

    expect(processor._calcOnlineUrl({
      body: { content : 'join https://capgemini.webex.com/join/abcdef.' },
    })).to.equal('https://capgemini.webex.com/join/abcdef');

	});

  it('should extract webex meet url properly', () => {

    expect(processor._calcOnlineUrl({
      body: { content : 'lorem https://capgemini.webex.com/meet/abcdef ipsum' },
    })).to.equal('https://capgemini.webex.com/meet/abcdef');

    expect(processor._calcOnlineUrl({
      body: { content : 'join https://capgemini.webex.com/meet/abcdef.' },
    })).to.equal('https://capgemini.webex.com/meet/abcdef');

	});

  it('should extract zoom url properly', () => {

    expect(processor._calcOnlineUrl({
      body: { content : 'lorem https://zoom.us/j/abcdef ipsum' },
    })).to.equal('https://zoom.us/j/abcdef');

    expect(processor._calcOnlineUrl({
      body: { content : 'join https://zoom.us/j/abcdef.' },
    })).to.equal('https://zoom.us/j/abcdef');

	});

  it('should extract google url properly', () => {

    expect(processor._calcOnlineUrl({
      body: { content : 'lorem https://meet.google.com/abcdef ipsum' },
    })).to.equal('https://meet.google.com/abcdef');

    expect(processor._calcOnlineUrl({
      body: { content : 'join https://meet.google.com/abcdef.' },
    })).to.equal('https://meet.google.com/abcdef');

	});

});
