import DS from 'ember-data';
import Ember from 'ember';
import { moduleFor, test } from 'ember-qunit';
import DjangoTastypieAdapter from 'ember-data-tastypie-adapter/adapters/dta';
import DjangoTastypieSerializer from 'ember-data-tastypie-adapter/serializers/dta';
import HomePlanet from '../../../models/home-planet';
import SuperVillain from '../../../models/super-villain';
import YellowMinion from '../../../models/yellow-minion';
import DoomsdayDevice from '../../../models/doomsday-device';
import Course from '../../../models/course';
import Unit from '../../../models/unit';
import Comment from '../../../models/comment';

var get = Ember.get, set = Ember.set;
var run = Ember.run;
/* var HomePlanet, league, SuperVillain, superVillain, EvilMinion, YellowMinion, DoomsdayDevice, PopularVillain, Comment, Course, Unit, env; */

moduleFor('serializer:application', 'DjangoTastypieSerializer', {
  needs: ['model:super-villain', 'model:home-planet', 'model:evil-minion',
      'model:yellow-minion', 'model:doomsday-device',
      'model:course', 'model:unit', 'model:comment', 'model:post'],
  beforeEach: function() {
      var container = this.container;

      var adapterFactory = container.lookupFactory('adapter:application');
      if (!adapterFactory) {
          container.register('adapter:application', DjangoTastypieAdapter);
      }
  }
});

/*
module("integration/django_tastypie_adapter - DjangoTastypieSerializer", {
  setup: function() {

    SuperVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      homePlanet:    DS.belongsTo("homePlanet", {async: true}),
      evilMinions:   DS.hasMany("evilMinion", {async: true})
    });
    HomePlanet = DS.Model.extend({
      name:          DS.attr('string'),
      villains:      DS.hasMany('superVillain', {async: true})
    });
    EvilMinion = DS.Model.extend({
      superVillain: DS.belongsTo('superVillain'),
      name:         DS.attr('string')
    });
    YellowMinion = EvilMinion.extend();
    DoomsdayDevice = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinion:   DS.belongsTo('evilMinion', {polymorphic: true})
    });
    PopularVillain = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinions:  DS.hasMany('evilMinion', {polymorphic: true})
    });
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      root: DS.attr('boolean'),
      children: DS.hasMany('comment')
    });
    Course = DS.Model.extend({
      name: DS.attr('string'),
      prerequisiteUnits: DS.hasMany('unit'),
      units: DS.hasMany('unit')
    });
    Unit = DS.Model.extend({
      name: DS.attr('string')
    });
    env = setupStore({
      superVillain:   SuperVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion,
      yellowMinion:   YellowMinion,
      doomsdayDevice: DoomsdayDevice,
      popularVillain: PopularVillain,
      comment:        Comment,
      course:         Course,
      unit:           Unit,
      adapter: DS.DjangoTastypieAdapter
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('evilMinion');
    env.store.modelFor('yellowMinion');
    env.store.modelFor('doomsdayDevice');
    env.store.modelFor('popularVillain');
    env.store.modelFor('comment');
    env.store.modelFor('course');
    env.store.modelFor('unit');
    env.container.register('serializer:application', DS.DjangoTastypieSerializer);
    env.container.register('serializer:-django-tastypie', DS.DjangoTastypieSerializer);
    env.container.register('adapter:-django-tastypie', DS.DjangoTastypieAdapter);
    env.dtSerializer = env.container.lookup("serializer:-django-tastypie");
    env.dtAdapter    = env.container.lookup("adapter:-django-tastypie");
  },

  teardown: function() {
    Ember.run(function() {
      env.store.destroy();
    });
  }
});
*/

