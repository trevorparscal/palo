/**
 * @class
 *
 * @constructor
 * @param {string} name Name
 * @param {Object} meta Meta information
 * @param {Object} resources Resources
 */
Palo.Package = function ( name, meta, resources ) {
	this.name = name;
	this.meta = meta;
	this.resources = resources;
};

/* Methods */

Palo.Package.prototype.getName = function () {
	return this.name;
};

Palo.Package.prototype.getMeta = function () {
	return this.meta;
};

Palo.Package.prototype.getResources = function () {
	return this.resources;
};
