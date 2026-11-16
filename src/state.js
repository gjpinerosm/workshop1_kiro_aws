// Estado central y transiciones puras de la calculadora cientifica (tarea 8.1).
//
// Este modulo define el modelo CalculatorState (design.md -> Data Models) y las
// transiciones puras que lo manipulan. Todas las funciones son puras: no mutan
// el estado recibido ni dependen del DOM; devuelven un nuevo CalculatorState.
// Esto permite verificar las transiciones de forma aislada con pruebas basadas
// en propiedades (fast-check) y reutilizarlas desde el Input Handler embebido
// en index.html.
//
// El Motor_Calculo puro vive en engine.js y se invoca unicamente al aplicar `=`
// (aplicarIgual). Al tener exito, el Resultado se almacena como nuevo Ans
// (Requirement 9.6); al fallar, se conservan Ans y la Linea_Inferior previa
// (Requirements 9.7, 2.3).
//
// Requirements: 2.2, 2.3, 4.2, 4.3, 9.1, 9.2, 9.4, 9.5, 9.6, 9.7.

import { evaluar, TipoError } from "./engine.js";

// Valor de estadoError cuando no hay ningun error vigente. El resto de valores
// posibles coinciden con los TipoError del Motor_Calculo (design.md ->
// EstadoError: "NINGUNO o el tipo de error vigente").
export const EstadoError = Object.freeze({
  NINGUNO: "NINGUNO",
  ...TipoError,
});

// Linea_Inferior inicial y tras un borrado total (AC): el caracter cero (0)
// (Requirements 2.4, 9.1).
const LINEA_INFERIOR_CERO = "0";

// Devuelve el CalculatorState inicial de la sesion: Expresion vacia, cursor al
// inicio, Linea_Inferior "0", Ans 0, sin Resultado previo y sin error
// (Requirements 2.4, 9.5; design.md -> CalculatorState).
export function estadoInicial() {
  return {
    expresion: "",
    cursor: 0,
    lineaInferior: LINEA_INFERIOR_CERO,
    ans: 0,
    tieneResultado: false,
    estadoError: EstadoError.NINGUNO,
  };
}

// Inserta `texto` en la posicion del cursor dentro de la Expresion y avanza el
// cursor hasta despues del texto insertado. No invoca al Motor_Calculo ni
// modifica Ans. Limpia el estado de error (el usuario ha vuelto a editar la
// Expresion), pero conserva la Linea_Inferior previa.
//
// Es la transicion generica para digitos, operadores, parentesis, π, EXP y
// funciones (design.md -> Input Handler). El separador decimal usa su propia
// transicion insertarDecimal por la validacion de un unico `.`.
//
// Requirements: 2.1 (reflejo de la Expresion), base de 4.2.
export function insertarToken(estado, texto) {
  const cursor = posicionCursor(estado);
  const expresion =
    estado.expresion.slice(0, cursor) + texto + estado.expresion.slice(cursor);
  return {
    ...estado,
    expresion,
    cursor: cursor + texto.length,
    estadoError: EstadoError.NINGUNO,
  };
}

// Inserta el Separador_Decimal punto (.) en la posicion del cursor solo si el
// numero en construccion alrededor del cursor aun no contiene un `.`. Si el
// numero ya tiene un punto, ignora la pulsacion y devuelve el estado sin
// cambios (Requirements 4.2, 4.3).
//
// El "numero en construccion" se detecta explorando a izquierda y derecha del
// cursor a traves de digitos y puntos (segmento numerico contiguo). Asi, en
// "12|3" el segmento es "123"; en "1.2+|3" el segmento del cursor es "3".
export function insertarDecimal(estado) {
  const cursor = posicionCursor(estado);
  if (segmentoNumericoTienePunto(estado.expresion, cursor)) {
    // El numero ya contiene un separador decimal: ignorar (Requirement 4.3).
    return estado;
  }
  return insertarToken(estado, ".");
}

// DEL: elimina el caracter inmediatamente anterior al cursor. Si la Expresion
// esta vacia, no cambia nada y no modifica la Linea_Inferior (Requirements 9.2,
// 9.3). No invoca al Motor_Calculo ni modifica Ans.
export function del(estado) {
  // Expresion vacia: mantener todo sin cambios, incluida la Linea_Inferior
  // (Requirement 9.3).
  if (estado.expresion.length === 0) {
    return estado;
  }
  const cursor = posicionCursor(estado);
  // Nada que borrar a la izquierda del cursor (cursor al inicio): sin cambios.
  if (cursor === 0) {
    return estado;
  }
  const expresion =
    estado.expresion.slice(0, cursor - 1) + estado.expresion.slice(cursor);
  return {
    ...estado,
    expresion,
    cursor: cursor - 1,
    estadoError: EstadoError.NINGUNO,
  };
}

// AC (borrar todo): vacia la Expresion, situa el cursor al inicio, pone "0" en
// la Linea_Inferior y devuelve Ans a 0, limpiando el estado de error y el
// indicador de Resultado previo (Requirements 9.1, 9.5).
export function ac() {
  return estadoInicial();
}

