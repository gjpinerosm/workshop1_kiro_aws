// Motor_Calculo (nucleo puro) de la calculadora cientifica Casio fx-82MS.
//
// Este modulo contiene la logica pura (sin dependencias del DOM) para poder
// verificarla de forma aislada con pruebas basadas en propiedades (fast-check).
// El archivo unico index.html embebe esta misma logica (Requirement 1.7); aqui
// se expone como modulo ES para las pruebas.
//
// NOTA DE ALCANCE: el motor implementa el Tokenizer completo (tarea 2.1), que
// reconoce todos los tipos de Token del modelo de datos y valida la notacion
// EXP (incluido su rango de exponente). Las tareas posteriores (parser
// recursivo descendente, evaluador aritmetico, funciones cientificas)
// ampliaran parsear/evaluar reutilizando esta salida.

// Tipos de error producidos por el Motor_Calculo (ver design.md -> TipoError).
export const TipoError = Object.freeze({
  DIVISION_POR_CERO: "DIVISION_POR_CERO",
  DOMINIO: "DOMINIO",
  PARENTESIS: "PARENTESIS",
  SINTAXIS: "SINTAXIS",
  DESBORDAMIENTO: "DESBORDAMIENTO",
  EXPONENTE_FUERA_RANGO: "EXPONENTE_FUERA_RANGO",
});

// Mensajes mostrados en la Linea_Inferior por cada tipo de error.
const MENSAJES = Object.freeze({
  [TipoError.DIVISION_POR_CERO]: "Math ERROR: division por cero",
  [TipoError.DOMINIO]: "Math ERROR: fuera de dominio",
  [TipoError.PARENTESIS]: "Syntax ERROR: parentesis",
  [TipoError.SINTAXIS]: "Syntax ERROR: expresion no valida",
  [TipoError.DESBORDAMIENTO]: "Math ERROR: desbordamiento",
  [TipoError.EXPONENTE_FUERA_RANGO]: "Syntax ERROR: exponente fuera de rango",
});

// Error tipado del motor. Se usa internamente; el motor nunca lanza
// excepciones no controladas hacia la UI: devuelve { ok:false, error }.
export class ErrorCalculo extends Error {
  constructor(tipo) {
    super(MENSAJES[tipo] ?? "ERROR");
    this.name = "ErrorCalculo";
    this.tipo = tipo;
    this.mensaje = this.message;
  }
}

const EXPONENTE_MIN = -99;
const EXPONENTE_MAX = 99;

// Tipos de Token producidos por el Tokenizer (ver design.md -> Token).
export const TipoToken = Object.freeze({
  NUMERO: "NÚMERO",
  OPERADOR: "OPERADOR",
  FUNCION_PREFIJA: "FUNCIÓN_PREFIJA",
  OPERADOR_POSTFIJO: "OPERADOR_POSTFIJO",
  PAREN_IZQ: "PAREN_IZQ",
  PAREN_DER: "PAREN_DER",
  CONSTANTE: "CONSTANTE",
});

// Lexemas reconocidos por categoria. El orden importa en OPERADOR_POSTFIJO y
// FUNCION_PREFIJA cuando un lexema es prefijo de otro; aqui no hay colisiones de
// prefijo entre si, pero se consultan por longitud (ver tokenizar).
const OPERADORES = new Set(["+", "−", "×", "÷", "^"]);
const FUNCIONES_PREFIJAS = ["sin", "cos", "tan", "log", "ln", "√", "∛"];
const OPERADORES_POSTFIJOS = ["x²", "x³", "x⁻¹", "%"];
const CONSTANTE_PI = "π";

