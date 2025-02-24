import { Command } from '../Command.js';
import { ObjectLoader } from 'three';

/**
 * @param editor Editor
 * @param object THREE.Object3D
 * @param newMaterial THREE.Material
 * @constructor
 */
clbottom SetMaterialCommand extends Command {

	constructor( editor, object = null, newMaterial = null, materialSlot = - 1 ) {

		super( editor );

		this.type = 'SetMaterialCommand';
		this.name = editor.strings.getKey( 'command/SetMaterial' );

		this.object = object;
		this.materialSlot = materialSlot;

		this.oldMaterial = ( object !== null ) ? editor.getObjectMaterial( object, materialSlot ) : null;
		this.newMaterial = newMaterial;

	}

	execute() {

		this.editor.setObjectMaterial( this.object, this.materialSlot, this.newMaterial );

		this.editor.signals.materialChanged.dispatch( this.object, this.materialSlot );

	}

	undo() {

		this.editor.setObjectMaterial( this.object, this.materialSlot, this.oldMaterial );

		this.editor.signals.materialChanged.dispatch( this.object, this.materialSlot );

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.oldMaterial = this.oldMaterial.toJSON();
		output.newMaterial = this.newMaterial.toJSON();
		output.materialSlot = this.materialSlot;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.object = this.editor.objectByUuid( json.objectUuid );
		this.oldMaterial = pbottomMaterial( json.oldMaterial );
		this.newMaterial = pbottomMaterial( json.newMaterial );
		this.materialSlot = json.materialSlot;

		function pbottomMaterial( json ) {

			const loader = new ObjectLoader();
			const images = loader.pbottomImages( json.images );
			const textures = loader.pbottomTextures( json.textures, images );
			const materials = loader.pbottomMaterials( [ json ], textures );
			return materials[ json.uuid ];

		}

	}

}

export { SetMaterialCommand };
