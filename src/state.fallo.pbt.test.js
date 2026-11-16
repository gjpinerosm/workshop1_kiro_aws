// Feature: scientific-calculator, Property 17: Un cálculo fallido conserva la
// Expresión, la Línea_Inferior previa y Ans.
//
// Validates: Requirements 2.3, 9.7
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Sobre un
// CalculatorState con Expresion invalida (que el Motor_Calculo rechaza) y con
// estado inicial arbitrario (Ans = a, Linea_Inferior = L), al aplicar `=`
// (aplicarIgual) el estado resultante debe:
//   - mantener la Expresion intacta (no se modifica al fallar; Req 2.3),
//   - conservar Ans sin cambios (`ans = a`; Req 9.7),
//   - marcar un estado de error (estadoError != NINGUNO), y
//   - la Linea_Inferior se conserva como L salvo que se sustituya por la
//     indicacion de error (unica sustitucion permitida; Req 2.3).
//
// La transicion es pura: ademas se verifica que no muta el estado de entrada y
// que no lanza excepciones no controladas.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { aplicarIgual, EstadoError } from "./state.js";
import { evaluar } from "./engine.js";

describe("Property 17: Un cálculo fallido conserva la Expresión, la Línea_Inferior previa y Ans", () => {
  it("aplicarIgual sobre una Expresión inválida mantiene Expresión y Ans, y solo sustituye L por la indicación de error", () => {
    // Generador de Expresiones invalidas: construcciones que el Motor_Calculo
    // rechaza (operador final sin operando, parentesis descompensados, EXP sin
    // mantisa, lexemas no reconocidos, expresion vacia, etc.). Tras generarlas
    // se filtra con una precondicion (evaluar(...).ok === false) para operar
    // estrictamente dentro del subdominio de fallo.
    const operando = fc.constantFrom("1", "2", "3.5", "π", "42", "0");
    const operadorBinario = fc.constantFrom("+", "−", "×", "÷", "^");

    const expresionInvalida = fc.oneof(
      // Expresion vacia: entrada incompleta (Req 3.7 -> SINTAXIS).
      fc.constant(""),
      // Solo espacios en blanco: tambien incompleta.
      fc.constant("   "),
      // Operador binario final sin operando derecho: "n +".
      fc
        .tuple(operando, operadorBinario)
        .map(([a, op]) => `${a}${op}`),
      // Operador binario inicial sin operando izquierdo: "+ n".
      fc
        .tuple(operadorBinario, operando)
        .map(([op, a]) => `${op}${a}`),
      // Dos operadores binarios consecutivos: "n + × m".
      fc
        .tuple(operando, operadorBinario, operadorBinario, operando)
        .map(([a, op1, op2, b]) => `${a}${op1}${op2}${b}`),
      // Parentesis sin cerrar: "(n + m".
      fc
        .tuple(operando, operadorBinario, operando)
        .map(([a, op, b]) => `(${a}${op}${b}`),
      // Parentesis de cierre sobrante: "n + m)".
      fc
        .tuple(operando, operadorBinario, operando)
        .map(([a, op, b]) => `${a}${op}${b})`),
      // Parentesis vacios: "()".
      fc.constant("()"),
      // Notacion EXP sin mantisa: "E5".
      fc
        .integer({ min: 0, max: 50 })
        .map((n) => `E${n}`),
      // Lexemas no reconocidos (caracteres fuera del alfabeto del motor).
      fc.constantFrom("@", "abc", "n&m", "1 ? 2", "#")
    );

    fc.assert(
      fc.property(
        expresionInvalida,
        fc.double({ noNaN: true, noDefaultInfinity: true }), // Ans previo = a
        fc.string(), // Linea_Inferior previa = L
        fc.integer(), // cursor arbitrario
        fc.boolean(), // tieneResultado previo arbitrario
        (expresion, a, L, cursor, tieneResultado) => {
          // Precondicion del subdominio de fallo: la Expresion debe ser
          // rechazada por el Motor_Calculo. Si por azar resultara valida, se
          // descarta este caso (fuera del subdominio de la propiedad).
          fc.pre(evaluar(expresion).ok === false);

          const estado = {
            expresion,
            cursor,
            lineaInferior: L,
            ans: a,
            tieneResultado,
            estadoError: EstadoError.NINGUNO,
          };
          // Copia defensiva para detectar mutaciones del estado de entrada.
          const estadoOriginal = { ...estado };

          // La transicion nunca lanza excepciones no controladas.
          let siguiente;
          expect(() => {
            siguiente = aplicarIgual(estado);
          }).not.toThrow();

          // La Expresion se mantiene intacta (Req 2.3).
          expect(siguiente.expresion).toBe(expresion);

          // Ans se conserva sin modificar (`ans = a`; Req 9.7).
          expect(siguiente.ans).toBe(a);
          // tieneResultado tampoco cambia ante el fallo.
          expect(siguiente.tieneResultado).toBe(tieneResultado);

          // Se fija un estado de error (no NINGUNO).
          expect(siguiente.estadoError).not.toBe(EstadoError.NINGUNO);

          // La Linea_Inferior se conserva como L salvo que se sustituya por la
          // indicacion de error: cuando difiere de L, debe coincidir con el
          // mensaje de error del Motor_Calculo (unica sustitucion permitida).
          const fallo = evaluar(expresion);
          if (siguiente.lineaInferior !== L) {
            expect(siguiente.lineaInferior).toBe(fallo.error.mensaje);
          }
          // El tipo de error vigente coincide con el del Motor_Calculo.
          expect(siguiente.estadoError).toBe(fallo.error.tipo);

          // La transicion es pura: no muta el estado de entrada.
          expect(estado).toEqual(estadoOriginal);
        }
      ),
      { numRuns: 200 }
    );
  });
});
