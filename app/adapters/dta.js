import DjangoTastypieAdapter from 'ember-data-tastypie-adapter/adapters/dta';
import ENV from '../config/environment';

export default DjangoTastypieAdapter.extend({
  serverDomain: function() {
    return ENV.APP.API_HOST;
  }.property(),
  namespace: function() {
    return ENV.APP.API_NAMESPACE;
  }.property()
});