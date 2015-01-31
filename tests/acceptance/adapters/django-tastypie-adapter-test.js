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

var expectUrl = function(url, desc) {
  equal(passedUrl, url, "the URL is: " + url);
};

var expectType = function(type) {
  equal(passedVerb, type, "the HTTP method is: " + type);
};

var expectData = function(hash) {
  deepEqual(passedHash.data, hash, "the hash was passed along");
};

var expectState = function(model, state, value) {
  if (value === undefined) { value = true; }

  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
  equal(model.get(flag), value, "the person is " + (value === false ? "not " : "") + state);
};

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

test("creating a person makes a POST to /api/v1/person, with the data hash", function() {
  ajaxResponse({ id: 1,  name: "Tom Dale", resource_uri: '/api/v1/person/1/'});

  run(function() {
    var person = store.createRecord('person', {name: 'Tom Dale'});

    person.save().then(function(person) {
      equal(passedUrl, "/api/v1/person/");
      equal(passedVerb, "POST");
      expectData({ name: "Tom Dale" });

      equal(person.get('id'), "1", "the post has the updated ID");
      equal(person.get('isDirty'), false, "the post isn't dirty anymore");
    });
  });
});

test("updating a person makes a PUT to /people/:id with the data hash", function() {
  adapter.set('bulkCommit', false);

  run(store, 'push', 'person', { id: 1, name: "Yehuda Katz" });

  run(store, 'find', 'person', 1).then(function(person) {
    person.set('name', "Brohuda Brokatz");

    ajaxResponse();
    return person.save();
  }).then(function(person) {
    equal(passedUrl, "/api/v1/person/1/");
    equal(passedVerb, "PUT");
    expectData({ name: "Brohuda Brokatz" });

    equal(person.get('id'), "1");
    equal(person.get('isDirty'), false, "the person isn't dirty anymore");
    equal(person.get('name'), "Brohuda Brokatz");
  });

});

test("updates are not required to return data", function() {
  adapter.set('bulkCommit', false);

  run(store, 'push', 'person', { id: 1, name: "Yehuda Katz" });

  var _person;

  run(store, 'find', 'person', 1).then(function(person) {
    expectState(person, 'new', false);
    expectState(person, 'loaded');
    expectState(person, 'dirty', false);

    _person = person;

    person.set('name', "Brohuda Brokatz");
    expectState(person, 'dirty');

    ajaxResponse();
    return person.save();
  }).then(function(person) {
    expectUrl("/api/v1/person/1/", "the plural of the model name with its ID");
    expectType("PUT");

    expectState(person, 'saving', false);

    equal(_person, store.getById('person', 1), "the same person is retrieved by the same ID");
    equal(person.get('name'), "Brohuda Brokatz", "the data is preserved");
  });

});

test("deleting a person makes a DELETE to /api/v1/person/:id/", function() {
  adapter.set('bulkCommit', false);

  run(store, 'push', 'person', { id: 1, name: "Tom Dale" });

  run(store, 'find', 'person', 1).then(function(person) {
    ajaxResponse();

    person.deleteRecord();
    return person.save();
  }).then(function(person) {
    expectUrl("/api/v1/person/1/", "the plural of the model name with its ID");
    expectType("DELETE");

    equal(person.get('isDirty'), false, "the post isn't dirty anymore");
    equal(person.get('isDeleted'), true, "the post is now deleted");
  });
});

