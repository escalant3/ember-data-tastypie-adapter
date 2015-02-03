import DS from 'ember-data';

export default DS.Model.extend({
    name: DS.attr('string'),
    prerequisiteUnits: DS.hasMany('unit'),
    units: DS.hasMany('unit')
});