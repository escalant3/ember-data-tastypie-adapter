import Ember from 'ember';
import DjangoTastypieAdapter from 'ember-data-tastypie-adapter/adapters/dta';
import ENV from '../config/environment';

export default DjangoTastypieAdapter.extend({
  serverDomain: Ember.computed(function() {
    return ENV.APP.API_HOST;
  }),

  namespace: Ember.computed(function() {
    return ENV.APP.API_NAMESPACE;
  })
});
