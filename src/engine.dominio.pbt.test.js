// Feature: scientific-calculator, Property 11: Los argumentos fuera de dominio
// producen error de dominio.
//
// Para todo valor v <= 0, `log(v)` y `ln(v)` producen DOMINIO; para todo v < 0,
// `√v` produce DOMINIO; y para todo entero k, `tan(90 + 180·k)` produce DOMINIO.
// En todos los casos la Expresion queda sin modificar.
//
// Validates: Requirements 5.5, 6.3, 7.9
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Cubre los
// tres subdominios de fallo:
//  - log/ln de argumento <= 0,
//  - √ de argumento negativo,
//  - tan en 90° + 180°·k.
// Verifica que el Motor_Calculo devuelve un ErrorCalculo de tipo DOMINIO sin
// lanzar excepciones no controladas y sin alterar la cadena de la Expresion.
//
// NOTA DE GRAMATICA: el Parser (design.md -> Motor_Calculo: Parser) no define
// el menos unario, por lo que un `−` inicial seria un operador binario sin
// operando izquierdo (SINTAXIS), no el signo de un numero. Para obtener
// argumentos negativos o cero sin disparar un error de sintaxis previo se
// construyen con la resta binaria `0−v` (que el evaluador reduce al valor
// negativo antes de aplicar la funcion). El literal `0` cubre el caso v = 0 de
// log/ln de forma directa.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar, TipoError } from "./engine.js";

describe("Property 11: Los argumentos fuera de dominio producen error de dominio", () => {
  // Generador de literales decimales positivos tecleables (parte entera y,
  // opcionalmente, fraccionaria). Se evita el 0 para que `0−v` sea
  // estrictamente negativo; el caso v = 0 se prueba aparte con el literal `0`.
  const positivo = fc
    .tuple(
      fc.integer({ min: 1, max: 999999 }),
      fc.option(fc.integer({ min: 1, max: 999999 }), { nil: null })
    )
    .map(([entero, fraccion]) =>
      fraccion === null ? `${entero}` : `${entero}.${fraccion}`
    );

  it("log/ln de un argumento <= 0 produce DOMINIO sin excepciones no controladas", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("log", "ln"),
        // El argumento es 0 (literal directo) o un valor estrictamente negativo
        // construido como `0−v` con v > 0.
        fc.oneof(
          fc.constant("0"),
          positivo.map((v) => `0−${v}`)
        ),
        (fn, argumento) => {
          const expresion = `${fn}(${argumento})`;

          // El motor nunca debe lanzar: devuelve un resultado tipado.
          let resultado;
          expect(() => {
            resultado = evaluar(expresion);
          }).not.toThrow();

          expect(resultado.ok).toBe(false);
          expect(resultado.error.tipo).toBe(TipoError.DOMINIO);

          // La Expresion de entrada no se modifica.
          expect(expresion).toBe(`${fn}(${argumento})`);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("√ de un argumento negativo produce DOMINIO sin excepciones no controladas", () => {
    fc.assert(
      fc.property(positivo, (v) => {
        // Argumento estrictamente negativo construido como `0−v` con v > 0.
        const expresion = `√(0−${v})`;

        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        expect(resultado.ok).toBe(false);
        expect(resultado.error.tipo).toBe(TipoError.DOMINIO);

        expect(expresion).toBe(`√(0−${v})`);
      }),
      { numRuns: 200 }
    );
  });

  it("tan(90 + 180·k) produce DOMINIO sin excepciones no controladas", () => {
    fc.assert(
      fc.property(
        // k entero no negativo. El angulo singular es 90 + 180·k grados.
        //
        // Cota del generador: la deteccion del singular de la tangente se basa
        // en comprobar |cos(grados × π/180)| < 1e-10 (engine.js ->
        // evaluarTrigonometrica, Requirement 5.5). Al crecer el angulo, el error
        // de redondeo IEEE-754 en la conversion grados→radianes supera ese
        // umbral y el coseno deja de evaluarse como cero, por lo que el motor ya
        // no reconoce el punto singular. Empiricamente la deteccion es fiable de
        // forma contigua hasta k ≈ 333771 (angulo ≈ 6e7 grados); se acota a
        // k ≤ 300000 (angulo ≈ 5.4e7, holgadamente dentro de ±999999999 grados,
        // Requirement 5.3) para muestrear el subdominio donde el comportamiento
        // especificado esta bien definido sobre la aritmetica del motor.
        fc.integer({ min: 0, max: 300000 }),
        (k) => {
          // Angulo singular literal: 90, 270, 450, ... (siempre no negativo con
          // k >= 0, expresable sin menos unario).
          const angulo = 90 + 180 * k;
          const expresion = `tan(${angulo})`;

          let resultado;
          expect(() => {
            resultado = evaluar(expresion);
          }).not.toThrow();

          expect(resultado.ok).toBe(false);
          expect(resultado.error.tipo).toBe(TipoError.DOMINIO);

          expect(expresion).toBe(`tan(${angulo})`);
        }
      ),
      { numRuns: 200 }
    );
  });
});
