/* Private Variables */

var isReady = false,
	styleAnchor,
	ensureQueues = {},
	readyQueue = new Palo.Queue(),
	requests = [],
	handlers = [];

/* Private Functions */

/**
 * Handle document ready events.
 */
function onReady() {
	// Prevent running more than once
	if ( !isReady ) {
		// Callbacks passed to Palo.ready during this loop will be executed when the loop's done
		isReady = true;
		// Execute queued callbacks
		readyQueue.execute();
	}
}

/**
 * Add a CSS stylesheet to the document.
 *
 * @param {string} cssText CSS text to add
 * @param {string} [media] Media to apply stylesheet to
 */
function addStylesheet( css, media ) {
	var element = document.createElement( 'style' );

	styleAnchor.parentNode.insertBefore( element, styleAnchor );
	element.rel = 'stylesheet';
	if ( media && media !== 'all' ) {
		element.media = media;
	}
	if ( element.styleSheet ) {
		// IE
		element.styleSheet.cssText = css;
	} else {
		// Other browsers.
		// (Safari sometimes borks on non-string values,
		// play safe by casting to a string, just in case.)
		element.appendChild( document.createTextNode( String( css ) ) );
	}
}

/**
 * Add a stylesheet link to the document.
 *
 * @param {string} href URL of stylesheet
 * @param {string} [media] Media to apply stylesheet to
 */
function addStylesheetLink( href, media ) {
	var element = document.createElement( 'link' );

	// For IE: Insert in document *before* setting href
	styleAnchor.parentNode.insertBefore( element, styleAnchor );
	element.rel = 'stylesheet';
	if ( media && media !== 'all' ) {
		element.media = media;
	}
	// If you end up here from an IE exception "SCRIPT: Invalid property value.",
	// see #addEmbeddedCSS, wikimedia bug 31676, and wikimedia bug 47277 for details.
	element.href = href;
}

/**
 * Add a script to the document.
 *
 * Until the document is ready, scripts will be added using document.write; afterward the DOM API
 * will be used instead.
 *
 * @param {string} src URL of script
 */
function addScript( src ) {
	var element;

	if ( isReady ) {
		element = document.createElement( 'script' );
		element.src = src;
		document.body.appendChild( element );
	} else {
		/*jshint evil:true */
		document.write( '\u003Cscript src="' + src + '"\u003E\u003C/script\u003E' );
	}
}

/**
 * Request packages from server.
 *
 * Package requests are queued until the callstack clears, allowing clusters of calls to request to
 * be batched automatically.
 *
 * @param {string[]} names Names of packages to load from server
 */
function request( names ) {
	requests.push.apply( requests, names );
	setTimeout( fetch );
}

/**
 * Fetch packages from server.
 *
 * Called by `request` to carry out loading of packages from server after the callstack clears.
 * After calling this method `requests` will be cleared, making it safe to call it repeatedly.
 * Do not call this directly, use `request` instead.
 */
function fetch() {
	var i, time;

	if ( requests.length ) {
		// Calculate time of most recently changed initial package
		time = 0;
		i = requests.length;
		while ( i-- ) {
			time = Math.max( time, Palo.packages[requests[i]].time );
		}

		addScript( Palo.uri + '/packages/' + requests.join( ';' ) + '?t=' + time );
		requests = [];
	}
}

/**
 * Resolve a local module ID.
 *
 * Example:
 *     resolve( './a/b/c', './test' ) === './a/b/test'
 *     resolve( './a/b/c', '../test' ) === './a/test'
 *     resolve( './a/b/c', '../../test' ) === './test'
 *     resolve( './a/b/c', './c/d/e' ) === './a/b/c/d/e'
 *
 * @param {string} abs Absolute path
 * @param {string} rel Relative path
 * @return {string} Resolved path
 */
function resolveModuleId( abs, rel ) {
	var i, len, pos,
		a = abs.replace( '/^', '' ).split( '/' ),
		b = rel.replace( '/^', '' ).split( '/' );

	a.pop();
	for ( i = 0, len = b.length; i < len; i++ ) {
		if ( b[i] === '..' ) {
			a.pop();
		} else if ( b[i] !== '.' ) {
			a.push( b[i] );
		}
	}
	return a.join( '/' );
}

