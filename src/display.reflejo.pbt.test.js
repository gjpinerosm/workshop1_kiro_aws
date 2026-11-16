// Feature: scientific-calculator, Property 21: La Linea_Superior refleja la
// Expresion introducida.
//
// Para toda secuencia de pulsaciones de entrada valida, el contenido de la
// Linea_Superior es exactamente igual a la cadena de la Expresion acumulada en
// el estado.
//
// Validates: Requirements 2.1
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera
// secuencias de tokens de entrada validos (digitos, operadores, parentesis, pi,
// EXP, funciones y el Separador_Decimal), los aplica sobre el CalculatorState
// mediante las transiciones puras del estado (insertarToken / insertarDecimal)
// para construir una Expresion, y verifica que derivarLineas(estado) refleja la
// Expresion completa en la Linea_Superior cuando NO se indica un ancho visible
// (caso de reflejo total, sin desplazamiento horizontal). El desplazamiento por
// ancho se cubre en la Property 22.
//
// TEST-ONLY: no se modifican src/display.js ni src/state.js.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { derivarLineas } from "./display.js";
import { estadoInicial, insertarToken, insertarDecimal } from "./state.js";

describe("Property 21: La Linea_Superior refleja la Expresion introducida", () => {
  it("derivarLineas(estado).lineaSuperior === estado.expresion para toda secuencia de entrada valida (sin ancho)", () => {
    // Pulsaciones de entrada que, segun el Input Handler (design.md), insertan
    // texto en la Expresion: digitos, Separador_Decimal, operadores binarios,
    // operadores postfijos, parentesis, la constante pi, la notacion EXP (E) y
    // las funciones prefijas. Cada pulsacion se modela como el texto que inserta
    // en la Expresion; el Separador_Decimal se enruta por insertarDecimal por su
    // validacion de un unico `.` por numero.
    const digitos = "0123456789".split("");
    const operadores = ["+", "−", "×", "÷", "^"];
    const postfijos = ["x²", "x³", "x⁻¹", "%"];
    const parentesis = ["(", ")"];
    const funciones = ["sin", "cos", "tan", "log", "ln", "√", "∛"];
    const otros = ["π", "E"]; // pi y el marcador de EXP

    const DECIMAL = Symbol("decimal"); // pulsacion del Separador_Decimal

    const pulsacionGen = fc.oneof(
      fc.constantFrom(...digitos),
      fc.constantFrom(...operadores),
      fc.constantFrom(...postfijos),
      fc.constantFrom(...parentesis),
      fc.constantFrom(...funciones),
      fc.constantFrom(...otros),
      fc.constant(DECIMAL)
    );

    fc.assert(
      fc.property(
        fc.array(pulsacionGen, { minLength: 0, maxLength: 60 }),
        (pulsaciones) => {
          // Aplicar la secuencia de pulsaciones sobre el estado inicial usando
          // exclusivamente las transiciones puras del estado.
          let estado = estadoInicial();
          for (const pulsacion of pulsaciones) {
            estado =
              pulsacion === DECIMAL
                ? insertarDecimal(estado)
                : insertarToken(estado, pulsacion);
          }

          // Sin ancho visible: la Linea_Superior refleja la Expresion completa
          // (reflejo total, Requirement 2.1).
          const { lineaSuperior } = derivarLineas(estado);
          expect(lineaSuperior).toBe(estado.expresion);
        }
      ),
      { numRuns: 200 }
    );
  });
});
