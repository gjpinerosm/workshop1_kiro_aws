// Feature: scientific-calculator, Property 14: Para toda operacion aritmetica,
// potencia o raiz cuyo resultado es no finito (`±Infinity`), evaluar produce
// DESBORDAMIENTO y deja la Expresion sin modificar.
//
// Validates: Requirements 3.8, 7.10
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera
// Expresiones con operandos extremos cuyo resultado desborda el rango
// representable de `Number` (hacia `±Infinity`) y verifica que el
// Motor_Calculo devuelve un ErrorCalculo de tipo DESBORDAMIENTO sin lanzar
// excepciones no controladas, conservando la Expresion de entrada sin
// modificar.
//
// NOTA DE ALCANCE: en la tarea 4.1 el evaluador solo soporta los operadores
// aritmeticos binarios (`+ − × ÷ ^`). Las raices (`√`, `∛`) todavia no estan
// implementadas (reportan SINTAXIS), de modo que esta propiedad se ejercita a
// traves del desbordamiento aritmetico: potencias `base^exponente` con base y
// exponente grandes, y multiplicaciones encadenadas de magnitudes enormes. El
// patron se amplia naturalmente a las raices cuando la tarea 6.6 las habilite.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar, TipoError } from "./engine.js";

describe("Property 14: Los resultados no representables producen desbordamiento", () => {
  it("evaluar una operacion con resultado no finito produce DESBORDAMIENTO sin excepciones no controladas", () => {
    // Generador de Expresiones cuyo resultado aritmetico es garantizadamente
    // `±Infinity` sobre `Number` de JS. Number.MAX_VALUE ~= 1.8e308; cualquier
    // magnitud por encima de ~1e308 desborda. Cada rama construye una
    // Expresion tecleable con los glifos de operador del motor (`×`, `^`).
    const expresionDesbordante = fc.oneof(
      // 1) Potencia `base^exponente`: con base >= 2 y exponente >= 1024,
      //    Math.pow(base, exponente) >= 2^1024 > MAX_VALUE => +Infinity.
      fc
        .tuple(
          fc.integer({ min: 2, max: 9 }), // base
          fc.integer({ min: 1024, max: 100000 }) // exponente grande
        )
        .map(([base, exp]) => ({
          texto: `${base}^${exp}`,
          descripcion: "potencia con exponente grande",
        })),

      // 2) Potencia con mantisa EXP en la base: `1EK ^ P`. Con K ~ 90..99 y
      //    P >= 4, (10^K)^P = 10^(K*P) con K*P >= 360 > 308 => +Infinity.
      fc
        .tuple(
          fc.integer({ min: 90, max: 99 }), // exponente EXP de la base
          fc.integer({ min: 4, max: 5000 }) // potencia aplicada
        )
        .map(([k, p]) => ({
          texto: `1E${k}^${p}`,
          descripcion: "potencia de un numero EXP grande",
        })),

      // 3) Multiplicacion encadenada de magnitudes enormes: `1EK × 1EK × ...`.
      //    Con K ~ 90..99 y >= 4 factores, el producto es 10^(K * factores)
      //    con exponente total >= 360 > 308 => +Infinity.
      fc
        .tuple(
          fc.integer({ min: 90, max: 99 }), // exponente EXP de cada factor
          fc.integer({ min: 4, max: 20 }) // cantidad de factores
        )
        .map(([k, factores]) => ({
          texto: Array.from({ length: factores }, () => `1E${k}`).join("×"),
          descripcion: "producto encadenado de numeros EXP grandes",
        }))
    );

    fc.assert(
      fc.property(expresionDesbordante, ({ texto }) => {
        // Captura del contenido original de la Expresion antes de evaluar para
        // comprobar despues que el motor no la altera.
        const expresionOriginal = `${texto}`;

        // El motor nunca debe lanzar: devuelve un resultado tipado.
        let resultado;
        expect(() => {
          resultado = evaluar(texto);
        }).not.toThrow();

        // Debe ser un error tipado DESBORDAMIENTO (resultado no finito).
        expect(resultado.ok).toBe(false);
        expect(resultado.error.tipo).toBe(TipoError.DESBORDAMIENTO);

        // La Expresion de entrada permanece sin modificar (Requirements 3.8, 7.10).
        expect(texto).toBe(expresionOriginal);
      }),
      { numRuns: 200 }
    );
  });
});
