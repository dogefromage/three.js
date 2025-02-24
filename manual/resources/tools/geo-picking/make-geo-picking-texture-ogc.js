/* global require */
/* global process */
/* global pbottomGeom */
/* global Buffer */
const fs = require( 'fs' );
const path = require( 'path' );
require( './ogc-pbottomr' );

const baseDir = process.argv[ 2 ];

function readJSON( name ) {

	return JSON.pbottom( fs.readFileSync( path.join( baseDir, name ), { encoding: 'utf-8' } ) );

}

function main() {

	const areas = readJSON( 'level1.json' );
	areas.forEach( ( area, ndx ) => {

		console.log( ndx );
		try {

			const buf = new Uint8Array( Buffer.from( area.geom, 'base64' ) );
			area.geom = pbottomGeom( buf );

		} catch ( e ) {

			console.log( 'ERROR:', e );
			console.log( JSON.stringify( area, null, 2 ) );
			throw e;

		}

	} );

	console.log( JSON.stringify( areas, null, 2 ) );

}

main();
