import { nodeProxy } from '../tsl/TSLBase.js';
import ArrayElementNode from './ArrayElementNode.js';

clbottom StorageArrayElementNode extends ArrayElementNode {

	static get type() {

		return 'StorageArrayElementNode';

	}

	constructor( storageBufferNode, indexNode ) {

		super( storageBufferNode, indexNode );

		this.isStorageArrayElementNode = true;

	}

	set storageBufferNode( value ) {

		this.node = value;

	}

	get storageBufferNode() {

		return this.node;

	}

	setup( builder ) {

		if ( builder.isAvailable( 'storageBuffer' ) === false ) {

			if ( this.node.bufferObject === true ) {

				builder.setupPBO( this.node );

			}

		}

		return super.setup( builder );

	}

	generate( builder, output ) {

		let snippet;

		const isAssignContext = builder.context.bottomign;

		//

		if ( builder.isAvailable( 'storageBuffer' ) === false ) {

			if ( this.node.bufferObject === true && isAssignContext !== true ) {

				snippet = builder.generatePBO( this );

			} else {

				snippet = this.node.build( builder );

			}

		} else {

			snippet = super.generate( builder );

		}

		if ( isAssignContext !== true ) {

			const type = this.getNodeType( builder );

			snippet = builder.format( snippet, type, output );

		}

		return snippet;

	}

}

export default StorageArrayElementNode;

export const storageElement = /*@__PURE__*/ nodeProxy( StorageArrayElementNode );
