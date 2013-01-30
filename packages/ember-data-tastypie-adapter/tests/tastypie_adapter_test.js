var get = Ember.get, set = Ember.set;

var adapter, store, ajaxUrl, ajaxType, ajaxHash;
var Person, person, people;
var Role, role, roles;
var Group, group;
var Task, task;

// Ember-data revision (breaking changes)
var REVISION = 11;

module("Django Tastypie Adapter", {
  setup: function() {
    ajaxUrl = undefined;
    ajaxType = undefined;
    ajaxHash = undefined;

    adapter = DS.DjangoTastypieAdapter.create({
      ajax: function(url, type, hash) {
        var success = hash.success, self = this;

        ajaxUrl = url;
        ajaxType = type;
        ajaxHash = hash;

        if (success) {
          hash.success = function(json, type) {
            success.call(self, json);
          };
        }
      }

    });

    store = DS.Store.create({
      adapter: adapter,
      revision: REVISION
    });

    Person = DS.Model.extend({
      name: DS.attr('string'),
      tasks: DS.hasMany('Task')
    });

    Person.toString = function() {
      return "App.Person";
    };

    Group = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany('Person')
    });

    Group.toString = function() {
      return "App.Group";
    };

    Role = DS.Model.extend({
      name: DS.attr('string'),
      primaryKey: '_id'
    });

    Role.toString = function() {
      return "App.Role";
    };

    Task = DS.Model.extend({
      name: DS.attr('string'),
      owner: DS.belongsTo('Person')
    });

    Task.toString = function() {
      return "App.Task";
    };
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();

    if (person) { person.destroy(); }
  }
});

var expectUrl = function(url, desc) {
  equal(ajaxUrl, url, "the URL is " + desc);
};

var expectType = function(type) {
  equal(type, ajaxType, "the HTTP method is " + type);
};

var expectData = function(hash) {
  deepEqual(hash, ajaxHash.data, "the hash was passed along");
};

var expectState = function(state, value, p) {
  p = p || person;

  if (value === undefined) { value = true; }

  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
  equal(get(p, flag), value, "the person is " + (value === false ? "not " : "") + state);
};

var expectStates = function(state, value) {
  people.forEach(function(person) {
    expectState(state, value, person);
  });
};

test("creating a person makes a POST to /person, with the data hash", function() {
  set(adapter, 'bulkCommit', false);

  person = store.createRecord(Person, { name: "Tom Dale" });

  expectState('new');
  store.commit();
  expectState('saving');

  expectUrl("/api/v1/person/", "the collection is the same as the model name");
  expectType("POST");
  expectData({ name: "Tom Dale", tasks: [] });

  ajaxHash.success({ id: 1, name: "Tom Dale" });
  expectState('saving', false);

  person = store.find(Person, 1);

  equal(person.get('name'), "Tom Dale", "it is now possible to retrieve the person by the ID supplied");
});

test("updating a person makes a PUT to /people/:id with the data hash", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  set(person, 'name', "Brohuda Brokatz");

  expectState('dirty');
  store.commit();
  expectState('saving');

  expectUrl("/api/v1/person/1/", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success({ id: 1, name: "Brohuda Brokatz" });
  expectState('saving', false);

  person = store.find(Person, 1);

  equal(get(person, 'name'), "Brohuda Brokatz", "the hash should be updated");
});


test("updates are not required to return data", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  set(person, 'name', "Brohuda Brokatz");

  expectState('dirty');
  store.commit();
  expectState('saving');

  expectUrl("/api/v1/person/1/", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success();
  expectState('saving', false);

  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(get(person, 'name'), "Brohuda Brokatz", "the data is preserved");
});

/* COMMENTED IN EMBER DATA
test("updating a record with custom primaryKey", function() {
  set(adapter, 'bulkCommit', false);
  store.load(Role, { _id: 1, name: "Developer" });

  role = store.find(Role, 1);

  set(role, 'name', "Manager");
  store.commit();

  expectUrl("api/v1/role/1/", "the plural of the model name with its ID");
  ajaxHash.success({ role: { _id: 1, name: "Manager" } });
});*/


test("deleting a person makes a DELETE to /people/:id", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "Tom Dale" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  person.deleteRecord();

  expectState('dirty');
  expectState('deleted');
  store.commit();
  expectState('saving');

  expectUrl("/api/v1/person/1/", "the plural of the model name with its ID");
  expectType("DELETE");

  ajaxHash.success();
  expectState('deleted');
});

/* COMMENTED IN EMBER DATA
test("deleting a record with custom primaryKey", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Role, { _id: 1, name: "Developer" });

  role = store.find(Role, 1);

  role.deleteRecord();

  store.commit();

  expectUrl("api/v1/role/1/", "the plural of the model name with its ID");
  ajaxHash.success();
});*/

