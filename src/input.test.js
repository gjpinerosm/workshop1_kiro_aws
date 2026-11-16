// Pruebas de ejemplo (unit tests) del Input Handler puro (tarea 11.1).
//
// Verifican que manejarTecla mapea cada DescriptorTecla a la transicion de
// estado correcta de state.js, sin mutar el estado recibido ni depender del
// DOM.
//
// Requirements: 2.1, 2.2, 2.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.2, 10.3,
// 10.4.

import { describe, it, expect } from "vitest";
import {
  estadoInicial,
  insertarToken,
  insertarDecimal,
  del,
  ac,
  insertarAns,
  aplicarIgual,
  EstadoError,
} from "./state.js";
import { manejarTecla, esDecorativa, TECLAS_DECORATIVAS } from "./input.js";

describe("manejarTecla: inserciones de token", () => {
  it("un digito se inserta en la Expresion (Requirement 2.1)", () => {
    const estado = manejarTecla("7", estadoInicial());
    expect(estado.expresion).toBe("7");
    expect(estado.cursor).toBe(1);
  });

  it("los operadores, parentesis, π, EXP y funciones insertan su lexema", () => {
    const descriptores = [
      "+", "−", "×", "÷", "^", "(", ")", "π", "EXP",
      "sin", "cos", "tan", "log", "ln", "√", "∛", "x²", "x³", "x⁻¹", "%",
    ];
    for (const d of descriptores) {
      expect(manejarTecla(d, estadoInicial())).toEqual(
        insertarToken(estadoInicial(), d)
      );
    }
  });

  it("inserta el token en la posicion del cursor de una Expresion existente", () => {
    const base = insertarToken(estadoInicial(), "2+3");
    expect(manejarTecla("4", base)).toEqual(insertarToken(base, "4"));
  });
});

describe("manejarTecla: separador decimal", () => {
  it("'.' delega en insertarDecimal e inserta el punto en un numero sin punto (Requirement 4.2)", () => {
    const base = insertarToken(estadoInicial(), "12");
    expect(manejarTecla(".", base)).toEqual(insertarDecimal(base));
    expect(manejarTecla(".", base).expresion).toBe("12.");
  });

  it("'.' se ignora si el numero en curso ya contiene un punto (Requirement 4.3)", () => {
    const base = insertarToken(estadoInicial(), "12.5");
    expect(manejarTecla(".", base)).toEqual(base);
  });
});

describe("manejarTecla: controles DEL/AC/Ans/=", () => {
  it("DEL borra el ultimo caracter (Requirement 9.2)", () => {
    const base = insertarToken(estadoInicial(), "123");
    expect(manejarTecla("DEL", base)).toEqual(del(base));
    expect(manejarTecla("DEL", base).expresion).toBe("12");
  });

  it("DEL sobre Expresion vacia no cambia nada (Requirement 9.3)", () => {
    const base = estadoInicial();
    expect(manejarTecla("DEL", base)).toEqual(base);
  });

  it("AC vacia la Expresion y restablece el estado inicial (Requirements 9.1, 9.5)", () => {
    const base = aplicarIgual(insertarToken(estadoInicial(), "2+3"));
    expect(manejarTecla("AC", base)).toEqual(ac(base));
    expect(manejarTecla("AC", base)).toEqual(estadoInicial());
  });

  it("Ans inserta el ultimo Resultado en la posicion del cursor (Requirement 9.4)", () => {
    // Tras '=', la Expresion "2+3" y el cursor al final se conservan; Ans=5 se
    // inserta en el cursor, resultando "2+3" + "5".
    const conResultado = aplicarIgual(insertarToken(estadoInicial(), "2+3"));
    expect(manejarTecla("Ans", conResultado)).toEqual(insertarAns(conResultado));
    expect(manejarTecla("Ans", conResultado).expresion).toBe("2+35");
  });

  it("Ans sin Resultado previo inserta 0 (Requirement 9.5)", () => {
    const base = estadoInicial();
    expect(manejarTecla("Ans", base).expresion).toBe("0");
  });

  it("'=' invoca el Motor_Calculo y muestra el Resultado (Requirement 2.2)", () => {
    const base = insertarToken(estadoInicial(), "2+3");
    const resultado = manejarTecla("=", base);
    expect(resultado).toEqual(aplicarIgual(base));
    expect(resultado.lineaInferior).toBe("5");
    expect(resultado.ans).toBe(5);
    expect(resultado.expresion).toBe("2+3");
  });

  it("'=' sobre una Expresion invalida fija el error y conserva la Expresion (Requirement 2.3)", () => {
    const base = insertarToken(estadoInicial(), "2+");
    const resultado = manejarTecla("=", base);
    expect(resultado).toEqual(aplicarIgual(base));
    expect(resultado.estadoError).not.toBe(EstadoError.NINGUNO);
    expect(resultado.expresion).toBe("2+");
  });
});

describe("manejarTecla: teclas decorativas (Requirements 10.2, 10.3, 10.4)", () => {
  it("cada tecla decorativa deja el estado identico", () => {
    const base = insertarToken(estadoInicial(), "9×9");
    for (const d of TECLAS_DECORATIVAS) {
      expect(esDecorativa(d)).toBe(true);
      expect(manejarTecla(d, base)).toEqual(base);
    }
  });

  it("TECLAS_DECORATIVAS contiene exactamente las seis teclas del hardware", () => {
    expect([...TECLAS_DECORATIVAS].sort()).toEqual(
      ["ALPHA", "MODE", "RCL", "SHIFT", "hyp", "nCr"].sort()
    );
  });
});

describe("manejarTecla: robustez", () => {
  it("un descriptor no decorativo ni de control se inserta como token", () => {
    // Las teclas de entrada (digitos, operadores, funciones, π, EXP...) comparten
    // la rama generica insertarToken: el `data-key` coincide con el lexema que
    // reconoce el Motor_Calculo, de modo que cualquier descriptor de entrada se
    // inserta tal cual en la Expresion.
    const base = insertarToken(estadoInicial(), "5");
    expect(manejarTecla("π", base)).toEqual(insertarToken(base, "π"));
  });

  it("un descriptor ausente o vacio no altera el estado", () => {
    const base = insertarToken(estadoInicial(), "5");
    expect(manejarTecla("", base)).toEqual(base);
    expect(manejarTecla(undefined, base)).toEqual(base);
  });

  it("no muta el estado recibido", () => {
    const base = Object.freeze(insertarToken(estadoInicial(), "7"));
    // Si manejarTecla intentara mutar el objeto congelado, lanzaria en modo
    // estricto; al ser puro, simplemente devuelve un nuevo estado.
    expect(() => manejarTecla("8", base)).not.toThrow();
    expect(base.expresion).toBe("7");
  });
});
