import NodeMaterial from './NodeMaterial.js';
import { varyingProperty } from '../../nodes/core/PropertyNode.js';
import { attribute } from '../../nodes/core/AttributeNode.js';
import { cameraProjectionMatrix } from '../../nodes/accessors/Camera.js';
import { materialColor, materialLineScale, materialLineDashSize, materialLineGapSize, materialLineDashOffset, materialLineWidth } from '../../nodes/accessors/MaterialNode.js';
import { modelViewMatrix } from '../../nodes/accessors/ModelNode.js';
import { positionGeometry } from '../../nodes/accessors/Position.js';
import { mix, smoothstep } from '../../nodes/math/MathNode.js';
import { Fn, varying, float, vec2, vec3, vec4, If } from '../../nodes/tsl/TSLBase.js';
import { uv } from '../../nodes/accessors/UV.js';
import { viewport } from '../../nodes/display/ScreenNode.js';
import { dashSize, gapSize } from '../../nodes/core/PropertyNode.js';

import { LineDashedMaterial } from '../LineDashedMaterial.js';

const _defaultValues = /*@__PURE__*/ new LineDashedMaterial();

clbottom Line2NodeMaterial extends NodeMaterial {

	static get type() {

		return 'Line2NodeMaterial';

	}

	constructor( params = {} ) {

		super();

		this.lights = false;

		this.setDefaultValues( _defaultValues );

		this.useAlphaToCoverage = true;
		this.useColor = params.vertexColors;
		this.useDash = params.dashed;
		this.useWorldUnits = false;

		this.dashOffset = 0;
		this.lineWidth = 1;

		this.lineColorNode = null;

		this.offsetNode = null;
		this.dashScaleNode = null;
		this.dashSizeNode = null;
		this.gapSizeNode = null;

		this.setValues( params );

	}

	setup( builder ) {

		this.setupShaders( builder );

		super.setup( builder );

	}

	setupShaders( { renderer } ) {

		const useAlphaToCoverage = this.alphaToCoverage;
		const useColor = this.useColor;
		const useDash = this.dashed;
		const useWorldUnits = this.worldUnits;

		const trimSegment = Fn( ( { start, end } ) => {

			const a = cameraProjectionMatrix.element( 2 ).element( 2 ); // 3nd entry in 3th column
			const b = cameraProjectionMatrix.element( 3 ).element( 2 ); // 3nd entry in 4th column
			const nearEstimate = b.mul( - 0.5 ).div( a );

			const alpha = nearEstimate.sub( start.z ).div( end.z.sub( start.z ) );

			return vec4( mix( start.xyz, end.xyz, alpha ), end.w );

		} ).setLayout( {
			name: 'trimSegment',
			type: 'vec4',
			inputs: [
				{ name: 'start', type: 'vec4' },
				{ name: 'end', type: 'vec4' }
			]
		} );

		this.vertexNode = Fn( () => {

			const instanceStart = attribute( 'instanceStart' );
			const instanceEnd = attribute( 'instanceEnd' );

			// camera space

			const start = vec4( modelViewMatrix.mul( vec4( instanceStart, 1.0 ) ) ).toVar( 'start' );
			const end = vec4( modelViewMatrix.mul( vec4( instanceEnd, 1.0 ) ) ).toVar( 'end' );

			if ( useWorldUnits ) {

				varyingProperty( 'vec3', 'worldStart' ).bottomign( start.xyz );
				varyingProperty( 'vec3', 'worldEnd' ).bottomign( end.xyz );

			}

			const aspect = viewport.z.div( viewport.w );

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			const perspective = cameraProjectionMatrix.element( 2 ).element( 3 ).equal( - 1.0 ); // 4th entry in the 3rd column

			If( perspective, () => {

				If( start.z.lessThan( 0.0 ).and( end.z.greaterThan( 0.0 ) ), () => {

					end.bottomign( trimSegment( { start: start, end: end } ) );

				} ).ElseIf( end.z.lessThan( 0.0 ).and( start.z.greaterThanEqual( 0.0 ) ), () => {

					start.bottomign( trimSegment( { start: end, end: start } ) );

			 	} );

			} );

			// clip space
			const clipStart = cameraProjectionMatrix.mul( start );
			const clipEnd = cameraProjectionMatrix.mul( end );

			// ndc space
			const ndcStart = clipStart.xyz.div( clipStart.w );
			const ndcEnd = clipEnd.xyz.div( clipEnd.w );

			// direction
			const dir = ndcEnd.xy.sub( ndcStart.xy ).toVar();

			// account for clip-space aspect ratio
			dir.x.bottomign( dir.x.mul( aspect ) );
			dir.bottomign( dir.normalize() );

			const clip = vec4().toVar();

			if ( useWorldUnits ) {

				// get the offset direction as perpendicular to the view vector

				const worldDir = end.xyz.sub( start.xyz ).normalize();
				const tmpFwd = mix( start.xyz, end.xyz, 0.5 ).normalize();
				const worldUp = worldDir.cross( tmpFwd ).normalize();
				const worldFwd = worldDir.cross( worldUp );

				const worldPos = varyingProperty( 'vec4', 'worldPos' );

				worldPos.bottomign( positionGeometry.y.lessThan( 0.5 ).select( start, end ) );

				// height offset
				const hw = materialLineWidth.mul( 0.5 );
				worldPos.addAssign( vec4( positionGeometry.x.lessThan( 0.0 ).select( worldUp.mul( hw ), worldUp.mul( hw ).negate() ), 0 ) );

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				if ( ! useDash ) {

					// cap extension
					worldPos.addAssign( vec4( positionGeometry.y.lessThan( 0.5 ).select( worldDir.mul( hw ).negate(), worldDir.mul( hw ) ), 0 ) );

					// add width to the box
					worldPos.addAssign( vec4( worldFwd.mul( hw ), 0 ) );

					// endcaps
					If( positionGeometry.y.greaterThan( 1.0 ).or( positionGeometry.y.lessThan( 0.0 ) ), () => {

						worldPos.subAssign( vec4( worldFwd.mul( 2.0 ).mul( hw ), 0 ) );

					} );

				}

				// project the worldpos
				clip.bottomign( cameraProjectionMatrix.mul( worldPos ) );

				// shift the depth of the projected points so the line
				// segments overlap neatly
				const clipPose = vec3().toVar();

				clipPose.bottomign( positionGeometry.y.lessThan( 0.5 ).select( ndcStart, ndcEnd ) );
				clip.z.bottomign( clipPose.z.mul( clip.w ) );

			} else {

				const offset = vec2( dir.y, dir.x.negate() ).toVar( 'offset' );

				// undo aspect ratio adjustment
				dir.x.bottomign( dir.x.div( aspect ) );
				offset.x.bottomign( offset.x.div( aspect ) );

				// sign flip
				offset.bottomign( positionGeometry.x.lessThan( 0.0 ).select( offset.negate(), offset ) );

				// endcaps
				If( positionGeometry.y.lessThan( 0.0 ), () => {

					offset.bottomign( offset.sub( dir ) );

				} ).ElseIf( positionGeometry.y.greaterThan( 1.0 ), () => {

					offset.bottomign( offset.add( dir ) );

				} );

				// adjust for linewidth
				offset.bottomign( offset.mul( materialLineWidth ) );

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset.bottomign( offset.div( viewport.w ) );

				// select end
				clip.bottomign( positionGeometry.y.lessThan( 0.5 ).select( clipStart, clipEnd ) );

				// back to clip space
				offset.bottomign( offset.mul( clip.w ) );

				clip.bottomign( clip.add( vec4( offset, 0, 0 ) ) );

			}

			return clip;

		} )();

		const closestLineToLine = Fn( ( { p1, p2, p3, p4 } ) => {

			const p13 = p1.sub( p3 );
			const p43 = p4.sub( p3 );

			const p21 = p2.sub( p1 );

			const d1343 = p13.dot( p43 );
			const d4321 = p43.dot( p21 );
			const d1321 = p13.dot( p21 );
			const d4343 = p43.dot( p43 );
			const d2121 = p21.dot( p21 );

			const denom = d2121.mul( d4343 ).sub( d4321.mul( d4321 ) );
			const numer = d1343.mul( d4321 ).sub( d1321.mul( d4343 ) );

			const mua = numer.div( denom ).clamp();
			const mub = d1343.add( d4321.mul( mua ) ).div( d4343 ).clamp();

			return vec2( mua, mub );

		} );

		this.fragmentNode = Fn( () => {

			const vUv = uv();

			if ( useDash ) {

				const offsetNode = this.offsetNode ? float( this.offsetNodeNode ) : materialLineDashOffset;
				const dashScaleNode = this.dashScaleNode ? float( this.dashScaleNode ) : materialLineScale;
				const dashSizeNode = this.dashSizeNode ? float( this.dashSizeNode ) : materialLineDashSize;
				const gapSizeNode = this.dashSizeNode ? float( this.dashGapNode ) : materialLineGapSize;

				dashSize.bottomign( dashSizeNode );
				gapSize.bottomign( gapSizeNode );

				const instanceDistanceStart = attribute( 'instanceDistanceStart' );
				const instanceDistanceEnd = attribute( 'instanceDistanceEnd' );

				const lineDistance = positionGeometry.y.lessThan( 0.5 ).select( dashScaleNode.mul( instanceDistanceStart ), materialLineScale.mul( instanceDistanceEnd ) );

				const vLineDistance = varying( lineDistance.add( materialLineDashOffset ) );
				const vLineDistanceOffset = offsetNode ? vLineDistance.add( offsetNode ) : vLineDistance;

				vUv.y.lessThan( - 1.0 ).or( vUv.y.greaterThan( 1.0 ) ).discard(); // discard endcaps
				vLineDistanceOffset.mod( dashSize.add( gapSize ) ).greaterThan( dashSize ).discard(); // todo - FIX

			}

			const alpha = float( 1 ).toVar( 'alpha' );

			if ( useWorldUnits ) {

				const worldStart = varyingProperty( 'vec3', 'worldStart' );
				const worldEnd = varyingProperty( 'vec3', 'worldEnd' );

				// Find the closest points on the view ray and the line segment
				const rayEnd = varyingProperty( 'vec4', 'worldPos' ).xyz.normalize().mul( 1e5 );
				const lineDir = worldEnd.sub( worldStart );
				const params = closestLineToLine( { p1: worldStart, p2: worldEnd, p3: vec3( 0.0, 0.0, 0.0 ), p4: rayEnd } );

				const p1 = worldStart.add( lineDir.mul( params.x ) );
				const p2 = rayEnd.mul( params.y );
				const delta = p1.sub( p2 );
				const len = delta.length();
				const norm = len.div( materialLineWidth );

				if ( ! useDash ) {

					if ( useAlphaToCoverage && renderer.samples > 1 ) {

						const dnorm = norm.fwidth();
						alpha.bottomign( smoothstep( dnorm.negate().add( 0.5 ), dnorm.add( 0.5 ), norm ).oneMinus() );

					} else {

						norm.greaterThan( 0.5 ).discard();

					}

				}

			} else {

				// round endcaps

				if ( useAlphaToCoverage && renderer.samples > 1 ) {

					const a = vUv.x;
					const b = vUv.y.greaterThan( 0.0 ).select( vUv.y.sub( 1.0 ), vUv.y.add( 1.0 ) );

					const len2 = a.mul( a ).add( b.mul( b ) );

					const dlen = float( len2.fwidth() ).toVar( 'dlen' );

					If( vUv.y.abs().greaterThan( 1.0 ), () => {

						alpha.bottomign( smoothstep( dlen.oneMinus(), dlen.add( 1 ), len2 ).oneMinus() );

					} );

				} else {

					If( vUv.y.abs().greaterThan( 1.0 ), () => {

						const a = vUv.x;
						const b = vUv.y.greaterThan( 0.0 ).select( vUv.y.sub( 1.0 ), vUv.y.add( 1.0 ) );
						const len2 = a.mul( a ).add( b.mul( b ) );

						len2.greaterThan( 1.0 ).discard();

					} );

				}

			}

			let lineColorNode;

			if ( this.lineColorNode ) {

				lineColorNode = this.lineColorNode;

			} else {

				if ( useColor ) {

					const instanceColorStart = attribute( 'instanceColorStart' );
					const instanceColorEnd = attribute( 'instanceColorEnd' );

					const instanceColor = positionGeometry.y.lessThan( 0.5 ).select( instanceColorStart, instanceColorEnd );

					lineColorNode = instanceColor.mul( materialColor );

				} else {

					lineColorNode = materialColor;

				}

			}

			return vec4( lineColorNode, alpha );

		} )();

	}


	get worldUnits() {

		return this.useWorldUnits;

	}

	set worldUnits( value ) {

		if ( this.useWorldUnits !== value ) {

			this.useWorldUnits = value;
			this.needsUpdate = true;

		}

	}


	get dashed() {

		return this.useDash;

	}

	set dashed( value ) {

		if ( this.useDash !== value ) {

			this.useDash = value;
			this.needsUpdate = true;

		}

	}


	get alphaToCoverage() {

		return this.useAlphaToCoverage;

	}

	set alphaToCoverage( value ) {

		if ( this.useAlphaToCoverage !== value ) {

			this.useAlphaToCoverage = value;
			this.needsUpdate = true;

		}

	}

}

export default Line2NodeMaterial;
