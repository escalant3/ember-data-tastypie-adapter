DS.DjangoTastypieSerializer = DS.Serializer.extend({
  /*
   * This is the default Tastypie url found in the documentation.
   * You may change it if necessary when creating the adapter
   */
  tastypieApiUrl: "api/v1/",

  getItemUrl: function(meta, id){
    var url;
    Em.assert("tastypieApiUrl parameters is mandatory.", !!this.tastypieApiUrl);

    url = this.rootForType(meta.type);
    return ["", this.tastypieApiUrl.slice(0,-1), url, id, ""].join('/');
  },

  // TODO Remove this duplicated code
  rootForType: function(type) {
    if (type.url) { return type.url; }

    // use the last part of the name as the URL
    var parts = type.toString().split(".");
    var name = parts[parts.length - 1];
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1);
  },

  keyForBelongsTo: function(type, name) {
    return this.keyForAttributeName(type, name) + "_id";
  },

  keyForAttributeName: function(type, name) {
    return Ember.String.decamelize(name);
  },

  /**
   * ASSOCIATIONS: SERIALIZATION
   * Transforms the association fields to Resource URI django-tastypie format
   */
  addBelongsTo: function(hash, record, key, relationship) {
    var id = Ember.get(record, relationship.key+'.id');

    if (!Ember.none(id)) { hash[key] = this.getItemUrl(relationship, id); }
  },

  addHasMany: function(hash, record, key, relationship) {
    var self = this,
        serializedValues = [],
        id = null;

    key = this.keyForHasMany(relationship.type, key);

    value = record.get(key) || [];

    value.forEach(function(item) {
      id = item.get(self.primaryKey(item));
      serializedValues.push(self.getItemUrl(relationship, id));
    });

    hash[key] = serializedValues;
  }

});

