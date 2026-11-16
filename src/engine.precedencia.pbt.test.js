// Feature: scientific-calculator, Property 1: La evaluacion aritmetica respeta
// la precedencia de operadores.
//
// Para toda Expresion aritmetica valida compuesta por numeros, `+ − × ÷`,
// potencia `^` y parentesis, el Resultado del Motor_Calculo coincide, dentro de
// una tolerancia de 10 cifras significativas, con el valor producido por un
// evaluador de referencia que aplica la precedencia estandar (`×`/`÷` antes de
// `+`/`−`, `^` asociativo a derecha, igual precedencia de izquierda a derecha y
// parentesis mas internos primero).
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1
//
// Estrategia: en lugar de generar cadenas y re-parsearlas, se genera un arbol
// de expresion aleatorio cuya ESTRUCTURA codifica la precedencia deseada. De
// ese mismo arbol se derivan dos cosas independientes:
//   1) un valor de referencia, calculado recorriendo el arbol (la precedencia
//      ya esta fijada por su forma, sin depender del parser del motor); y
//   2) una cadena de Expresion con PARENTESIS MINIMOS, es decir, se omiten los
//      parentesis alla donde la precedencia/asociatividad estandar reconstruye
//      la misma estructura. Asi el motor debe recuperar el arbol original solo
//      a partir de las reglas de precedencia, que es justamente lo que se
//      prueba. La cadena usa los glifos del motor (× ÷ − , no ASCII).
//
// Para que la comparacion sea unicamente sobre precedencia, se descartan
// (fc.pre) los arboles cuya evaluacion de referencia tope con division por
// cero, con un resultado intermedio/final no finito (desbordamiento) o con un
// `^` que produzca un numero complejo (base negativa con exponente no entero,
// que en el motor da NaN). Esos subdominios los cubren otras propiedades
// (Property 10 y Property 14).

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar } from "./engine.js";

// --- Niveles de precedencia (mayor numero = mayor precedencia) -------------
// Coinciden con la gramatica del motor: aditivos < multiplicativos < potencia.
const PREC = Object.freeze({ "+": 1, "−": 1, "×": 2, "÷": 2, "^": 3 });

// --- Evaluador de referencia -----------------------------------------------
// Recorre el arbol aplicando cada operador. La precedencia NO se decide aqui:
// ya esta codificada en la forma del arbol que entrega el generador.
function evaluarRef(nodo) {
  if (nodo.tipo === "num") {
    return nodo.valor;
  }
  const izq = evaluarRef(nodo.izq);
  const der = evaluarRef(nodo.der);
  switch (nodo.op) {
    case "+":
      return izq + der;
    case "−":
      return izq - der;
    case "×":
      return izq * der;
    case "÷":
      return izq / der;
    case "^":
      return Math.pow(izq, der);
    default:
      throw new Error(`operador de referencia no soportado: ${nodo.op}`);
  }
}

// --- Serializacion a cadena con parentesis minimos -------------------------
// Inserta un parentesis alrededor de un hijo solo cuando la precedencia o la
// asociatividad estandar, sin ese parentesis, agruparian de forma distinta a
// la del arbol. De este modo la cadena resultante es "natural" (como la
// teclearia un usuario) y el motor debe reconstruir la agrupacion por sus
// reglas de precedencia.
function serializar(nodo) {
  if (nodo.tipo === "num") {
    return formatearNumero(nodo.valor);
  }

  const op = nodo.op;
  const precPadre = PREC[op];

  // Asociatividad estandar: + − × ÷ a izquierda; ^ a derecha.
  const asociaDerecha = op === "^";

  const txtIzq = envolverSiHaceFalta(nodo.izq, precPadre, !asociaDerecha);
  const txtDer = envolverSiHaceFalta(nodo.der, precPadre, asociaDerecha);

  return `${txtIzq}${op}${txtDer}`;
}

