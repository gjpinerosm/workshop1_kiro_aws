// Display Controller de la calculadora cientifica Casio fx-82MS (tarea 9.1).
//
// Deriva y escribe las dos lineas de la Pantalla a partir del CalculatorState:
//  - Linea_Superior: refleja la Expresion completa introducida por el usuario
//    (Requirements 2.1, 2.2).
//  - Linea_Inferior: muestra el Resultado formateado, el caracter "0" cuando no
//    hay ningun calculo previo o tras un borrado total, o el mensaje de error
//    del TipoError cuando la ultima evaluacion fallo (Requirements 2.2, 2.3,
//    2.4). La Linea_Inferior ya viene formateada en el estado (state.js la
//    produce con formatearResultado al pulsar `=`, o con el mensaje de error del
//    Motor_Calculo), de modo que el Display Controller la refleja sin volver a
//    decidir su contenido y no diverge de la semantica del estado.
//
// El modulo separa deliberadamente la derivacion pura de las lineas
// (derivarLineas) de la escritura en el DOM (renderizar). Asi la logica
// observable puede verificarse de forma aislada (unit/PBT) sin un DOM, mientras
// que renderizar se limita a volcar esas cadenas en los nodos de la Pantalla.
//
// DESPLAZAMIENTO Y NOTACION CIENTIFICA POR ANCHO (tarea 9.2): el Display
// Controller tambien gestiona el desbordamiento por ancho de ambas lineas
// cuando se le indica un ancho visible (numero de caracteres de la Pantalla):
//  - Linea_Superior: si la Expresion excede el ancho, se desplaza
//    horizontalmente mostrando una ventana de los ultimos caracteres y
//    manteniendo visible el cursor (Requirement 2.5).
//  - Linea_Inferior: si la representacion decimal del Resultado numerico excede
//    el ancho, se formatea en notacion cientifica dentro de ese ancho visible
//    (Requirement 2.6). Los mensajes de error y el "0" se muestran tal cual.
//
// El ancho es un parametro OPCIONAL. Cuando no se indica (o no es un entero
// positivo), derivarLineas conserva el comportamiento de la tarea 9.1 (lineas
// completas sin recorte), de modo que no se altera el contrato previo.
//
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6.

import { formatearResultado, EstadoError } from "./state.js";

// Deriva las dos lineas de la Pantalla a partir del estado. Funcion pura: no
// lee ni escribe el DOM y no muta el estado recibido.
//
// - lineaSuperior: la Expresion completa tal cual la tiene el estado. Si la
//   Expresion esta vacia, la linea superior es la cadena vacia (Pantalla vacia
//   al inicio, Requirement 1.3; reflejo de la Expresion, Requirements 2.1, 2.2).
// - lineaInferior: el contenido ya resuelto en el estado (Resultado formateado,
//   "0" sin calculo previo o el mensaje de error). Se normaliza a "0" solo como
//   salvaguarda si el estado llegara sin Linea_Inferior definida.
//
// Parametro opcional `ancho` (numero de caracteres visibles de la Pantalla):
//  - Si se indica un entero positivo y la Expresion excede ese ancho, la
//    Linea_Superior se recorta a una ventana de los ultimos caracteres que
//    mantiene visible el cursor (Requirement 2.5).
//  - Si se indica y la representacion decimal del Resultado numerico excede el
//    ancho, la Linea_Inferior se reformatea en notacion cientifica dentro del
//    ancho (Requirement 2.6). Los mensajes de error y el "0" quedan intactos.
//  - Si no se indica (o no es valido), se conserva el comportamiento de la
//    tarea 9.1: ambas lineas completas, sin recorte.
export function derivarLineas(estado, ancho) {
  const expresion = typeof estado?.expresion === "string" ? estado.expresion : "";
  const inferiorEstado =
    typeof estado?.lineaInferior === "string" && estado.lineaInferior.length > 0
      ? estado.lineaInferior
      : "0";

  if (!esAnchoValido(ancho)) {
    // Sin ancho visible definido: lineas completas (contrato de la tarea 9.1).
    return { lineaSuperior: expresion, lineaInferior: inferiorEstado };
  }

  const lineaSuperior = ventanaLineaSuperior(expresion, posicionCursor(estado), ancho);

  // La notacion cientifica solo aplica a un Resultado numerico valido: ni los
  // mensajes de error (estadoError != NINGUNO) ni el "0" inicial/sin calculo se
  // reformatean (Requirement 2.6; se muestran tal cual).
  let lineaInferior = inferiorEstado;
  if (esResultadoNumerico(estado) && inferiorEstado !== "0") {
    lineaInferior = formatearLineaInferiorAncho(estado.ans, ancho);
  }

  return { lineaSuperior, lineaInferior };
}

// Devuelve la ventana visible de la Linea_Superior para un ancho dado.
//
// Si la Expresion cabe en `ancho` (o el ancho no es valido), devuelve la
// Expresion completa. En caso contrario desplaza horizontalmente devolviendo
// una subcadena de exactamente `ancho` caracteres que mantiene visible la
// posicion del cursor: la ventana termina en el cursor cuando este esta al
// final (se ven los ultimos caracteres introducidos, Requirement 2.5) y se
// ajusta hacia la derecha si el cursor cae antes del inicio de la ventana.
export function ventanaLineaSuperior(expresion, cursor, ancho) {
  const texto = typeof expresion === "string" ? expresion : "";
  if (!esAnchoValido(ancho) || texto.length <= ancho) {
    return texto;
  }

  const n = texto.length;
  // Posicion del cursor normalizada al rango [0, n].
  let pos = Number.isInteger(cursor) ? cursor : n;
  if (pos < 0) pos = 0;
  if (pos > n) pos = n;

  // Por defecto, anclar la ventana al final para ver los ultimos caracteres.
  let fin = n;
  // Mantener el cursor visible dentro de la ventana [inicio, fin].
  // El cursor es visible si inicio <= pos <= fin. Si el cursor esta a la
  // izquierda del inicio, desplazar la ventana para que empiece en el cursor.
  if (pos < fin - ancho) {
    fin = pos + ancho;
  }
  // Si el cursor esta mas alla del fin anclado (no ocurre con fin=n), ajustar.
  if (pos > fin) {
    fin = pos;
  }
  const inicio = fin - ancho;
  return texto.slice(inicio, fin);
}

