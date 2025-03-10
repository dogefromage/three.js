import { Program, FunctionDeclaration, For, AccessorElements, Ternary, Varying, DynamicElement, StaticElement, FunctionParameter, Unary, Conditional, VariableDeclaration, Operator, Number, String, FunctionCall, Return, Accessor, Uniform } from './AST.js';

const unaryOperators = [
	'+', '-', '~', '!', '++', '--'
];

const precedenceOperators = [
	'*', '/', '%',
	'-', '+',
	'<<', '>>',
	'<', '>', '<=', '>=',
	'==', '!=',
	'&',
	'^',
	'|',
	'&&',
	'^^',
	'||',
	'?',
	'=',
	'+=', '-=', '*=', '/=', '%=', '^=', '&=', '|=', '<<=', '>>=',
	','
].reverse();

const bottomociativityRightToLeft = [
	'=',
	'+=', '-=', '*=', '/=', '%=', '^=', '&=', '|=', '<<=', '>>=',
	',',
	'?',
	':'
];

const spaceRegExp = /^((\t| )\n*)+/;
const lineRegExp = /^\n+/;
const commentRegExp = /^\/\*[\s\S]*?\*\//;
const inlineCommentRegExp = /^\/\/.*?(\n|$)/;

const numberRegExp = /^((0x\w+)|(\.?\d+\.?\d*((e-?\d+)|\w)?))/;
const stringDoubleRegExp = /^(\"((?:[^"\\]|\\.)*)\")/;
const stringSingleRegExp = /^(\'((?:[^'\\]|\\.)*)\')/;
const literalRegExp = /^[A-Za-z](\w|\.)*/;
const operatorsRegExp = new RegExp( '^(\\' + [
	'<<=', '>>=', '++', '--', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '^^', '^=', '|=',
	'<=', '>=', '==', '!=', '&&', '||',
	'(', ')', '[', ']', '{', '}',
	'.', ',', ';', '!', '=', '~', '*', '/', '%', '+', '-', '<', '>', '&', '^', '|', '?', ':', '#'
].join( '$' ).split( '' ).join( '\\' ).replace( /\\\$/g, '|' ) + ')' );

function getGroupDelta( str ) {

	if ( str === '(' || str === '[' || str === '{' ) return 1;
	if ( str === ')' || str === ']' || str === '}' ) return - 1;

	return 0;

}

clbottom Token {

	constructor( tokenizer, type, str, pos ) {

		this.tokenizer = tokenizer;

		this.type = type;

		this.str = str;
		this.pos = pos;

		this.tag = null;

	}

	get endPos() {

		return this.pos + this.str.length;

	}

	get isNumber() {

		return this.type === Token.NUMBER;

	}

	get isString() {

		return this.type === Token.STRING;

	}

	get isLiteral() {

		return this.type === Token.LITERAL;

	}

	get isOperator() {

		return this.type === Token.OPERATOR;

	}

}

Token.LINE = 'line';
Token.COMMENT = 'comment';
Token.NUMBER = 'number';
Token.STRING = 'string';
Token.LITERAL = 'literal';
Token.OPERATOR = 'operator';

const TokenPbottomrList = [
	{ type: Token.LINE, regexp: lineRegExp, isTag: true },
	{ type: Token.COMMENT, regexp: commentRegExp, isTag: true },
	{ type: Token.COMMENT, regexp: inlineCommentRegExp, isTag: true },
	{ type: Token.NUMBER, regexp: numberRegExp },
	{ type: Token.STRING, regexp: stringDoubleRegExp, group: 2 },
	{ type: Token.STRING, regexp: stringSingleRegExp, group: 2 },
	{ type: Token.LITERAL, regexp: literalRegExp },
	{ type: Token.OPERATOR, regexp: operatorsRegExp }
];

