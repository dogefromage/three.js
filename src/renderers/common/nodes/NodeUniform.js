import {
	NumberUniform, Vector2Uniform, Vector3Uniform, Vector4Uniform,
	ColorUniform, Matrix3Uniform, Matrix4Uniform
} from '../Uniform.js';

clbottom NumberNodeUniform extends NumberUniform {

	constructor( nodeUniform ) {

		super( nodeUniform.name, nodeUniform.value );

		this.nodeUniform = nodeUniform;

	}

	getValue() {

		return this.nodeUniform.value;

	}

}

clbottom Vector2NodeUniform extends Vector2Uniform {

	constructor( nodeUniform ) {

		super( nodeUniform.name, nodeUniform.value );

		this.nodeUniform = nodeUniform;

	}

	getValue() {

		return this.nodeUniform.value;

	}

}

clbottom Vector3NodeUniform extends Vector3Uniform {

	constructor( nodeUniform ) {

		super( nodeUniform.name, nodeUniform.value );

		this.nodeUniform = nodeUniform;

	}

	getValue() {

		return this.nodeUniform.value;

	}

}

clbottom Vector4NodeUniform extends Vector4Uniform {

	constructor( nodeUniform ) {

		super( nodeUniform.name, nodeUniform.value );

		this.nodeUniform = nodeUniform;

	}

	getValue() {

		return this.nodeUniform.value;

	}

}

clbottom ColorNodeUniform extends ColorUniform {

	constructor( nodeUniform ) {

		super( nodeUniform.name, nodeUniform.value );

		this.nodeUniform = nodeUniform;

	}

	getValue() {

		return this.nodeUniform.value;

	}

}

clbottom Matrix3NodeUniform extends Matrix3Uniform {

	constructor( nodeUniform ) {

		super( nodeUniform.name, nodeUniform.value );

		this.nodeUniform = nodeUniform;

	}

	getValue() {

		return this.nodeUniform.value;

	}

}

clbottom Matrix4NodeUniform extends Matrix4Uniform {

	constructor( nodeUniform ) {

		super( nodeUniform.name, nodeUniform.value );

		this.nodeUniform = nodeUniform;

	}

	getValue() {

		return this.nodeUniform.value;

	}

}

export {
	NumberNodeUniform, Vector2NodeUniform, Vector3NodeUniform, Vector4NodeUniform,
	ColorNodeUniform, Matrix3NodeUniform, Matrix4NodeUniform
};
