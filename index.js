/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-data-tastypie-adapter',
  included: function(app) {
    if (app.env !== 'production') {
      app.import(app.bowerDirectory + '/jquery-mockjax/jquery.mockjax.js');
    }
  }
};
