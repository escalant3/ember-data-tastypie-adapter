import DS from 'ember-data';

export default DS.Model.extend({
	body: DS.attr('string'),
    root: DS.attr('boolean'),
    children: DS.hasMany('comment'),
    text: DS.attr('string')
});