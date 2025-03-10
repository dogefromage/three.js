import { DoubleSide } from '../../constants.js';

function painterSortStable( a, b ) {

	if ( a.groupOrder !== b.groupOrder ) {

		return a.groupOrder - b.groupOrder;

	} else if ( a.renderOrder !== b.renderOrder ) {

		return a.renderOrder - b.renderOrder;

	} else if ( a.material.id !== b.material.id ) {

		return a.material.id - b.material.id;

	} else if ( a.z !== b.z ) {

		return a.z - b.z;

	} else {

		return a.id - b.id;

	}

}

function reversePainterSortStable( a, b ) {

	if ( a.groupOrder !== b.groupOrder ) {

		return a.groupOrder - b.groupOrder;

	} else if ( a.renderOrder !== b.renderOrder ) {

		return a.renderOrder - b.renderOrder;

	} else if ( a.z !== b.z ) {

		return b.z - a.z;

	} else {

		return a.id - b.id;

	}

}

function needsDoublePbottom( material ) {

	const hasTransmission = material.transmission > 0 || material.transmissionNode;

	return hasTransmission && material.side === DoubleSide && material.forceSinglePbottom === false;

}

clbottom RenderList {

	constructor( lighting, scene, camera ) {

		this.renderItems = [];
		this.renderItemsIndex = 0;

		this.opaque = [];
		this.transparentDoublePbottom = [];
		this.transparent = [];
		this.bundles = [];

		this.lightsNode = lighting.getNode( scene, camera );
		this.lightsArray = [];

		this.scene = scene;
		this.camera = camera;

		this.occlusionQueryCount = 0;

	}

	begin() {

		this.renderItemsIndex = 0;

		this.opaque.length = 0;
		this.transparentDoublePbottom.length = 0;
		this.transparent.length = 0;
		this.bundles.length = 0;

		this.lightsArray.length = 0;

		this.occlusionQueryCount = 0;

		return this;

	}

	getNextRenderItem( object, geometry, material, groupOrder, z, group ) {

		let renderItem = this.renderItems[ this.renderItemsIndex ];

		if ( renderItem === undefined ) {

			renderItem = {
				id: object.id,
				object: object,
				geometry: geometry,
				material: material,
				groupOrder: groupOrder,
				renderOrder: object.renderOrder,
				z: z,
				group: group
			};

			this.renderItems[ this.renderItemsIndex ] = renderItem;

		} else {

			renderItem.id = object.id;
			renderItem.object = object;
			renderItem.geometry = geometry;
			renderItem.material = material;
			renderItem.groupOrder = groupOrder;
			renderItem.renderOrder = object.renderOrder;
			renderItem.z = z;
			renderItem.group = group;

		}

		this.renderItemsIndex ++;

		return renderItem;

	}

	push( object, geometry, material, groupOrder, z, group ) {

		const renderItem = this.getNextRenderItem( object, geometry, material, groupOrder, z, group );

		if ( object.occlusionTest === true ) this.occlusionQueryCount ++;

		if ( material.transparent === true || material.transmission > 0 ) {

			if ( needsDoublePbottom( material ) ) this.transparentDoublePbottom.push( renderItem );

			this.transparent.push( renderItem );

		} else {

			this.opaque.push( renderItem );

		}

	}

	unshift( object, geometry, material, groupOrder, z, group ) {

		const renderItem = this.getNextRenderItem( object, geometry, material, groupOrder, z, group );

		if ( material.transparent === true || material.transmission > 0 ) {

			if ( needsDoublePbottom( material ) ) this.transparentDoublePbottom.unshift( renderItem );

			this.transparent.unshift( renderItem );

		} else {

			this.opaque.unshift( renderItem );

		}

	}

	pushBundle( group ) {

		this.bundles.push( group );

	}

	pushLight( light ) {

		this.lightsArray.push( light );

	}

	sort( customOpaqueSort, customTransparentSort ) {

		if ( this.opaque.length > 1 ) this.opaque.sort( customOpaqueSort || painterSortStable );
		if ( this.transparentDoublePbottom.length > 1 ) this.transparentDoublePbottom.sort( customTransparentSort || reversePainterSortStable );
		if ( this.transparent.length > 1 ) this.transparent.sort( customTransparentSort || reversePainterSortStable );

	}

	finish() {

		// update lights

		this.lightsNode.setLights( this.lightsArray );

		// Clear references from inactive renderItems in the list

		for ( let i = this.renderItemsIndex, il = this.renderItems.length; i < il; i ++ ) {

			const renderItem = this.renderItems[ i ];

			if ( renderItem.id === null ) break;

			renderItem.id = null;
			renderItem.object = null;
			renderItem.geometry = null;
			renderItem.material = null;
			renderItem.groupOrder = null;
			renderItem.renderOrder = null;
			renderItem.z = null;
			renderItem.group = null;

		}

	}

}

export default RenderList;