test("serialize", function(assert) {
  var serializer = this.subject();
  var store = this.container.lookup('store:main');

  var league, tom, json;

  run(function() {
    league = store.createRecord('home-planet', { name: "Villain League", id: "123" });
    tom = store.createRecord('super-villain', { firstName: "Tom", lastName: "Dale", homePlanet: league });

    json = serializer.serialize(tom._createSnapshot());
  });

  assert.deepEqual(json, {
    first_name: "Tom",
    last_name: "Dale",
    home_planet: '/api/v1/homePlanet/'+get(league, "id")+'/',
    evil_minions: []
  });
});

test("serializeIntoHash", function(assert) {
  var serializer = this.subject();
  var store = this.container.lookup('store:main');
  var league, json = {};
  run(function() {
    league = store.createRecord('home-planet', { name: "Umber", id: "123" });

    serializer.serializeIntoHash(json, store.modelFor('home-planet'), league._createSnapshot());
  });

  assert.deepEqual(json, {
    name: "Umber",
    villains: []
  });
});

test("normalize", function(assert) {
  var store = this.container.lookup('store:main');
  var serializer = this.subject();
  var superVillain_hash = {first_name: "Tom", last_name: "Dale", home_planet: "/api/v1/homePlanet/123/", evil_minions: ['/api/v1/evilMinion/1/', '/api/v1/evilMinion/2/'], resource_uri: '/api/v1/superVillain/1/'};

  var json;
  run(function() {
    json = serializer.normalize(store.modelFor('super-villain'), superVillain_hash, "super-villain");
  });

  assert.deepEqual(json, {
    id: "1",
    firstName: "Tom",
    lastName: "Dale",
    homePlanet: "123",
    evilMinions: ["1", "2"]
  });
});

test("extractSingle", function(assert) {
  var serializer = this.subject();
  var container = this.container;
  var store = this.container.lookup('store:main');
  container.register('adapter:super-villain', DjangoTastypieAdapter);

  var json_hash = {
    id: "1", name: "Umber", villains: ["/api/v1/super_villain/1/"],
    resource_uri: '/api/v1/home_planet/1/'
  };

  var json;
  run(function() {
    json = serializer.extractSingle(store, store.modelFor('home-planet'), json_hash);
  });

  assert.deepEqual(json, {
    "id": "1",
    "name": "Umber",
    "villains": ["1"]
  });
});

test("extractSingle with embedded objects", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');
  container.register('adapter:super-villain', DjangoTastypieAdapter);
  container.register('serializer:home-planet', DjangoTastypieSerializer.extend({
    attrs: {
      villains: {embedded: 'always'}
    }
  }));

  var serializer = container.lookup("serializer:home-planet");
  var json_hash = {
    id: "1",
    name: "Umber",
    villains: [{
      id: "1",
      first_name: "Tom",
      last_name: "Dale",
      resource_uri: "/api/v1/super_villain/1/"
    }],
    resource_uri: "/api/v1/home_planet/1/"
  };

  var json;
  run(function() {
    json = serializer.extractSingle(store, store.modelFor('home-planet'), json_hash);
  });

  assert.deepEqual(json, {
    id: "1",
    name: "Umber",
    villains: ["1"]
  });

  run(store, 'find', "super-villain", 1).then(function(minion) {
    assert.equal(minion.get('firstName'), "Tom");
  });
});

