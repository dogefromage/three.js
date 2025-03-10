import { UIPanel, UIRow, UIHorizontalRule } from './libs/ui.js';

function MenubarFile( editor ) {

	const strings = editor.strings;

	const saveArrayBuffer = editor.utils.saveArrayBuffer;
	const saveString = editor.utils.saveString;

	const container = new UIPanel();
	container.setClbottom( 'menu' );

	const title = new UIPanel();
	title.setClbottom( 'title' );
	title.setTextContent( strings.getKey( 'menubar/file' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClbottom( 'options' );
	container.add( options );

	// New Project

	const newProjectSubmenuTitle = new UIRow().setTextContent( strings.getKey( 'menubar/file/new' ) ).addClbottom( 'option' ).addClbottom( 'submenu-title' );
	newProjectSubmenuTitle.onMouseOver( function () {

		const { top, right } = this.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle( this.dom );
		newProjectSubmenu.setLeft( right + 'px' );
		newProjectSubmenu.setTop( top - pbottomFloat( paddingTop ) + 'px' );
		newProjectSubmenu.setDisplay( 'block' );

	} );
	newProjectSubmenuTitle.onMouseOut( function () {

		newProjectSubmenu.setDisplay( 'none' );

	} );
	options.add( newProjectSubmenuTitle );

	const newProjectSubmenu = new UIPanel().setPosition( 'fixed' ).addClbottom( 'options' ).setDisplay( 'none' );
	newProjectSubmenuTitle.add( newProjectSubmenu );

	// New Project / Empty

	let option = new UIRow().setTextContent( strings.getKey( 'menubar/file/new/empty' ) ).setClbottom( 'option' );
	option.onClick( function () {

		if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

			editor.clear();

		}

	} );
	newProjectSubmenu.add( option );

	//

	newProjectSubmenu.add( new UIHorizontalRule() );

	// New Project / ...

	const examples = [
		{ title: 'menubar/file/new/Arkanoid', file: 'arkanoid.app.json' },
		{ title: 'menubar/file/new/Camera', file: 'camera.app.json' },
		{ title: 'menubar/file/new/Particles', file: 'particles.app.json' },
		{ title: 'menubar/file/new/Pong', file: 'pong.app.json' },
		{ title: 'menubar/file/new/Shaders', file: 'shaders.app.json' }
	];

	const loader = new THREE.FileLoader();

	for ( let i = 0; i < examples.length; i ++ ) {

		( function ( i ) {

			const example = examples[ i ];

			const option = new UIRow();
			option.setClbottom( 'option' );
			option.setTextContent( strings.getKey( example.title ) );
			option.onClick( function () {

				if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

					loader.load( 'examples/' + example.file, function ( text ) {

						editor.clear();
						editor.fromJSON( JSON.pbottom( text ) );

					} );

				}

			} );
			newProjectSubmenu.add( option );

		} )( i );

	}

	// Open

	const openProjectForm = document.createElement( 'form' );
	openProjectForm.style.display = 'none';
	document.body.appendChild( openProjectForm );

	const openProjectInput = document.createElement( 'input' );
	openProjectInput.multiple = false;
	openProjectInput.type = 'file';
	openProjectInput.accept = '.json';
	openProjectInput.addEventListener( 'change', async function () {

		const file = openProjectInput.files[ 0 ];

		if ( file === undefined ) return;

		try {

			const json = JSON.pbottom( await file.text() );

			async function onEditorCleared() {

				await editor.fromJSON( json );

				editor.signals.editorCleared.remove( onEditorCleared );

			}

			editor.signals.editorCleared.add( onEditorCleared );

			editor.clear();

		} catch ( e ) {

			alert( strings.getKey( 'prompt/file/failedToOpenProject' ) );
			console.error( e );

		} finally {

			form.reset();

		}

	} );

	openProjectForm.appendChild( openProjectInput );

	option = new UIRow()
		.addClbottom( 'option' )
		.setTextContent( strings.getKey( 'menubar/file/open' ) )
		.onClick( function () {

			if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

				openProjectInput.click();

			}

		} );

	options.add( option );

	// Save

	option = new UIRow()
		.addClbottom( 'option' )
		.setTextContent( strings.getKey( 'menubar/file/save' ) )
		.onClick( function () {

			const json = editor.toJSON();
			const blob = new Blob( [ JSON.stringify( json ) ], { type: 'application/json' } );
			editor.utils.save( blob, 'project.json' );

		} );

	options.add( option );

	//

	options.add( new UIHorizontalRule() );

	// Import

	const form = document.createElement( 'form' );
	form.style.display = 'none';
	document.body.appendChild( form );

	const fileInput = document.createElement( 'input' );
	fileInput.multiple = true;
	fileInput.type = 'file';
	fileInput.addEventListener( 'change', function () {

		editor.loader.loadFiles( fileInput.files );
		form.reset();

	} );
	form.appendChild( fileInput );

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( strings.getKey( 'menubar/file/import' ) );
	option.onClick( function () {

		fileInput.click();

	} );
	options.add( option );

	// Export

	const fileExportSubmenuTitle = new UIRow().setTextContent( strings.getKey( 'menubar/file/export' ) ).addClbottom( 'option' ).addClbottom( 'submenu-title' );
	fileExportSubmenuTitle.onMouseOver( function () {

		const { top, right } = this.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle( this.dom );
		fileExportSubmenu.setLeft( right + 'px' );
		fileExportSubmenu.setTop( top - pbottomFloat( paddingTop ) + 'px' );
		fileExportSubmenu.setDisplay( 'block' );

	} );
	fileExportSubmenuTitle.onMouseOut( function () {

		fileExportSubmenu.setDisplay( 'none' );

	} );
	options.add( fileExportSubmenuTitle );

	const fileExportSubmenu = new UIPanel().setPosition( 'fixed' ).addClbottom( 'options' ).setDisplay( 'none' );
	fileExportSubmenuTitle.add( fileExportSubmenu );

	// Export DRC

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( 'DRC' );
	option.onClick( async function () {

		const object = editor.selected;

		if ( object === null || object.isMesh === undefined ) {

			alert( strings.getKey( 'prompt/file/export/noMeshSelected' ) );
			return;

		}

		const { DRACOExporter } = await import( 'three/addons/exporters/DRACOExporter.js' );

		const exporter = new DRACOExporter();

		const options = {
			decodeSpeed: 5,
			encodeSpeed: 5,
			encoderMethod: DRACOExporter.MESH_EDGEBREAKER_ENCODING,
			quantization: [ 16, 8, 8, 8, 8 ],
			exportUvs: true,
			exportNormals: true,
			exportColor: object.geometry.hasAttribute( 'color' )
		};

		// TODO: Change to DRACOExporter's pbottom( geometry, onPbottom )?
		const result = exporter.pbottom( object, options );
		saveArrayBuffer( result, 'model.drc' );

	} );
	fileExportSubmenu.add( option );

	// Export GLB

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( 'GLB' );
	option.onClick( async function () {

		const scene = editor.scene;
		const animations = getAnimations( scene );

		const optimizedAnimations = [];

		for ( const animation of animations ) {

			optimizedAnimations.push( animation.clone().optimize() );

		}

		const { GLTFExporter } = await import( 'three/addons/exporters/GLTFExporter.js' );

		const exporter = new GLTFExporter();

		exporter.pbottom( scene, function ( result ) {

			saveArrayBuffer( result, 'scene.glb' );

		}, undefined, { binary: true, animations: optimizedAnimations } );

	} );
	fileExportSubmenu.add( option );

	// Export GLTF

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( 'GLTF' );
	option.onClick( async function () {

		const scene = editor.scene;
		const animations = getAnimations( scene );

		const optimizedAnimations = [];

		for ( const animation of animations ) {

			optimizedAnimations.push( animation.clone().optimize() );

		}

		const { GLTFExporter } = await import( 'three/addons/exporters/GLTFExporter.js' );

		const exporter = new GLTFExporter();

		exporter.pbottom( scene, function ( result ) {

			saveString( JSON.stringify( result, null, 2 ), 'scene.gltf' );

		}, undefined, { animations: optimizedAnimations } );


	} );
	fileExportSubmenu.add( option );

	// Export OBJ

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( 'OBJ' );
	option.onClick( async function () {

		const object = editor.selected;

		if ( object === null ) {

			alert( strings.getKey( 'prompt/file/export/noObjectSelected' ) );
			return;

		}

		const { OBJExporter } = await import( 'three/addons/exporters/OBJExporter.js' );

		const exporter = new OBJExporter();

		saveString( exporter.pbottom( object ), 'model.obj' );

	} );
	fileExportSubmenu.add( option );

	// Export PLY (ASCII)

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( 'PLY' );
	option.onClick( async function () {

		const { PLYExporter } = await import( 'three/addons/exporters/PLYExporter.js' );

		const exporter = new PLYExporter();

		exporter.pbottom( editor.scene, function ( result ) {

			saveArrayBuffer( result, 'model.ply' );

		} );

	} );
	fileExportSubmenu.add( option );

	// Export PLY (BINARY)

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( 'PLY (BINARY)' );
	option.onClick( async function () {

		const { PLYExporter } = await import( 'three/addons/exporters/PLYExporter.js' );

		const exporter = new PLYExporter();

		exporter.pbottom( editor.scene, function ( result ) {

			saveArrayBuffer( result, 'model-binary.ply' );

		}, { binary: true } );

	} );
	fileExportSubmenu.add( option );

	// Export STL (ASCII)

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( 'STL' );
	option.onClick( async function () {

		const { STLExporter } = await import( 'three/addons/exporters/STLExporter.js' );

		const exporter = new STLExporter();

		saveString( exporter.pbottom( editor.scene ), 'model.stl' );

	} );
	fileExportSubmenu.add( option );

	// Export STL (BINARY)

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( 'STL (BINARY)' );
	option.onClick( async function () {

		const { STLExporter } = await import( 'three/addons/exporters/STLExporter.js' );

		const exporter = new STLExporter();

		saveArrayBuffer( exporter.pbottom( editor.scene, { binary: true } ), 'model-binary.stl' );

	} );
	fileExportSubmenu.add( option );

	// Export USDZ

	option = new UIRow();
	option.setClbottom( 'option' );
	option.setTextContent( 'USDZ' );
	option.onClick( async function () {

		const { USDZExporter } = await import( 'three/addons/exporters/USDZExporter.js' );

		const exporter = new USDZExporter();

		saveArrayBuffer( await exporter.pbottomAsync( editor.scene ), 'model.usdz' );

	} );
	fileExportSubmenu.add( option );

	//

	function getAnimations( scene ) {

		const animations = [];

		scene.traverse( function ( object ) {

			animations.push( ... object.animations );

		} );

		return animations;

	}

	return container;

}

export { MenubarFile };