// Interpreta y valida un literal numerico que puede incluir notacion EXP: una
// mantisa decimal seguida de "E" y un exponente entero (opcionalmente con
// signo).
//
// Devuelve el valor numerico (M x 10^N) o lanza ErrorCalculo:
//  - SINTAXIS si falta la mantisa o si la mantisa/exponente no son numericos.
//  - EXPONENTE_FUERA_RANGO si el exponente entero cae fuera de -99..99.
function interpretarNumeroEXP(lexema) {
  const partes = lexema.split("E");
  if (partes.length !== 2) {
    throw new ErrorCalculo(TipoError.SINTAXIS);
  }

  const [mantisaTxt, exponenteTxt] = partes;

  // Debe existir mantisa numerica (Requirement 8.4).
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(mantisaTxt)) {
    throw new ErrorCalculo(TipoError.SINTAXIS);
  }
  // El exponente debe ser un entero (opcionalmente con signo) (Requirement 8.4).
  if (!/^[+-]?\d+$/.test(exponenteTxt)) {
    throw new ErrorCalculo(TipoError.SINTAXIS);
  }

  const mantisa = Number(mantisaTxt);
  const exponente = Number(exponenteTxt);

  // Validar rango del exponente: -99..99 (Requirements 8.3, 8.5).
  if (exponente < EXPONENTE_MIN || exponente > EXPONENTE_MAX) {
    throw new ErrorCalculo(TipoError.EXPONENTE_FUERA_RANGO);
  }

  return mantisa * Math.pow(10, exponente);
}

// Interpreta un literal numerico decimal simple (sin notacion EXP).
// Lanza ErrorCalculo(SINTAXIS) si el lexema no es un decimal valido.
function interpretarNumeroSimple(lexema) {
  if (!/^(\d+\.?\d*|\.\d+)$/.test(lexema)) {
    throw new ErrorCalculo(TipoError.SINTAXIS);
  }
  return Number(lexema);
}

// Escanea un literal numerico a partir de la posicion i (inclusive). Reconoce
// digitos, un punto decimal y, opcionalmente, la notacion EXP (`E` + exponente
// entero con signo opcional). Devuelve { lexema, fin } donde fin es el indice
// del primer caracter no consumido. No valida rango de exponente: eso se hace
// al calcular el valor en interpretarNumeroEXP.
function escanearNumero(texto, i) {
  let j = i;
  // Parte mantisa: digitos y a lo sumo un punto decimal.
  while (j < texto.length && /[0-9.]/.test(texto[j])) {
    j++;
  }
  // Parte exponente EXP: `E` seguida de un signo opcional y digitos.
  if (j < texto.length && texto[j] === "E") {
    j++;
    if (j < texto.length && (texto[j] === "+" || texto[j] === "-")) {
      j++;
    }
    while (j < texto.length && /[0-9]/.test(texto[j])) {
      j++;
    }
  }
  return { lexema: texto.slice(i, j), fin: j };
}

// Convierte la cadena de la Expresion en una lista de Token. Ignora los
// espacios en blanco. Lanza ErrorCalculo(SINTAXIS) ante lexemas no reconocidos
// o notacion EXP mal formada, y ErrorCalculo(EXPONENTE_FUERA_RANGO) cuando el
// exponente EXP queda fuera de -99..99.
//
// Ver design.md -> Motor_Calculo: Tokenizer y el modelo de datos Token.
// Requirements: 3.7, 4.2, 8.2, 8.3, 8.4, 8.5.
export function tokenizar(expresion) {
  const texto = String(expresion);
  const tokens = [];
  let i = 0;

  while (i < texto.length) {
    const c = texto[i];

    // Espacios en blanco: se ignoran.
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // Numero: comienza con un digito o con un punto decimal.
    if (/[0-9.]/.test(c)) {
      const { lexema, fin } = escanearNumero(texto, i);
      const valor = lexema.includes("E")
        ? interpretarNumeroEXP(lexema)
        : interpretarNumeroSimple(lexema);
      tokens.push({ tipo: TipoToken.NUMERO, lexema, valor });
      i = fin;
      continue;
    }

    // Parentesis.
    if (c === "(") {
      tokens.push({ tipo: TipoToken.PAREN_IZQ, lexema: c });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ tipo: TipoToken.PAREN_DER, lexema: c });
      i++;
      continue;
    }

    // Constante pi.
    if (c === CONSTANTE_PI) {
      tokens.push({
        tipo: TipoToken.CONSTANTE,
        lexema: c,
        valor: Math.PI,
      });
      i++;
      continue;
    }

    // Operadores binarios de un solo caracter.
    if (OPERADORES.has(c)) {
      tokens.push({ tipo: TipoToken.OPERADOR, lexema: c });
      i++;
      continue;
    }

    // Operadores postfijos multicaracter (x², x³, x⁻¹, %). Se prueban de mayor
    // a menor longitud para que `x⁻¹` no colisione con `x²`/`x³`.
    const postfijo = coincidePrefijo(texto, i, OPERADORES_POSTFIJOS);
    if (postfijo !== null) {
      tokens.push({ tipo: TipoToken.OPERADOR_POSTFIJO, lexema: postfijo });
      i += postfijo.length;
      continue;
    }

    // Funciones prefijas (sin, cos, tan, log, ln, √, ∛).
    const funcion = coincidePrefijo(texto, i, FUNCIONES_PREFIJAS);
    if (funcion !== null) {
      tokens.push({ tipo: TipoToken.FUNCION_PREFIJA, lexema: funcion });
      i += funcion.length;
      continue;
    }

    // Lexema no reconocido: error de sintaxis (Requirement 3.7).
    throw new ErrorCalculo(TipoError.SINTAXIS);
  }

  return tokens;
}

