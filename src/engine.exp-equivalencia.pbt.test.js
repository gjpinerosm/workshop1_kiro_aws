// Feature: scientific-calculator, Property 8: La notación exponencial equivale
// a M × 10^N.
//
// Para toda mantisa M y todo exponente entero N en el rango −99..99, interpretar
// la notación EXP `M E N` produce el valor M × 10^N dentro de una tolerancia de
// 10 cifras significativas.
//
// Validates: Requirements 8.2, 8.3
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones) y comparación
// por oráculo con tolerancia relativa de 10 cifras significativas. El valor de
// la notación EXP se observa a través del NÚMERO que produce el Tokenizer
// (tarea 2.1): `tokenizar("M E N")` genera un único Token NÚMERO cuyo `valor`
// es la interpretación numérica de la mantisa por diez elevado al exponente.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { tokenizar, TipoToken } from "./engine.js";

// Tolerancia relativa equivalente a 10 cifras significativas: dos valores se
// consideran iguales si su diferencia relativa es menor que 10^-10. Cuando el
// oráculo es 0 la comparación es exacta (M = 0 => M × 10^N = 0).
const TOLERANCIA_RELATIVA = 1e-10;

function coincideConTolerancia(actual, esperado) {
  if (esperado === 0) {
    return actual === 0;
  }
  return Math.abs(actual - esperado) / Math.abs(esperado) < TOLERANCIA_RELATIVA;
}

describe("Property 8: La notación exponencial equivale a M × 10^N", () => {
  it("tokenizar(`M E N`) produce un NÚMERO cuyo valor es M × 10^N (tolerancia 10 cifras)", () => {
    // Generador de mantisas M tal como las escanea el Tokenizer: un literal
    // decimal plano (parte entera y, opcionalmente, fracción). El escáner de
    // números arranca en un dígito o un punto y no absorbe un signo inicial (la
    // negación sería un OPERADOR independiente), por lo que la mantisa que
    // precede a `E` no lleva signo. Se evita la notación científica de JS para
    // no introducir una segunda `E` en la Expresión `M E N`.
    const mantisa = fc
      .tuple(
        fc.integer({ min: 0, max: 999999 }), // parte entera
        fc.option(fc.integer({ min: 0, max: 999999 }), { nil: null }) // fracción
      )
      .map(([entero, fraccion]) =>
        fraccion === null ? `${entero}` : `${entero}.${fraccion}`
      );

    // Generador de exponentes enteros N dentro del rango permitido −99..99
    // (Requirement 8.3).
    const exponente = fc.integer({ min: -99, max: 99 });

    fc.assert(
      fc.property(mantisa, exponente, (M, N) => {
        // Construir la Expresión `M E N` (la tecla EXP inserta `E`).
        const expresion = `${M}E${N}`;

        // El Tokenizer produce un único NÚMERO con el valor interpretado.
        const tokens = tokenizar(expresion);
        expect(tokens).toHaveLength(1);
        expect(tokens[0].tipo).toBe(TipoToken.NUMERO);

        // Oráculo: M × 10^N calculado de forma independiente.
        const esperado = Number(M) * Math.pow(10, N);

        expect(coincideConTolerancia(tokens[0].valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