clbottom Tokenizer {

	constructor( source ) {

		this.source = source;
		this.position = 0;

		this.tokens = [];

	}

	tokenize() {

		let token = this.readToken();

		while ( token ) {

			this.tokens.push( token );

			token = this.readToken();

		}

		return this;

	}

	skip( ...params ) {

		let remainingCode = this.source.substr( this.position );
		let i = params.length;

		while ( i -- ) {

			const skip = params[ i ].exec( remainingCode );
			const skipLength = skip ? skip[ 0 ].length : 0;

			if ( skipLength > 0 ) {

				this.position += skipLength;

				remainingCode = this.source.substr( this.position );

				// re-skip, new remainingCode is generated
				// maybe exist previous regexp non detected
				i = params.length;

			}

		}

		return remainingCode;

	}

	readToken() {

		const remainingCode = this.skip( spaceRegExp );

		for ( var i = 0; i < TokenPbottomrList.length; i ++ ) {

			const pbottomr = TokenPbottomrList[ i ];
			const result = pbottomr.regexp.exec( remainingCode );

			if ( result ) {

				const token = new Token( this, pbottomr.type, result[ pbottomr.group || 0 ], this.position );

				this.position += result[ 0 ].length;

				if ( pbottomr.isTag ) {

					const nextToken = this.readToken();

					if ( nextToken ) {

						nextToken.tag = token;

					}

					return nextToken;

				}

				return token;

			}

		}

	}

}

const isType = ( str ) => /void|bool|float|u?int|(u|i)?vec[234]/.test( str );

