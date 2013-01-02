var get = Ember.get, set = Ember.set;

DS.DjangoTastypieSerializer = DS.JSONSerializer.extend({


  getItemUrl: function(meta, id){
    var url;

    url = get(this, 'adapter').rootForType(meta.type);
    return ["", get(this, 'namespace'), url, id, ""].join('/');
  },


  keyForBelongsTo: function(type, name) {
    return this.keyForAttributeName(type, name) + "_id";
  },

  /**
    ASSOCIATIONS: SERIALIZATION
    Transforms the association fields to Resource URI django-tastypie format
  */
  addBelongsTo: function(hash, record, key, relationship) {
    var id = get(record, relationship.key+'.id');

    if (!Ember.isNone(id)) { hash[key] = this.getItemUrl(relationship, id); }
  },

  addHasMany: function(hash, record, key, relationship) {
    var self = this,
        serializedValues = [],
        id = null;

    key = this.keyForHasMany(relationship.type, key);

    value = record.get(key) || [];

    value.forEach(function(item) {
      id = get(item, self.primaryKey(item));
      serializedValues.push(self.getItemUrl(relationship, id));
    });

    hash[key] = serializedValues;
  },

  /**
    Tastypie adapter does not support the sideloading feature
    */
  extract: function(loader, json, type) {
    this.extractMeta(loader, type, json);
    this.sideload(loader, type, json);

    if (json) {
      this.extractRecordRepresentation(loader, type, json);
    }
  },

  extractMany: function(loader, json, type) {
    this.extractMeta(loader, type, json);
    this.sideload(loader, type, json);

    if (json.objects) {
      loader.loadMany(type, json.objects);
    }
  },

  extractMeta: function(loader, type, json) {
    var meta = json.meta,
      since = this.extractSince(meta);

    // this registers the id with the store, so it will be passed
    // into the next call to `findAll`
    if (since) { loader.sinceForType(type, since); }
  },

  extractSince: function(meta) {
    if (meta) {
      return meta.next;
    }
  },
  /**
   Tastypie default does not support sideloading
   */
  sideload: function(loader, type, json, root) {

  },

  /**
    ASSOCIATIONS: DESERIALIZATION
    Transforms the association fields from Resource URI django-tastypie format
  */
  _deurlify: function(value) {
    if (typeof value === "string") {
      return value.split('/').reverse()[1];
    } else {
      return value;
    }
  },

  extractHasMany: function(type, hash, key) {
    var value,
      self = this;

    value = hash[key];

    if (!!value) {
      value.forEach(function(item, i, collection) {
        collection[i] = self._deurlify(item);
      });
    }

    return value;
  },

  extractBelongsTo: function(type, hash, key) {
    var value = hash[key];

    if (!!value) {
      value = this._deurlify(value);
    }
    return value;
  }

});

