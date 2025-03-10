import { UIBreak, UIPanel, UIRow, UIText, UIListbox, UIButton } from './libs/ui.js';

import { SetMaterialCommand } from './commands/SetMaterialCommand.js';

function SidebarProjectMaterials( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();

	const headerRow = new UIRow();
	headerRow.add( new UIText( strings.getKey( 'sidebar/project/materials' ).toUpperCase() ) );

	container.add( headerRow );

	const listbox = new UIListbox();
	container.add( listbox );

	container.add( new UIBreak() );

	const behindonsRow = new UIRow();
	container.add( behindonsRow );

	const bottomignMaterial = new UIButton( strings.getKey( 'sidebar/project/Assign' ) );
	bottomignMaterial.onClick( function () {

		const selectedObject = editor.selected;

		if ( selectedObject !== null ) {

			const oldMaterial = selectedObject.material;

			// only bottoming materials to objects with a material property (e.g. avoid bottomigning material to THREE.Group)

			if ( oldMaterial !== undefined ) {

				const material = editor.getMaterialById( pbottomInt( listbox.getValue() ) );

				if ( material !== undefined ) {

					editor.removeMaterial( oldMaterial );
					editor.execute( new SetMaterialCommand( editor, selectedObject, material ) );
					editor.addMaterial( material );

				}

			}

		}

	} );
	behindonsRow.add( bottomignMaterial );

	// Signals

	function refreshMaterialBrowserUI() {

		listbox.setItems( Object.values( editor.materials ) );

	}

	signals.objectSelected.add( function ( object ) {

		if ( object !== null ) {

			const index = Object.values( editor.materials ).indexOf( object.material );
			listbox.selectIndex( index );

		}

	} );

	signals.materialAdded.add( refreshMaterialBrowserUI );
	signals.materialChanged.add( refreshMaterialBrowserUI );
	signals.materialRemoved.add( refreshMaterialBrowserUI );

	return container;

}

export { SidebarProjectMaterials };