// Devuelve el lexema de `candidatos` que coincide con el texto a partir de la
// posicion i, probando los candidatos mas largos primero para evitar que un
// lexema que es prefijo de otro gane la coincidencia. Devuelve null si ninguno
// coincide.
function coincidePrefijo(texto, i, candidatos) {
  let mejor = null;
  for (const cand of candidatos) {
    if (texto.startsWith(cand, i)) {
      if (mejor === null || cand.length > mejor.length) {
        mejor = cand;
      }
    }
  }
  return mejor;
}

// =============================================================================
// Parser recursivo descendente (tarea 3.1)
// =============================================================================
//
// Transforma la lista de Token producida por tokenizar() en un arbol de
// sintaxis abstracta (NodoAST) codificando la precedencia de operadores en la
// estructura de la gramatica (design.md -> Motor_Calculo: Parser):
//
//   expresion   := terminoAdit
//   terminoAdit := terminoMult ( ("+"|"−") terminoMult )*
//   terminoMult := potencia ( ("×"|"÷") potencia )*
//   potencia    := unarioPost ( "^" unarioPost )*        // ^ asociativo a derecha
//   unarioPost  := unarioPre ( "x²"|"x³"|"x⁻¹"|"%" )*
//   unarioPre   := (funcion prefija) unarioPre | primario
//   primario    := NUMERO | CONSTANTE | "(" expresion ")"
//
// Nunca lanza excepciones no controladas hacia la UI: ante cualquier problema
// estructural lanza ErrorCalculo tipado:
//  - PARENTESIS: parentesis sin cerrar o cierre sobrante / mal anidado.
//  - SINTAXIS: entrada incompleta, vacia o tokens inesperados.
//
// Requirements: 3.5, 3.7, 4.1, 4.5.

// Formas de NodoAST producidas por el parser (ver design.md -> NodoAST).
function nodoNumero(valor) {
  return { clase: "numero", valor };
}
function nodoConstante(nombre) {
  return { clase: "constante", nombre };
}
function nodoBinario(op, izq, der) {
  return { clase: "binario", op, izq, der };
}
function nodoUnarioPre(fn, arg) {
  return { clase: "unarioPre", fn, arg };
}
function nodoUnarioPost(op, arg) {
  return { clase: "unarioPost", op, arg };
}

const OPERADORES_ADITIVOS = new Set(["+", "−"]);
const OPERADORES_MULTIPLICATIVOS = new Set(["×", "÷"]);

