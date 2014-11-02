Palo.implement = function ( name, resources ) {
	var media, head, style,
		pkg = this.packages[name];

	pkg.resources = resources;
	if ( !pkg.dependencies.length ) {
		if ( resources.modules && resources.modules['.'] ) {
			resources.modules['.']( 'require', 'exports', 'module', window );
		}
		if ( resources.stylesheets ) {
			head = document.getElementsByTagName( 'head' )[0];
			for ( media in resources.stylesheets ) {
				style = document.createElement( 'style' );
				style.setAttribute( 'media', media );
				style.appendChild(
					document.createTextNode( String( resources.stylesheets[media] ) )
				);
				head.appendChild( style );
			}
		}
	}
};
