// Feature: scientific-calculator, Property 20: Las teclas decorativas no tienen
// efecto.
//
// Para todo CalculatorState y toda Tecla_Decorativa (SHIFT, ALPHA, MODE, RCL,
// nCr, hyp), pulsar esa tecla deja el estado identico: no cambia la Expresion
// ni la Linea_Inferior (ni Ans, cursor, tieneResultado o estadoError) y no
// invoca al Motor_Calculo (design.md -> Property 20).
//
// Validates: Requirements 10.2, 10.3, 10.4
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones) sobre un
// CalculatorState arbitrario. Para cada Tecla_Decorativa se verifica que el
// estado resultante es profundamente igual al de entrada (todos los campos:
// expresion, lineaInferior, ans, cursor, tieneResultado, estadoError) y que el
// Motor_Calculo (evaluar) no se invoca en ningun momento.

import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import * as engine from "./engine.js";
import { teclaDecorativa, EstadoError } from "./state.js";

// Las seis Teclas_Decorativas del modelo fisico (Requirement 10.1).
const TECLAS_DECORATIVAS = ["SHIFT", "ALPHA", "MODE", "RCL", "nCr", "hyp"];

// Generador de un CalculatorState arbitrario pero bien formado: cubre el
// espacio de estados que el Input Handler puede sostener (Expresion con
// caracteres variados, cursor dentro o fuera de rango, Ans finito, indicador de
// Resultado y cualquier EstadoError posible).
const estadoArbitrario = fc.record({
  expresion: fc.string(),
  cursor: fc.integer({ min: -5, max: 40 }),
  lineaInferior: fc.string(),
  ans: fc.double({ noNaN: true, noDefaultInfinity: true }),
  tieneResultado: fc.boolean(),
  estadoError: fc.constantFrom(...Object.values(EstadoError)),
});

describe("Feature: scientific-calculator, Property 20: Las teclas decorativas no tienen efecto", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("para todo estado y toda Tecla_Decorativa, teclaDecorativa deja el estado identico y no invoca al Motor_Calculo", () => {
    // Espia sobre evaluar: si la transicion lo invocase, el contador seria > 0.
    const espiaEvaluar = vi.spyOn(engine, "evaluar");

    fc.assert(
      fc.property(
        estadoArbitrario,
        fc.constantFrom(...TECLAS_DECORATIVAS),
        (estado, _tecla) => {
          // Copia profunda del estado previo para comparar tras la pulsacion.
          const previo = structuredClone(estado);

          const resultado = teclaDecorativa(estado);

          // Estado identico: igualdad profunda campo a campo.
          expect(resultado).toEqual(previo);
          expect(resultado.expresion).toBe(previo.expresion);
          expect(resultado.lineaInferior).toBe(previo.lineaInferior);
          expect(resultado.ans).toBe(previo.ans);
          expect(resultado.cursor).toBe(previo.cursor);
          expect(resultado.tieneResultado).toBe(previo.tieneResultado);
          expect(resultado.estadoError).toBe(previo.estadoError);

          // La transicion es pura: no muta el estado de entrada.
          expect(estado).toEqual(previo);

          // No se invoca al Motor_Calculo en ninguna pulsacion decorativa.
          expect(espiaEvaluar).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 200 }
    );

    // Comprobacion global adicional tras todas las iteraciones.
    expect(espiaEvaluar).not.toHaveBeenCalled();
  });
});
