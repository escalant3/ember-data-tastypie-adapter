import DS from 'ember-data';

export default DS.Model.extend({
    name: DS.attr('string'),
    villains: DS.hasMany('super-villain', {async: true})
});