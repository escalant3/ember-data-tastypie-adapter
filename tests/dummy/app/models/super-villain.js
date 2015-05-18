import DS from 'ember-data';

export default DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    homePlanet: DS.belongsTo("home-planet", {async: true}),
    evilMinions: DS.hasMany("evil-minion", {async: true})
});