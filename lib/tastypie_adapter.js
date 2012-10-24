DS.DjangoTastypieAdapter = DS.RESTAdapter.extend({
  /*
   * Set this parameter if you are planning to do cross-site
   * requests to the destination domain. Remember trailing slash
   */

  serverDomain: "",

  /*
   * This is the default Tastypie url found in the documentation.
   * You may change it if necessary when creating the adapter
   */
  tastypieApiUrl: "api/v1/",


  /*
   * Bulk commits are not supported at this time by the adapter.
   * Changing this setting will not work
   */
  bulkCommit: false,

  /**
   * Transforms the association fields to Resource URI django-tastypie format
   */
  _urlifyData: function(type, record, raw){
    var self = this,
        value,
        serializer,
        jsonData,
        associations;

    serializer = this.get('serializer');
    jsonData = record.toJSON({ associations: true });
    associations = Em.get(type, 'associationsByName');

    associations.forEach(function(key, meta){

      value = null;

      if (meta.kind === "belongsTo") {

        if (!!record.get(key)) {
          value = serializer.extractId(meta.type, record.get(key));
        }

        key = self.get('serializer').keyForBelongsTo(type, key);
        jsonData[key] = (value !== null) ? self.getItemUrl(type, meta, value) : null;

      } else if (meta.kind === "hasMany") {

        key = self.get('serializer').keyForHasMany(type, key);
        value = jsonData[key] || [];

        $.each(value, function(i, item) {
          value[i] = self.getItemUrl(type, meta, item);
        });

        jsonData[key] = value;
      }

    });

    return (raw) ? jsonData : JSON.stringify(jsonData);
  },

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
    var self = this;
    var root = this.rootForType(type);

    var data = this._urlifyData(type, record);

    this.ajax(root, "POST", {
      data: data,
      success: function(json) {
        json = self._deurlifyData(type, json);
        self.didCreateRecord(store, type, record, json);
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
    var self = this;

    var id = Em.get(record, 'id');
    var root = this.rootForType(type);

    var data = this._urlifyData(type, record);

    var url = [root, id].join("/");

    this.ajax(url, "PUT", {
      data: data,
      success: function(json) {
        json = self._deurlifyData(type, json);
        self.didUpdateRecord(store, type, record, json);
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
        self.didDeleteRecord(store, type, record, json);
      }
    });
  },

  /*
   * Mark record as saved in after creating
   */
  didCreateRecord: function(store, type, record, json) {
    store.didSaveRecord(record, json);
  },

  /*
   * Mark record as saved after updating
   */
  didUpdateRecord: function(store, type, record, json) {
    store.didSaveRecord(record, json);
  },

  /*
   * Mark record as saved after deleting
   */
  didDeleteRecord: function(store, type, record, json) {
    store.didSaveRecord(record, json);
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
        json["objects"].forEach(function(item, i, collection) {
          collection[i] = self._deurlifyData(type, item);
        });
        recordArray.load(json["objects"]);
      }
    });
  },

  getItemUrl: function(type, meta, id){
    var url;
    Em.assert("tastypieApiUrl parameters is mandatory.", !!this.tastypieApiUrl);
    url = this.rootForType(meta.type);
    return ["", this.tastypieApiUrl.slice(0,-1), url, id, ""].join('/');
  },

  getTastypieUrl: function(url){
    Em.assert("tastypieApiUrl parameters is mandatory.", !!this.tastypieApiUrl);
    return this.serverDomain + this.tastypieApiUrl + url + "/";

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