DS.DjangoTastypieAdapter = DS.RESTAdapter.extend({
  /*
   * Set this parameter if you are planning to do cross-site
   * requests to the destination domain. Remember trailing slash
   */
  serverDomain: "",

  /*
   * Bulk commits are not supported at this time by the adapter.
   * Changing this setting will not work
   */
  bulkCommit: false,

  /*
   * Serializer object to manage JSON transformations
   */
  serializer: DS.DjangoTastypieSerializer.create({

  }),


  /**
   * Transforms the association fields from Resource URI django-tastypie format to IDs
   */
  _deurlifyData: function(type, jsonObject) {
    var meta,
        value,
        self;

    self = this;

    var deurlify = function(value) {
      if (!!value) {
        return value.split('/').reverse()[1];
      }
    };

    var associations = Em.get(type, 'associationsByName'),
        self = this;

    associations.forEach(function(key, meta) {
      meta = type.metaForProperty(key);

      if (meta.kind === "belongsTo") {
        key = self.get('serializer').keyForBelongsTo(type, key);
        value = jsonObject[key];
        if (value !== undefined) {
          jsonObject[key] = (meta.options.embedded) ? self._deurlifyData( meta.type, value ) : deurlify(value);
        }
      } else if (meta.kind === "hasMany") {
        key = self.get('serializer').keyForHasMany(type, key);
        if (!!jsonObject[key]) {
          jsonObject[key].forEach(function(item, i, collection) {
            collection[i] = (meta.options.embedded) ? item : deurlify(item);
          });
        }
      }
    });
    return jsonObject;
  },

  /*
   * Create a record in the Django server. POST actions must
   * be enabled in the Resource
   */
  createRecord: function(store, type, record) {
    var self = this,
        root = this.rootForType(type),
        data;

    data = JSON.stringify(record.toJSON());

    this.ajax(root, "POST", {
      data: data,
      success: function(json) {
        json = self._deurlifyData(type, json);
        self.didCreateRecord(store, record, json);
      },
      error: function(error) {
      }
    });
  },

  /*
   * Edit a record in the Django server. PUT actions must
   * be enabled in the Resource
   */
  updateRecord: function(store, type, record) {
    var self = this,
        id,
        data,
        url;

    id = Em.get(record, 'id');
    root = this.rootForType(type);

    data = JSON.stringify(record.toJSON());

    url = [root, id].join("/");

    this.ajax(url, "PUT", {
      data: data,
      success: function(json) {
        json = self._deurlifyData(type, json);
        self.didUpdateRecord(store, record, json);
      },
      error: function(error) {
      }
    });
  },

  /*
   * Delete a record in the Django server. DELETE actions
   * must be enabled in the Resource
   */
  deleteRecord: function(store, type, record) {
    var self = this;

    var id = Em.get(record, 'id');
    var root = this.rootForType(type);

    var url = [root, id].join("/");

    this.ajax(url, "DELETE", {
      success: function(json) {
        self.didDeleteRecord(store, record, json);
      }
    });
  },

  /*
   * Mark record as saved in after creating
   */
  didCreateRecord: function(store, record, json) {
    this.didSaveRecord(store, record, json);
  },

  /*
   * Mark record as saved after updating
   */
  didUpdateRecord: function(store, record, json) {
    this.didSaveRecord(store, record, json);
  },

  /*
   * Mark record as saved after deleting
   */
  didDeleteRecord: function(store, record, json) {
    this.didSaveRecord(store, record, json);
  },

  find: function(store, type, id) {
    var self = this;

    // FindMany array through subset of resources
    if (id instanceof Array) {
      id = "set/" + id.join(";");
    }

    var root = this.rootForType(type);
    var url = [root, id].join("/");

    this.ajax(url, "GET", {
      success: function(json) {

        // Loads collection for findMany
        if (json.hasOwnProperty("objects")) {
          json["objects"].forEach(function(item, i, collection) {
            collection[i] = self._deurlifyData(type, item);
          });
          store.loadMany(type, json["objects"]);
        // Loads unique element with find by id
        } else {
          json = self._deurlifyData(type, json);
          store.load(type, json);
        }
      }
    });
  },

  findMany: function() {
    this.find.apply(this, arguments);
  },

  findAll: function(store, type) {
    var self = this;
    var root = this.rootForType(type);

    this.ajax(root, "GET", {
      success: function(json) {
        json["objects"].forEach(function(item, i, collection) {
          collection[i] = self._deurlifyData(type, item);
        });
        store.loadMany(type, json["objects"]);
      }
    });
  },

  findQuery: function(store, type, query, recordArray){
    var self = this;
    var root = this.rootForType(type);

    this.ajax(root, "GET", {
      data: query,
      success: function(json) {
        self.didFindQuery(store, type, json, recordArray);
      }
    });
  },

  didFindQuery: function(store, type, json, recordArray) {
    var self = this;

    json["objects"].forEach(function(item, i, collection) {
      collection[i] = self._deurlifyData(type, item);
    });

    recordArray.load(json["objects"]);
  },

  getItemUrl: function(type, meta, id){
    var url;
    Em.assert("tastypieApiUrl parameters is mandatory.", !!this.get('serializer').tastypieApiUrl);
    url = this.rootForType(meta.type);
    return ["", this.get('serializer').tastypieApiUrl.slice(0,-1), url, id, ""].join('/');
  },

  getTastypieUrl: function(url){
    Em.assert("tastypieApiUrl parameters is mandatory.", !!this.get('serializer').tastypieApiUrl);
    return this.serverDomain + this.get('serializer').tastypieApiUrl + url + "/";

  },

  ajax: function(url, type, hash) {
    hash.url = this.getTastypieUrl(url);
    hash.type = type;
    hash.dataType = "json";
    hash.contentType = 'application/json';
    jQuery.ajax(hash);
  },

  /**
    * django-tastypie does not pluralize names for lists
    */
  pluralize: function(name) {
    return name;
  }
});