// Ans: inserta la representacion numerica del ultimo Resultado calculado en la
// posicion del cursor. Si no hay Resultado previo, el valor de Ans es 0
// (Requirements 9.4, 9.5).
export function insertarAns(estado) {
  return insertarToken(estado, formatearAns(estado.ans));
}

// `=`: invoca al Motor_Calculo sobre la Expresion actual.
//  - Exito: mantiene la Expresion intacta, muestra el Resultado formateado en
//    la Linea_Inferior, almacena el Resultado como nuevo Ans y marca que hay
//    Resultado (Requirements 2.2, 9.6).
//  - Fallo: mantiene la Expresion intacta, conserva Ans, fija el estadoError y
//    muestra el mensaje de error en la Linea_Inferior (la Linea_Inferior previa
//    se sustituye unicamente por la indicacion de error) (Requirements 2.3,
//    9.7).
export function aplicarIgual(estado) {
  const resultado = evaluar(estado.expresion);

  if (resultado.ok) {
    return {
      ...estado,
      lineaInferior: formatearResultado(resultado.valor),
      ans: resultado.valor,
      tieneResultado: true,
      estadoError: EstadoError.NINGUNO,
    };
  }

  // Fallo: Expresion y Ans sin modificar; se muestra la indicacion de error.
  return {
    ...estado,
    ans: estado.ans,
    tieneResultado: estado.tieneResultado,
    estadoError: resultado.error.tipo,
    lineaInferior: resultado.error.mensaje,
  };
}

// Teclas decorativas (SHIFT, ALPHA, MODE, RCL, nCr, hyp): transicion de accion
// nula. Devuelve el CalculatorState recibido sin cambio alguno y, al no invocar
// al Motor_Calculo ni tocar la Expresion/Linea_Inferior/Ans, cumple que pulsar
// una Tecla_Decorativa deja el estado identico (design.md -> "teclas
// decorativas -> accion nula"; Requirements 10.2, 10.3, 10.4). El cableado
// real de estas teclas a esta transicion se realiza en manejarTecla (tarea
// 11.1); aqui se expone unicamente la transicion pura.
export function teclaDecorativa(estado) {
  return estado;
}

// -----------------------------------------------------------------------------
// Auxiliares puros
// -----------------------------------------------------------------------------

// Normaliza la posicion del cursor al rango valido [0, longitud] de la
// Expresion. Protege las transiciones ante un cursor fuera de rango.
function posicionCursor(estado) {
  const n = estado.expresion.length;
  const c = Number.isInteger(estado.cursor) ? estado.cursor : n;
  if (c < 0) return 0;
  if (c > n) return n;
  return c;
}

// Determina si el segmento numerico contiguo que rodea la posicion `cursor` ya
// contiene un separador decimal `.`. El segmento numerico se define como la
// secuencia maxima de digitos y puntos que incluye la posicion de insercion:
// se explora hacia la izquierda desde cursor-1 y hacia la derecha desde cursor
// mientras los caracteres sean digitos o `.`.
function segmentoNumericoTienePunto(expresion, cursor) {
  // Explorar hacia la izquierda del punto de insercion.
  let i = cursor - 1;
  while (i >= 0 && esCaracterNumerico(expresion[i])) {
    if (expresion[i] === ".") return true;
    i--;
  }
  // Explorar hacia la derecha del punto de insercion.
  let j = cursor;
  while (j < expresion.length && esCaracterNumerico(expresion[j])) {
    if (expresion[j] === ".") return true;
    j++;
  }
  return false;
}

// Un caracter pertenece a un segmento numerico si es un digito o el separador
// decimal. (La notacion EXP introduce `E` y signos, pero el separador decimal
// solo aplica a la mantisa/digitos contiguos; mantener el segmento en digitos y
// `.` basta para la regla de un unico `.` por numero, Requirements 4.2, 4.3.)
function esCaracterNumerico(c) {
  return c === "." || (c >= "0" && c <= "9");
}

// Formatea el valor de Ans para insertarlo como texto en la Expresion. Usa la
// representacion decimal estandar de JS (sin ceros ni formato cientifico
// superfluo) adecuada para volver a tokenizarse como NUMERO.
function formatearAns(ans) {
  const valor = Number.isFinite(ans) ? ans : 0;
  return String(valor);
}

// Formatea el Resultado para mostrarlo en la Linea_Inferior con al menos 10
// digitos significativos, recortando ceros no significativos. El Display
// Controller (tarea 9.x) puede aplicar despues notacion cientifica por ancho;
// aqui se produce la representacion numerica canonica del Resultado.
//
// Se exporta para que el Display Controller (src/display.js) reutilice la misma
// regla de formato y no diverja de la Linea_Inferior ya almacenada en el estado.
export function formatearResultado(valor) {
  if (!Number.isFinite(valor)) {
    // No deberia ocurrir (evaluar ya señala DESBORDAMIENTO), pero se protege.
    return LINEA_INFERIOR_CERO;
  }
  if (valor === 0) {
    // Evita "-0" y normaliza el cero exacto.
    return LINEA_INFERIOR_CERO;
  }
  // toPrecision(12) garantiza >= 10 cifras significativas; Number() recorta los
  // ceros no significativos de la representacion.
  return String(Number(valor.toPrecision(12)));
}
