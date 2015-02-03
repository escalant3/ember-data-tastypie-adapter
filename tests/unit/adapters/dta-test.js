import Ember from 'ember';
import { moduleFor, test } from 'ember-qunit';

var get = Ember.get, set = Ember.set, hash = Ember.RSVP.hash;

var env, store, adapter;
var originalAjax, passedUrl, passedVerb, passedHash;
var Person, Role, Group, Task, Comment, Post;
var run = Ember.run;

moduleFor('adapter:application', 'DjangoTastypieAdapter', {
  // The integration tests don't work with the host set so the host
  // setting is being overridden directly.
  subject: function(options, factory) {
    return factory.create({'namespace': 'api/v1'});
  }
});

/*
module("integration/django_tastypie_adapter - DjangoTastypieAdapter", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr('string'),
    });

    Group = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany('person')
    });

    Role = DS.Model.extend({
      name: DS.attr('string'),
      primaryKey: '_id'
    });

    Task = DS.Model.extend({
      name: DS.attr('string'),
      owner: DS.belongsTo('person')
    });
    
    Comment = DS.Model.extend({
      text: DS.attr('string')
    });
    
    Post = DS.Model.extend({
      text: DS.attr('string'),
      comments: DS.hasMany('comment')
    })

    env = setupStore({
      person: Person,
      group: Group,
      role: Role,
      task: Task,
      comment: Comment,
      post: Post,
      adapter: DS.DjangoTastypieAdapter
    });

    store = env.store;
    adapter = env.adapter;

    env.store.modelFor('person');
    env.store.modelFor('group');
    env.store.modelFor('role');
    env.store.modelFor('task');

    env.container.register('serializer:application', DS.DjangoTastypieSerializer);
    env.container.register('serializer:-django-tastypie', DS.DjangoTastypieSerializer);
    env.container.register('adapter:-django-tastypie', DS.DjangoTastypieAdapter);
    env.dtSerializer = env.container.lookup("serializer:-django-tastypie");
    env.dtAdapter    = env.container.lookup("adapter:-django-tastypie");

    passedUrl = passedVerb = passedHash = null;
  }
});
*/
function ajaxResponse(value) {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return Ember.RSVP.resolve(value);
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
  equal(get(model, flag), value, "the person is " + (value === false ? "not " : "") + state);
};

var expectStates = function(arr, state, value) {
  arr.forEach(function(model) {
    expectState(model, state, value);
  });
};

test('buildURL - should not use plurals', function() {
  var adapter = this.subject();
  equal(adapter.buildURL('person', 1), "/api/v1/person/1/");
});

/* COMMENTED IN EMBER DATA
test("updating a record with custom primaryKey", function() {
  Ember.run(function() {
    set(adapter, 'bulkCommit', false);
    store.load(Role, { _id: 1, name: "Developer" });

    role = store.find(Role, 1);

    set(role, 'name', "Manager");
    store.commit();
  });

  expectUrl("api/v1/role/1/", "the plural of the model name with its ID");
  ajaxHash.success({ role: { _id: 1, name: "Manager" } });
});*/


test("if you specify a server domain then it is prepended onto all URLs", function() {
  var adapter = this.subject();
  adapter.set('serverDomain', 'http://localhost:8000');
  equal(adapter.buildURL('person', 1), "http://localhost:8000/api/v1/person/1/");
});



/*
test("creating an item with a belongsTo relationship urlifies the Resource URI (custom key)", function() {
  env.container.register('serializer:task', DS.DjangoTastypieSerializer.extend({
    attrs: { owner: 'owner_custom_key' }
  }));

  store.push('person', {id: 1, name: "Maurice Moss"});
  store.find('person', 1).then(async(function (person) {
    var task = store.createRecord('task', {name: "Get a bike!"});
    task.set('owner', person);

    expectState(task, 'new', true);
    expectState(task, 'dirty', true);

    ajaxResponse();
    return task.save();
  })).then(async(function (task) {
    expectUrl('/api/v1/task/', 'create URL');
    expectType("POST");
    expectData({ name: "Get a bike!", owner_custom_key: "/api/v1/person/1/"});

    expectState(task, 'new', false);
    expectState(task, 'dirty', false);
  }));
});
*/






  





