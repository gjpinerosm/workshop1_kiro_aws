// Feature: scientific-calculator, Property 16: Un calculo valido conserva la
// Expresion y almacena Ans.
//
// Validates: Requirements 2.2, 9.6
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera
// Expresiones aritmeticas validas con los glifos del Motor_Calculo (numeros,
// operadores, parentesis), las fija como `expresion` del CalculatorState y
// aplica la transicion pura `aplicarIgual`. Verifica, para todo caso de exito,
// las cuatro clausulas del AC:
//   - la Expresion queda intacta (Requirement 2.2),
//   - `tieneResultado` pasa a true,
//   - `ans` almacena el Resultado (Requirement 9.6), cruzado contra
//     `evaluar(expresion).valor`,
//   - `lineaInferior` muestra el Resultado formateado.
//
// Para aislar la propiedad del exito, el generador se restringe al subespacio
// de Expresiones que no producen division por cero ni desbordamiento: solo usa
// los operadores +, − y × sobre numeros acotados, de modo que `evaluar`
// siempre devuelve { ok: true }. Esa precondicion se comprueba explicitamente
// en cada iteracion.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { aplicarIgual, estadoInicial } from "./state.js";
import { evaluar } from "./engine.js";

// Reproduce el contrato de formato de la Linea_Inferior aplicado por state.js
// al tener exito (formatearResultado, interno al modulo): cero exacto -> "0"
// (evitando "-0"), y en otro caso representacion canonica con >= 10 cifras
// significativas via toPrecision(12), recortando ceros no significativos. Se
// reimplementa aqui como oraculo porque la funcion no se exporta; TEST-ONLY.
function formatoResultadoEsperado(valor) {
  if (valor === 0) return "0";
  return String(Number(valor.toPrecision(12)));
}

// Generador de Expresiones aritmeticas validas con los glifos del motor.
// Construye arboles equilibrados por profundidad: las hojas son literales
// numericos no negativos; los nodos internos combinan dos subexpresiones con un
// operador de + / − / × (se excluyen ÷ y ^ para no inducir division por cero ni
// desbordamiento). Los numeros se mantienen acotados para que ningun camino de
// operaciones alcance ±Infinity. Opcionalmente envuelve una subexpresion entre
// parentesis para ejercitar ese glifo.
function expresionValida() {
  const numero = fc
    .tuple(
      fc.integer({ min: 0, max: 9999 }),
      fc.option(fc.integer({ min: 0, max: 9999 }), { nil: null })
    )
    .map(([entero, fraccion]) =>
      fraccion === null ? `${entero}` : `${entero}.${fraccion}`
    );

  const operador = fc.constantFrom("+", "−", "×");

  const { expr } = fc.letrec((tie) => ({
    expr: fc.oneof(
      { depthSize: "small", withCrossShrink: true },
      // Hoja: un literal numerico.
      numero,
      // Nodo binario: subexpr operador subexpr.
      fc
        .tuple(tie("expr"), operador, tie("expr"))
        .map(([izq, op, der]) => `${izq}${op}${der}`),
      // Agrupacion entre parentesis de una subexpresion.
      tie("expr").map((e) => `(${e})`)
    ),
  }));

  // Acotar la profundidad del arbol para que los productos no desborden.
  return expr;
}

describe("Property 16: Un calculo valido conserva la Expresion y almacena Ans", () => {
  it("aplicarIgual sobre una Expresion valida deja la Expresion intacta, marca Resultado, almacena Ans y formatea la Linea_Inferior", () => {
    fc.assert(
      fc.property(expresionValida(), (expresion) => {
        // Precondicion del subdominio de exito: el motor evalua sin error.
        const resultadoMotor = evaluar(expresion);
        fc.pre(resultadoMotor.ok);

        // Estado de partida con la Expresion fijada. Se parte del estado
        // inicial para que los demas campos (ans previo, tieneResultado) tengan
        // valores conocidos y comprobar que aplicarIgual los transiciona.
        const estado = {
          ...estadoInicial(),
          expresion,
          cursor: expresion.length,
        };

        let siguiente;
        // aplicarIgual nunca lanza: es una transicion pura sobre el estado.
        expect(() => {
          siguiente = aplicarIgual(estado);
        }).not.toThrow();

        // 1) La Expresion queda intacta (Requirement 2.2).
        expect(siguiente.expresion).toBe(expresion);

        // 2) Se marca que hay Resultado.
        expect(siguiente.tieneResultado).toBe(true);

        // 3) Ans almacena el Resultado, cruzado contra el valor del motor
        //    (Requirement 9.6).
        expect(siguiente.ans).toBe(resultadoMotor.valor);

        // 4) La Linea_Inferior muestra el Resultado formateado.
        expect(siguiente.lineaInferior).toBe(
          formatoResultadoEsperado(resultadoMotor.valor)
        );

        // La transicion no muta el estado de entrada (pureza).
        expect(estado.expresion).toBe(expresion);
        expect(estado.tieneResultado).toBe(false);
      }),
      { numRuns: 200 }
    );
  });
});
