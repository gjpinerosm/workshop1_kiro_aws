// Feature: scientific-calculator, Property 13: Las entradas mal formadas
// producen error de sintaxis.
//
// Para toda cadena de Expresion sintacticamente invalida o incompleta
// (incluida la notacion EXP sin mantisa o con mantisa/exponente no numerico,
// y argumentos de funcion mal formados), analizar la Expresion produce
// SINTAXIS de forma controlada -sin lanzar excepciones no gestionadas- y deja
// la Expresion sin modificar.
//
// Validates: Requirements 3.7, 6.4, 8.4
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). El motor
// expone el analisis como tokenizar()+parsear(), que señalan los fallos
// lanzando ErrorCalculo tipado (una excepcion CONTROLADA del dominio). La
// propiedad verifica que:
//   1. el unico tipo de excepcion que escapa es ErrorCalculo (nunca un
//      TypeError, RangeError u otra excepcion no gestionada), y
//   2. el tipo del error es SINTAXIS.
//
// Las entradas se generan dentro del subdominio de fallo de SINTAXIS,
// evitando deliberadamente los casos que producen PARENTESIS (parentesis
// descompensados) o EXPONENTE_FUERA_RANGO (|N| > 99), que tienen sus propias
// propiedades (12 y 15).

import { describe, it, expect } from "vitest";
import { tokenizar, parsear, ErrorCalculo, TipoError } from "./engine.js";

// Analiza una Expresion a traves del pipeline del Motor_Calculo
// (tokenizar -> parsear). Devuelve el ErrorCalculo capturado o null si el
// analisis tuvo exito. Cualquier otra excepcion se re-lanza para que el test
// la detecte como una excepcion no gestionada (violacion de la propiedad).
function analizar(expresion) {
  try {
    parsear(tokenizar(expresion));
    return null;
  } catch (e) {
    if (e instanceof ErrorCalculo) {
      return e;
    }
    // Excepcion no controlada: re-lanzar para fallar la propiedad.
    throw e;
  }
}

describe("Property 13: Las entradas mal formadas producen error de sintaxis", () => {
  it("entradas invalidas/incompletas producen SINTAXIS sin excepciones no controladas", () => {
    // --- Generadores del subdominio de fallo por SINTAXIS ---------------

    // (a) Cadena vacia o solo espacios: expresion incompleta.
    const vacia = fcVacia();

    // (b) Operador binario sin su operando izquierdo o derecho, y operadores
    //     binarios encadenados. Todos dejan un operando faltante -> SINTAXIS.
    const operadorColgante = fcOperadorColgante();

    // (c) Notacion EXP mal formada: sin mantisa numerica o con exponente no
    //     entero/ausente (Requirement 8.4).
    const expMalFormada = fcExpMalFormada();

    // (d) Argumento de funcion mal formado: una funcion prefija sin operando
    //     o seguida directamente de un operador/cierre (Requirement 6.4).
    const funcionMalFormada = fcFuncionMalFormada();

    // (e) Operador postfijo suelto, sin operando a su izquierda.
    const postfijoSuelto = fcPostfijoSuelto();

    const entradaInvalida = fcOneOf([
      vacia,
      operadorColgante,
      expMalFormada,
      funcionMalFormada,
      postfijoSuelto,
    ]);

    fcAssert(
      entradaInvalida,
      /** @param {string} expresion */ (expresion) => {
        const original = expresion;

        // El analisis no debe lanzar excepciones NO controladas. analizar()
        // re-lanza cualquier excepcion que no sea ErrorCalculo; envolverla en
        // not.toThrow garantiza la deteccion.
        let error;
        expect(() => {
          error = analizar(expresion);
        }).not.toThrow();

        // Debe haberse detectado un error tipado (no un analisis exitoso).
        expect(error).toBeInstanceOf(ErrorCalculo);

        // El tipo del error debe ser SINTAXIS.
        expect(error.tipo).toBe(TipoError.SINTAXIS);

        // La Expresion de entrada no se modifica.
        expect(expresion).toBe(original);
      }
    );
  });
});

// =============================================================================
// Generadores fast-check. Se definen como funciones auxiliares para mantener
// legible el cuerpo del test. Requieren el import de fast-check.
// =============================================================================

import fc from "fast-check";

// Helper fino sobre fc.assert con >=100 iteraciones (se usan 200).
function fcAssert(arb, predicado) {
  fc.assert(fc.property(arb, predicado), { numRuns: 200 });
}

