/**
 * Callback queue.
 *
 * @class
 *
 * @constructor
 */
Palo.Queue = function () {
	this.callbacks = [];
};

/**
 * Add callback to queue.
 *
 * @param {Function} callback Callback to add
 */
Palo.Queue.prototype.add = function ( callback ) {
	this.callbacks.push( callback );
};

/**
 * Remove callback from queue.
 *
 * @param {Function} callback Callback to remove
 */
Palo.Queue.prototype.remove = function ( callback ) {
	var index = this.callbacks.indexOf( callback );
	if ( index !== -1 ) {
		this.callbacks.splice( index, 1 );
	}
};

/**
 * Execute callbacks.
 *
 * @param {Mixed} [args...] Arguments to pass to callback
 */
Palo.Queue.prototype.execute = function () {
	var len = this.callbacks.length;
	while ( len ) {
		this.callbacks.shift().apply( null, arguments );
		len--;
	}
};
