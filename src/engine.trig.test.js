// Pruebas de ejemplo (unit tests) de las funciones trigonometricas en grados
// del Evaluator del Motor_Calculo (tarea 6.3).
//
// Verifican que sin/cos/tan operan sobre grados sexagesimales (conversion
// rad = grados × π/180 antes de Math.*), que tan señala DOMINIO en 90° + 180°·k
// (coseno cero) y que los resultados despreciables (|valor| < 1e-10) se
// normalizan a 0 exacto.
//
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6.

import { describe, it, expect } from "vitest";
import { evaluar, TipoError } from "./engine.js";

// Oraculo: convierte grados a radianes como lo exige el diseño.
const rad = (g) => (g * Math.PI) / 180;

describe("trigonometria en grados: sin", () => {
  it("sin(0) = 0", () => {
    expect(evaluar("sin0")).toEqual({ ok: true, valor: 0 });
  });

  it("sin(90) = 1", () => {
    const r = evaluar("sin90");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(1, 10);
  });

  it("sin(30) = 0.5", () => {
    const r = evaluar("sin30");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(0.5, 10);
  });

  it("sin(45) coincide con el oraculo en radianes", () => {
    const r = evaluar("sin45");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(Math.sin(rad(45)), 10);
  });
});

describe("trigonometria en grados: cos", () => {
  it("cos(0) = 1", () => {
    expect(evaluar("cos0")).toEqual({ ok: true, valor: 1 });
  });

  it("cos(60) = 0.5", () => {
    const r = evaluar("cos60");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(0.5, 10);
  });

  it("cos(180) = -1", () => {
    const r = evaluar("cos180");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(-1, 10);
  });
});

describe("trigonometria en grados: tan", () => {
  it("tan(0) = 0", () => {
    expect(evaluar("tan0")).toEqual({ ok: true, valor: 0 });
  });

  it("tan(45) = 1", () => {
    const r = evaluar("tan45");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(1, 10);
  });

  it("tan(180) se normaliza a 0 exacto", () => {
    expect(evaluar("tan180")).toEqual({ ok: true, valor: 0 });
  });
});

describe("normalizacion de resultados despreciables a 0 (Requirement 5.6)", () => {
  it("sin(180) se muestra como 0 exacto, no como un residuo flotante", () => {
    expect(evaluar("sin180")).toEqual({ ok: true, valor: 0 });
  });

  it("cos(90) se muestra como 0 exacto", () => {
    expect(evaluar("cos90")).toEqual({ ok: true, valor: 0 });
  });

  it("sin(360) se muestra como 0 exacto", () => {
    expect(evaluar("sin360")).toEqual({ ok: true, valor: 0 });
  });
});

describe("tan indefinida: DOMINIO en 90° + 180°·k (Requirement 5.5)", () => {
  it("tan(90) produce error de DOMINIO", () => {
    const r = evaluar("tan90");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DOMINIO);
  });

  it("tan(270) produce error de DOMINIO", () => {
    const r = evaluar("tan270");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DOMINIO);
  });

  it("tan(-90) produce error de DOMINIO", () => {
    const r = evaluar("tan(0−90)");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DOMINIO);
  });

  it("tan(450) produce error de DOMINIO", () => {
    const r = evaluar("tan450");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DOMINIO);
  });
});

describe("trigonometria con argumentos compuestos y constantes", () => {
  it("cos(π × 0) = cos(0) = 1 usando la constante pi como argumento numerico", () => {
    // π grados convertido a radianes; comparado con el oraculo.
    const r = evaluar("cosπ");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(Math.cos(rad(Math.PI)), 10);
  });

  it("sin aplicado a una expresion entre parentesis respeta los grados", () => {
    const r = evaluar("sin(30+60)");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(1, 10);
  });
});
