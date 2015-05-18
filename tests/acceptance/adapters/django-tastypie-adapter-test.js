import Ember from 'ember';
import { module, test } from 'qunit';
import startApp from '../../helpers/start-app';
import Person from '../../../models/person';
import Group from '../../../models/group';
import Post from '../../../models/post';
import Comment from '../../../models/comment';
import DjangoTastypieSerializer from 'ember-data-tastypie-adapter/serializers/dta';
import DjangoTastypieAdapter from 'ember-data-tastypie-adapter/adapters/dta';

var application;
var store;
var adapter;
var passedUrl, passedVerb, passedHash;
var run = Ember.run;

module('Acceptance: AdaptersDjangoTastypieAdapter', {
  beforeEach: function() {
    application = startApp({'namespace': 'api/v1'});

    store = application.__container__.lookup('store:main');
    adapter = application.__container__.lookup('adapter:application');

    passedUrl = passedVerb = passedHash = null;
  },
  afterEach: function() {
    Ember.run(application, 'destroy');
  }
});

function ajaxResponse(value) {
  adapter.reopen({
    ajax: function(url, verb, hash) {
      passedUrl = url;
      passedVerb = verb;
      passedHash = hash;

      return run(Ember.RSVP, 'resolve', value);
    }
  });
}

var expectUrl = function(assert, url, desc) {
  assert.equal(passedUrl, url, "the URL is: " + url);
};

var expectType = function(assert, type) {
  assert.equal(passedVerb, type, "the HTTP method is: " + type);
};

var expectData = function(assert, hash) {
  assert.deepEqual(passedHash.data, hash, "the hash was passed along");
};

var expectState = function(assert, model, state, value) {
  if (value === undefined) { value = true; }

  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
  assert.equal(model.get(flag), value, "the person is " + (value === false ? "not " : "") + state);
};

test("can create a record", function(assert) {
  run(function() {
    var record = store.createRecord('person');
    record.set('name', 'bar');

    assert.equal(record.get('name'), 'bar', "property was set on the record");
  });
});

test("find - basic payload", function (assert) {
  var id = $.mockjax({
    url: '/api/v1/person/1/',
    status: 200,
    responseText: {id: 1, name: "Rails is omakase", resource_uri: '/api/v1/person/1/'}
  });
  stop();
  run(store, 'find', 'person', 1).then(function (person) {
    assert.equal($.mockjax.mockedAjaxCalls().length, 1);
    assert.equal(person.get('id'), "1");
    assert.equal(person.get('name'), "Rails is omakase");

    $.mockjax.clear(id);
    start();
  });
});

test("creating a person makes a POST to /api/v1/person, with the data hash", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/person/',
    type: 'POST',
    status: 200,
    response: function(settings) {
      var data = JSON.parse(settings.data);
      assert.equal(data['name'], "Tom Dale");
      this.responseText = {id: 1, name: "Tom Dale", resource_uri: '/api/v1/person/1/'};
    }
  });

  stop();
  run(function() {
    var person = store.createRecord('person', {name: 'Tom Dale'});

    person.save().then(function(person) {
      assert.equal(person.get('id'), "1", "the post has the updated ID");
      assert.equal(person.get('isDirty'), false, "the post isn't dirty anymore");

      $.mockjax.clear(id);
      start();
    });
  });
});

test("updating a person makes a PUT to /people/:id with the data hash", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/person/1/',
    type: 'PUT',
    status: 200,
    response: function(settings) {
      var data = JSON.parse(settings.data);
      assert.equal(data['name'], "Brohuda Brokatz");
      this.responseText = {id: 1, name: "Brohuda Brokatz", resource_uri: '/api/v1/person/1/'};
    }
  });

  adapter.set('bulkCommit', false);

  stop();
  run(store, 'push', 'person', { id: 1, name: "Yehuda Katz" });

  run(store, 'find', 'person', 1).then(function(person) {
    person.set('name', "Brohuda Brokatz");
    return person.save();
  }).then(function(person) {
    assert.equal(person.get('id'), "1");
    assert.equal(person.get('isDirty'), false, "the person isn't dirty anymore");
    assert.equal(person.get('name'), "Brohuda Brokatz");

    $.mockjax.clear(id);
    start();
  });

});

