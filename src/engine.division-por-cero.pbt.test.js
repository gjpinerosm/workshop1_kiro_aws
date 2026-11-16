// Feature: scientific-calculator, Property 10: La division por cero produce un
// ErrorCalculo de tipo DIVISION_POR_CERO y deja la Expresion sin modificar.
//
// Validates: Requirements 3.6, 7.8
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera un
// numerador arbitrario n y construye la Expresion `n ÷ 0` (usando el glifo de
// division del motor); verifica que el Motor_Calculo devuelve un ErrorCalculo
// de tipo DIVISION_POR_CERO sin lanzar excepciones no controladas y que la
// cadena de la Expresion de entrada no se altera.
//
// NOTA DE ALCANCE: el Requirement 7.8 (`0⁻¹` -> DIVISION_POR_CERO) tambien
// corresponde a esta propiedad, pero el operador postfijo de inverso (`x⁻¹`)
// aun no esta implementado en el Evaluator: se incorpora en la tarea 6.6. Hasta
// entonces `0x⁻¹` produce SINTAXIS, de modo que aqui solo se ejercita el caso
// `n ÷ 0` (Requirement 3.6). La cobertura de `0⁻¹` queda diferida a la tarea
// 6.6, cuando el inverso sea evaluable.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar, TipoError } from "./engine.js";

describe("Property 10: La division por cero produce error sin alterar la Expresion", () => {
  it("evaluar `n ÷ 0` produce DIVISION_POR_CERO y conserva la Expresion", () => {
    // Generador del numerador n tal como lo teclearia el usuario: un literal
    // decimal plano no negativo (parte entera y, opcionalmente, parte
    // fraccionaria). Se omite el signo inicial porque la gramatica del motor
    // (design.md -> Parser) no define el menos unario; un `−` inicial seria un
    // operador binario sin operando izquierdo. Se incluye el cero como
    // numerador (0 ÷ 0 tambien debe ser DIVISION_POR_CERO).
    const numerador = fc
      .tuple(
        fc.integer({ min: 0, max: 999999 }), // parte entera
        fc.option(fc.integer({ min: 0, max: 999999 }), { nil: null }) // fraccion
      )
      .map(([entero, fraccion]) =>
        fraccion === null ? `${entero}` : `${entero}.${fraccion}`
      );

    fc.assert(
      fc.property(numerador, (n) => {
        // Construir la Expresion `n ÷ 0` con el glifo de division del motor.
        const expresion = `${n}÷0`;

        // El motor nunca debe lanzar: devuelve un resultado tipado.
        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        // Debe ser un error tipado DIVISION_POR_CERO (Requirement 3.6).
        expect(resultado.ok).toBe(false);
        expect(resultado.error.tipo).toBe(TipoError.DIVISION_POR_CERO);

        // La Expresion de entrada no se modifica al construir el error.
        expect(expresion).toBe(`${n}÷0`);
      }),
      { numRuns: 200 }
    );
  });
});
