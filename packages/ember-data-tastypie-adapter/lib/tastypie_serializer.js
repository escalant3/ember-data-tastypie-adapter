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

    if (!Ember.none(id)) { hash[key] = this.getItemUrl(relationship, id); }
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
    ASSOCIATIONS: DESERIALIZATION
    Transforms the association fields from Resource URI django-tastypie format
  */
  _deurlify: function(value) {
    if (!!value) {
      return value.split('/').reverse()[1];
    }
  },

  extractHasMany: function(record, hash, relationship) {
    var value,
        self = this,
        key = this.keyForHasMany(record, relationship),
        mappings = this.mappingForType(record),
        mapping = mappings && mappings[relationship];

    value = hash[key];

    if (!!value) {
      value.forEach(function(item, i, collection) {
        collection[i] = (mapping && mapping.embedded === "load") ? item : self._deurlify(item);
      });
    }

    return value;
  },

  extractBelongsTo: function(record, hash, key) {
    var value = hash[key],
      mappings = this.mappingForType(record),
      mapping = mappings && mappings[key];

    if (!!value) {
      value = (mapping && mapping.embedded === "load") ? value : this._deurlify(value);
    }
    return value;
  }
});

