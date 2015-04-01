import Ember from 'ember';
import { moduleFor, test } from 'ember-qunit';

moduleFor('adapter:application', 'DjangoTastypieAdapter', {
  // The integration tests don't work with the host set so the host
  // setting is being overridden directly.
  subject: function(options, factory) {
    return factory.create({'namespace': 'api/v1'});
  }
});

test('buildURL - should not use plurals', function(assert) {
  var adapter = this.subject();
  assert.equal(adapter.buildURL('person', 1), "/api/v1/person/1/");
});

test("if you specify a server domain then it is prepended onto all URLs", function(assert) {
  var adapter = this.subject();
  adapter.set('serverDomain', 'http://localhost:8000');
  assert.equal(adapter.buildURL('person', 1), "http://localhost:8000/api/v1/person/1/");
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