function fcOneOf(arbs) {
  return fc.oneof(...arbs);
}

// (a) Cadena vacia o compuesta solo de espacios en blanco.
function fcVacia() {
  return fc.stringMatching(/^[ \t]*$/).map((s) => s);
}

// Operandos simples validos (sin EXP) para construir expresiones incompletas.
function operandoSimple() {
  return fc.oneof(
    fc.integer({ min: 0, max: 999999 }).map((n) => String(n)),
    fc.constant("π")
  );
}

// (b) Operador binario colgante: falta el operando izquierdo, el derecho, o
//     hay dos operadores binarios consecutivos.
function fcOperadorColgante() {
  const binario = fc.constantFrom("+", "−", "×", "÷", "^");
  return fc.oneof(
    // Falta el operando derecho: "3+"
    fc.tuple(operandoSimple(), binario).map(([a, op]) => `${a}${op}`),
    // Falta el operando izquierdo para un binario que no es unario: "×3"
    fc
      .tuple(fc.constantFrom("×", "÷", "^"), operandoSimple())
      .map(([op, b]) => `${op}${b}`),
    // Dos operadores binarios consecutivos: "3+×4"
    fc
      .tuple(operandoSimple(), binario, fc.constantFrom("×", "÷", "^"), operandoSimple())
      .map(([a, op1, op2, b]) => `${a}${op1}${op2}${b}`)
  );
}

// (c) Notacion EXP mal formada que el tokenizer rechaza con SINTAXIS.
//     Casos cubiertos: "E" sin mantisa; mantisa + "E" sin exponente.
//     Se evita |N| > 99 (EXPONENTE_FUERA_RANGO) usando exponentes pequeños o
//     ausentes.
function fcExpMalFormada() {
  return fc.oneof(
    // Mantisa seguida de "E" sin digitos de exponente: "5E", "3.2E".
    fc
      .tuple(
        fc.integer({ min: 0, max: 99999 }),
        fc.option(fc.integer({ min: 0, max: 99999 }), { nil: null })
      )
      .map(([entero, frac]) =>
        frac === null ? `${entero}E` : `${entero}.${frac}E`
      ),
    // "E" seguida de exponente pero sin mantisa previa: el tokenizer no
    // reconoce el lexema inicial 'E' -> SINTAXIS. Exponente dentro de rango
    // para no colisionar con EXPONENTE_FUERA_RANGO.
    fc.integer({ min: 0, max: 99 }).map((n) => `E${n}`),
    // "E+" / "E-" sin digitos tras el signo (via mantisa): "7E+".
    fc
      .tuple(fc.integer({ min: 0, max: 99999 }), fc.constantFrom("+", "-"))
      .map(([m, signo]) => `${m}E${signo}`)
  );
}

// (d) Argumento de funcion mal formado: funcion prefija sin operando, o
//     seguida directamente de un operador binario o de un cierre de
//     parentesis. Todos producen SINTAXIS en el parser (parentesis siempre
//     balanceados para no caer en PARENTESIS).
function fcFuncionMalFormada() {
  const funcion = fc.constantFrom("sin", "cos", "tan", "log", "ln", "√", "∛");
  return fc.oneof(
    // Funcion sin argumento al final de la entrada: "sin".
    funcion,
    // Funcion seguida de un operador binario: "log×2".
    fc
      .tuple(funcion, fc.constantFrom("×", "÷", "^"), operandoSimple())
      .map(([f, op, b]) => `${f}${op}${b}`),
    // Funcion seguida de un operador postfijo sin operando: "cos%".
    fc
      .tuple(funcion, fc.constantFrom("x²", "x³", "x⁻¹", "%"))
      .map(([f, post]) => `${f}${post}`)
  );
}

// (e) Operador postfijo suelto sin operando a su izquierda: "%", "x²+3".
function fcPostfijoSuelto() {
  const postfijo = fc.constantFrom("x²", "x³", "x⁻¹", "%");
  return fc.oneof(
    // Postfijo al inicio de la entrada.
    postfijo,
    // Postfijo tras un operador binario: "3+%".
    fc
      .tuple(operandoSimple(), fc.constantFrom("+", "−", "×", "÷"), postfijo)
      .map(([a, op, post]) => `${a}${op}${post}`)
  );
}
