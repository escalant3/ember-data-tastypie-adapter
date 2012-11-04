var get = Ember.get, set = Ember.set;

DS.DjangoTastypieAdapter = DS.RESTAdapter.extend({
  /**
    Set this parameter if you are planning to do cross-site
    requests to the destination domain. Remember trailing slash
  */
  serverDomain: null,

  /**
    This is the default Tastypie namespace found in the documentation.
    You may change it if necessary when creating the adapter
  */
  namespace: "api/v1",

  /**
    Bulk commits are not supported at this time by the adapter.
    Changing this setting will not work
  */
  bulkCommit: false,

  /**
    Serializer object to manage JSON transformations
  */
  serializer: DS.DjangoTastypieSerializer,

  init: function() {
    var serializer,
        namespace;

    this._super();

    namespace = get(this, 'namespace');
    Em.assert("tastypie namespace parameter is mandatory.", !!namespace);

    // Make the adapter available for the serializer
    serializer = get(this, 'serializer');
    set(serializer, 'adapter', this);
    set(serializer, 'namespace', namespace);
  },


  /**
    Create a record in the Django server. POST actions must
    be enabled in the Resource
  */
  createRecord: function(store, type, record) {
    var data,
        root = this.rootForType(type);

    data = record.toJSON();

    this.ajax(this.buildURL(root), "POST", {
      data: data,
      success: function(json) {
        this.didCreateRecord(store, record, json);
      }
    });
  },

  /**
    Edit a record in the Django server. PUT actions must
    be enabled in the Resource
  */
  updateRecord: function(store, type, record) {
    var id,
        data;

    id = Em.get(record, 'id');
    root = this.rootForType(type);

    data = record.toJSON();

    this.ajax(this.buildURL(root, id), "PUT", {
      data: data,
      success: function(json) {
        this.didUpdateRecord(store, record, json);
      }
    });
  },

  /**
    Delete a record in the Django server. DELETE actions
    must be enabled in the Resource
  */
  deleteRecord: function(store, type, record) {
    var id,
        root;

    id = get(record, 'id');
    root = this.rootForType(type);

    this.ajax(this.buildURL(root, id), "DELETE", {
      success: function(json) {
        this.didDeleteRecord(store, record, json);
      }
    });
  },

  /**
    Mark record as saved in after creating
  */
  didCreateRecord: function(store, record, json) {
    this.didSaveRecord(store, record, json);
  },

  /**
    Mark record as saved after updating
  */
  didUpdateRecord: function(store, record, json) {
    this.didSaveRecord(store, record, json);
  },

  /**
    Mark record as saved after deleting
  */
  didDeleteRecord: function(store, record, json) {
    this.didSaveRecord(store, record, json);
  },

  didFindRecord: function(store, type, json, id) {
    store.load(type, id, json);
  },

  findMany: function(store, type, ids) {
    var url,
        root = this.rootForType(type);

    ids = get(this, 'serializer').serializeIds(ids);

    // FindMany array through subset of resources
    if (ids instanceof Array) {
      ids = "set/" + ids.join(";") + '/';
    }

    url = this.buildURL(root);
    url += ids;

    this.ajax(url, "GET", {
      success: function(json) {
        this.didFindMany(store, type, json);
      }
    });
  },

  didFindMany: function(store, type, json) {
    store.loadMany(type, json.objects);
  },

  didFindAll: function(store, type, json) {
    var since = this.extractSince(json);

    store.loadMany(type, json.objects);

    // this registers the id with the store, so it will be passed
    // into the next call to `findAll`
    if (since) { store.sinceForType(type, since); }

    store.didUpdateAll(type);
  },

  didFindQuery: function(store, type, json, recordArray) {
    recordArray.load(json.objects);
  },

  buildURL: function(record, suffix) {
    var url = this._super(record, suffix);

    // Add the trailing slash to avoid setting requirement in Django.settings
    if (url.charAt(url.length -1) !== '/') {
      url += '/';
    }

    // Add the server domain if any
    if (!!this.serverDomain) {
      url = this.serverDomain + url;
    }

    return url;
  },

  /**
    django-tastypie does not pluralize names for lists
  */
  pluralize: function(name) {
    return name;
  }
});
