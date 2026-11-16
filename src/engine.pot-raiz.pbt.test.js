// Feature: scientific-calculator, Property 6: Potencias y raíces coinciden con
// su oráculo.
//
// Para todo valor v: x² = v², x³ = v³, √v (para v ≥ 0) = Math.sqrt(v),
// ∛v = Math.cbrt(v) y, para toda base b y exponente e, b^e = Math.pow(b, e),
// todos dentro de una tolerancia de 10 cifras significativas.
//
// Validates: Requirements 7.1, 7.2, 7.4, 7.5, 7.6, 7.7
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera
// valores como los teclearia el usuario y construye cada Expresion usando los
// glifos del Motor_Calculo (x², x³, √, ∛, ^). Compara el Resultado contra el
// oraculo Math.pow/sqrt/cbrt con tolerancia relativa equivalente a 10 cifras
// significativas. Las combinaciones que producen un resultado no finito
// (desbordamiento) se filtran del subdominio, porque ahi el motor devuelve
// DESBORDAMIENTO en lugar de un valor (Requirement 7.10, fuera del alcance de
// esta propiedad de equivalencia numerica).

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar } from "./engine.js";

// Tolerancia relativa equivalente a 10 cifras significativas: dos valores se
// consideran iguales si su diferencia relativa es menor que 10^-10. Cuando el
// oraculo es 0 la comparacion degenera en igualdad exacta (el motor y el
// oraculo calculan el mismo 0 cuando el operando es 0).
const TOLERANCIA_RELATIVA = 1e-10;

function coincideConTolerancia(actual, esperado) {
  if (esperado === 0) {
    return actual === 0;
  }
  return Math.abs(actual - esperado) / Math.abs(esperado) < TOLERANCIA_RELATIVA;
}

// Generador del valor v tal como lo teclearia el usuario: un literal decimal
// plano no negativo (parte entera y, opcionalmente, parte fraccionaria). Se
// omite el signo inicial porque la gramatica del motor (design.md -> Parser) no
// define el menos unario: un `−` inicial seria un OPERADOR binario sin operando
// izquierdo. Para obtener un operando negativo (p. ej. en ∛) se antepone
// `0−` dentro de parentesis, que el motor evalua a un valor negativo.
const valorNoNegativo = fc
  .tuple(
    fc.integer({ min: 0, max: 999999 }), // parte entera
    fc.option(fc.integer({ min: 0, max: 999999 }), { nil: null }) // fraccion
  )
  .map(([entero, fraccion]) =>
    fraccion === null ? `${entero}` : `${entero}.${fraccion}`
  );

describe("Property 6: Potencias y raíces coinciden con su oráculo", () => {
  it("x² (v²) coincide con v**2 dentro de 10 cifras significativas", () => {
    fc.assert(
      fc.property(valorNoNegativo, (v) => {
        const base = Number(v);
        const esperado = base ** 2;
        fc.pre(Number.isFinite(esperado));

        const resultado = evaluar(`${v}x²`);
        expect(resultado.ok).toBe(true);
        expect(coincideConTolerancia(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("x³ (v³) coincide con v**3 dentro de 10 cifras significativas", () => {
    fc.assert(
      fc.property(valorNoNegativo, (v) => {
        const base = Number(v);
        const esperado = base ** 3;
        fc.pre(Number.isFinite(esperado));

        const resultado = evaluar(`${v}x³`);
        expect(resultado.ok).toBe(true);
        expect(coincideConTolerancia(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("√v (v ≥ 0) coincide con Math.sqrt(v) dentro de 10 cifras significativas", () => {
    fc.assert(
      fc.property(valorNoNegativo, (v) => {
        const radicando = Number(v);
        const esperado = Math.sqrt(radicando);
        fc.pre(Number.isFinite(esperado));

        const resultado = evaluar(`√${v}`);
        expect(resultado.ok).toBe(true);
        expect(coincideConTolerancia(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("∛v coincide con Math.cbrt(v) para v ≥ 0 y v < 0 dentro de 10 cifras significativas", () => {
    fc.assert(
      fc.property(valorNoNegativo, fc.boolean(), (v, negativo) => {
        // La raiz cubica admite valores negativos (Requirement 7.5). Como la
        // gramatica no tiene menos unario, un argumento negativo se construye
        // con `0−v` entre parentesis: ∛(0−v). El oraculo usa el valor firmado.
        const magnitud = Number(v);
        const argumento = negativo ? -magnitud : magnitud;
        const esperado = Math.cbrt(argumento);
        fc.pre(Number.isFinite(esperado));

        const expresion = negativo ? `∛(0−${v})` : `∛${v}`;
        const resultado = evaluar(expresion);
        expect(resultado.ok).toBe(true);
        expect(coincideConTolerancia(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("b^e coincide con Math.pow(b, e) dentro de 10 cifras significativas", () => {
    // Base b no negativa (la gramatica no admite base negativa literal) y
    // exponente e entero pequeño no negativo: cubre el operador `^` sin caer
    // en NaN (p. ej. base negativa con exponente fraccionario) ni en
    // desbordamiento sistematico. Los casos no finitos se filtran con fc.pre.
    const baseGen = valorNoNegativo;
    const exponenteGen = fc.integer({ min: 0, max: 64 });

    fc.assert(
      fc.property(baseGen, exponenteGen, (b, e) => {
        const base = Number(b);
        const esperado = Math.pow(base, e);
        fc.pre(Number.isFinite(esperado));

        const resultado = evaluar(`${b}^${e}`);
        expect(resultado.ok).toBe(true);
        expect(coincideConTolerancia(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
