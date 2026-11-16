// Pruebas de ejemplo (unit tests) del Tokenizer del Motor_Calculo (tarea 2.1).
//
// Verifican el reconocimiento de cada tipo de Token del modelo de datos
// (design.md -> Token), la interpretacion de la notacion EXP y la emision de
// los errores tipados ErrorCalculo(SINTAXIS) y ErrorCalculo(EXPONENTE_FUERA_RANGO).
//
// Requirements: 3.7, 4.2, 8.2, 8.3, 8.4, 8.5.

import { describe, it, expect } from "vitest";
import { tokenizar, TipoToken, ErrorCalculo, TipoError } from "./engine.js";

describe("tokenizar: reconocimiento de tipos de Token", () => {
  it("reconoce NUMERO decimal con punto", () => {
    expect(tokenizar("3.14")).toEqual([
      { tipo: TipoToken.NUMERO, lexema: "3.14", valor: 3.14 },
    ]);
  });

  it("reconoce NUMERO que empieza por punto decimal", () => {
    expect(tokenizar(".5")).toEqual([
      { tipo: TipoToken.NUMERO, lexema: ".5", valor: 0.5 },
    ]);
  });

  it("reconoce los OPERADOR binarios + − × ÷ ^", () => {
    const tokens = tokenizar("+−×÷^");
    expect(tokens.map((t) => t.tipo)).toEqual(Array(5).fill(TipoToken.OPERADOR));
    expect(tokens.map((t) => t.lexema)).toEqual(["+", "−", "×", "÷", "^"]);
  });

  it("reconoce las FUNCION_PREFIJA sin cos tan log ln √ ∛", () => {
    const tokens = tokenizar("sincostanlogln√∛");
    expect(tokens.map((t) => t.lexema)).toEqual([
      "sin",
      "cos",
      "tan",
      "log",
      "ln",
      "√",
      "∛",
    ]);
    expect(
      tokens.every((t) => t.tipo === TipoToken.FUNCION_PREFIJA)
    ).toBe(true);
  });

  it("reconoce los OPERADOR_POSTFIJO x² x³ x⁻¹ %", () => {
    const tokens = tokenizar("x²x³x⁻¹%");
    expect(tokens.map((t) => t.lexema)).toEqual(["x²", "x³", "x⁻¹", "%"]);
    expect(
      tokens.every((t) => t.tipo === TipoToken.OPERADOR_POSTFIJO)
    ).toBe(true);
  });

  it("no confunde x⁻¹ con x²/x³ (coincidencia mas larga primero)", () => {
    expect(tokenizar("x⁻¹")).toEqual([
      { tipo: TipoToken.OPERADOR_POSTFIJO, lexema: "x⁻¹" },
    ]);
  });

  it("reconoce PAREN_IZQ y PAREN_DER", () => {
    const tokens = tokenizar("()");
    expect(tokens.map((t) => t.tipo)).toEqual([
      TipoToken.PAREN_IZQ,
      TipoToken.PAREN_DER,
    ]);
  });

  it("reconoce la CONSTANTE π con su valor Math.PI", () => {
    expect(tokenizar("π")).toEqual([
      { tipo: TipoToken.CONSTANTE, lexema: "π", valor: Math.PI },
    ]);
  });

  it("ignora los espacios en blanco", () => {
    const tokens = tokenizar("3 + 4");
    expect(tokens.map((t) => t.lexema)).toEqual(["3", "+", "4"]);
  });

  it("tokeniza una expresion compuesta", () => {
    const tokens = tokenizar("sin(π)×2^3+log(100)");
    expect(tokens.map((t) => t.lexema)).toEqual([
      "sin",
      "(",
      "π",
      ")",
      "×",
      "2",
      "^",
      "3",
      "+",
      "log",
      "(",
      "100",
      ")",
    ]);
  });
});

describe("tokenizar: notacion EXP", () => {
  it("interpreta M E N como M × 10^N en el valor del NUMERO", () => {
    const [token] = tokenizar("5E3");
    expect(token.tipo).toBe(TipoToken.NUMERO);
    expect(token.lexema).toBe("5E3");
    expect(token.valor).toBeCloseTo(5000, 10);
  });

  it("acepta exponente con signo", () => {
    expect(tokenizar("2.5E-2")[0].valor).toBeCloseTo(0.025, 10);
    expect(tokenizar("2.5E+2")[0].valor).toBeCloseTo(250, 10);
  });

  it("acepta los limites del rango -99..99", () => {
    expect(() => tokenizar("1E99")).not.toThrow();
    expect(() => tokenizar("1E-99")).not.toThrow();
  });
});

describe("tokenizar: errores tipados", () => {
  it("lanza SINTAXIS ante un lexema no reconocido", () => {
    expect(() => tokenizar("@")).toThrowError(ErrorCalculo);
    try {
      tokenizar("@");
    } catch (e) {
      expect(e.tipo).toBe(TipoError.SINTAXIS);
    }
  });

  it("lanza SINTAXIS ante EXP sin mantisa", () => {
    try {
      tokenizar("E5");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      // "E5" no empieza por digito/punto, por lo que es lexema no reconocido:
      // igualmente SINTAXIS.
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.SINTAXIS);
    }
  });

  it("lanza SINTAXIS ante EXP sin exponente (E final)", () => {
    // "5E" termina en `E` sin digitos de exponente: EXP mal formada.
    try {
      tokenizar("5E");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.SINTAXIS);
    }
  });

  it("segmenta un exponente no entero como numero + punto decimal", () => {
    // El Tokenizer no valida la estructura entre numeros: en "5E2.5" el `.5`
    // inicia un NUMERO nuevo; el error de estructura lo detecta el parser.
    const tokens = tokenizar("5E2.5");
    expect(tokens.map((t) => t.lexema)).toEqual(["5E2", ".5"]);
  });

  it("lanza EXPONENTE_FUERA_RANGO cuando |N| > 99", () => {
    try {
      tokenizar("5E150");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.EXPONENTE_FUERA_RANGO);
    }
  });
});
