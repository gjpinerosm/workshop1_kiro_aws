// Pruebas de ejemplo (unit tests) del operador de porcentaje y la constante π
// en el Evaluator del Motor_Calculo (tarea 6.1).
//
// Verifican que:
//  - `%` divide el valor entre 100 (Requirement 4.4).
//  - `π` se sustituye por Math.PI con al menos 10 cifras decimales (Requirement 8.1).
//
// Requirements: 4.4, 8.1.

import { describe, it, expect } from "vitest";
import { evaluar, TipoError } from "./engine.js";

describe("evaluar: operador de porcentaje % (Requirement 4.4)", () => {
  it("divide un valor entero entre 100", () => {
    const r = evaluar("50%");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(0.5, 12);
  });

  it("divide un valor decimal entre 100", () => {
    const r = evaluar("12.5%");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(0.125, 12);
  });

  it("aplica % sobre el resultado de una subexpresion entre parentesis", () => {
    // El postfijo se aplica al operando inmediato; con parentesis actua sobre
    // el valor de la subexpresion: (200)% = 2.
    const r = evaluar("(200)%");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(2, 12);
  });

  it("encadena % de izquierda a derecha: 100%% = 0.01", () => {
    const r = evaluar("100%%");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(0.01, 12);
  });

  it("% tiene mayor prioridad que la suma: 1+50% = 1.5", () => {
    const r = evaluar("1+50%");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(1.5, 12);
  });

  it("acepta cero: 0% = 0", () => {
    const r = evaluar("0%");
    expect(r.ok).toBe(true);
    expect(r.valor).toBe(0);
  });
});

describe("evaluar: constante π (Requirement 8.1)", () => {
  it("sustituye π por Math.PI", () => {
    const r = evaluar("π");
    expect(r.ok).toBe(true);
    expect(r.valor).toBe(Math.PI);
  });

  it("π tiene al menos 10 cifras decimales de precision (≥ 3.1415926535)", () => {
    const r = evaluar("π");
    expect(r.ok).toBe(true);
    // Requirement 8.1: el valor debe tener al menos 10 cifras decimales de
    // precision. Math.PI (3.141592653589793) coincide con π en ≥ 10 decimales.
    expect(r.valor).toBeGreaterThanOrEqual(3.1415926535);
    expect(Math.abs(r.valor - Math.PI)).toBeLessThan(1e-12);
  });

  it("π participa en operaciones aritmeticas: π×2", () => {
    const r = evaluar("π×2");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(Math.PI * 2, 12);
  });

  it("combina π con porcentaje: π% = π/100", () => {
    const r = evaluar("π%");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(Math.PI / 100, 12);
  });
});