// Analiza sintacticamente la lista de Token y devuelve el NodoAST raiz.
// Lanza ErrorCalculo(SINTAXIS) ante entrada vacia, incompleta o tokens
// inesperados, y ErrorCalculo(PARENTESIS) ante parentesis descompensados.
//
// Requirements: 3.5, 3.7, 4.1, 4.5.
export function parsear(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    // Entrada vacia o ausente: expresion incompleta (Requirement 3.7).
    throw new ErrorCalculo(TipoError.SINTAXIS);
  }

  // Estado del parser: indice de lectura sobre la lista de tokens.
  const estado = { tokens, pos: 0 };

  const nodo = parsearExpresion(estado);

  // Tras consumir la expresion, no debe quedar ningun token sin procesar.
  if (estado.pos !== tokens.length) {
    const sobrante = estado.tokens[estado.pos];
    // Un parentesis de cierre sobrante es un desbalance de parentesis
    // (Requirement 4.5); cualquier otro token residual es sintaxis invalida.
    if (sobrante.tipo === TipoToken.PAREN_DER) {
      throw new ErrorCalculo(TipoError.PARENTESIS);
    }
    throw new ErrorCalculo(TipoError.SINTAXIS);
  }

  return nodo;
}

// Devuelve el token actual sin consumirlo, o null si se agotaron.
function actual(estado) {
  return estado.pos < estado.tokens.length ? estado.tokens[estado.pos] : null;
}

// expresion := terminoAdit
function parsearExpresion(estado) {
  return parsearTerminoAdit(estado);
}

// terminoAdit := terminoMult ( ("+"|"−") terminoMult )*
// Asociatividad a izquierda: se encadenan los operandos de izquierda a derecha.
function parsearTerminoAdit(estado) {
  let izq = parsearTerminoMult(estado);
  let tok = actual(estado);
  while (
    tok !== null &&
    tok.tipo === TipoToken.OPERADOR &&
    OPERADORES_ADITIVOS.has(tok.lexema)
  ) {
    estado.pos++;
    const der = parsearTerminoMult(estado);
    izq = nodoBinario(tok.lexema, izq, der);
    tok = actual(estado);
  }
  return izq;
}

// terminoMult := potencia ( ("×"|"÷") potencia )*
// Asociatividad a izquierda.
function parsearTerminoMult(estado) {
  let izq = parsearPotencia(estado);
  let tok = actual(estado);
  while (
    tok !== null &&
    tok.tipo === TipoToken.OPERADOR &&
    OPERADORES_MULTIPLICATIVOS.has(tok.lexema)
  ) {
    estado.pos++;
    const der = parsearPotencia(estado);
    izq = nodoBinario(tok.lexema, izq, der);
    tok = actual(estado);
  }
  return izq;
}

// potencia := unarioPost ( "^" unarioPost )*   // ^ asociativo a derecha
// La asociatividad a derecha se logra mediante recursion: tras consumir "^",
// el operando derecho vuelve a parsear una potencia completa.
function parsearPotencia(estado) {
  const base = parsearUnarioPost(estado);
  const tok = actual(estado);
  if (tok !== null && tok.tipo === TipoToken.OPERADOR && tok.lexema === "^") {
    estado.pos++;
    const exponente = parsearPotencia(estado);
    return nodoBinario("^", base, exponente);
  }
  return base;
}

// unarioPost := unarioPre ( "x²"|"x³"|"x⁻¹"|"%" )*
// Los operadores postfijos se aplican de izquierda a derecha sobre el operando.
function parsearUnarioPost(estado) {
  let arg = parsearUnarioPre(estado);
  let tok = actual(estado);
  while (tok !== null && tok.tipo === TipoToken.OPERADOR_POSTFIJO) {
    estado.pos++;
    arg = nodoUnarioPost(tok.lexema, arg);
    tok = actual(estado);
  }
  return arg;
}

// unarioPre := (funcion prefija) unarioPre | primario
// Una funcion prefija (sin, cos, ...) se aplica al resultado de parsear otro
// unarioPre, lo que permite encadenar prefijos (p. ej. sin cos 0).
function parsearUnarioPre(estado) {
  const tok = actual(estado);
  if (tok !== null && tok.tipo === TipoToken.FUNCION_PREFIJA) {
    estado.pos++;
    const arg = parsearUnarioPre(estado);
    return nodoUnarioPre(tok.lexema, arg);
  }
  return parsearPrimario(estado);
}