test("extractSingle with embedded objects inside embedded objects", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');

  SuperVillain.reopen({
    homePlanet:    DS.belongsTo("home-planet"),
    evilMinions:   DS.hasMany("evil-minion")
  });

  HomePlanet.reopen({
    villains:      DS.hasMany('super-villain')
  });

  container.register('adapter:super-villain', DjangoTastypieAdapter);
  container.register('serializer:home-planet', DjangoTastypieSerializer.extend({
    attrs: {
      villains: {embedded: 'always'}
    }
  }));
  container.register('serializer:super-villain', DjangoTastypieSerializer.extend({
    attrs: {
      evilMinions: {embedded: 'always'}
    }
  }));

  var serializer = container.lookup("serializer:home-planet");
  var json_hash = {
    id: "1",
    name: "Umber",
    villains: [{
      id: "1",
      first_name: "Tom",
      last_name: "Dale",
      evil_minions: [{
        id: "1",
        name: "Alex",
        resource_uri: '/api/v1/evil_minions/1/'
      }],
      resource_uri: '/api/v1/super_villain/1/'
    }],
    resource_uri: '/api/v1/home_planet/1/'
  };

  var json;
  run(function() {
    json = serializer.extractSingle(store, store.modelFor('home-planet'), json_hash);
  });

  assert.deepEqual(json, {
    id: "1",
    name: "Umber",
    villains: ["1"]
  });
  run(function() {
    store.find("super-villain", 1).then(function(villain) {
      assert.equal(villain.get('firstName'), "Tom");
      assert.equal(villain.get('evilMinions.length'), 1, "Should load the embedded child");
      assert.equal(villain.get('evilMinions.firstObject.name'), "Alex", "Should load the embedded child");
    });
    store.find("evil-minion", 1).then(function(minion) {
      assert.equal(minion.get('name'), "Alex");
    });
  });
});

test("extractSingle with embedded objects of same type", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');
  container.register('adapter:comment', DjangoTastypieAdapter);
  container.register('serializer:comment', DjangoTastypieSerializer.extend({
    attrs: {
      children: {embedded: 'always'}
    }
  }));

  var serializer = container.lookup("serializer:comment");
  var json_hash = {
    id: "1",
    body: "Hello",
    root: true,
    children: [{
      id: "2",
      body: "World",
      root: false,
      resource_uri: '/api/v1/comment/2/'
    },
    {
      id: "3",
      body: "Foo",
      root: false,
      resource_uri: '/api/v1/comment/3/'
    }],
    resource_uri: '/api/v1/comment/1/'
  };

  var json;
  run(function() {
    json = serializer.extractSingle(store, store.modelFor('comment'), json_hash);
  });

  assert.deepEqual(json, {
    id: "1",
    body: "Hello",
    root: true,
    children: ["2", "3"]
  }, "Primary record was correct");
  assert.equal(store.recordForId("comment", "2").get("body"), "World", "Secondary records found in the store");
  assert.equal(store.recordForId("comment", "3").get("body"), "Foo", "Secondary records found in the store");
});

test("extractSingle with embedded objects inside embedded objects of same type", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');
  container.register('adapter:comment', DjangoTastypieAdapter);
  container.register('serializer:comment', DjangoTastypieSerializer.extend({
    attrs: {
      children: {embedded: 'always'}
    }
  }));

  var serializer = container.lookup("serializer:comment");
  var json_hash = {
    id: "1",
    body: "Hello",
    root: true,
    children: [{
      id: "2",
      body: "World",
      root: false,
      children: [{
        id: "4",
        body: "Another",
        root: false,
        resource_uri: '/api/v1/comment/4/'
      }],
      resource_uri: '/api/v1/comment/2/'
    },
    {
      id: "3",
      body: "Foo",
      root: false,
      resource_uri: '/api/v1/comment/3/'
    }],
    resource_uri: '/api/v1/comment/1/'
  };
  var json;
  run(function() {
    json = serializer.extractSingle(store, store.modelFor('comment'), json_hash);
  });

  assert.deepEqual(json, {
    id: "1",
    body: "Hello",
    root: true,
    children: ["2", "3"]
  }, "Primary record was correct");
  assert.equal(store.recordForId("comment", "2").get("body"), "World", "Secondary records found in the store");
  assert.equal(store.recordForId("comment", "3").get("body"), "Foo", "Secondary records found in the store");
  assert.equal(store.recordForId("comment", "4").get("body"), "Another", "Secondary records found in the store");
  assert.equal(store.recordForId("comment", "2").get("children.length"), 1, "Should have one embedded record");
  assert.equal(store.recordForId("comment", "2").get("children.firstObject.body"), "Another", "Should have one embedded record");
});

