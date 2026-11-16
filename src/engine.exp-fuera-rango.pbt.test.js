// Feature: scientific-calculator, Property 15: Para toda mantisa M y todo
// exponente entero N con |N| > 99, evaluar `M EXP N` produce
// EXPONENTE_FUERA_RANGO y deja la Expresion sin modificar.
//
// Validates: Requirements 8.5
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera
// exponentes enteros fuera del rango -99..99 y mantisas arbitrarias, construye
// la Expresion de notacion EXP (`M EXP N`) y verifica que el Motor_Calculo
// devuelve un ErrorCalculo de tipo EXPONENTE_FUERA_RANGO sin lanzar
// excepciones no controladas.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar, TipoError } from "./engine.js";

describe("Property 15: El exponente EXP fuera de rango produce error especifico", () => {
  it("evaluar `M EXP N` con |N| > 99 produce EXPONENTE_FUERA_RANGO sin excepciones no controladas", () => {
    // Generador de mantisas M como las teclearia el usuario antes de EXP: un
    // literal decimal plano no negativo (parte entera y, opcionalmente,
    // fraccionaria). Se omite el signo inicial porque la gramatica del motor
    // (design.md -> Parser) no define el menos unario: un `−` inicial seria un
    // operador binario sin operando izquierdo, no el signo de un unico numero
    // `M EXP N`. Tambien se evita la notacion cientifica de JS (p. ej.
    // "5e-324") porque introduciria un segundo marcador de exponente en la
    // Expresion `M EXP N`, lo cual no representa una mantisa tecleable.
    const mantisa = fc
      .tuple(
        fc.integer({ min: 0, max: 999999 }), // parte entera
        fc.option(fc.integer({ min: 0, max: 999999 }), { nil: null }) // fraccion
      )
      .map(([entero, fraccion]) =>
        fraccion === null ? `${entero}` : `${entero}.${fraccion}`
      );

    // Generador de exponentes enteros N con |N| > 99: tanto > 99 como < -99.
    const exponenteFueraRango = fc
      .integer({ min: 100, max: 100000 })
      .chain((magnitud) =>
        fc.boolean().map((negativo) => (negativo ? -magnitud : magnitud))
      );

    fc.assert(
      fc.property(mantisa, exponenteFueraRango, (M, N) => {
        // Precondicion del subdominio de fallo.
        expect(Math.abs(N)).toBeGreaterThan(99);

        // Construir la Expresion `M EXP N` (la tecla EXP inserta `E`).
        const expresion = `${M}E${N}`;

        // El motor nunca debe lanzar: devuelve un resultado tipado.
        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        // Debe ser un error tipado EXPONENTE_FUERA_RANGO.
        expect(resultado.ok).toBe(false);
        expect(resultado.error.tipo).toBe(TipoError.EXPONENTE_FUERA_RANGO);

        // La Expresion de entrada no se modifica (es un string inmutable; se
        // comprueba que el motor no la altera al construir el error).
        expect(expresion).toBe(`${M}E${N}`);
      }),
      { numRuns: 200 }
    );
  });
});
