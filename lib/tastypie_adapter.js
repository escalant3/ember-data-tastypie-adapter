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
  _urlifyData: function(type, model, raw){
    var self = this;
    var value;
    
    var jsonData = model.toJSON({ associations: true });
   
    var associations = Em.get(type, 'associationsByName');

    associations.forEach(function(key, meta){

      if (meta.kind === "belongsTo") {
        key = meta.options.key || Em.get(model, 'namingConvention').foreignKey(key);
        value = jsonData[key];
        if (!!value) {
          jsonData[key] = self.getItemUrl(type, meta, value);
        }

      } else if (meta.kind === "hasMany") {
        key = meta.options.key || Em.get(model, 'namingConvention').keyToJSONKey(key);
        value = jsonData[key] || [];
        $.each(value, function(i, item) {
          value[i] = self.getItemUrl(type, meta, item);
        });
        }
    });

    return (raw) ? jsonData : JSON.stringify(jsonData);
  },

  /**
   * Transforms the association fields from Resource URI django-tastypie format to IDs
   */
  _deurlifyData: function(type, jsonObject) {
    var meta,
      value;

    var deurlify = function(value) {
      if (!!value) {
        return value.split('/').reverse()[1];
      }
    };

    var associations = Em.get(type, 'associationsByName');

    associations.forEach(function(key, meta) {
      meta = type.metaForProperty(key);

      if (meta.kind === "belongsTo") {
        key = meta.options.key || type.prototype.get('namingConvention').foreignKey(key);
        value = jsonObject[key];
        if (!!value) {
          jsonObject[key] = deurlify(value);
        }
      } else if (meta.kind === "hasMany") {
        key = meta.options.key || type.prototype.get('namingConvention').keyToJSONKey(key);
        jsonObject[key].forEach(function(item, i, collection) {
          collection[i] = deurlify(item);
        });
      }
    });
    return jsonObject;
  },

  /*
   * Create a record in the Django server. POST actions must
   * be enabled in the Resource
   */
  createRecord: function(store, type, model) {
    var self = this;
    var root = this.rootForType(type);

    var data = this._urlifyData(type, model);

    this.ajax(root, "POST", {
      data: data,
      success: function(json) {
        json = self._deurlifyData(type, json);
        store.didCreateRecord(model, json);
      },
      error: function(error) {
      }
    });
  },

  /*
   * Edit a record in the Django server. PUT actions must
   * be enabled in the Resource
   */
  updateRecord: function(store, type, model) {
    var self = this;

    var id = Em.get(model, 'id');
    var root = this.rootForType(type);

    var data = this._urlifyData(type, model);

    var url = [root, id].join("/");

    this.ajax(url, "PUT", {
      data: data,
      success: function(json) {
        json = self._deurlifyData(type, json);
        store.didUpdateRecord(model, json);
      },
      error: function(error) {
      }
    });
  },

  /*
   * Delete a record in the Django server. DELETE actions
   * must be enabled in the Resource
   */
  deleteRecord: function(store, type, model) {
    var id = Em.get(model, 'id');
    var root = this.rootForType(type);

    var url = [root, id].join("/");

    this.ajax(url, "DELETE", {
      success: function(json) {
        store.didDeleteRecord(model);
      }
    });
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
