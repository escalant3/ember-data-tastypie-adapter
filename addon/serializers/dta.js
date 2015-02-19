import DS from 'ember-data';
import Ember from 'ember';

export default DS.RESTSerializer.extend({

  keyForAttribute: function(attr) {
    return Ember.String.decamelize(attr);
  },

  keyForRelationship: function(key) {
    return Ember.String.decamelize(key);
  },

  /**
    Tastypie adapter does not support the sideloading feature
    */
  extract: function(store, type, payload, id, requestType) {
    this.extractMeta(store, type, payload);

    var specificExtract = "extract" + requestType.charAt(0).toUpperCase() + requestType.substr(1);
    return this[specificExtract](store, type, payload, id, requestType);
  },
  
  /**
    `extractMeta` is used to deserialize any meta information in the
    adapter payload. By default Ember Data expects meta information to
    be located on the `meta` property of the payload object.
  
    The actual nextUrl is being stored. The offset must be extracted from
    the string to do a new call.
    When there are remaining objects to be returned, Tastypie returns a
    `next` URL that in the meta header. Whenever there are no
    more objects to be returned, the `next` paramater value will be null.
    Instead of calculating the next `offset` each time, we store the nextUrl
    from which the offset will be extrated for the next request
    
    @method extractMeta
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Object} payload
  */
  extractMeta: function(store, type, payload) {
    if (payload && payload.meta) {
      var adapter = store.adapterFor(type);
              
      if (adapter && adapter.get('since') !== null && payload.meta[adapter.get('since')] !== undefined) {
        payload.meta.since = payload.meta[adapter.get('since')];
      }
      
      store.setMetadataFor(type, payload.meta);
      delete payload.meta;
    }
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

  // Tastypie defaults do not support sideloading
  sideload: function() {
  },

  resourceUriToId: function (resourceUri) {
    return resourceUri.split('/').reverse()[1];
  },

  normalizeId: function (hash) {
    if (hash.resource_uri) {
      hash.id = this.resourceUriToId(hash.resource_uri);
      delete hash.resource_uri;
    }
  },

  normalizeRelationships: function (type, hash) {
    var payloadKey, self = this;

    type.eachRelationship(function (key, relationship) {
      if (this.keyForRelationship) {
        payloadKey = this.keyForRelationship(key, relationship.kind);
        if (key !== payloadKey) {
          hash[key] = hash[payloadKey];
          delete hash[payloadKey];
        }
      }
      if (hash[key]) {
        var isEmbedded = self.isEmbedded(relationship);
        if (relationship.kind === 'belongsTo'){
          var resourceUri = hash[key];
          if (!isEmbedded) {
            Ember.assert(relationship.key + " is an async relation but the related data in the response is not a URI", typeof resourceUri === "string");
          }
          hash[key] = self.resourceUriToId(hash[key]);
        } else if (relationship.kind === 'hasMany'){
          var ids = [];
          hash[key].forEach(function (resourceUri){
            if (!isEmbedded) {
              Ember.assert(relationship.key + " is an async relation but the related data in the response is not a URI", typeof resourceUri === "string");
            }
            ids.push(self.resourceUriToId(resourceUri));
          });
          hash[key] = ids;
        }
      }
    }, this);
  },

  extractArray: function(store, primaryType, payload) {
    var records = [];
    var self = this;
    payload.objects.forEach(function (hash) {
      self.extractEmbeddedFromPayload(store, primaryType, hash);
      records.push(self.normalize(primaryType, hash, primaryType.typeKey));
    });
    return records;
  },

  extractSingle: function(store, primaryType, payload, recordId, requestType) {
    var newPayload = {};
    this.extractEmbeddedFromPayload(store, primaryType, payload);
    newPayload[primaryType.typeKey] = payload;

    return this._super(store, primaryType, newPayload, recordId, requestType);
  },

  isEmbedded: function(relationship) {
    var key = relationship.key;
    var attrs = Ember.get(this, 'attrs');
    var config = attrs && attrs[key] ? attrs[key] : false;
    if (config) {
        // Per model serializer will take preference for the embedded mode
        return (config.embedded === 'load' || config.embedded === 'always');
    }

    // Consider the resource as embedded if the relationship is not async
    return !(relationship.options.async ? relationship.options.async : false);
  },
  
  isResourceUri: function(adapter, payload) {
    if (typeof payload !== 'string') {
      return false;
    }
    return true;
  },

  extractEmbeddedFromPayload: function(store, type, payload) {
    var self = this;

    type.eachRelationship(function(key, relationship) {
      var attrs = Ember.get(self, 'attrs');
      var config = attrs && attrs[key] ? attrs[key] : false;

      if (self.isEmbedded(relationship)) {
        if (relationship.kind === 'hasMany') {
          self.extractEmbeddedFromHasMany(store, key, relationship, payload, config);
        } else if (relationship.kind === 'belongsTo') {
          self.extractEmbeddedFromBelongsTo(store, key, relationship, payload, config);
        }
      }
    });
  },

  extractEmbeddedFromHasMany: function(store, key, relationship, payload, config) {
    var serializer = store.serializerFor(relationship.type);

    key = config.key ? config.key : this.keyForAttribute(key);

    var ids = [];

    if (!payload[key]) {
      return;
    }

    Ember.EnumerableUtils.forEach(payload[key], function(data) {
      var embeddedType = store.modelFor(relationship.type);

      serializer.extractEmbeddedFromPayload(store, embeddedType, data);

      data = serializer.normalize(embeddedType, data, embeddedType.typeKey);

      ids.push(serializer.relationshipToResourceUri(relationship, data));
      store.push(embeddedType, data);
    });

    payload[key] = ids;
  },

  extractEmbeddedFromBelongsTo: function(store, key, relationship, payload, config) {
    var serializer = store.serializerFor(relationship.type);

    key = config.key ? config.key : this.keyForAttribute(key);

    if (!payload[key]) {
      return;
    }

    var data = payload[key];
    
    // Don't try to process data if it's not data!
    if (serializer.isResourceUri(store.adapterFor(relationship.type), data)) {
      return;
    }
    
    var embeddedType = store.modelFor(relationship.type);

    serializer.extractEmbeddedFromPayload(store, embeddedType, data);

    data = serializer.normalize(embeddedType, data, embeddedType.typeKey);
    payload[key] = serializer.relationshipToResourceUri(relationship, data);

    store.push(embeddedType, data);
  },

  relationshipToResourceUri: function (relationship, value){
    if (!value) {
      return value;
    }

    var store = relationship.type.store,
        typeKey = relationship.type.typeKey;

    return store.adapterFor(typeKey).buildURL(typeKey, Ember.get(value, 'id'));
  },

  serializeIntoHash: function (data, type, record, options) {
    Ember.merge(data, this.serialize(record, options));
  },

  serializeBelongsTo: function (record, json, relationship) {
    this._super.apply(this, arguments);
    var key = relationship.key;
    key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo") : key;

    json[key] = this.relationshipToResourceUri(relationship, Ember.get(record, relationship.key));
  },

  serializeHasMany: function(record, json, relationship) {
    var key = relationship.key;
    key = this.keyForRelationship ? this.keyForRelationship(key, "hasMany") : key;

    var relationshipType = record.constructor.determineRelationshipType(relationship);

    if (relationshipType === 'manyToNone' || relationshipType === 'manyToMany' || relationshipType === 'manyToOne') {
      if (this.isEmbedded(relationship)) {
        json[key] = Ember.get(record, relationship.key).map(function (relation) {
          var data = relation.serialize();

          // Embedded objects need the ID for update operations
          var id = relation.get('id');
          if (!!id) { data.id = id; }

          return data;
        });
      } else {
        var relationData = Ember.get(record, relationship.key); 
        
        // We can't deal with promises here. We need actual data
        if (relationData instanceof DS.PromiseArray) {
          // We need the content of the promise. Make sure it is fulfilled
          if (relationData.get('isFulfilled')) {
            // Use the fulfilled array
            relationData = relationData.get('content');
          } else {
            // If the property hasn't been fulfilled then it hasn't changed.
            // Fall back to the internal data. It contains enough for relationshipToResourceUri.
            relationData = Ember.get(record, relationship.key).mapBy('id').map(function(_id) {
              return {id: _id};
            }) || [];
          }
        }
        
        json[key] = relationData.map(function (next){
          return this.relationshipToResourceUri(relationship, next);
        }, this);
        
      }
    }
  }
});
