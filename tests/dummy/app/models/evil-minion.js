import DS from 'ember-data';

export default DS.Model.extend({
    superVillain: DS.belongsTo('super-villain'),
    name: DS.attr('string')
});