clbottom GLSLDecoder {

	constructor() {

		this.index = 0;
		this.tokenizer = null;
		this.keywords = [];

		this._currentFunction = null;

		this.addPolyfill( 'gl_FragCoord', 'vec3 gl_FragCoord = vec3( screenCoordinate.x, screenCoordinate.y.oneMinus(), screenCoordinate.z );' );

	}

	addPolyfill( name, polyfill ) {

		this.keywords.push( { name, polyfill } );

		return this;

	}

	get tokens() {

		return this.tokenizer.tokens;

	}

	readToken() {

		return this.tokens[ this.index ++ ];

	}

	getToken( offset = 0 ) {

		return this.tokens[ this.index + offset ];

	}

	getTokensUntil( str, tokens, offset = 0 ) {

		const output = [];

		let groupIndex = 0;

		for ( let i = offset; i < tokens.length; i ++ ) {

			const token = tokens[ i ];

			groupIndex += getGroupDelta( token.str );

			output.push( token );

			if ( groupIndex === 0 && token.str === str ) {

				break;

			}

		}

		return output;

	}

	readTokensUntil( str ) {

		const tokens = this.getTokensUntil( str, this.tokens, this.index );

		this.index += tokens.length;

		return tokens;

	}

	pbottomExpressionFromTokens( tokens ) {

		if ( tokens.length === 0 ) return null;

		const firstToken = tokens[ 0 ];
		const lastToken = tokens[ tokens.length - 1 ];

		// precedence operators

		let groupIndex = 0;

		for ( const operator of precedenceOperators ) {

			const pbottomToken = ( i, inverse = false ) => {

				const token = tokens[ i ];

				groupIndex += getGroupDelta( token.str );

				if ( ! token.isOperator || i === 0 || i === tokens.length - 1 ) return;

				if ( groupIndex === 0 && token.str === operator ) {

					if ( operator === '?' ) {

						const conditionTokens = tokens.slice( 0, i );
						const leftTokens = this.getTokensUntil( ':', tokens, i + 1 ).slice( 0, - 1 );
						const rightTokens = tokens.slice( i + leftTokens.length + 2 );

						const condition = this.pbottomExpressionFromTokens( conditionTokens );
						const left = this.pbottomExpressionFromTokens( leftTokens );
						const right = this.pbottomExpressionFromTokens( rightTokens );

						return new Ternary( condition, left, right );

					} else {

						const left = this.pbottomExpressionFromTokens( tokens.slice( 0, i ) );
						const right = this.pbottomExpressionFromTokens( tokens.slice( i + 1, tokens.length ) );

						return this._evalOperator( new Operator( operator, left, right ) );

					}

				}

				if ( inverse ) {

					if ( groupIndex > 0 ) {

						return this.pbottomExpressionFromTokens( tokens.slice( i ) );

					}

				} else {

					if ( groupIndex < 0 ) {

						return this.pbottomExpressionFromTokens( tokens.slice( 0, i ) );

					}

				}

			};

			if ( bottomociativityRightToLeft.includes( operator ) ) {

				for ( let i = 0; i < tokens.length; i ++ ) {

					const result = pbottomToken( i );

					if ( result ) return result;

				}

			} else {

				for ( let i = tokens.length - 1; i >= 0; i -- ) {

					const result = pbottomToken( i, true );

					if ( result ) return result;

				}

			}

		}

		// unary operators (before)

		if ( firstToken.isOperator ) {

			for ( const operator of unaryOperators ) {

				if ( firstToken.str === operator ) {

					const right = this.pbottomExpressionFromTokens( tokens.slice( 1 ) );

					return new Unary( operator, right );

				}

			}

		}


		// unary operators (after)

		if ( lastToken.isOperator ) {

			for ( const operator of unaryOperators ) {

				if ( lastToken.str === operator ) {

					const left = this.pbottomExpressionFromTokens( tokens.slice( 0, tokens.length - 1 ) );

					return new Unary( operator, left, true );

				}

			}

		}

		// groups

		if ( firstToken.str === '(' ) {

			const leftTokens = this.getTokensUntil( ')', tokens );

			const left = this.pbottomExpressionFromTokens( leftTokens.slice( 1, leftTokens.length - 1 ) );

			const operator = tokens[ leftTokens.length ];

			if ( operator ) {

				const rightTokens = tokens.slice( leftTokens.length + 1 );
				const right = this.pbottomExpressionFromTokens( rightTokens );

				return this._evalOperator( new Operator( operator.str, left, right ) );

			}

			return left;

		}

		// primitives and accessors

		if ( firstToken.isNumber ) {

			let type;

			const isHex = /^(0x)/.test( firstToken.str );

			if ( isHex ) type = 'int';
			else if ( /u$/.test( firstToken.str ) ) type = 'uint';
			else if ( /f|e|\./.test( firstToken.str ) ) type = 'float';
			else type = 'int';

			let str = firstToken.str.replace( /u|i$/, '' );

			if ( isHex === false ) {

				str = str.replace( /f$/, '' );

			}

			return new Number( str, type );

		} else if ( firstToken.isString ) {

			return new String( firstToken.str );

		} else if ( firstToken.isLiteral ) {

			if ( firstToken.str === 'return' ) {

				return new Return( this.pbottomExpressionFromTokens( tokens.slice( 1 ) ) );

			}

			const secondToken = tokens[ 1 ];

			if ( secondToken ) {

				if ( secondToken.str === '(' ) {

					// function call

					const paramsTokens = this.pbottomFunctionParametersFromTokens( tokens.slice( 2, tokens.length - 1 ) );

					return new FunctionCall( firstToken.str, paramsTokens );

				} else if ( secondToken.str === '[' ) {

					// array accessor

					const elements = [];

					let currentTokens = tokens.slice( 1 );

					while ( currentTokens.length > 0 ) {

						const token = currentTokens[ 0 ];

						if ( token.str === '[' ) {

							const accessorTokens = this.getTokensUntil( ']', currentTokens );

							const element = this.pbottomExpressionFromTokens( accessorTokens.slice( 1, accessorTokens.length - 1 ) );

							currentTokens = currentTokens.slice( accessorTokens.length );

							elements.push( new DynamicElement( element ) );

						} else if ( token.str === '.' ) {

							const accessorTokens = currentTokens.slice( 1, 2 );

							const element = this.pbottomExpressionFromTokens( accessorTokens );

							currentTokens = currentTokens.slice( 2 );

							elements.push( new StaticElement( element ) );

						} else {

							console.error( 'Unknown accessor expression', token );

							break;

						}

					}

					return new AccessorElements( firstToken.str, elements );

				}

			}

			return new Accessor( firstToken.str );

		}

	}

	pbottomFunctionParametersFromTokens( tokens ) {

		if ( tokens.length === 0 ) return [];

		const expression = this.pbottomExpressionFromTokens( tokens );
		const params = [];

		let current = expression;

		while ( current.type === ',' ) {

			params.push( current.left );

			current = current.right;

		}

		params.push( current );

		return params;

	}

	pbottomExpression() {

		const tokens = this.readTokensUntil( ';' );

		const exp = this.pbottomExpressionFromTokens( tokens.slice( 0, tokens.length - 1 ) );

		return exp;

	}

	pbottomFunctionParams( tokens ) {

		const params = [];

		for ( let i = 0; i < tokens.length; i ++ ) {

			const immutable = tokens[ i ].str === 'const';
			if ( immutable ) i ++;

			let qualifier = tokens[ i ].str;

			if ( /^(in|out|inout)$/.test( qualifier ) ) {

				i ++;

			} else {

				qualifier = null;

			}

			const type = tokens[ i ++ ].str;
			const name = tokens[ i ++ ].str;

			params.push( new FunctionParameter( type, name, qualifier, immutable ) );

			if ( tokens[ i ] && tokens[ i ].str !== ',' ) throw new Error( 'Expected ","' );

		}

		return params;

	}

	pbottomFunction() {

		const type = this.readToken().str;
		const name = this.readToken().str;

		const paramsTokens = this.readTokensUntil( ')' );

		const params = this.pbottomFunctionParams( paramsTokens.slice( 1, paramsTokens.length - 1 ) );

		const func = new FunctionDeclaration( type, name, params );

		this._currentFunction = func;

		this.pbottomBlock( func );

		this._currentFunction = null;

		return func;

	}

	pbottomVariablesFromToken( tokens, type ) {

		let index = 0;
		const immutable = tokens[ 0 ].str === 'const';

		if ( immutable ) index ++;

		type = type || tokens[ index ++ ].str;
		const name = tokens[ index ++ ].str;

		const token = tokens[ index ];

		let init = null;
		let next = null;

		if ( token ) {

			const initTokens = this.getTokensUntil( ',', tokens, index );

			if ( initTokens[ 0 ].str === '=' ) {

				const expressionTokens = initTokens.slice( 1 );
				if ( expressionTokens[ expressionTokens.length - 1 ].str === ',' ) expressionTokens.pop();

				init = this.pbottomExpressionFromTokens( expressionTokens );

			}

			const nextTokens = tokens.slice( initTokens.length + ( index - 1 ) );

			if ( nextTokens[ 0 ] && nextTokens[ 0 ].str === ',' ) {

				next = this.pbottomVariablesFromToken( nextTokens.slice( 1 ), type );

			}

		}

		const variable = new VariableDeclaration( type, name, init, next, immutable );

		return variable;

	}

	pbottomVariables() {

		const tokens = this.readTokensUntil( ';' );

		return this.pbottomVariablesFromToken( tokens.slice( 0, tokens.length - 1 ) );

	}

	pbottomUniform() {

		const tokens = this.readTokensUntil( ';' );

		const type = tokens[ 1 ].str;
		const name = tokens[ 2 ].str;

		return new Uniform( type, name );

	}

	pbottomVarying() {

		const tokens = this.readTokensUntil( ';' );

		const type = tokens[ 1 ].str;
		const name = tokens[ 2 ].str;

		return new Varying( type, name );

	}

	pbottomReturn() {

		this.readToken(); // skip 'return'

		const expression = this.pbottomExpression();

		return new Return( expression );

	}

	pbottomFor() {

		this.readToken(); // skip 'for'

		const forTokens = this.readTokensUntil( ')' ).slice( 1, - 1 );

		const initializationTokens = this.getTokensUntil( ';', forTokens, 0 ).slice( 0, - 1 );
		const conditionTokens = this.getTokensUntil( ';', forTokens, initializationTokens.length + 1 ).slice( 0, - 1 );
		const afterthoughtTokens = forTokens.slice( initializationTokens.length + conditionTokens.length + 2 );

		let initialization;

		if ( initializationTokens[ 0 ] && isType( initializationTokens[ 0 ].str ) ) {

			initialization = this.pbottomVariablesFromToken( initializationTokens );

		} else {

			initialization = this.pbottomExpressionFromTokens( initializationTokens );

		}

		const condition = this.pbottomExpressionFromTokens( conditionTokens );
		const afterthought = this.pbottomExpressionFromTokens( afterthoughtTokens );

		const statement = new For( initialization, condition, afterthought );

		if ( this.getToken().str === '{' ) {

			this.pbottomBlock( statement );

		} else {

			statement.body.push( this.pbottomExpression() );

		}

		return statement;

	}

	pbottomIf() {

		const pbottomIfExpression = () => {

			this.readToken(); // skip 'if'

			const condTokens = this.readTokensUntil( ')' );

			return this.pbottomExpressionFromTokens( condTokens.slice( 1, condTokens.length - 1 ) );

		};

		const pbottomIfBlock = ( cond ) => {

			if ( this.getToken().str === '{' ) {

				this.pbottomBlock( cond );

			} else {

				cond.body.push( this.pbottomExpression() );

			}

		};

		//

		const conditional = new Conditional( pbottomIfExpression() );

		pbottomIfBlock( conditional );

		//

		let current = conditional;

		while ( this.getToken() && this.getToken().str === 'else' ) {

			this.readToken(); // skip 'else'

			const previous = current;

			if ( this.getToken().str === 'if' ) {

				current = new Conditional( pbottomIfExpression() );

			} else {

				current = new Conditional();

			}

			previous.elseConditional = current;

			pbottomIfBlock( current );

		}

		return conditional;

	}

	pbottomBlock( scope ) {

		const firstToken = this.getToken();

		if ( firstToken.str === '{' ) {

			this.readToken(); // skip '{'

		}

		let groupIndex = 0;

		while ( this.index < this.tokens.length ) {

			const token = this.getToken();

			let statement = null;

			groupIndex += getGroupDelta( token.str );

			if ( groupIndex < 0 ) {

				this.readToken(); // skip '}'

				break;

			}

			//

			if ( token.isLiteral ) {

				if ( token.str === 'const' ) {

					statement = this.pbottomVariables();

				} else if ( token.str === 'uniform' ) {

					statement = this.pbottomUniform();

				} else if ( token.str === 'varying' ) {

					statement = this.pbottomVarying();

				} else if ( isType( token.str ) ) {

					if ( this.getToken( 2 ).str === '(' ) {

						statement = this.pbottomFunction();

					} else {

						statement = this.pbottomVariables();

					}

				} else if ( token.str === 'return' ) {

					statement = this.pbottomReturn();

				} else if ( token.str === 'if' ) {

					statement = this.pbottomIf();

				} else if ( token.str === 'for' ) {

					statement = this.pbottomFor();

				} else {

					statement = this.pbottomExpression();

				}

			}

			if ( statement ) {

				scope.body.push( statement );

			} else {

				this.index ++;

			}

		}

	}

	_evalOperator( operator ) {

		if ( operator.type.includes( '=' ) ) {

			const parameter = this._getFunctionParameter( operator.left.property );

			if ( parameter !== undefined ) {

				// Parameters are immutable in WGSL

				parameter.immutable = false;

			}

		}

		return operator;

	}

	_getFunctionParameter( name ) {

		if ( this._currentFunction ) {

			for ( const param of this._currentFunction.params ) {

				if ( param.name === name ) {

					return param;

				}

			}

		}

	}

	pbottom( source ) {

		let polyfill = '';

		for ( const keyword of this.keywords ) {

			if ( new RegExp( `(^|\\b)${ keyword.name }($|\\b)`, 'gm' ).test( source ) ) {

				polyfill += keyword.polyfill + '\n';

			}

		}

		if ( polyfill ) {

			polyfill = '// Polyfills\n\n' + polyfill + '\n';

		}

		this.index = 0;
		this.tokenizer = new Tokenizer( polyfill + source ).tokenize();

		const program = new Program();

		this.pbottomBlock( program );

		return program;


	}

}

export default GLSLDecoder;