test("updates are not required to return data", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/person/1/',
    type: 'PUT',
    status: 200,
    response: function(settings) {
      var data = JSON.parse(settings.data);
      assert.equal(data['name'], "Brohuda Brokatz");
      this.responseText = null;
    }
  });

  adapter.set('bulkCommit', false);

  stop();
  run(store, 'push', 'person', { id: 1, name: "Yehuda Katz" });

  var _person;

  run(store, 'find', 'person', 1).then(function(person) {
    expectState(assert, person, 'new', false);
    expectState(assert, person, 'loaded');
    expectState(assert, person, 'dirty', false);

    _person = person;

    person.set('name', "Brohuda Brokatz");
    expectState(assert, person, 'dirty');

    return person.save();
  }).then(function(person) {
    expectState(assert, person, 'saving', false);

    assert.equal(_person, store.getById('person', 1), "the same person is retrieved by the same ID");
    assert.equal(person.get('name'), "Brohuda Brokatz", "the data is preserved");

    $.mockjax.clear(id);
    start();
  });

});

test("deleting a person makes a DELETE to /api/v1/person/:id/", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/person/1/',
    type: 'DELETE',
    status: 200,
    responseText: null
  });

  adapter.set('bulkCommit', false);

  stop();
  run(store, 'push', 'person', { id: 1, name: "Tom Dale" });

  run(store, 'find', 'person', 1).then(function(person) {
    person.deleteRecord();
    return person.save();
  }).then(function(person) {
    assert.equal(person.get('isDirty'), false, "the post isn't dirty anymore");
    assert.equal(person.get('isDeleted'), true, "the post is now deleted");

    $.mockjax.clear(id);
    start();
  });
});

test("finding all people makes a GET to /api/v1/person/", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/person/',
    type: 'GET',
    responseText: {"objects": [{ id: 1, name: "Yehuda Katz", resource_uri: '/api/v1/person/1/' }]}
  });

  stop();
  run(store, 'find', 'person').then(function(people) {
    var person = people.objectAt(0);

    expectState(assert, person, 'loaded');
    expectState(assert, person, 'dirty', false);

    assert.equal(person, store.getById('person', 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
    assert.equal($.mockjax.mockedAjaxCalls().length, 1);

    $.mockjax.clear(id);
    start();
  });
});

test("since gets set if needed for pagination", function(assert) {

  var callCount = 0;
  var id = $.mockjax({
    url: '/api/v1/person/',
    type: 'GET',
    response: function(settings) {
      if (callCount === 0) {
        this.responseText = {
          objects: [{id: 1, name: "Roy", resource_uri: '/api/v1/person/1/'}, {
            id: 2,
            name: "Moss",
            resource_uri: '/api/v1/person/2/'
          }],
          meta: {limit: 2, next: "nextUrl&offset=2", offset: 0, previous: null, total_count: 25}
        };
        callCount++;
      } else {
        this.responseText = {
          objects: [{id: 3, name: "Roy", resource_uri: '/api/v1/person/3/'}, {
            id: 4,
            name: "Moss",
            resource_uri: '/api/v1/person/4/'
          }],
          meta: {limit: 2, next: "nextUrl&offset=4", offset: 2, previous: "previousUrl&offset=0", total_count: 25}
        };
        assert.equal(settings.data.offset, 2, "Offset is 2");
      }
    }
  });

  stop();
  run(function() {
    store.find('person').then(function(people) {
      assert.equal(people.get('meta.offset', 0, "Offset is set"));
      assert.equal(people.get('meta.next', "nextUrl&offset=2", "Next is set"));
      assert.equal(people.get('meta.totalCount', 25, "Total count is correct"));

      return store.find('person');
    }).then(function(morePeople) {
      assert.equal(store.metadataFor('person').offset, 2, "Offset is correct");

      $.mockjax.clear(id);
      start();
    });
  });

});