function require( name, id, parent ) {
	id = id !== undefined ? id : '.';

	var factory,
		pkg = Palo.packages[name],
		mod = pkg && pkg.res.modules && pkg.res.modules[id];

	if ( !pkg ) {
		throw new Error(
			'Cannot require; package has not been registered: ' +
			[ name, id ].join( '/' )
		);
	}

	if ( !mod ) {
		throw new Error(
			'Cannot execute; module not implemented: ' +
			[ name, id ].join( '/' )
		);
	}

	if ( !Palo.done[name] ) {
		throw new Error( 'Cannot execute; package dependencies have not been met: ' + name );
	}

	if ( typeof mod === 'function' ) {
		factory = mod;
		pkg.res.modules[id] = mod = {
			exports: {},
			id: id,
			parent: Palo.packages[parent],
			children: [],
			main: id === '.',
			loaded: false,
			require: function ( rel ) {
				rel = rel.split( '/' );
				return rel[0] === '.' || rel[0] === '..' ?
					// Module in this package
					require( name, resolveModuleId( id, rel.join( '/' ) ) ) :
					// Module in another package
					require( rel.pop(), rel.length ? rel.join( '/' ) : undefined );
			}
		};
		mod.require.ensure = Palo.ensure;
		if ( parent ) {
			Palo.packages[parent].children.push( mod );
		}
		factory( mod.require, mod.exports, mod, window );
		mod.loaded = true;
	}

	return mod.exports;
}

/* Methods */

/**
 * Add a resource handler to be executed during package implementation.
 *
 * Handlers are used before stylesheets are added and the main module of a package is executed.
 *
 * @param {Function} callback Resource handling function
 * @param {Object} [callback.package] Package being implemented
 */
Palo.use = function ( callback ) {
	handlers.push( callback );
};

/**
 * Run a callback when the document is ready.
 *
 * @param {Function} callback Callback to execute
 */
Palo.ready = function ( callback ) {
	if ( isReady ) {
		// Run immediately when ready has already completed
		setTimeout( callback );
	} else {
		// Queue callback for later
		readyQueue.add( callback );
		if ( document.readyState === 'complete' ) {
			// Fire ready since document appears to be ready now
			setTimeout( onReady );
		}
	}
};

/**
 * Define a package.
 *
 * Packages that are not provided by the server must be defined before being used. If the `res`
 * argument is used, the package will also be implemented.
 *
 * @param {string} name Name of package being defined
 * @param {string[]} deps Names of packages the package being defined depends on
 * @param {Object} [res] Package resources being implemented
 * @throws {Error} If package name has already been registered
 */
Palo.define = function ( name, deps, res ) {
	var i, len;

	if ( Palo.packages[name] ) {
		throw new Error( 'Cannot register; package has already been registered: ' + name );
	}

	// Store meta information
	Palo.packages[name] = { name: name, time: Date.now(), deps: deps };

	// Add package to dependent lists
	for ( i = 0, len = deps.length; i < len; i++ ) {
		if ( !Palo.dependents[deps[i]] ) {
			Palo.dependents[deps[i]] = [ name ];
		} else {
			Palo.dependents[deps[i]].push( name );
		}
	}

	if ( res ) {
		Palo.implement( name, res );
	}
};

/**
 * Implemented resources for a registered package.
 *
 * @param {[type]} name [description]
 * @param {[type]} res [description]
 * @return {[type]} [description]
 */
