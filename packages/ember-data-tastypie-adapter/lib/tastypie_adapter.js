var get = Ember.get, set = Ember.set;
var forEach = Ember.ArrayPolyfills.forEach;

function rejectionHandler(reason) {
  Ember.Logger.error(reason, reason.message);
  throw reason;
}

var DjangoTastypieAdapter = DS.RESTAdapter.extend({
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
    Tastypie returns the next URL when all the elements of a type
    cannot be fetched inside a single request. Unless you override this
    feature in Tastypie, you don't need to change this value. Pagination
    will work out of the box for findAll requests
  */
  since: 'next',

  /**
    Serializer object to manage JSON transformations
  */
  defaultSerializer: '_djangoTastypie',

  buildURL: function(type, id, record) {
    var url = this._super(type, id, record);

    // Add the trailing slash to avoid setting requirement in Django.settings
    if (url.charAt(url.length -1) !== '/') {
      url += '/';
    }

    // Add the server domain if any
    if (!!this.serverDomain) {
      url = this.removeTrailingSlash(this.serverDomain) + url;
    }

    return url;
  },

  findMany: function(store, type, ids) {
    return this.ajax(Ember.String.fmt('%@set/%@/', this.buildURL(type.typeKey), ids.join(';')),
                     'GET');
  },

  _stripIDFromURL: function(store, record) {
      var type = store.modelFor(record);
      var url = this.buildURL(type.typeKey, record.get('id'), record);

      var expandedURL = url.split('/');
      //Case when the url is of the format ...something/:id
      var lastSegment = expandedURL[ expandedURL.length - 2 ];
      var id = record.get('id');
      if (lastSegment === id) {
        expandedURL[expandedURL.length - 2] = "";
      } else if(endsWith(lastSegment, '?id=' + id)) {
        //Case when the url is of the format ...something?id=:id
        expandedURL[expandedURL.length - 1] = lastSegment.substring(0, lastSegment.length - id.length - 1);
      }

      return expandedURL.join('/');
    },

  groupRecordsForFindMany: function (store, records) {
      var groups = Ember.MapWithDefault.create({defaultValue: function(){return [];}});
      var adapter = this;

      forEach.call(records, function(record){
        var baseUrl = adapter._stripIDFromURL(store, record);
        groups.get(baseUrl).push(record);
      });

      function splitGroupToFitInUrl(group, maxUrlLength) {
        var baseUrl = adapter._stripIDFromURL(store, group[0]);
        var idsSize = 0;
        var splitGroups = [[]];

        forEach.call(group, function(record) {
          var additionalLength = '&ids[]='.length + record.get('id.length');
          if (baseUrl.length + idsSize + additionalLength >= maxUrlLength) {
            idsSize = 0;
            splitGroups.push([]);
          }

          idsSize += additionalLength;

          var lastGroupIndex = splitGroups.length - 1;
          splitGroups[lastGroupIndex].push(record);
        });

        return splitGroups;
      }

      var groupsArray = [];
      groups.forEach(function(key, group){
        // http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
        var maxUrlLength = 2048;
        var splitGroups = splitGroupToFitInUrl(group, maxUrlLength);

        forEach.call(splitGroups, function(splitGroup) {
          groupsArray.push(splitGroup);
        });
      });

      return groupsArray;
    },

  /**
     The actual nextUrl is being stored. The offset must be extracted from
     the string to do a new call.
     When there are remaining objects to be returned, Tastypie returns a
     `next` URL that in the meta header. Whenever there are no
     more objects to be returned, the `next` paramater value will be null.
     Instead of calculating the next `offset` each time, we store the nextUrl
     from which the offset will be extrated for the next request
  */
  sinceQuery: function(since) {
    var offsetParam,
        query;

    query = {};

    if (!!since) {
      offsetParam = since.match(/offset=(\d+)/);
      offsetParam = (!!offsetParam && !!offsetParam[1]) ? offsetParam[1] : null;
      query.offset = offsetParam;
    }

    return offsetParam ? query : null;
  },

  removeTrailingSlash: function(url) {
    if (url.charAt(url.length -1) === '/') {
      return url.slice(0, -1);
    }
    return url;
  },

  /**
    django-tastypie does not pluralize names for lists
  */
  pathForType: function(type) {
    return type;
  }
});

export default DjangoTastypieAdapter;
