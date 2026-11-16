// Feature: scientific-calculator, Property 19: Insertar Ans coloca el ultimo
// Resultado en el cursor.
//
// Para todo estado con un Resultado previo `r` (valor de Ans) y un cursor en la
// posicion `p`, pulsar `Ans` inserta la representacion numerica de `r` en la
// posicion `p` de la Expresion y avanza el cursor hasta despues del texto
// insertado.
//
// Validates: Requirements 9.4
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Construye
// estados con un `ans` arbitrario `r`, una Expresion arbitraria y una posicion
// de cursor `p` dentro del rango valido, invoca `insertarAns` y verifica que la
// Expresion resultante es `antes[0:p] + repr(r) + antes[p:]`, donde `repr(r)`
// es la misma representacion numero->cadena que usa el modulo (String del valor
// finito, o "0" si no es finito). TEST-ONLY: no se modifica src/state.js.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { estadoInicial, insertarAns } from "./state.js";

// Reproduce la representacion numero->cadena que usa src/state.js (formatearAns):
// la representacion decimal estandar de JS, normalizando valores no finitos a 0.
function reprAns(ans) {
  const valor = Number.isFinite(ans) ? ans : 0;
  return String(valor);
}

describe("Property 19: Insertar Ans coloca el ultimo Resultado en el cursor", () => {
  it("inserta la representacion numerica de `r` en la posicion `p` del cursor", () => {
    // Generador de valores de Ans `r`: incluye enteros, decimales y casos
    // limite (0, negativos, no finitos) para ejercitar la representacion.
    const ansArb = fc.oneof(
      fc.integer({ min: -1_000_000, max: 1_000_000 }),
      fc.double({ min: -1e6, max: 1e6, noNaN: false }),
      fc.constantFrom(0, -0, Infinity, -Infinity, NaN)
    );

    // Generador de Expresiones arbitrarias (cualquier cadena, incluida vacia).
    const expresionArb = fc.string();

    fc.assert(
      fc.property(ansArb, expresionArb, fc.double({ min: 0, max: 1, noNaN: true }), (r, expresion, frac) => {
        // Posicion de cursor `p` dentro del rango valido [0, longitud].
        // Posicion valida [0, longitud]; Math.min evita el desborde cuando frac===1.
        const p = Math.min(expresion.length, Math.floor(frac * (expresion.length + 1)));

        const estado = {
          ...estadoInicial(),
          expresion,
          cursor: p,
          ans: r,
          tieneResultado: true,
        };

        const siguiente = insertarAns(estado);

        const repr = reprAns(r);
        const esperado =
          expresion.slice(0, p) + repr + expresion.slice(p);

        // La Expresion inserta repr(r) exactamente en la posicion del cursor.
        expect(siguiente.expresion).toBe(esperado);
        // El cursor avanza hasta despues del texto insertado.
        expect(siguiente.cursor).toBe(p + repr.length);
        // Insertar Ans no modifica el valor de Ans (Object.is trata NaN como
        // igual a NaN; el generador incluye NaN como caso limite de Ans).
        expect(Object.is(siguiente.ans, r)).toBe(true);
        // El estado original no se muta (transicion pura).
        expect(estado.expresion).toBe(expresion);
        expect(estado.cursor).toBe(p);
      }),
      { numRuns: 200 }
    );
  });
});
