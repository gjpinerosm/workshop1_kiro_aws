// Pruebas de ejemplo (unit tests) de logaritmos, potencias y raices del
// Motor_Calculo (tarea 6.6).
//
// Verifican el calculo de log/ln/√/∛ (unarioPre) y x²/x³/x⁻¹ (unarioPost), el
// operador binario de potencia `^`, y las condiciones de error asociadas:
// DOMINIO (log/ln de ≤0, √ de negativo), DIVISION_POR_CERO (x⁻¹ de 0) y
// DESBORDAMIENTO (resultados no finitos).
//
// Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10.

import { describe, it, expect } from "vitest";
import { evaluar, TipoError } from "./engine.js";

// Comparacion relativa a 10 cifras significativas (design.md -> Testing
// Strategy): evita falsos negativos por el ruido de punto flotante.
function cercaDe(valor, esperado) {
  if (esperado === 0) return Math.abs(valor) < 1e-10;
  return Math.abs((valor - esperado) / esperado) < 1e-10;
}

describe("logaritmos: log base 10 y ln base e (Requirements 6.1, 6.2)", () => {
  it("log(1000) = 3", () => {
    const r = evaluar("log1000");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 3)).toBe(true);
  });

  it("log(1) = 0", () => {
    const r = evaluar("log1");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 0)).toBe(true);
  });

  it("ln(1) = 0", () => {
    const r = evaluar("ln1");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 0)).toBe(true);
  });

  it("ln(e) ≈ 1 usando ln(2.718281828)", () => {
    const r = evaluar("ln2.718281828459045");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 1)).toBe(true);
  });
});

describe("logaritmos: dominio (Requirement 6.3)", () => {
  it("log(0) -> DOMINIO", () => {
    const r = evaluar("log0");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DOMINIO);
  });

  it("log de negativo -> DOMINIO", () => {
    const r = evaluar("log(0−5)");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DOMINIO);
  });

  it("ln(0) -> DOMINIO", () => {
    const r = evaluar("ln0");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DOMINIO);
  });

  it("ln de negativo -> DOMINIO", () => {
    const r = evaluar("ln(0−2)");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DOMINIO);
  });
});

describe("raices: √ y ∛ (Requirements 7.4, 7.5)", () => {
  it("√9 = 3", () => {
    const r = evaluar("√9");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 3)).toBe(true);
  });

  it("√0 = 0", () => {
    const r = evaluar("√0");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 0)).toBe(true);
  });

  it("∛27 = 3", () => {
    const r = evaluar("∛27");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 3)).toBe(true);
  });

  it("∛ admite negativos: ∛(0−27) = −3", () => {
    const r = evaluar("∛(0−27)");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, -3)).toBe(true);
  });

  it("√ de negativo -> DOMINIO (Requirement 7.9)", () => {
    const r = evaluar("√(0−4)");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DOMINIO);
  });
});

describe("potencias postfijas: x², x³, x⁻¹ (Requirements 7.1, 7.2, 7.3)", () => {
  it("5x² = 25", () => {
    const r = evaluar("5x²");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 25)).toBe(true);
  });

  it("2x³ = 8", () => {
    const r = evaluar("2x³");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 8)).toBe(true);
  });

  it("4x⁻¹ = 0.25", () => {
    const r = evaluar("4x⁻¹");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 0.25)).toBe(true);
  });

  it("x⁻¹ de 0 -> DIVISION_POR_CERO (Requirement 7.8)", () => {
    const r = evaluar("0x⁻¹");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DIVISION_POR_CERO);
  });
});

describe("operador binario de potencia ^ (Requirement 7.6)", () => {
  it("2^10 = 1024", () => {
    const r = evaluar("2^10");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 1024)).toBe(true);
  });

  it("^ es asociativo a derecha: 2^3^2 = 512", () => {
    const r = evaluar("2^3^2");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 512)).toBe(true);
  });

  it("raiz como potencia fraccionaria: 9^0.5 = 3", () => {
    const r = evaluar("9^0.5");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, 3)).toBe(true);
  });
});

describe("desbordamiento en potencias (Requirement 7.10)", () => {
  it("resultado no finito de ^ -> DESBORDAMIENTO", () => {
    const r = evaluar("9E99^9");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DESBORDAMIENTO);
  });

  it("resultado no finito de x² -> DESBORDAMIENTO", () => {
    // (9×10⁹⁹)² · duplicado supera el maximo representable IEEE-754 (~1.8E308).
    const r = evaluar("9E99x²x²");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DESBORDAMIENTO);
  });
});

describe("precision minima de 10 digitos (Requirement 7.7)", () => {
  it("√2 coincide con el oraculo Math.sqrt(2)", () => {
    const r = evaluar("√2");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, Math.sqrt(2))).toBe(true);
  });

  it("log(2) coincide con el oraculo Math.log10(2)", () => {
    const r = evaluar("log2");
    expect(r.ok).toBe(true);
    expect(cercaDe(r.valor, Math.log10(2))).toBe(true);
  });
});