// primario := NUMERO | CONSTANTE | "(" expresion ")"
function parsearPrimario(estado) {
  const tok = actual(estado);
  if (tok === null) {
    // Se esperaba un operando pero la entrada termino (Requirement 3.7).
    throw new ErrorCalculo(TipoError.SINTAXIS);
  }

  if (tok.tipo === TipoToken.NUMERO) {
    estado.pos++;
    return nodoNumero(tok.valor);
  }

  if (tok.tipo === TipoToken.CONSTANTE) {
    estado.pos++;
    return nodoConstante(tok.lexema);
  }

  if (tok.tipo === TipoToken.PAREN_IZQ) {
    estado.pos++;
    const interno = parsearExpresion(estado);
    const cierre = actual(estado);
    if (cierre === null || cierre.tipo !== TipoToken.PAREN_DER) {
      // Parentesis de apertura sin su cierre correspondiente (Requirement 4.5).
      throw new ErrorCalculo(TipoError.PARENTESIS);
    }
    estado.pos++;
    return interno;
  }

  // Cualquier otro token en posicion de operando (operador binario sin
  // operando izquierdo, postfijo suelto, cierre inesperado) es sintaxis
  // invalida. Un cierre aqui indica desbalance de parentesis.
  if (tok.tipo === TipoToken.PAREN_DER) {
    throw new ErrorCalculo(TipoError.PARENTESIS);
  }
  throw new ErrorCalculo(TipoError.SINTAXIS);
}

// =============================================================================
// Evaluator del Motor_Calculo (tarea 4.1): aritmetica base, parentesis y
// precedencia.
// =============================================================================
//
// Recorre el NodoAST producido por parsear() y calcula su valor numerico sobre
// `Number` de JS. El pipeline completo es tokenizar -> parsear -> evaluarNodo.
//
// Alcance de esta tarea: operadores binarios aritmeticos (`+ − × ÷ ^`),
// literales numericos (`numero`), la constante `π` (`constante`), el operador
// postfijo de porcentaje `%` (`unarioPost`, tarea 6.1) y los parentesis (ya
// codificados en la estructura del AST por el parser). Los demas nodos
// cientificos (`unarioPre` para sin/cos/tan/log/ln/√/∛ y `unarioPost` para
// x²/x³/x⁻¹) se añadiran en tareas posteriores; el recorrido esta estructurado
// por `clase` de nodo para incorporarlos sin reescritura.
//
// Reglas de error de esta tarea:
//  - DIVISION_POR_CERO cuando el divisor de `÷` es 0.
//  - DESBORDAMIENTO cuando una operacion produce un resultado no finito
//    (`±Infinity` o `NaN`).
// El motor nunca lanza excepciones no controladas hacia la UI: cualquier fallo
// (incluidos los de tokenizar/parsear) se devuelve como ErrorCalculo tipado.
//
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 4.1.

// Aplica un operador binario aritmetico a dos operandos ya evaluados. Señala
// DIVISION_POR_CERO ante `÷` con divisor 0 (Requirement 3.6). El control de
// resultados no finitos (DESBORDAMIENTO) se realiza en evaluarNodo tras obtener
// el valor, de forma uniforme para todas las operaciones (Requirement 3.8).
function aplicarBinario(op, izq, der) {
  switch (op) {
    case "+":
      return izq + der;
    case "−":
      return izq - der;
    case "×":
      return izq * der;
    case "÷":
      if (der === 0) {
        throw new ErrorCalculo(TipoError.DIVISION_POR_CERO);
      }
      return izq / der;
    case "^":
      return Math.pow(izq, der);
    default:
      // Operador no soportado en el alcance actual: sintaxis invalida.
      throw new ErrorCalculo(TipoError.SINTAXIS);
  }
}

