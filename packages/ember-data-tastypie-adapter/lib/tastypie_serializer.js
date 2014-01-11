var get = Ember.get, set = Ember.set;

DS.DjangoTastypieSerializer = DS.RESTSerializer.extend({

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
    var id,
        related = get(record, relationship.key),
        embedded = this.embeddedType(record.constructor, key);

    if (embedded === 'always') {
      hash[key] = related.serialize();

    } else {
      id = get(related, this.primaryKey(related));

      if (!Ember.isNone(id)) { hash[key] = this.getItemUrl(relationship, id); }
    }
  },

  addHasMany: function(hash, record, key, relationship) {
    var self = this,
        serializedValues = [],
        id = null,
        embedded = this.embeddedType(record.constructor, key);

    key = this.keyForHasMany(relationship.type, key);

    value = record.get(key) || [];

    value.forEach(function(item) {
      if (embedded === 'always') {
        serializedValues.push(item.serialize());
      } else {
        id = get(item, self.primaryKey(item));
        if (!Ember.isNone(id)) {
          serializedValues.push(self.getItemUrl(relationship, id));
        }
      }
    });

    hash[key] = serializedValues;

  },

  /**
    Tastypie adapter does not support the sideloading feature
    */
  extract: function(store, type, payload, id, requestType) {
    this.extractMeta(store, type, payload);

    var specificExtract = "extract" + requestType.charAt(0).toUpperCase() + requestType.substr(1);
    return this[specificExtract](store, type, payload, id, requestType);
  },

  extractMany: function(loader, json, type, records) {
    this.sideload(loader, type, json);
    this.extractMeta(loader, type, json);

    if (json.objects) {
      var objects = json.objects, references = [];
      if (records) { records = records.toArray(); }

      for (var i = 0; i < objects.length; i++) {
        if (records) { loader.updateId(records[i], objects[i]); }
        var reference = this.extractRecordRepresentation(loader, type, objects[i]);
        references.push(reference);
      }

      loader.populateArray(references);
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
  },

  resourceUriToId: function (resourceUri){
    return resourceUri.split('/').reverse()[1];
  },

  normalizeRelationships: function (type, hash) {
    var payloadKey, key, self = this;

    type.eachRelationship(function (key, relationship) {
      if (this.keyForRelationship) {
        payloadKey = this.keyForRelationship(key, relationship.kind);
        if (key !== payloadKey) {
          hash[key] = hash[payloadKey];
          delete hash[payloadKey];
        }
      }
      if (hash[key]) {
        if (relationship.kind === 'belongsTo'){
          hash[key] = this.resourceUriToId(hash[key]);
        } else if (relationship.kind === 'hasMany'){
          var ids = [];
          hash[key].forEach(function (resourceUri){
            ids.push(self.resourceUriToId(resourceUri));
          });
          hash[key] = ids;
        }
      }
    }, this);
  },

  extractArray: function(store, primaryType, payload) {
    payload[primaryType.typeKey] = payload.objects;
    delete payload.objects;

    return this._super(store, primaryType, payload);
  },

  extractSingle: function(store, primaryType, payload, recordId, requestType) {
    var newPayload = {};
    this.extractEmbeddedFromPayload(store, primaryType, payload);
    newPayload[primaryType.typeKey] = payload;

    return this._super(store, primaryType, newPayload, recordId, requestType);
  },

  isEmbedded: function(relOptions) {
    return !!relOptions && (relOptions.embedded === 'load' || relOptions.embedded === 'always');
  },

  extractEmbeddedFromPayload: function(store, type, payload) {
    var self = this;
    type.eachRelationship(function(key, relationship) {
      var relOptions = relationship.options;

      if (self.isEmbedded(relOptions)) {
        if (relationship.kind === 'hasMany') {
          self.extractEmbeddedFromHasMany(store, key, relationship, payload, relOptions);
        } else if (relationship.kind === 'belongsTo') {
          self.extractEmbeddedFromBelongsTo(store, key, relationship, payload, relOptions);
        }
      }
    });
  },

  extractEmbeddedFromHasMany: function(store, key, relationship, payload, config) {
    var self = this;
    var serializer = store.serializerFor(relationship.type.typeKey),
    primaryKey = get(this, 'primaryKey');

    var ids = [];

    if (!payload[key]) {
      return;
    }

    Ember.EnumerableUtils.forEach(payload[key], function(data) {
      var embeddedType = store.modelFor(relationship.type.typeKey);

      self.extractEmbeddedFromPayload.call(serializer, store, embeddedType, data);

      data = serializer.normalize(embeddedType, data, embeddedType.typeKey);

      ids.push(serializer.relationshipToResourceUri(relationship, data));
      store.push(embeddedType, data);
    });

    payload[key] = ids;
  },

  extractEmbeddedFromBelongsTo: function(store, key, relationship, payload, config) {
    var serializer = store.serializerFor(relationship.type.typeKey),
      primaryKey = get(this, 'primaryKey');

    if (!payload[key]) {
      return;
    }

    var data = payload[key];
    var embeddedType = store.modelFor(relationship.type.typeKey);

    extractEmbeddedFromPayload.call(serializer, store, embeddedType, data);

    data = serializer.normalize(embeddedType, data, embeddedType.typeKey);
    payload[key] = serializer.relationshipToResourceUri(relationship, data);

    store.push(embeddedType, data);
  },

  relationshipToResourceUri: function (relationship, value){
    if (!value)
      return value;

    var store = relationship.type.store,
        typeKey = relationship.type.typeKey;

    return store.adapterFor(typeKey).buildURL(typeKey, get(value, 'id'));
  },

  serializeIntoHash: function (data, type, record, options) {
    Ember.merge(data, this.serialize(record, options));
  },

  serializeBelongsTo: function (record, json, relationship) {
    this._super.apply(this, arguments);
    var key = relationship.key;
    key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo") : key;

    json[key] = this.relationshipToResourceUri(relationship, get(record, relationship.key));
  },

  serializeHasMany: function(record, json, relationship) {
    var key = relationship.key,
    attrs = get(this, 'attrs'),
    config = attrs && attrs[key] ? attrs[key] : false;
    key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo") : key;

    var relationshipType = DS.RelationshipChange.determineRelationshipType(record.constructor, relationship);

    if (relationshipType === 'manyToNone' || relationshipType === 'manyToMany' || relationshipType === 'manyToOne') {
      if (this.isEmbedded(config)) {
        json[key] = get(record, key).map(function (relation) {
          var data = relation.serialize();
          return data;
        });
      } else {
        json[key] = get(record, relationship.key).map(function (next){
          return this.relationshipToResourceUri(relationship, next);
        }, this);
      }
    }
  }
});