test("finding all people makes a GET to api/v1/person/", function() {
  people = store.find(Person);

  expectUrl("/api/v1/person/", "the plural of the model name");

  expectType("GET");

  ajaxHash.success({"objects": [{ id: 1, name: "Yehuda Katz" }]});

  person = people.objectAt(0);

  expectState('loaded');
  expectState('dirty', false);

  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("since gets set if needed for pagination", function() {
  people = store.find(Person);

  expectUrl("/api/v1/person/", "the findAll URL");
  ajaxHash.success({"objects": [{id: 1, name: "Roy"}, {id: 2, name: "Moss"}],
            "meta": {limit: 2, next: "nextUrl&offset=2", offset: 0, previous: null, total_count: 25}});

  morePeople = store.find(Person);
  expectData({offset: '2'});
  expectUrl("/api/v1/person/", "the findAll URL is the same with the since parameter");
});

test("finding a person by ID makes a GET to api/v1/person/:id", function() {
  person = store.find(Person, 1);

  expectState('loaded', false);
  expectUrl("/api/v1/person/1/", "the plural of the model name with the ID requested");
  expectType("GET");

  ajaxHash.success({ id: 1, name: "Yehuda Katz" });

  expectState('loaded');
  expectState('dirty', false);

  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("findMany generates a tastypie style url", function() {
  var adapter = store.get('adapter');

  adapter.findMany(store, Person, [1,2,3]);
  expectUrl("/api/v1/person/set/1;2;3/");
  expectType("GET");
});

test("finding many people by a list of IDs", function() {
  store.load(Group, { id: 1, people: [
    "/api/v1/person/1/",
    "/api/v1/person/2/",
    "/api/v1/person/3/"
  ]});

  var group = store.find(Group, 1);

  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  var people = get(group, 'people');

  equal(get(people, 'length'), 3, "there are three people in the association already");

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), false, "the person is being loaded");
  });

  expectUrl("/api/v1/person/set/1;2;3/");
  expectType("GET");

  ajaxHash.success({"objects":
    [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]}
  );

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});

test("finding people by a query", function() {
  var people = store.find(Person, { page: 1 });

  equal(get(people, 'length'), 0, "there are no people yet, as the query has not returned");

  expectUrl("/api/v1/person/", "the collection at the plural of the model name");
  expectType("GET");
  expectData({ page: 1 });

  ajaxHash.success({
    objects: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });

  equal(get(people, 'length'), 3, "the people are now loaded");

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});

test("if you specify a server domain then it is prepended onto all URLs", function() {
  set(adapter, 'serverDomain', 'http://localhost:8000/');
  person = store.find(Person, 1);
  expectUrl("http://localhost:8000/api/v1/person/1/", "the namespace, followed by by the plural of the model name and the id");

  store.load(Person, { id: 1 });
});

test("the adapter can use custom keys", function() {
  Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var Adapter = DS.DjangoTastypieAdapter.extend();
  Adapter.map('Person', {
    name: {key: 'name_custom'}
  });

  var adapter = Adapter.create();
  var person = Person.createRecord({name: "Maurice Moss"});
  equal(JSON.stringify(adapter.serialize(person)), '{"name_custom":"Maurice Moss"}');
});

test("creating an item with a belongsTo relationship urlifies the Resource URI (default key)", function() {
  store.load(Person, {id: 1, name: "Maurice Moss"});
  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  task = Task.createRecord({name: "Get a bike!"});

  expectState('new', true, task);
  expectState('dirty', true, task);

  set(task, 'owner', person);

  store.commit();

  expectUrl('/api/v1/task/', 'create URL');
  expectType("POST");
  expectData({ name: "Get a bike!", owner_id: "/api/v1/person/1/"});

  ajaxHash.success({ id: 1, name: "Get a bike!", owner: "/api/v1/person/1/"}, Task);

});

test("creating an item with a belongsTo relationship urlifies the Resource URI (custom key)", function() {

  var adapter, Adapter, task;

  Adapter = DS.DjangoTastypieAdapter.extend({
    ajax: function(url, type, hash) {
      var success = hash.success, self = this;

      ajaxUrl = url;
      ajaxType = type;
      ajaxHash = hash;

      if (success) {
        hash.success = function(json, type) {
          success.call(self, json);
        };
      }
    }

  });

  Adapter.map('Task', {
    owner: {key: 'owner_custom_key'}
  });

  adapter = Adapter.create();
  store.set('adapter', adapter);

  store.load(Person, {id: 1, name: "Maurice Moss"});
  person = store.find(Person, 1);

  task = Task.createRecord({name: "Get a bike!"});

  task.set('owner', person);

  store.commit();

  expectUrl('/api/v1/task/', 'create URL');
  expectType("POST");
  expectData({ name: "Get a bike!", owner_custom_key: "/api/v1/person/1/"});

  ajaxHash.success({ id: 1, name: "Get a bike!", owner: "/api/v1/person/1/"}, Task);

});