// Formatea un Resultado numerico para que quepa en `ancho` caracteres.
//
// Si la representacion decimal canonica (formatearResultado) cabe en el ancho,
// se devuelve tal cual. En caso contrario se usa notacion cientifica
// (toExponential) reduciendo los decimales de la mantisa hasta que la cadena
// no exceda el ancho visible (Requirement 2.6). Valores no finitos o el cero se
// devuelven con su representacion canonica ("0").
export function formatearLineaInferiorAncho(valor, ancho) {
  const decimal = formatearResultado(valor);
  if (!esAnchoValido(ancho) || decimal.length <= ancho) {
    return decimal;
  }
  if (!Number.isFinite(valor) || valor === 0) {
    // "0" / salvaguarda: no tiene sentido una notacion cientifica.
    return decimal;
  }
  return notacionCientificaEnAncho(valor, ancho);
}

// Escribe las dos lineas derivadas del estado en los nodos del DOM indicados.
//
// `domRefs` debe aportar los nodos de la Linea_Superior y la Linea_Inferior.
// Se aceptan los nombres { lineaSuperior, lineaInferior } (los esperados) y, por
// comodidad, sus alias { superior, inferior }. El contenido se escribe con
// textContent para evitar interpretacion de HTML.
//
// renderizar es el unico punto que toca el DOM; toda la decision de que mostrar
// vive en derivarLineas (puro), de modo que esta funcion no contiene logica
// observable mas alla del volcado.
export function renderizar(estado, domRefs, ancho) {
  const { lineaSuperior, lineaInferior } = derivarLineas(estado, ancho);
  const nodoSuperior = domRefs?.lineaSuperior ?? domRefs?.superior;
  const nodoInferior = domRefs?.lineaInferior ?? domRefs?.inferior;
  if (nodoSuperior) {
    nodoSuperior.textContent = lineaSuperior;
  }
  if (nodoInferior) {
    nodoInferior.textContent = lineaInferior;
  }
}

// Reexporta la regla de formato del Resultado para que otros consumidores del
// Display Controller (p. ej. la tarea 9.2 de notacion cientifica) partan de la
// misma representacion numerica canonica usada por el estado, con al menos 10
// digitos significativos y sin ceros no significativos.
export { formatearResultado };

// -----------------------------------------------------------------------------
// Auxiliares puros (tarea 9.2)
// -----------------------------------------------------------------------------

// Un ancho visible valido es un entero estrictamente positivo (numero de
// caracteres). Cualquier otro valor (undefined, 0, negativo, no entero) hace
// que el Display Controller no aplique recorte ni notacion cientifica.
function esAnchoValido(ancho) {
  return Number.isInteger(ancho) && ancho > 0;
}

// Normaliza la posicion del cursor del estado al rango [0, longitud]. Si el
// estado no aporta un cursor entero, se asume el final de la Expresion.
function posicionCursor(estado) {
  const n = typeof estado?.expresion === "string" ? estado.expresion.length : 0;
  const c = Number.isInteger(estado?.cursor) ? estado.cursor : n;
  if (c < 0) return 0;
  if (c > n) return n;
  return c;
}

// Un estado representa un Resultado numerico mostrable cuando la ultima
// evaluacion tuvo exito: hay Resultado previo y no hay error vigente. En ese
// caso estado.ans contiene el valor numerico del Resultado (state.js lo
// almacena al aplicar `=`).
function esResultadoNumerico(estado) {
  return (
    estado?.tieneResultado === true &&
    estado?.estadoError === EstadoError.NINGUNO &&
    typeof estado?.ans === "number" &&
    Number.isFinite(estado.ans)
  );
}

// Produce la notacion cientifica de `valor` cuya longitud no excede `ancho`.
// Parte del maximo numero de decimales que cabe y lo reduce hasta encajar;
// como ultimo recurso usa toExponential() por defecto. El resultado conserva
// tantas cifras significativas como permita el ancho visible.
function notacionCientificaEnAncho(valor, ancho) {
  // Cota superior razonable de decimales: toExponential admite 0..100.
  const maxDecimales = Math.min(100, Math.max(0, ancho));
  for (let d = maxDecimales; d >= 0; d--) {
    const candidato = normalizarExponencial(valor.toExponential(d));
    if (candidato.length <= ancho) {
      return candidato;
    }
  }
  // Minimo posible: mantisa de una cifra. Puede exceder el ancho si este es muy
  // pequeño (p. ej. no caben ni "1e+5"); se devuelve la forma mas compacta.
  return normalizarExponencial(valor.toExponential(0));
}

// Normaliza la cadena de toExponential para compactarla sin perder informacion:
// elimina el signo `+` del exponente y los ceros a la izquierda del exponente
// ("1.2e+05" -> "1.2e5", "3e-07" -> "3e-7"). No altera la mantisa.
function normalizarExponencial(cadena) {
  return cadena.replace(/e([+-])(\d+)/i, (_m, signo, digitos) => {
    const exp = digitos.replace(/^0+(?=\d)/, "");
    return signo === "-" ? `e-${exp}` : `e${exp}`;
  });
}
