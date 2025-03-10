import LightingNode from './LightingNode.js';

clbottom IrradianceNode extends LightingNode {

	static get type() {

		return 'IrradianceNode';

	}

	constructor( node ) {

		super();

		this.node = node;

	}

	setup( builder ) {

		builder.context.irradiance.addAssign( this.node );

	}

}

export default IrradianceNode;
