// Pruebas de ejemplo (unit tests) del Evaluator del Motor_Calculo (tarea 4.1):
// aritmetica base, parentesis y precedencia.
//
// Verifican el recorrido del AST sobre los operadores `+ − × ÷ ^`, la constante
// π y los parentesis, asi como la emision de los errores tipados
// DIVISION_POR_CERO y DESBORDAMIENTO. El motor nunca lanza excepciones no
// controladas: todo fallo se devuelve como { ok:false, error }.
//
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 4.1.

import { describe, it, expect } from "vitest";
import { evaluar, TipoError } from "./engine.js";

describe("evaluar: aritmetica base", () => {
  it("suma dos operandos (3.1)", () => {
    expect(evaluar("2+3")).toEqual({ ok: true, valor: 5 });
  });

  it("resta dos operandos con el signo menos Unicode − (3.2)", () => {
    expect(evaluar("10−4")).toEqual({ ok: true, valor: 6 });
  });

  it("multiplica dos operandos (3.3)", () => {
    expect(evaluar("6×7")).toEqual({ ok: true, valor: 42 });
  });

  it("divide dos operandos (3.4)", () => {
    expect(evaluar("20÷4")).toEqual({ ok: true, valor: 5 });
  });

  it("eleva a una potencia (7.6)", () => {
    expect(evaluar("2^10")).toEqual({ ok: true, valor: 1024 });
  });

  it("evalua la constante π", () => {
    const r = evaluar("π");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(Math.PI, 10);
  });

  it("interpreta la notacion EXP en un literal", () => {
    const r = evaluar("5E3");
    expect(r.ok).toBe(true);
    expect(r.valor).toBeCloseTo(5000, 10);
  });
});

describe("evaluar: precedencia y asociatividad (3.5, 4.1)", () => {
  it("× y ÷ se evaluan antes que + y −", () => {
    expect(evaluar("2+3×4")).toEqual({ ok: true, valor: 14 });
    expect(evaluar("2×3+4")).toEqual({ ok: true, valor: 10 });
  });

  it("los operadores de igual precedencia se evaluan de izquierda a derecha", () => {
    expect(evaluar("10−3−2")).toEqual({ ok: true, valor: 5 });
    expect(evaluar("100÷10÷2")).toEqual({ ok: true, valor: 5 });
  });

  it("^ es asociativo a derecha", () => {
    // 2^(3^2) = 2^9 = 512, no (2^3)^2 = 64.
    expect(evaluar("2^3^2")).toEqual({ ok: true, valor: 512 });
  });

  it("los parentesis se resuelven desde el nivel mas interno", () => {
    expect(evaluar("(2+3)×4")).toEqual({ ok: true, valor: 20 });
    expect(evaluar("2×(3+(4−1))")).toEqual({ ok: true, valor: 12 });
  });
});

describe("evaluar: errores tipados sin excepciones no controladas", () => {
  it("DIVISION_POR_CERO cuando el divisor de ÷ es 0 (3.6)", () => {
    const r = evaluar("5÷0");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DIVISION_POR_CERO);
  });

  it("DIVISION_POR_CERO tambien cuando el divisor es una subexpresion que vale 0", () => {
    const r = evaluar("5÷(3−3)");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DIVISION_POR_CERO);
  });

  it("DESBORDAMIENTO ante un resultado no finito (3.8)", () => {
    // 9E99^5 = 9^5 × 10^495 ≈ 5.9E499 supera el maximo de IEEE-754 (~1.8E308).
    const r = evaluar("9E99^5");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.DESBORDAMIENTO);
  });

  it("propaga SINTAXIS de una expresion incompleta (3.7)", () => {
    const r = evaluar("2+");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.SINTAXIS);
  });

  it("propaga PARENTESIS de parentesis no balanceados (4.5)", () => {
    const r = evaluar("(2+3");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.PARENTESIS);
  });

  it("reporta SINTAXIS ante una expresion vacia", () => {
    const r = evaluar("");
    expect(r.ok).toBe(false);
    expect(r.error.tipo).toBe(TipoError.SINTAXIS);
  });

  it("nunca lanza: siempre devuelve un objeto de resultado", () => {
    expect(() => evaluar("@#$")).not.toThrow();
    expect(evaluar("@#$").ok).toBe(false);
  });
});