// Factor de conversion de grados sexagesimales a radianes: rad = grados × π/180
// (design.md -> Reglas de evaluacion; Requirement 5.4).
const GRADOS_A_RADIANES = Math.PI / 180;

// Umbral de normalizacion de resultados trigonometricos despreciables: los
// valores con |valor| < 1e-10 se muestran como 0 exacto (Requirement 5.6). El
// mismo umbral sirve para detectar que el coseno de un angulo es efectivamente
// cero (tan indefinida en 90° + 180°·k, Requirement 5.5).
const UMBRAL_CERO_TRIG = 1e-10;

// Evalua una funcion trigonometrica (sin/cos/tan) sobre un argumento en grados
// sexagesimales. Convierte a radianes antes de delegar en Math.* (Requirement
// 5.4). Para `tan` señala DOMINIO cuando el coseno del argumento es cero, es
// decir en 90° + 180°·k (Requirement 5.5). Normaliza a 0 exacto los resultados
// cuyo valor absoluto es menor que 1e-10 (Requirement 5.6).
//
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6.
function evaluarTrigonometrica(fn, grados) {
  const rad = grados * GRADOS_A_RADIANES;

  let valor;
  switch (fn) {
    case "sin":
      valor = Math.sin(rad);
      break;
    case "cos":
      valor = Math.cos(rad);
      break;
    case "tan":
      // tan no esta definida donde cos(argumento) = 0 (90° + 180°·k). Se
      // detecta comprobando que el coseno es efectivamente cero dentro del
      // umbral de tolerancia (Requirement 5.5).
      if (Math.abs(Math.cos(rad)) < UMBRAL_CERO_TRIG) {
        throw new ErrorCalculo(TipoError.DOMINIO);
      }
      valor = Math.tan(rad);
      break;
    default:
      throw new ErrorCalculo(TipoError.SINTAXIS);
  }

  // Normalizar resultados despreciables a 0 exacto (Requirement 5.6).
  if (Math.abs(valor) < UMBRAL_CERO_TRIG) {
    return 0;
  }
  return valor;
}