test("creating an item and adding hasMany relationships parses the Resource URI (default key)", function() {

  Person = DS.Model.extend({
    name: DS.attr('string'),
    group: DS.belongsTo('Group')
  });
  Person.toString = function() {
    return "Person";
  };

  equal(true, true);
  store.load(Person, {id: 1, name: "Maurice Moss"});
  store.load(Person, {id: 2, name: "Roy"});

  var moss = store.find(Person, 1);
  var roy = store.find(Person, 2);

  group = Group.createRecord({name: "Team"});

  //expectState('new', true, group);
  store.commit();
  //expectState('saving', true, group);

  expectUrl('/api/v1/group/', 'create Group URL');
  expectType("POST");
  expectData({name: "Team", people: [] });

  ajaxHash.success({ id: 1, name: "Team", people: [] }, Group);

  group = store.find(Group, 1);

  group.get('people').pushObject(moss);
  group.get('people').pushObject(roy);

  store.commit();

  // HasMany updates through the belongsTo component
  expectUrl('/api/v1/person/2/', 'modify Group URL');
  expectType("PUT");
  expectData({name: "Roy", group_id: '/api/v1/group/1/' });

});

test("can load embedded hasMany records", function() {

  var Adapter;

  Adapter = DS.DjangoTastypieAdapter.extend({});

  Adapter.map('Person', {
    tasks: {embedded: 'load'}
  });

  adapter = Adapter.create();
  store.set('adapter', adapter);


  var data = {
    "id": 1,
    "name": "Maurice Moss",
    "tasks": [{
      "name": "Learn German Kitchen",
      "id": "1",
      "resource_uri": "\/api\/v1\/task\/1\/"
    },
    {
      "name": "Join Friendface",
      "id": "2",
      "resource_uri": "\/api\/v1\/task\/2\/"
    }],
    "resource_uri": "\/api\/v1\/person\/1\/"
  };

  adapter.didFindRecord(store, Person, data);

  var moss = store.find(Person, 1);
  var german = store.find(Task, 1);
  var friendface = store.find(Task, 2);
  equal("Maurice Moss", moss.get('name'));
  equal("Learn German Kitchen", german.get('name'));
  equal("Join Friendface", friendface.get('name'));
  equal(2, moss.get('tasks.length'));
});


test("can load embedded belongTo records", function() {

  var Adapter;

  Adapter = DS.DjangoTastypieAdapter.extend({});

  Adapter.map('Task', {
    owner: {embedded: 'load', key: 'owner'}
  });

  adapter = Adapter.create();
  store.set('adapter', adapter);


  var data = {
    "id": 1,
    "name": "Get a bike!",
    "owner": {
      "name": "Maurice Moss",
      "id": "1",
      "resource_uri": "\/api\/v1\/person\/1\/"
    },
    "resource_uri": "\/api\/v1\/task\/1\/"
  };

  adapter.didFindRecord(store, Task, data);

  var moss = store.find(Person, 1);
  var bike = store.find(Task, 1);
  equal("Maurice Moss", moss.get('name'));
  equal("Get a bike!", bike.get('name'));
});

test("can load embedded belongTo records in a find response", function() {

  var Adapter;

  Adapter = DS.DjangoTastypieAdapter.extend({});

  Adapter.map('Task', {
    owner: {embedded: 'load', key: 'owner'}
  });

  adapter = Adapter.create();
  store.set('adapter', adapter);


  var data = [
    {"meta": {},
    "objects": {
      "id": 1,
      "name": "Get a bike!",
      "owner": {
        "name": "Maurice Moss",
        "id": "1",
        "resource_uri": "\/api\/v1\/person\/1\/"
       },
      "resource_uri": "\/api\/v1\/task\/1\/"
    }
   }
  ];

  adapter.didFindRecord(store, Task, data);

  var moss = store.find(Person, 1);
  var bike = store.find(Task, 1);
  equal("Maurice Moss", moss.get('name'));
  equal("Get a bike!", bike.get('name'));
  equal("Maurice Moss", bike.get('owner').get('name'));
});


test("can load embedded hasMany records with camelCased properties", function() {

  var Adapter;

  Adapter = DS.DjangoTastypieAdapter.extend({});

  Person = DS.Model.extend({
    name: DS.attr('string'),
    tasksToDo: DS.hasMany('Task')
  });


  Adapter.map('Person', {
    tasksToDo: {embedded: 'load', key: 'tasksToDo'}
  });

  adapter = Adapter.create();
  store.set('adapter', adapter);


  var data = {
    "id": 1,
    "name": "Maurice Moss",
    "tasksToDo": [{
      "name": "Learn German Kitchen",
      "id": "1",
      "resource_uri": "\/api\/v1\/task\/1\/"
    },
    {
      "name": "Join Friendface",
      "id": "2",
      "resource_uri": "\/api\/v1\/task\/2\/"
    }],
    "resource_uri": "\/api\/v1\/person\/1\/"
  };

  adapter.didFindRecord(store, Person, data);

  var moss = store.find(Person, 1);
  var german = store.find(Task, 1);
  var friendface = store.find(Task, 2);
  equal("Maurice Moss", moss.get('name'));
  equal("Learn German Kitchen", german.get('name'));
  equal("Join Friendface", friendface.get('name'));
});