test("extractSingle with embedded objects of same type, but from separate attributes", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');
  container.register('adapter:course', DjangoTastypieAdapter);
  container.register('serializer:course', DjangoTastypieSerializer.extend({
    attrs: {
      prerequisiteUnits: {embedded: 'always'},
      units: {embedded: 'always'}
    }
  }));

  var serializer = container.lookup("serializer:course");
  var json_hash = {
    id: "1",
    name: "Course 1",
    prerequisite_units: [{
      id: "1",
      name: "Unit 1",
      resource_uri: '/api/v1/unit/1/'
    },{
      id: "3",
      name: "Unit 3",
      resource_uri: '/api/v1/unit/3/'
    }],
    units: [{
      id: "2",
      name: "Unit 2",
      resource_uri: '/api/v1/unit/2/'
    },{
      id: "4",
      name: "Unit 4",
      resource_uri: '/api/v1/unit/4/'
    }],
    resource_uri: '/api/v1/course/1/'
  };

  var json;
  run(function() {
    json = serializer.extractSingle(store, store.modelFor('course'), json_hash);
  });

  assert.deepEqual(json, {
    id: "1",
    name: "Course 1",
    prerequisiteUnits: ["1", "3"],
    units: ["2", "4"]
  }, "Primary array was correct");

  assert.equal(store.recordForId("unit", "1").get("name"), "Unit 1", "Secondary records found in the store");
  assert.equal(store.recordForId("unit", "2").get("name"), "Unit 2", "Secondary records found in the store");
  assert.equal(store.recordForId("unit", "3").get("name"), "Unit 3", "Secondary records found in the store");
  assert.equal(store.recordForId("unit", "4").get("name"), "Unit 4", "Secondary records found in the store");
});

test("extractArray", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');
  HomePlanet.reopen({
    villains: DS.hasMany('super-villain', {async: true})
  });
  container.register('serializer:home-planet', DjangoTastypieSerializer.extend({
    attrs: {
      villains: {embedded: false}
    }
  }));
  container.register('serializer:super-villain', DjangoTastypieSerializer.extend({
    attrs: {
      evilMinions: {embedded: false}
    }
  }));
  container.register('adapter:super-villain', DjangoTastypieAdapter);
  var serializer = this.container.lookup('serializer:home-planet');

  var json_hash = {
    meta: {},
    objects: [{id: "1", name: "Umber", villains: ['/api/v1/super_villain/1/'], resource_uri: '/api/v1/home_planet/1/'}]
  };

  var array;
  run(function() {
    array = serializer.extractArray(store, store.modelFor('home-planet'), json_hash);
  });

  assert.deepEqual(array, [{
    "id": "1",
    "name": "Umber",
    "villains": ["1"]
  }]);
});

test("extractArray with embedded objects", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');
  container.register('adapter:super-villain', DjangoTastypieAdapter);
  container.register('serializer:home-planet', DjangoTastypieSerializer.extend({
    attrs: {
      villains: {embedded: 'always'}
    }
  }));

  var serializer = container.lookup("serializer:home-planet");

  var json_hash = {
    objects: [{
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale",
        resource_uri: '/api/v1/superVillain/1/'
      }],
      resource_uri: '/api/v1/homePlanet/1/'
    }]
  };

  var array;
  run(function() {
    array = serializer.extractArray(store, store.modelFor('home-planet'), json_hash);
  });

  assert.deepEqual(array, [{
    id: "1",
    name: "Umber",
    villains: ["1"]
  }]);

  run(function() {
    store.find("super-villain", 1).then(function(minion){
      assert.equal(minion.get('firstName'), "Tom");
    });
  });
});