test("finding a person by ID makes a GET to /api/v1/person/:id/", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/person/1/',
    type: 'GET',
    responseText: {id: 1, name: "Yehuda Katz", resource_uri: '/api/v1/person/1/'}
  });

  stop();
  run(store, 'find', 'person', 1).then(function(person) {
    expectState(assert, person, 'loaded', true);
    expectState(assert, person, 'dirty', false);

    assert.equal(person, store.getById('person', 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
    assert.equal($.mockjax.mockedAjaxCalls().length, 1);

    $.mockjax.clear(id);
    start();
  });
});

test("findByIds generates a tastypie style url", function(assert) {

  var id = $.mockjax({
    url: '/api/v1/person/set/*/',
    type: 'GET',
    response: function(settings) {
      assert.equal(settings.url, "/api/v1/person/set/1;2;3/");
      this.responseText = { objects: [
        { id: 1, name: "Rein Heinrichs", resource_uri: '/api/v1/person/1/'},
        { id: 2, name: "Tom Dale", resource_uri: '/api/v1/person/2/' },
        { id: 3, name: "Yehuda Katz", resource_uri: '/api/v1/person/3/' }
      ]};
    }
  });

  stop();

  run(function() {
    application.registry.register('adapter:person', DjangoTastypieAdapter.extend({
      coalesceFindRequests: true
    }));
  });

  run(store, 'findByIds', 'person', [1, 2, 3]).then(function(people) {
    var rein = store.getById('person', 1),
        tom = store.getById('person', 2),
        yehuda = store.getById('person', 3);

    assert.deepEqual(rein.getProperties('id', 'name'), { id: "1", name: "Rein Heinrichs" });
    assert.deepEqual(tom.getProperties('id', 'name'), { id: "2", name: "Tom Dale" });
    assert.deepEqual(yehuda.getProperties('id', 'name'), { id: "3", name: "Yehuda Katz" });


    application.registry.unregister('adapter:person');
    $.mockjax.clear(id);
    start();
  });
});