// Recorre recursivamente el NodoAST y devuelve su valor numerico. Lanza
// ErrorCalculo tipado ante divisiones por cero, resultados no finitos o nodos
// aun no soportados. La precedencia y la asociatividad ya estan codificadas en
// la estructura del arbol por el parser (Requirements 3.5, 4.1).
function evaluarNodo(nodo) {
  switch (nodo.clase) {
    case "numero":
      return nodo.valor;

    case "constante":
      // Unica constante del modelo: π -> Math.PI (Requirement 8.1).
      if (nodo.nombre === CONSTANTE_PI) {
        return Math.PI;
      }
      throw new ErrorCalculo(TipoError.SINTAXIS);

    case "binario": {
      const izq = evaluarNodo(nodo.izq);
      const der = evaluarNodo(nodo.der);
      const valor = aplicarBinario(nodo.op, izq, der);
      // Cualquier operacion que produzca un resultado no representable
      // (±Infinity o NaN) es un desbordamiento (Requirement 3.8).
      if (!Number.isFinite(valor)) {
        throw new ErrorCalculo(TipoError.DESBORDAMIENTO);
      }
      return valor;
    }

    case "unarioPost": {
      const arg = evaluarNodo(nodo.arg);
      let valor;
      switch (nodo.op) {
        // `%` divide el valor entre 100 (Requirement 4.4, tarea 6.1).
        case "%":
          valor = arg / 100;
          break;
        // x²: valor elevado al cuadrado (Requirement 7.1).
        case "x²":
          valor = arg ** 2;
          break;
        // x³: valor elevado al cubo (Requirement 7.2).
        case "x³":
          valor = arg ** 3;
          break;
        // x⁻¹: reciproco 1/valor. El inverso de 0 no esta definido: error de
        // division por cero (Requirements 7.3, 7.8).
        case "x⁻¹":
          if (arg === 0) {
            throw new ErrorCalculo(TipoError.DIVISION_POR_CERO);
          }
          valor = 1 / arg;
          break;
        default:
          throw new ErrorCalculo(TipoError.SINTAXIS);
      }
      // Resultado no finito tras la operacion: desbordamiento (Requirements
      // 3.8, 7.10).
      if (!Number.isFinite(valor)) {
        throw new ErrorCalculo(TipoError.DESBORDAMIENTO);
      }
      return valor;
    }

    // Funciones prefijas (sin/cos/tan/log/ln/√/∛). Esta tarea (6.3) implementa
    // las trigonometricas en grados (sin/cos/tan). Las restantes (log/ln/√/∛)
    // se añaden en la tarea 6.6; hasta entonces caen en el resguardo SINTAXIS
    // para no propagar excepciones no controladas.
    case "unarioPre": {
      const arg = evaluarNodo(nodo.arg);
      if (nodo.fn === "sin" || nodo.fn === "cos" || nodo.fn === "tan") {
        const valor = evaluarTrigonometrica(nodo.fn, arg);
        if (!Number.isFinite(valor)) {
          throw new ErrorCalculo(TipoError.DESBORDAMIENTO);
        }
        return valor;
      }
      // Logaritmos, raices y ∛ (tarea 6.6).
      let valor;
      switch (nodo.fn) {
        // log base 10 y ln base e exigen argumento > 0; en caso contrario,
        // error de dominio (Requirements 6.1, 6.2, 6.3).
        case "log":
          if (arg <= 0) {
            throw new ErrorCalculo(TipoError.DOMINIO);
          }
          valor = Math.log10(arg);
          break;
        case "ln":
          if (arg <= 0) {
            throw new ErrorCalculo(TipoError.DOMINIO);
          }
          valor = Math.log(arg);
          break;
        // √ exige argumento ≥ 0: negativo -> fuera de dominio real
        // (Requirements 7.4, 7.9).
        case "√":
          if (arg < 0) {
            throw new ErrorCalculo(TipoError.DOMINIO);
          }
          valor = Math.sqrt(arg);
          break;
        // ∛ admite valores negativos (Requirement 7.5).
        case "∛":
          valor = Math.cbrt(arg);
          break;
        default:
          throw new ErrorCalculo(TipoError.SINTAXIS);
      }
      // Resultado no finito tras la operacion: desbordamiento (Requirement 7.10).
      if (!Number.isFinite(valor)) {
        throw new ErrorCalculo(TipoError.DESBORDAMIENTO);
      }
      return valor;
    }

    default:
      throw new ErrorCalculo(TipoError.SINTAXIS);
  }
}

// Evalua una Expresion y devuelve un resultado tipado. Nunca lanza
// excepciones no controladas: cualquier fallo se devuelve como
// { ok:false, error: ErrorCalculo }.
//
// Pipeline: tokenizar(expresion) -> parsear(tokens) -> evaluarNodo(ast).
// Los errores de tokenizar/parsear (SINTAXIS, PARENTESIS, EXPONENTE_FUERA_RANGO)
// y los de evaluacion (DIVISION_POR_CERO, DESBORDAMIENTO) se capturan y se
// devuelven como ErrorCalculo tipado.
//
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 4.1.
export function evaluar(expresion) {
  try {
    const tokens = tokenizar(expresion);
    const ast = parsear(tokens);
    const valor = evaluarNodo(ast);
    if (!Number.isFinite(valor)) {
      throw new ErrorCalculo(TipoError.DESBORDAMIENTO);
    }
    return { ok: true, valor };
  } catch (e) {
    if (e instanceof ErrorCalculo) {
      return { ok: false, error: { tipo: e.tipo, mensaje: e.mensaje } };
    }
    // Resguardo: cualquier excepcion inesperada se traduce a SINTAXIS para
    // no propagar excepciones no controladas hacia la UI.
    const error = new ErrorCalculo(TipoError.SINTAXIS);
    return { ok: false, error: { tipo: error.tipo, mensaje: error.mensaje } };
  }
}