test("extractArray with embedded objects of same type as primary type", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');
  container.register('adapter:comment', DjangoTastypieAdapter);
  container.register('serializer:comment', DjangoTastypieSerializer.extend({
    attrs: {
      children: {embedded: 'always'}
    }
  }));

  var serializer = container.lookup("serializer:comment");

  var json_hash = {
    objects: [{
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false,
        resource_uri: '/api/v1/comment/2/'
      },
      {
        id: "3",
        body: "Foo",
        root: false,
        resource_uri: '/api/v1/comment/3/'
      }],
      resource_uri: '/api/v1/comment/1/'
    }]
  };

  var array;
  run(function() {
    array = serializer.extractArray(store, store.modelFor('comment'), json_hash);
  });

  assert.deepEqual(array, [{
    id: "1",
    body: "Hello",
    root: true,
    children: ["2", "3"]
  }], "Primary array is correct");

  assert.equal(store.recordForId("comment", "2").get("body"), "World", "Secondary record found in the store");
  assert.equal(store.recordForId("comment", "3").get("body"), "Foo", "Secondary record found in the store");
});

test("extractArray with embedded objects of same type, but from separate attributes", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');
  container.register('adapter:course', DjangoTastypieAdapter);
  container.register('serializer:course', DjangoTastypieSerializer.extend({
    attrs: {
      prerequisiteUnits: {embedded: 'always'},
      units: {embedded: 'always'}
    }
  }));

  var serializer = container.lookup("serializer:course");
  var json_hash = {
    objects: [{
      id: "1",
      name: "Course 1",
      resource_uri: '/api/v1/course/1/',
      prerequisite_units: [{
        id: "1",
        name: "Unit 1",
        resource_uri: '/api/v1/unit/1/'
      },{
        id: "3",
        name: "Unit 3",
        resource_uri: '/api/v1/unit/3/'
      }],
      units: [{
        id: "2",
        name: "Unit 2",
        resource_uri: '/api/v1/unit/2/'
      },{
        id: "4",
        name: "Unit 4",
        resource_uri: '/api/v1/unit/4/'
      }]
    },{
      id: "2",
      name: "Course 2",
      resource_uri: '/api/v1/course/2/',
      prerequisite_units: [{
        id: "1",
        name: "Unit 1",
        resource_uri: '/api/v1/unit/1/'
      },{
        id: "3",
        name: "Unit 3",
        resource_uri: '/api/v1/unit/3/'
      }],
      units: [{
        id: "5",
        name: "Unit 5",
        resource_uri: '/api/v1/unit/5/'
      },{
        id: "6",
        name: "Unit 6",
        resource_uri: '/api/v1/unit/6/'
      }]
    }]
  };
  var json;

  run(function() {
    json = serializer.extractArray(store, store.modelFor('course'), json_hash);
  });

  assert.deepEqual(json, [{
    id: "1",
    name: "Course 1",
    prerequisiteUnits: ["1", "3"],
    units: ["2", "4"]
  },{
    id: "2",
    name: "Course 2",
    prerequisiteUnits: ["1", "3"],
    units: ["5", "6"]
  }], "Primary array was correct");

  assert.equal(store.recordForId("unit", "1").get("name"), "Unit 1", "Secondary records found in the store");
  assert.equal(store.recordForId("unit", "2").get("name"), "Unit 2", "Secondary records found in the store");
  assert.equal(store.recordForId("unit", "3").get("name"), "Unit 3", "Secondary records found in the store");
  assert.equal(store.recordForId("unit", "4").get("name"), "Unit 4", "Secondary records found in the store");
  assert.equal(store.recordForId("unit", "5").get("name"), "Unit 5", "Secondary records found in the store");
  assert.equal(store.recordForId("unit", "6").get("name"), "Unit 6", "Secondary records found in the store");
});

test("serialize polymorphic", function(assert) {
  var store = this.container.lookup('store:main');
  var serializer = this.subject();
  var tom, ray, json;
  run(function() {
    tom = store.createRecord('yellow-minion',   {name: "Alex", id: "124"});
    ray = store.createRecord('doomsday-device', {evilMinion: tom, name: "DeathRay"});

    json = serializer.serialize(ray._createSnapshot());
  });
  assert.deepEqual(json, {
    name:  "DeathRay",
    evil_minionType: "yellowMinion",
    evil_minion: "/api/v1/evilMinion/124/"
  });
});

