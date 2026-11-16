// Feature: scientific-calculator, Property 2: El porcentaje divide entre cien.
//
// Para todo valor numerico v, evaluar la Expresion `v%` produce `v / 100`
// dentro de una tolerancia de 10 cifras significativas.
//
// Validates: Requirements 4.4
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera un
// valor decimal no negativo v, construye la Expresion `v%` (el glifo postfijo
// `%` del Motor_Calculo) y compara el Resultado contra el oraculo `v / 100`
// con tolerancia relativa equivalente a 10 cifras significativas.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar } from "./engine.js";

// Tolerancia relativa equivalente a 10 cifras significativas: dos valores se
// consideran iguales si su diferencia relativa es menor que 1e-10 (para el
// caso v = 0 la diferencia absoluta es exactamente 0).
const TOLERANCIA_RELATIVA = 1e-10;

function iguales10CifrasSignificativas(actual, esperado) {
  const diferencia = Math.abs(actual - esperado);
  // Escala por la magnitud del valor esperado para obtener una tolerancia de
  // cifras significativas; con esperado = 0 degenera en igualdad exacta.
  const escala = Math.max(1, Math.abs(esperado));
  return diferencia <= TOLERANCIA_RELATIVA * escala;
}

describe("Property 2: El porcentaje divide entre cien", () => {
  it("evaluar `v%` produce v/100 dentro de 10 cifras significativas", () => {
    // Generador del valor v como lo teclearia el usuario: un literal decimal
    // plano no negativo (parte entera y, opcionalmente, parte fraccionaria).
    // Se omite el signo inicial porque la gramatica del motor (design.md ->
    // Parser) no define el menos unario: un `−` inicial seria un operador
    // binario sin operando izquierdo. Tambien se evita la notacion cientifica
    // de JS para que el lexema sea un decimal plano tecleable.
    const valorDecimal = fc
      .tuple(
        fc.integer({ min: 0, max: 999999999 }), // parte entera
        fc.option(fc.integer({ min: 0, max: 999999999 }), { nil: null }) // fraccion
      )
      .map(([entero, fraccion]) =>
        fraccion === null ? `${entero}` : `${entero}.${fraccion}`
      );

    fc.assert(
      fc.property(valorDecimal, (literal) => {
        // Expresion `v%`: el operador postfijo de porcentaje aplicado a v.
        const expresion = `${literal}%`;

        // El motor nunca debe lanzar: devuelve un resultado tipado.
        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        // La evaluacion de `v%` sobre un decimal no negativo es siempre valida.
        expect(resultado.ok).toBe(true);

        // Oraculo: dividir el valor numerico entre cien (Requirement 4.4).
        const esperado = Number(literal) / 100;

        expect(
          iguales10CifrasSignificativas(resultado.valor, esperado)
        ).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
