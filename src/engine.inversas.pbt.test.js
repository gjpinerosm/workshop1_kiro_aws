// Feature: scientific-calculator, Property 7: Raiz e inverso son operaciones
// inversas de potencia.
//
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Verifica las
// tres identidades que ligan las funciones de potencia con sus inversas, tal
// como las expresa el usuario mediante las teclas del Motor_Calculo:
//
//   - √(v²) = |v|   (Requirements 7.1 cuadrado, 7.4 raiz cuadrada)
//   - ∛(v³) = v     (Requirements 7.2 cubo, 7.5 raiz cubica)
//   - (v⁻¹)⁻¹ = v   (Requirement 7.3 inverso), con v ≠ 0
//
// Las Expresiones se construyen con los glifos que reconoce el Tokenizer: los
// operadores postfijos `x²`, `x³`, `x⁻¹` y las funciones prefijas `√`, `∛`.
//
// LIMITACION DE DOMINIO (gramatica sin menos unario): el Parser del motor
// (design.md -> Parser) no define el signo negativo unario, de modo que un
// literal negativo no es expresable; un `−` inicial seria un operador binario
// sin operando izquierdo. Por ello:
//   - Para √(v²) = |v| se generan v ≥ 0, donde |v| = v y la identidad se puede
//     comprobar con un unico valor esperado sin depender del signo.
//   - Para ∛(v³) = v y (v⁻¹)⁻¹ = v se generan v > 0, el unico subdominio
//     expresable como literal; la admision de negativos por parte de ∛ y x⁻¹
//     (Requirement 7.5) no puede ejercitarse desde la Expresion y queda fuera
//     del alcance verificable de esta propiedad.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar } from "./engine.js";

// Tolerancia relativa de ~10 cifras significativas (Requirement 7.7): el error
// relativo entre el valor obtenido y el esperado debe ser menor que 1e-10.
const TOLERANCIA_RELATIVA = 1e-10;

// Compara `obtenido` contra `esperado` con tolerancia relativa de 10 cifras
// significativas. Cerca de cero el error relativo no esta bien definido, asi
// que se admite tambien un error absoluto pequeño.
function cercaDe(obtenido, esperado) {
  const escala = Math.max(1, Math.abs(esperado));
  return Math.abs(obtenido - esperado) <= TOLERANCIA_RELATIVA * escala;
}

// Genera un valor numerico junto con su literal decimal tecleable. Construir el
// literal de forma controlada (parte entera + hasta 6 decimales) evita que la
// Expresion contenga la notacion cientifica de JS (p. ej. "5e-324"), cuyo
// marcador `e` no pertenece a la gramatica del Tokenizer (design.md -> Token:
// la notacion EXP usa `E`, no `e`). Se devuelve el { v, texto } para que el
// valor esperado coincida exactamente con lo que lee el motor.
//
// `min`/`max` acotan la magnitud; `permitirCero` decide si se admite el 0.
function generadorDecimal({ min, max, permitirCero }) {
  return fc
    .tuple(
      fc.integer({ min, max }), // parte entera
      fc.integer({ min: 0, max: 999999 }) // parte fraccionaria (6 digitos)
    )
    .map(([entero, frac]) => {
      const texto = `${entero}.${String(frac).padStart(6, "0")}`;
      return { v: Number(texto), texto };
    })
    .filter(({ v }) => (permitirCero ? true : v !== 0));
}

describe("Property 7: Raiz e inverso son operaciones inversas de potencia", () => {
  it("√(v²) = |v| para v ≥ 0 con tolerancia de 10 cifras significativas", () => {
    // v no negativo acotado para que v² se mantenga muy por debajo del limite
    // de overflow (Number.MAX_VALUE ~ 1.8e308): con v ≤ 1e6, v² ≤ ~1e12.
    const valor = generadorDecimal({ min: 0, max: 1000000, permitirCero: true });

    fc.assert(
      fc.property(valor, ({ v, texto }) => {
        const expresion = `√(${texto}x²)`;

        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        expect(resultado.ok).toBe(true);
        // Para v ≥ 0, |v| = v: raiz cuadrada del cuadrado recupera el valor.
        expect(cercaDe(resultado.valor, v)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("∛(v³) = v para v > 0 con tolerancia de 10 cifras significativas", () => {
    // v positivo acotado para que v³ no desborde: con v ≤ 1e4, v³ ≤ ~1e12.
    const valor = generadorDecimal({ min: 0, max: 10000, permitirCero: false });

    fc.assert(
      fc.property(valor, ({ v, texto }) => {
        const expresion = `∛(${texto}x³)`;

        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        expect(resultado.ok).toBe(true);
        expect(cercaDe(resultado.valor, v)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("(v⁻¹)⁻¹ = v para v ≠ 0 con tolerancia de 10 cifras significativas", () => {
    // v positivo y alejado de cero: el inverso de un valor muy pequeño podria
    // desbordar, y el inverso de 0 es un error de division por cero
    // (Requirement 7.8), fuera del alcance de esta identidad. El generador
    // excluye el 0 y, al usar hasta 6 decimales, el menor valor no nulo es
    // 0.000001 = 1e-6, cuyo inverso (1e6) y su inverso (1e-6) no desbordan.
    const valor = generadorDecimal({ min: 0, max: 1000000, permitirCero: false });

    fc.assert(
      fc.property(valor, ({ v, texto }) => {
        const expresion = `(${texto}x⁻¹)x⁻¹`;

        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        expect(resultado.ok).toBe(true);
        expect(cercaDe(resultado.valor, v)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
