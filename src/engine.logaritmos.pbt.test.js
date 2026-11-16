// Feature: scientific-calculator, Property 5: Los logaritmos coinciden con su
// oraculo. Para todo valor v > 0, evaluar `log v` coincide con Math.log10(v) y
// evaluar `ln v` coincide con Math.log(v), ambos con una precision de al menos
// 10 cifras significativas.
//
// Validates: Requirements 6.1, 6.2
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera
// valores v > 0 cubriendo magnitudes pequenas y grandes, construye la
// Expresion con los glifos del motor (`log v`, `ln v`) y compara el Resultado
// del Motor_Calculo contra los oraculos Math.log10 / Math.log usando una
// tolerancia relativa correspondiente a ~10 cifras significativas.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar } from "./engine.js";

// Tolerancia relativa para 10 cifras significativas. Dos valores coinciden a 10
// cifras significativas cuando su diferencia absoluta es menor que 10^-10 veces
// la magnitud del valor de referencia (con un piso absoluto para el caso en que
// el oraculo sea 0, p. ej. log(1) = 0 o ln(1) = 0).
const TOLERANCIA_RELATIVA = 1e-10;
const PISO_ABSOLUTO = 1e-10;

function coincideA10CifrasSignificativas(obtenido, esperado) {
  const margen = Math.max(Math.abs(esperado) * TOLERANCIA_RELATIVA, PISO_ABSOLUTO);
  return Math.abs(obtenido - esperado) <= margen;
}

// Genera valores v > 0 cubriendo un amplio rango de magnitudes (muy pequenas y
// muy grandes). Se usa un exponente decimal controlado para abarcar ordenes de
// magnitud desde ~1e-9 hasta ~1e9 sin caer en 0, Infinity ni NaN. El literal
// que teclea el usuario es un decimal plano no negativo, acorde a la gramatica
// del motor (no hay menos unario ni notacion cientifica de JS en la Expresion).
const valorPositivo = fc
  .tuple(
    fc.double({ min: 1, max: 9.999999, noNaN: true, noDefaultInfinity: true }),
    fc.integer({ min: -9, max: 9 })
  )
  .map(([mantisa, exp]) => mantisa * Math.pow(10, exp))
  .filter((v) => Number.isFinite(v) && v > 0);

// Convierte el valor a un literal decimal tecleable por el usuario, evitando la
// notacion cientifica de JS (que insertaria una `e` no reconocida como el glifo
// EXP `E` del motor). Se usa toFixed con suficientes decimales y se recorta.
function aLiteralDecimal(v) {
  // 20 decimales cubren las magnitudes generadas sin perder cifras relevantes.
  let s = v.toFixed(20);
  // Recortar ceros finales y el punto si queda suelto.
  if (s.includes(".")) {
    s = s.replace(/0+$/, "").replace(/\.$/, "");
  }
  return s;
}

describe("Property 5: Los logaritmos coinciden con su oraculo", () => {
  it("evaluar `log v` coincide con Math.log10(v) a 10 cifras significativas para v > 0", () => {
    fc.assert(
      fc.property(valorPositivo, (v) => {
        const literal = aLiteralDecimal(v);
        // El valor realmente representado por el literal tecleado (el oraculo
        // debe compararse contra el mismo numero que recibe el motor).
        const vParsed = Number(literal);
        fc.pre(Number.isFinite(vParsed) && vParsed > 0);

        const resultado = evaluar(`log${literal}`);
        expect(resultado.ok).toBe(true);

        const esperado = Math.log10(vParsed);
        expect(coincideA10CifrasSignificativas(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("evaluar `ln v` coincide con Math.log(v) a 10 cifras significativas para v > 0", () => {
    fc.assert(
      fc.property(valorPositivo, (v) => {
        const literal = aLiteralDecimal(v);
        const vParsed = Number(literal);
        fc.pre(Number.isFinite(vParsed) && vParsed > 0);

        const resultado = evaluar(`ln${literal}`);
        expect(resultado.ok).toBe(true);

        const esperado = Math.log(vParsed);
        expect(coincideA10CifrasSignificativas(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