test("finding many people by a list of IDs", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/person/set/*/',
    type: 'GET',
    response: function(settings) {
      assert.equal(settings.url, "/api/v1/person/set/1;2;3/");
      this.responseText = { objects: [
        { id: 1, name: "Rein Heinrichs", resource_uri: '/api/v1/person/1/'},
        { id: 2, name: "Tom Dale", resource_uri: '/api/v1/person/2/' },
        { id: 3, name: "Yehuda Katz", resource_uri: '/api/v1/person/3/' }
      ]};
    }
  });

  stop();
  Group.reopen({ people: DS.hasMany('person', { async: true }) });

  run(function() {
    application.registry.register('adapter:person', DjangoTastypieAdapter.extend({
      coalesceFindRequests: true
    }));
  });

  run(store, 'push', 'group', { id: 1, name: "Group 1", people: [1, 2, 3]});

  run(store, 'find', 'group', 1).then(function(group) {
    assert.ok(true, "passed");

    return group.get('people');
  }).then(function(people) {

    var rein = store.getById('person', 1),
        tom = store.getById('person', 2),
        yehuda = store.getById('person', 3);

    assert.deepEqual(rein.getProperties('id', 'name'), { id: "1", name: "Rein Heinrichs" });
    assert.deepEqual(tom.getProperties('id', 'name'), { id: "2", name: "Tom Dale" });
    assert.deepEqual(yehuda.getProperties('id', 'name'), { id: "3", name: "Yehuda Katz" });

    assert.deepEqual(people.toArray(), [ rein, tom, yehuda ], "The correct records are in the array");

    application.registry.unregister('adapter:person');
    $.mockjax.clear(id);
    start();
  });
});

test("finding people by a query", function(assert) {
  var people, rein, tom, yehuda;

  var id = $.mockjax({
    url: '/api/v1/person/',
    type: 'GET',
    status: 200,
    response: function(settings) {
      assert.equal(settings.data.page, 1);

      this.responseText = {
        objects: [
          { id: 1, name: "Rein Heinrichs", resource_uri: '/api/v1/person/1/' },
          { id: 2, name: "Tom Dale", resource_uri: '/api/v1/person/2/' },
          { id: 3, name: "Yehuda Katz", resource_uri: '/api/v1/person/3/' }
        ]
      };
    }
  });

  stop();
  run(store, 'find', 'person', {page: 1}).then(function(people) {
    assert.equal(people.get('length'), 3, "the people are now loaded");

    rein = people.objectAt(0);
    assert.equal(rein.get('name'), "Rein Heinrichs");
    assert.equal(rein.get('id'), 1);

    tom = people.objectAt(1);
    assert.equal(tom.get('name'), "Tom Dale");
    assert.equal(tom.get('id'), 2);

    yehuda = people.objectAt(2);
    assert.equal(yehuda.get('name'), "Yehuda Katz");
    assert.equal(yehuda.get('id'), 3);

    people.forEach(function(person) {
      assert.equal(person.get('isLoaded'), true, "the person is being loaded");
    });

    $.mockjax.clear(id);
    start();
  });
});

test("creating an item with a belongsTo relationship urlifies the Resource URI (default key)", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/task/',
    type: 'POST',
    status: 200,
    response: function(settings) {
      var data = JSON.parse(settings.data);
      assert.deepEqual(data, { name: "Get a bike!", owner: "/api/v1/person/1/" }, "posted data is correct");
      this.responseText = null;
    }
  });

  stop();
  run(store, 'push', 'person', {id: 1, name: "Maurice Moss"});

  run(store, 'find', 'person', 1).then(function(person) {
    expectState(assert, person, 'new', false);
    expectState(assert, person, 'loaded');
    expectState(assert, person, 'dirty', false);

    var task = store.createRecord('task', {name: "Get a bike!"});
    expectState(assert, task, 'new', true);
    expectState(assert, task, 'dirty', true);
    task.set('owner', person);

    return task.save();
  }).then(function(task) {
    assert.ok(true);

    $.mockjax.clear(id);
    start();
  });

});

test("metadata is accessible", function (assert) {
  var id = $.mockjax({
    url: '/api/v1/person/',
    type: 'GET',
    status: 200,
    responseText: {
      meta: { offset: 2, limit: 0 },
      objects: [
        {id: 1, name: "Maurice Moss"},
        {id: 2, name: "Roy"}
      ]
    }
});

  stop();
  run(function() {
    store.find('person').then(function (people) {
      assert.equal(store.metadataFor('person').offset,
          2,
          "Metadata can be accessed with metadataFor");

      $.mockjax.clear(id);
      start();
    });
  });
});

test("adding hasMany relationships parses the Resource URI (default key)", function(assert) {

  var id = $.mockjax({
    url: '/api/v1/group/1/',
    type: 'PUT',
    response: function(settings) {
      var data = JSON.parse(settings.data);
      assert.deepEqual(data,  {name: "Team", people: ['/api/v1/person/1/', '/api/v1/person/2/']});
      this.responseText = null;
    }
  });

  Person.reopen({
    name: DS.attr('string'),
    group: DS.belongsTo('group', { async: true })
  });

  Group.reopen({
    people: DS.hasMany('person', { async: true })
  });

  stop();
  run(function () {
    store.push('person', {id: 1, name: "Maurice Moss"});
    store.push('person', {id: 2, name: "Roy"});
    store.push('group', {id: 1, name: "Team"});
  });

  run(function () {
    Ember.RSVP.hash({
      moss: store.find('person', 1),
      roy: store.find('person', 2),
      group: store.find('group', 1)
    }).then(function (objects) {
      var group = objects.group,
          people;

      return group.get('people').then(function (people) {
        people.pushObject(objects.moss);
        people.pushObject(objects.roy);

        return group.save();
      });
    }).
    then(function (data) {

      return store.find('person', 2);
    }).then(function (person) {
        assert.equal(person.get('name'), 'Roy');
        assert.equal(person.get('group').get('name'), 'Team');

        $.mockjax.clear(id);
        start();
    });
  });
});

test("async hasMany always returns a promise", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/comment/*',
    type: 'GET',
    status: 200,
    response: function(settings) {

      this.responseText = {
        objects: [
          { id: 1, text: "Rein Heinrichs", resource_uri: '/api/v1/comment/1/' },
          { id: 2, text: "Tom Dale", resource_uri: '/api/v1/comment/2/' }
        ]
      };

      $.mockjax.clear(id);
    }
  });

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  stop();
  run(function() {
    application.registry.register('adapter:comment', DjangoTastypieAdapter.extend({
      coalesceFindRequests: true
    }));
  });

  run(function() {
    store.push('post', { id: 1, text: "Some text", comments: ['1', '2']});

    store.find('post', 1).then(function(post) {
      assert.ok(post.get('comments') instanceof DS.PromiseArray, "comments is a promise");

      start();
    });
  });

});

test("sync hasMany find with full=True", function(assert) {

  Post.reopen({
    comments: DS.hasMany('comment', { async: false })
  });

  Comment.reopen({
    post: DS.belongsTo('post')
  });

  var id = $.mockjax({
    url: '/api/v1/post/1/',
    type: 'GET',
    responseText: {
      id: 1,
      text: "Some Text",
      comments: [
        {id: 1, text: 'Comment 1', post: '/api/v1/post/1/', resource_uri: '/api/v1/comment/1/'},
        {id: 2, text: 'Comment 2', post: '/api/v1/post/1/', resource_uri: '/api/v1/comment/2/'}
      ],
      resource_uri: '/api/v1/post/1/'
    }
  });

  stop();
  run(function() {
    store.find('post', 1).then(function(post) {
      assert.ok(post.get('comments') instanceof DS.ManyArray, "comments is not a promise");
      assert.ok(post.get('comments').isLoaded, "Comments are loaded");
      assert.equal(post.get('text'), "Some Text", "the post has the correct data");

      $.mockjax.clear(id);
      start();
    });
  });
});

test("sync hasMany save should not need to resolve relationship", function(assert) {
  var count = 0;
  var post;
  var id = $.mockjax({
    url: '/api/v1/post/1/',
    type: 'PUT',
    response: function(settings) {
      var data = JSON.parse(settings.data);
      assert.deepEqual(data, {text: "New Text", comments: [
        { id: "1", body: null, children: [], root: false, text: 'Comment 1', post: '/api/v1/post/1/' },
        { id: "2", body: null, children: [], root: false, text: 'Comment 2', post: '/api/v1/post/1/' }
      ]});
      this.responseText = null;
    }
  });

  Post.reopen({
    comments: DS.hasMany('comment', { async: false })
  });

  Comment.reopen({
    post: DS.belongsTo('post', { async: false })
  });

  stop();
  run(function() {
    post = store.push('post', { id: 1, text: "Some text", comments: [1, 2]});
    store.push('comment', {id: 1, text: "Comment 1", post: post});
    store.push('comment', {id: 2, text: "Comment 2", post: post});

    application.registry.register('adapter:comment', DjangoTastypieAdapter.extend({
      findMany: function() {
        assert.ok(false, "Should not get here.");
      }
    }));
  });

  run(function() {
    store.find('post', 1).then(function(post) {
      post.set('text', 'New Text');

      assert.equal(post.get('isDirty'), true, "the post dirty");

      return post.save();
    }).then(function(post) {
      assert.equal(post.get('isDirty'), false, "the post is not dirty anymore");
      assert.equal(post.get('text'), "New Text", "the post was updated");

      application.registry.unregister('adapter:comment');
      $.mockjax.clear(id);
      start();
    });
  });

});

test("async hasMany save should resolve promise before post", function(assert) {
  var count = 0;
  var id = $.mockjax({
    url: '/api/v1/post/1/',
    type: 'PUT',
    response: function(settings) {
      var data = JSON.parse(settings.data);
      assert.deepEqual(data, {text: "New Text", comments: ['/api/v1/comment/1/', '/api/v1/comment/2/'] });
      this.responseText = null;
    }
  });

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    post: DS.belongsTo('post', { async: true })
  });

  stop();
  run(function() {
    store.push('post', { id: 1, text: "Some text", comments: [1, 2]});
    application.registry.register('adapter:comment', DjangoTastypieAdapter.extend({
      coalesceFindRequests: true,
      findMany: function() {
        assert.ok(count++ === 0, "findHasMany called once");

        return Ember.RSVP.resolve({ objects: [
          {id: 1, text: "Comment 1", post: '/api/v1/post/1/', resource_uri: '/api/v1/comment/1/'},
          {id: 2, text: "Comment 2", post: '/api/v1/post/1/', resource_uri: '/api/v1/comment/2/'}
        ]});
      }
    }));
  });

  run(function() {
    store.find('post', 1).then(function(post) {
      post.set('text', 'New Text');

      assert.equal(post.get('isDirty'), true, "the post dirty");

      return post.save();
    }).then(function(post) {

      assert.equal(post.get('isDirty'), false, "the post is not dirty anymore");
      assert.equal(post.get('text'), "New Text", "the post was updated");

      application.registry.unregister('adapter:comment');
      $.mockjax.clear(id);
      start();
    });
  });
});

test("findQuery - payload 'meta' is accessible on the record array", function(assert) {
  var id = $.mockjax({
    url: '/api/v1/person/',
    type: 'GET',
    responseText: {
      meta: { offset: 5 },
      objects: [{id: 1, name: "Roy"}]
    }
  });

  stop();
  run(function() {
    store.findQuery('person', { page: 2 }).then(function(people) {
      assert.equal(
          people.get('meta.offset'),
          5,
          "Reponse metadata can be accessed with recordArray.meta"
      );

      $.mockjax.clear(id);
      start();
    });
  });
});

test("findQuery - each record array can have it's own meta object", function(assert) {
  var count = 0;
  var id = $.mockjax({
    url: '/api/v1/person/',
    type: 'GET',
    response: function(settings) {
      if (count === 0) {
        this.responseText = {
          meta: {offset: 5},
          objects: [{id: 1, name: "Roy"}]
        };
        count++;
      } else {
        this.responseText = {
          meta: { offset: 1 },
          objects: [{id: 1, name: "Maurice Moss"}]
        };
      }
    }
  });

  stop();
  run(function() {
    store.findQuery('person', { page: 2 }).then(function(people) {
      assert.equal(
          people.get('meta.offset'),
          5,
          "Reponse metadata can be accessed with recordArray.meta"
      );

      store.findQuery('person', { page: 1}).then(function(newPeople){
        assert.equal(newPeople.get('meta.offset'), 1, 'new array has correct metadata');
        assert.equal(people.get('meta.offset'), 5, 'metadata on the old array hasnt been clobbered');

        $.mockjax.clear(id);
        start();
      });
    });
  });
});

test("the adapter can use custom keys", function(assert) {

  var id = $.mockjax({
    url: '/api/v1/person/',
    type: 'GET',
    responseText: { objects: [{ id: 1, name_custom: "Rails is omakase", resource_uri: '/api/v1/person/1/' }, { id: 2, name_custom: "The Parley Letter", resource_uri: '/api/v1/person/2/' }] }
  });

  stop();
  run(function() {
    application.registry.register('serializer:person', DjangoTastypieSerializer.extend({
      attrs: { name: 'name_custom' }
    }));
  });

  run(function() {
    store.findAll('person').then(function (people) {
      var person1 = store.getById('person', 1),
        person2 = store.getById('person', 2);

      assert.deepEqual(person1.getProperties('id', 'name'), {id: "1", name: "Rails is omakase"}, "Person 1 is loaded");
      assert.deepEqual(person2.getProperties('id', 'name'), {id: "2", name: "The Parley Letter"}, "Person 2 is loaded");

      assert.equal(people.get('length'), 2, "The posts are in the array");
      assert.equal(people.get('isLoaded'), true, "The RecordArray is loaded");
      assert.deepEqual(people.toArray(), [person1, person2], "The correct records are in the array");

      application.registry.unregister('serializer:person');
      $.mockjax.clear(id);
      start();
    });
  });
});
