import Ember from 'ember';
import startApp from '../../helpers/start-app';

var application;
var store;
var adapter;
var passedUrl, passedVerb, passedHash;
var run = Ember.run;

module('Acceptance: AdaptersDjangoTastypieAdapter', {
  setup: function() {
    application = startApp({'namespace': 'api/v1'});

    store = application.__container__.lookup('store:main');
    adapter = application.__container__.lookup('adapter:application');

    passedUrl = passedVerb = passedHash = null;
  },
  teardown: function() {
    Ember.run(application, 'destroy');
  }
});

function ajaxResponse(value) {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return run(Ember.RSVP, 'resolve', value);
  };
}

test("can create a record", function() {
  run(function() {
    var record = store.createRecord('person');
    record.set('name', 'bar');

    equal(record.get('name'), 'bar', "property was set on the record");
  });
});

test("find - basic payload", function() {

  ajaxResponse({ id: 1, name: "Rails is omakase", resource_uri: '/api/v1/person/1/' });

  run(store, 'find', 'person', 1).then(function(person) {
    equal(passedUrl, "/api/v1/person/1/");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(person.get('id'), "1");
    equal(person.get('name'), "Rails is omakase");
  });
});