test("serialize with embedded objects", function(assert) {
  var container = this.container;
  var store = this.container.lookup('store:main');

  SuperVillain.reopen({
    homePlanet:    DS.belongsTo("home-planet"),
    evilMinions:   DS.hasMany("evil-minion", { async: true })
  });

  HomePlanet.reopen({
    villains:      DS.hasMany('super-villain', { async: false })
  });

  var league, tom;
  run(function() {
    league = store.createRecord('home-planet', { name: "Villain League", id: "123" });
    tom = store.createRecord('super-villain', { id: 1, firstName: "Tom", lastName: "Dale", homePlanet: league });
  });

  container.register('serializer:home-planet', DjangoTastypieSerializer.extend({
    attrs: {
      villains: {embedded: 'always'}
    }
  }));
  var serializer = container.lookup("serializer:home-planet");
  var json;
  run(function() {
    json = serializer.serialize(league._createSnapshot());
  });

  assert.deepEqual(json, {
    name: "Villain League",
    villains: [{
      id: tom.get("id"),
      first_name: "Tom",
      last_name: "Dale",
      home_planet: '/api/v1/homePlanet/' + league.get("id") +'/',
      evil_minions: []
    }]
  });
});

/*
test("extractPolymorphic hasMany", function() {
  env.container.register('adapter:yellowMinion', DS.DjangoTastypieAdapter);
  PopularVillain.toString = function() { return "PopularVillain"; };
  YellowMinion.toString = function() { return "YellowMinion"; };

  var json_hash = {
    id: 1,
    name: "Dr Horrible",
    evil_minions: [{
      type: "yellow_minion",
      id: 12,
      resource_uri: '/api/v1/evilMinion/12/'}],
    resource_uri: '/api/v1/popularVillain/1/'
  };

  var json = env.dtSerializer.extractSingle(env.store, PopularVillain, json_hash);

  deepEqual(json, {
    "id": 1,
    "name": "Dr Horrible",
    "evilMinions": [{
      type: "yellowMinion",
      id: 12
    }]
  });
});

test("extractPolymorphic", function() {
  env.container.register('adapter:yellowMinion', DS.DjangoTastypieAdapter);
  EvilMinion.toString   = function() { return "EvilMinion"; };
  YellowMinion.toString = function() { return "YellowMinion"; };

  var json_hash = {
    id: 1, name: "DeathRay", evil_minion: { type: "yellowMinion", id: 12, resource_uri: '/api/v1/evil_minion/12/'}, resource_uri: '/api/v1/doomsday_device/1/'
  };

  var json = env.dtSerializer.extractSingle(env.store, DoomsdayDevice, json_hash);

  deepEqual(json, {
    "id": 1,
    "name": "DeathRay",
    "evilMinion": {
      type: "yellowMinion",
      id: 12
    }
  });
});

test("extractPolymorphic when the related data is not specified", function() {
  var json = {
    id: 1, name: "DeathRay", resource_uri: '/api/v1/doomsday_device/1/'
  };

  json = env.dtSerializer.extractSingle(env.store, DoomsdayDevice, json);

  deepEqual(json, {
    "id": "1",
    "name": "DeathRay",
    "evilMinion": undefined
  });
});

test("extractPolymorphic hasMany when the related data is not specified", function() {
  var json = {
    id: 1, name: "Dr Horrible", resource_uri: '/api/v1/popular_villain/1/'
  };

  json = env.dtSerializer.extractSingle(env.store, PopularVillain, json);

  deepEqual(json, {
    "id": "1",
    "name": "Dr Horrible",
    "evilMinions": undefined
  });
});

test("extractPolymorphic does not break hasMany relationships", function() {
  var json = {
    id: 1, name: "Dr. Evil", evilMinions: [], resource_uri: '/api/v1/popular_villain/1/'
  };

  json = env.dtSerializer.extractSingle(env.store, PopularVillain, json);

  deepEqual(json, {
    "id": "1",
    "name": "Dr. Evil",
    "evilMinions": undefined
  });
});
*/
