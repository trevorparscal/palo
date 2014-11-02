# palo

Package loading system for browsers.

## How it works

Palo brings [bower](http://bower.io/) components to the client as packages. Packages may contain JavaScript modules, CSS styles, i18n messages, configuration options and templates.

Modules are executed in a CommonJs-compatible environment and local require statements within the same package are synchronous. Additionally require.ensure is provided for asynchronous package loading.

Modules behave as similarly as possible to how it would in Node.js; including the presence and behavior of ``module``, ``export``, ``require``, and ``global`` symbols within the scope of the module. Stylesheets are added to the DOM just before executing the main module. Access to messages, options and templates is provided through interfaces attached to the module object.

The first package sent to the client is a startup package containing a compatability check and meta information of all avialable  packages. If the client is found to be capable the loading process continues and an intial set of modules are loaded using the bundled meta information. The startup package expires after a short time, allowing changes to propagate quickly. Other packages are set to expire after a very long time, maximizing cache hits.

## Getting started

This package is part of the client-side of the system. The [startup package](http://github.com/trevorparscal/palo-startup) also runs on the client. Both of these packages are independent of the server implementation.

Palo currently has only a [server implmenetation for Node.js](http://github.com/trevorparscal/node-palo), but other implementations are planned, specifically PHP for use in MediaWiki as a potential replacement for MediaWiki's current ResourceLoader system, of which Palo is based on.

The Node.js implementation is designed to be used with [Koa](http://github.com/koajs/koa). Similarly to Koa it makes use of ES6 generators. Palo has a [Koa app](http://github.com/trevorparscal/koa-palo) that can be mounted onto any other Koa app.

Take a look at the [Koa app example](http://github.com/trevorparscal/koa-palo-example) for more details.

## License

MIT