Palo.implement = function ( name, res ) {
	var pkg = Palo.packages[name];

	if ( !pkg ) {
		throw new Error( 'Cannot implement; package has not been registered: ' + name );
	}
	if ( pkg.res ) {
		throw new Error( 'Cannot implement; package has already been implemented: ' + name );
	}

	// Store resources
	pkg.res = res;

	// Mark as resolving
	delete Palo.loading[name];
	Palo.resolving[name] = true;

	// Execute when all dependencies are met
	Palo.ensure( pkg.deps, function () {
		var i, len, media, modules, stylesheets,
			res = pkg && pkg.res;

		if ( !pkg ) {
			throw new Error( 'Cannot execute; package has not been registered: ' + name );
		}

		if ( !res ) {
			throw new Error( 'Cannot execute; package has not been implemented: ' + name );
		}

		// Mark as done
		delete Palo.resolving[name];
		Palo.done[name] = true;

		// Handle package resources
		for ( i = 0, len = handlers.length; i < len; i++ ) {
			handlers[i]( pkg );
		}

		// Add stylesheets
		stylesheets = pkg.res.stylesheets;
		if ( stylesheets ) {
			for ( media in stylesheets ) {
				addStylesheet( stylesheets[media], media );
			}
		}

		// Execute main module
		modules = pkg.res.modules;
		if ( modules ) {
			require( pkg.name );
		}

		// Resolve dependent pacakages
		if ( ensureQueues[name] ) {
			ensureQueues[name].execute( name );
			delete ensureQueues[name];
		}
	} );
};

/**
 * Ensure modules are accessible before executing a callback.
 *
 * The callback will be given an argument that is equivilent to calling require() with each of the
 * requested package names in the `names` argument, in the same order.
 *
 * @param {string[]} names Names of modules
 * @param {Function} callback Function to call
 */
Palo.ensure = function ( names, callback ) {
	var i, len, name,
		req = names.slice(),
		wait = [],
		load = [];

	// Collect packages needing to be loaded
	for ( i = 0, len = names.length; i < len; i++ ) {
		name = names[i];
		if ( !Palo.done[name] ) {
			// Prevent duplicates
			if ( wait.indexOf( name ) === -1 ) {
				wait.push( name );
			}
		}
		if ( Palo.available[name] ) {
			// Prevent duplicates
			if ( load.indexOf( name ) === -1 ) {
				load.push( name );
			}
			// Mark as loading
			delete Palo.available[name];
			Palo.loading[name] = true;
		}

		// Add dependencies - adjust `len` since `push` makes `names` longer
		len = names.push.apply( names, Palo.packages[name].deps );
	}

	function resolveRequestedPackages( name ) {
		var index;

		// Reduce wait list
		index = wait.indexOf( name );
		if ( index !== -1 ) {
			wait.splice( index, 1 );
		}

		// Callback when done
		if ( !wait.length ) {
			callback.apply( null, req.map( function ( name ) {
				return Palo.packages[name].res.modules ? require( name ) : null;
			} ) );
		}
	}

	if ( wait.length ) {
		// Setup queues to trigger resolution when dependencies are met
		for ( i = 0, len = wait.length; i < len; i++ ) {
			name = wait[i];
			if ( !ensureQueues[name] ) {
				ensureQueues[name] = new Palo.Queue();
			}
			ensureQueues[name].add( resolveRequestedPackages );
		}
		// Request packages that still need to be loaded
		if ( load.length ) {
			request( load.slice() );
		}
	} else {
		resolveRequestedPackages();
	}
};

/* Initialization */

( function init() {
	var i, len, pkg, name, element, elements, resources;

	// Find or create an insertion point for dynamically added stylesheets
	elements = document.getElementsByTagName( 'meta' );
	for ( i = 0, len = elements.length; i < len; i++ ) {
		element = elements[i];
		if ( element.getAttribute( 'name' ) === 'PaloDynamicStylesheets' ) {
			styleAnchor = element;
			break;
		}
	}
	if ( !styleAnchor ) {
		element = document.createElement( 'meta' );
		element.setAttribute( 'name', 'PaloDynamicStylesheets' );
		document.getElementsByTagName( 'head' )[0].appendChild( element );
		styleAnchor = element;
	}

	// Listen for the document becoming ready
	if ( document.addEventListener ) {
		// Use DOMContentLoaded event when possible
		document.addEventListener( 'DOMContentLoaded', onReady, false );
		// Use window load event as fallback
		window.addEventListener( 'load', onReady, false );
	} else {
		// IE
		document.attachEvent( 'onreadystatechange', function () {
			if ( document.readyState === 'complete' ) {
				onReady();
			}
		} );
		window.attachEvent( 'onload', onReady );
	}
} )();