// Serializa un hijo y lo envuelve entre parentesis solo si es imprescindible.
// `esLadoAsociativo` indica si el hijo ocupa el lado hacia el que asocia el
// operador padre (izquierda para operadores a izquierda; derecha para `^`).
function envolverSiHaceFalta(hijo, precPadre, esLadoAsociativo) {
  const txt = serializar(hijo);
  if (hijo.tipo === "num") {
    return txt;
  }
  const precHijo = PREC[hijo.op];

  // Menor precedencia que el padre: siempre requiere parentesis.
  if (precHijo < precPadre) {
    return `(${txt})`;
  }
  // Igual precedencia: el lado asociativo puede ir sin parentesis; el lado no
  // asociativo debe envolverse para preservar el agrupamiento del arbol
  // (p. ej. en a−(b−c) o en a^(b^c) cuando el arbol lo exige).
  if (precHijo === precPadre && !esLadoAsociativo) {
    return `(${txt})`;
  }
  return txt;
}

// Formatea un literal numerico tal como lo aceptaria el tokenizer del motor:
// decimal plano, sin signo inicial (la gramatica no define el menos unario) y
// sin notacion cientifica de JS.
function formatearNumero(v) {
  // Los generadores producen enteros pequenos no negativos y decimales con un
  // unico punto, de modo que String() ya da una forma valida y plana.
  return String(v);
}

// --- Generador de arboles de expresion -------------------------------------
// Genera arboles cuya forma codifica una precedencia/asociatividad arbitraria
// (incluyendo agrupamientos que en texto solo se logran con parentesis).
const OPERADORES = ["+", "−", "×", "÷", "^"];

// Operando: enteros pequenos o decimales con un solo punto, todos >= 1 para
// alejarnos de divisiones por cero y de ceros problematicos en `^`.
const genNumero = fc
  .oneof(
    fc.integer({ min: 1, max: 20 }).map((n) => ({ tipo: "num", valor: n })),
    fc
      .tuple(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 9 }))
      .map(([e, d]) => ({ tipo: "num", valor: Number(`${e}.${d}`) }))
  );

// Arbol recursivo con profundidad acotada para evitar expresiones gigantes.
const genArbol = fc.letrec((tie) => ({
  nodo: fc.oneof(
    { depthSize: "small", withCrossShrink: true },
    genNumero,
    fc
      .tuple(fc.constantFrom(...OPERADORES), tie("nodo"), tie("nodo"))
      .map(([op, izq, der]) => ({ tipo: "op", op, izq, der }))
  ),
})).nodo;

// --- Tolerancia de 10 cifras significativas --------------------------------
// Comparacion relativa: |a-b| <= tol * max(1, |a|, |b|). Con tol = 1e-10 se
// exigen ~10 cifras significativas coincidentes, acomodando el redondeo de
// IEEE-754 que comparten el motor y la referencia.
function cercaDiezCifras(a, b) {
  const escala = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-10 * escala;
}

describe("Property 1: La evaluacion aritmetica respeta la precedencia de operadores", () => {
  it("evaluar(expresion) coincide con el evaluador de referencia dentro de 10 cifras significativas", () => {
    fc.assert(
      fc.property(genArbol, (arbol) => {
        // Valor de referencia; se exige que toda la evaluacion sea finita y
        // sin divisiones por cero ni `^` complejo. Si no, el caso pertenece a
        // otro subdominio (division por cero / desbordamiento) y se descarta
        // para aislar la precedencia.
        const esperado = evaluarRefSeguro(arbol);
        fc.pre(esperado !== null);

        const expresion = serializar(arbol);

        // El motor nunca debe lanzar: devuelve un resultado tipado.
        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        // Dentro del subdominio elegido, la evaluacion debe tener exito y
        // coincidir con la referencia (misma precedencia/asociatividad).
        expect(resultado.ok).toBe(true);
        expect(cercaDiezCifras(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});

// Evalua la referencia controlando los subdominios que esta propiedad excluye.
// Devuelve el valor numerico, o null si el arbol cae en division por cero,
// resultado no finito o `^` de base negativa con exponente no entero.
function evaluarRefSeguro(nodo) {
  if (nodo.tipo === "num") {
    return nodo.valor;
  }
  const izq = evaluarRefSeguro(nodo.izq);
  if (izq === null) return null;
  const der = evaluarRefSeguro(nodo.der);
  if (der === null) return null;

  if (nodo.op === "÷" && der === 0) {
    return null; // division por cero -> Property 10
  }
  if (nodo.op === "^" && izq < 0 && !Number.isInteger(der)) {
    return null; // potencia compleja -> el motor daria NaN (fuera de alcance)
  }
  const valor = evaluarRef(nodo);
  if (!Number.isFinite(valor)) {
    return null; // desbordamiento -> Property 14
  }
  return valor;
}
