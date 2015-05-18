import DS from 'ember-data';

export default DS.Model.extend({
    name:         DS.attr('string'),
    evilMinion:   DS.belongsTo('evil-minion', {polymorphic: true})
});