test("finding all people makes a GET to /api/v1/person/", function() {

  ajaxResponse({"objects": [{ id: 1, name: "Yehuda Katz", resource_uri: '/api/v1/person/1/' }]});

  run(store, 'find', 'person').then(function(people) {
    expectUrl("/api/v1/person/", "the plural of the model name");
    expectType("GET");
    var person = people.objectAt(0);

    expectState(person, 'loaded');
    expectState(person, 'dirty', false);

    equal(person, store.getById('person', 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
  });
});

test("since gets set if needed for pagination", function() {

  ajaxResponse({"objects": [{id: 1, name: "Roy", resource_uri: '/api/v1/person/1/'}, {id: 2, name: "Moss", resource_uri: '/api/v1/person/2/'}],
    "meta": {limit: 2, next: "nextUrl&offset=2", offset: 0, previous: null, total_count: 25}});

  run(store, 'findAll', 'person').then(function(people) {
    expectUrl("/api/v1/person/", "the findAll URL");
    equal(people.get('meta.offset', 0, "Offset is set"));
    equal(people.get('meta.next', "nextUrl&offset=2", "Next is set"));
    equal(people.get('meta.totalCount', 25, "Total count is correct"));

    ajaxResponse({"objects": [{id: 3, name: "Roy", resource_uri: '/api/v1/person/3/'}, {id: 4, name: "Moss", resource_uri: '/api/v1/person/4/'}],
      "meta": {limit: 2, next: "nextUrl&offset=4", offset: 2, previous: "previousUrl&offset=0", total_count: 25}});

    return store.findAll('person');
  }).then(function(morePeople) {
    deepEqual(passedHash.data, { offset: "2" });

    equal(store.metadataFor('person').offset, 2, "Offset is correct");
    expectUrl("/api/v1/person/", "the findAll URL is the same with the since parameter");
  });

});

test("finding a person by ID makes a GET to /api/v1/person/:id/", function() {
  ajaxResponse({ id: 1, name: "Yehuda Katz", resource_uri: '/api/v1/person/1/' });

  run(store, 'find', 'person', 1).then(function(person) {
    expectUrl("/api/v1/person/1/", "the model name with the ID requested");
    expectType("GET");

    expectState(person, 'loaded', true);
    expectState(person, 'dirty', false);

    equal(person, store.getById('person', 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
  });
});

test("findByIds generates a tastypie style url", function() {
  adapter.set('coalesceFindRequests', true);
  ajaxResponse({ objects: [
    { id: 1, name: "Rein Heinrichs", resource_uri: '/api/v1/person/1/'},
    { id: 2, name: "Tom Dale", resource_uri: '/api/v1/person/2/' },
    { id: 3, name: "Yehuda Katz", resource_uri: '/api/v1/person/3/' }
  ]
  });

  run(store, 'findByIds', 'person', [1, 2, 3]).then(function(people) {
    expectUrl("/api/v1/person/set/1;2;3/");
    expectType("GET");

    var rein = store.getById('person', 1),
        tom = store.getById('person', 2),
        yehuda = store.getById('person', 3);

    deepEqual(rein.getProperties('id', 'name'), { id: "1", name: "Rein Heinrichs" });
    deepEqual(tom.getProperties('id', 'name'), { id: "2", name: "Tom Dale" });
    deepEqual(yehuda.getProperties('id', 'name'), { id: "3", name: "Yehuda Katz" });
  });
});

test("finding many people by a list of IDs", function() {
  Group.reopen({ people: DS.hasMany('person', { async: true }) });
  adapter.set('coalesceFindRequests', true);

  run(store, 'push', 'group', { id: 1, name: "Group 1", people: [1, 2, 3]});

  run(store, 'find', 'group', 1).then(function(group) {
    ajaxResponse({"objects":
        [
          { id: 1, name: "Rein Heinrichs", resource_uri: '/api/v1/person/1/' },
          { id: 2, name: "Tom Dale", resource_uri: '/api/v1/person/2/' },
          { id: 3, name: "Yehuda Katz", resource_uri: '/api/v1/person/3/' }
        ]});

    ok(true, "passed");

    return group.get('people');
  }).then(function(people) {
    expectUrl("/api/v1/person/set/1;2;3/");
    expectType("GET");

    var rein = store.getById('person', 1),
        tom = store.getById('person', 2),
        yehuda = store.getById('person', 3);

    deepEqual(rein.getProperties('id', 'name'), { id: "1", name: "Rein Heinrichs" });
    deepEqual(tom.getProperties('id', 'name'), { id: "2", name: "Tom Dale" });
    deepEqual(yehuda.getProperties('id', 'name'), { id: "3", name: "Yehuda Katz" });

    deepEqual(people.toArray(), [ rein, tom, yehuda ], "The correct records are in the array");
  });
});

test("finding people by a query", function() {
  var people, rein, tom, yehuda;

  ajaxResponse({
    objects: [
      { id: 1, name: "Rein Heinrichs", resource_uri: '/api/v1/person/1/' },
      { id: 2, name: "Tom Dale", resource_uri: '/api/v1/person/2/' },
      { id: 3, name: "Yehuda Katz", resource_uri: '/api/v1/person/3/' }
    ]
  });

  run(store, 'find', 'person', {page: 1}).then(function(people) {
    equal(passedUrl, "/api/v1/person/");
    equal(passedVerb, "GET");
    deepEqual(passedHash.data, { page: 1 });

    equal(people.get('length'), 3, "the people are now loaded");

    rein = people.objectAt(0);
    equal(rein.get('name'), "Rein Heinrichs");
    equal(rein.get('id'), 1);

    tom = people.objectAt(1);
    equal(tom.get('name'), "Tom Dale");
    equal(tom.get('id'), 2);

    yehuda = people.objectAt(2);
    equal(yehuda.get('name'), "Yehuda Katz");
    equal(yehuda.get('id'), 3);

    people.forEach(function(person) {
      equal(person.get('isLoaded'), true, "the person is being loaded");
    });

  });
});

test("creating an item with a belongsTo relationship urlifies the Resource URI (default key)", function() {
  run(store, 'push', 'person', {id: 1, name: "Maurice Moss"});

  run(store, 'find', 'person', 1).then(function(person) {
    expectState(person, 'new', false);
    expectState(person, 'loaded');
    expectState(person, 'dirty', false);

    var task = store.createRecord('task', {name: "Get a bike!"});
    expectState(task, 'new', true);
    expectState(task, 'dirty', true);
    task.set('owner', person);

    ajaxResponse();

    return task.save();
  }).then(function(task) {
    expectUrl('/api/v1/task/', 'create URL');
    expectType("POST");
    expectData({ name: "Get a bike!", owner: "/api/v1/person/1/"});
  });

});

test("metadata is accessible", function () {
  ajaxResponse({
    meta: { offset: 2, limit: 0 },
    objects: [
      {id: 1, name: "Maurice Moss"},
      {id: 2, name: "Roy"},
    ]
  });

  run(function() {
    store.findAll('person').then(function (people) {
      equal(store.metadataFor('person').offset,
          2,
          "Metadata can be accessed with metadataFor");
    });
  });
});
