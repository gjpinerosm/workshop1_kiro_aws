// Feature: scientific-calculator, Property 12: Los paréntesis no balanceados
// producen error de paréntesis.
//
// Para toda Expresión cuyo número de paréntesis de apertura y de cierre no
// coincide (o cuyos paréntesis están mal anidados), parsear() produce un
// ErrorCalculo de tipo PARENTESIS y deja la Expresión sin modificar.
//
// Validates: Requirements 4.5
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). La estrategia
// genera primero un "núcleo" de Expresión bien formado (números unidos por
// operadores binarios, opcionalmente con subexpresiones correctamente
// parentizadas) y, sobre él, introduce un desbalance de paréntesis como falta
// DOMINANTE: o bien un `(` de apertura sin su cierre, o bien un `)` de cierre
// sobrante, o bien ambos mal anidados. De este modo el único defecto estructural
// es el desbalance de paréntesis, por lo que el parser debe reportar PARENTESIS
// (y no SINTAXIS) de forma fiable.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { tokenizar, parsear, TipoError } from "./engine.js";

describe("Property 12: Los paréntesis no balanceados producen error de paréntesis", () => {
  it("parsear() de una Expresión con paréntesis descompensados produce PARENTESIS sin excepciones no controladas", () => {
    // Operando atómico siempre válido: un literal numérico decimal simple.
    const operando = fc
      .tuple(fc.integer({ min: 0, max: 9999 }), fc.option(fc.integer({ min: 0, max: 9999 }), { nil: null }))
      .map(([entero, fraccion]) => (fraccion === null ? `${entero}` : `${entero}.${fraccion}`));

    const OP_BINARIO = ["+", "−", "×", "÷", "^"];

    // Un "núcleo" bien formado: operandos atómicos unidos por operadores
    // binarios. Siempre es una Expresión sintácticamente válida y balanceada
    // (sin paréntesis propios), de modo que cualquier desbalance que añadamos
    // sea la única falta estructural.
    const nucleoValido = fc
      .array(operando, { minLength: 1, maxLength: 4 })
      .chain((operandos) =>
        fc
          .array(fc.constantFrom(...OP_BINARIO), {
            minLength: operandos.length - 1,
            maxLength: operandos.length - 1,
          })
          .map((ops) => {
            let s = operandos[0];
            for (let k = 0; k < ops.length; k++) {
              s += ops[k] + operandos[k + 1];
            }
            return s;
          })
      );

    // Escenario de desbalance. Cada variante conserva el núcleo como contenido
    // válido y solo altera el balance de paréntesis:
    //  - "apertura_sobrante": uno o más `(` iniciales sin cierre -> el parser
    //    agota la entrada buscando el `)` correspondiente (PARENTESIS).
    //  - "cierre_sobrante": uno o más `)` finales tras una expresión completa
    //    -> queda un PAREN_DER residual (PARENTESIS).
    //  - "mal_anidado": `)` antes de su `(`, p. ej. `a)+(b` -> cierre inesperado
    //    en posición de operando (PARENTESIS).
    const desbalance = fc.oneof(
      // Apertura(s) sin cierre: "(("+nucleo  (desbalance = +k)
      fc
        .tuple(nucleoValido, fc.integer({ min: 1, max: 3 }))
        .map(([nucleo, k]) => "(".repeat(k) + nucleo),
      // Cierre(s) sobrante(s): nucleo+")"  (desbalance = -k)
      fc
        .tuple(nucleoValido, fc.integer({ min: 1, max: 3 }))
        .map(([nucleo, k]) => nucleo + ")".repeat(k)),
      // Paréntesis que envuelve y deja un cierre extra: "("+nucleo+"))"
      fc.tuple(nucleoValido, fc.integer({ min: 1, max: 2 })).map(([nucleo, k]) => "(" + nucleo + ")".repeat(k + 1)),
      // Mal anidado: "a)+(b" — mismo recuento pero orden inválido.
      fc
        .tuple(nucleoValido, nucleoValido)
        .map(([a, b]) => `${a})+(${b}`)
    );

    fc.assert(
      fc.property(desbalance, (expresion) => {
        // Precondición del subdominio de fallo: los paréntesis están
        // descompensados en recuento, o bien existe un `)` que precede a su `(`
        // (mal anidado), lo que también es un desbalance estructural.
        const abre = (expresion.match(/\(/g) || []).length;
        const cierra = (expresion.match(/\)/g) || []).length;
        const malAnidado = (() => {
          let saldo = 0;
          for (const ch of expresion) {
            if (ch === "(") saldo++;
            else if (ch === ")") {
              saldo--;
              if (saldo < 0) return true; // cierre antes de su apertura
            }
          }
          return false;
        })();
        expect(abre !== cierra || malAnidado).toBe(true);

        const copiaExpresion = String(expresion);

        // El pipeline nunca debe lanzar excepciones no controladas: debe
        // producir un ErrorCalculo tipado. La tokenización de estos caracteres
        // (dígitos, operadores, paréntesis) no falla; el parser es quien
        // detecta el desbalance.
        let error;
        expect(() => {
          try {
            parsear(tokenizar(expresion));
          } catch (e) {
            error = e;
          }
        }).not.toThrow();

        // Debe haberse producido un error tipado PARENTESIS.
        expect(error).toBeDefined();
        expect(error.tipo).toBe(TipoError.PARENTESIS);

        // La Expresión de entrada no se modifica.
        expect(expresion).toBe(copiaExpresion);
      }),
      { numRuns: 200 }
    );
  });
});
