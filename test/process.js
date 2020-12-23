
const chai = require('chai')
const EventProcessor = require('../src/processor.js');
const expect = chai.expect;

before(() => {
  this.consoleLog = console.log;
  console.log = function() {};
});

after(() => {
  console.log = this.consoleLog;
});

describe('event selector', () => {

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

describe('datetime extractor', () => {

  let processor = new EventProcessor({});

  it('should convert datetime properly', () => {
    expect(processor._extractDateTime({                 }, '1972-11-27T11:54:00.000')).to.eql([ 1972, 11, 27, 11, 54 ]);
    expect(processor._extractDateTime({ isAllDay: false }, '1972-11-27T11:54:00.000')).to.eql([ 1972, 11, 27, 11, 54 ]);
  });

  it('should convert all day datetime properly', () => {
    expect(processor._extractDateTime({ isAllDay: true }, '1972-11-27T11:54:00.000')).to.eql([ 1972, 11, 27 ]);
  });

});

describe('event converter', () => {

  it('should convert events properly', () => {

    let processor = new EventProcessor({});

    expect(processor._convertEvent({
      iCalUId: 'abcdefghijklmnopqrstuvwxyz',
      subject: 'subject',
      bodyPreview: 'bodyPreview',
      body: { content: 'bodyContent' },
      start: { dateTime: '1972-11-27T11:54:00.000'},
      end: { dateTime: '2045-01-07T21:44:00.000'},
      onlineMeetingUrl: 'http://www.sportyapps.fr',
      location: { displayName: 'location' },
      organizer: { emailAddress: { name: 'organizer', address: 'organizer@org.org' } },
      showAs: 'busy',
    })).to.eql({
      uid: 'klmnopqrstuvwxyz197211271154',
      title: 'subject',
      description: 'bodyPreview',
      start: [ 1972, 11, 27, 11, 54 ],
      end: [ 2045, 01, 07, 21, 44 ],
      location: 'location',
      url: 'http://www.sportyapps.fr',
      organizer: { name: 'organizer', email: 'organizer@org.org' },
      busyStatus: 'BUSY',
      alarms: null,
      startInputType: 'utc',
      endInputType: 'utc',
    });
    
  });
  
  it('should map statuses properly', () => {

    let processor = new EventProcessor({});

    const statuses = {
      'busy': 'BUSY',
      'free': 'FREE',
      'tentative': 'FREE',
      'oof': 'OOF',
    }

    for (const [statusIn, statusOut] of Object.entries(statuses)) {
      
      expect(processor._convertEvent({
        iCalUId: 'abcdefghijklmnopqrstuvwxyz',
        showAs: statusIn,
      }).busyStatus).to.eql(statusOut);

    }

  });

  it('should create alarms properly', () => {

    let processor = new EventProcessor({
      alarm: 5,
    });

    expect(processor._convertEvent({
      iCalUId: 'abcdefghijklmnopqrstuvwxyz',
    }).alarms).to.eql([{
      action: 'display', repeat: 0, trigger: { before: true, minutes: 5, },
    }]);

  });

});
