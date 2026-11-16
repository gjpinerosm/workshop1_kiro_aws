// Pruebas de ejemplo (unit tests) del Parser recursivo descendente del
// Motor_Calculo (tarea 3.1).
//
// Verifican la construccion del arbol de sintaxis abstracta (NodoAST) segun la
// gramatica por niveles de precedencia (design.md -> Motor_Calculo: Parser) y
// la emision de los errores tipados ErrorCalculo(PARENTESIS) y
// ErrorCalculo(SINTAXIS) ante entradas descompensadas o mal formadas.
//
// Requirements: 3.5, 3.7, 4.1, 4.5.

import { describe, it, expect } from "vitest";
import { tokenizar, parsear, ErrorCalculo, TipoError } from "./engine.js";

// Atajo: tokeniza y parsea una cadena de Expresion en un solo paso.
function ast(expresion) {
  return parsear(tokenizar(expresion));
}

describe("parsear: nodos primarios", () => {
  it("construye un nodo numero", () => {
    expect(ast("42")).toEqual({ clase: "numero", valor: 42 });
  });

  it("construye un nodo numero desde notacion EXP", () => {
    expect(ast("5E3")).toEqual({ clase: "numero", valor: 5000 });
  });

  it("construye un nodo constante para π", () => {
    expect(ast("π")).toEqual({ clase: "constante", nombre: "π" });
  });

  it("resuelve los parentesis devolviendo la expresion interna", () => {
    expect(ast("(7)")).toEqual({ clase: "numero", valor: 7 });
  });
});

describe("parsear: precedencia aditiva y multiplicativa", () => {
  it("× tiene mayor precedencia que + (2+3×4 => 2+(3×4))", () => {
    expect(ast("2+3×4")).toEqual({
      clase: "binario",
      op: "+",
      izq: { clase: "numero", valor: 2 },
      der: {
        clase: "binario",
        op: "×",
        izq: { clase: "numero", valor: 3 },
        der: { clase: "numero", valor: 4 },
      },
    });
  });

  it("+ y − son asociativos a izquierda (1−2+3 => (1−2)+3)", () => {
    expect(ast("1−2+3")).toEqual({
      clase: "binario",
      op: "+",
      izq: {
        clase: "binario",
        op: "−",
        izq: { clase: "numero", valor: 1 },
        der: { clase: "numero", valor: 2 },
      },
      der: { clase: "numero", valor: 3 },
    });
  });

  it("× y ÷ son asociativos a izquierda (8÷2×4 => (8÷2)×4)", () => {
    expect(ast("8÷2×4")).toEqual({
      clase: "binario",
      op: "×",
      izq: {
        clase: "binario",
        op: "÷",
        izq: { clase: "numero", valor: 8 },
        der: { clase: "numero", valor: 2 },
      },
      der: { clase: "numero", valor: 4 },
    });
  });

  it("los parentesis alteran la precedencia natural ((2+3)×4)", () => {
    expect(ast("(2+3)×4")).toEqual({
      clase: "binario",
      op: "×",
      izq: {
        clase: "binario",
        op: "+",
        izq: { clase: "numero", valor: 2 },
        der: { clase: "numero", valor: 3 },
      },
      der: { clase: "numero", valor: 4 },
    });
  });
});

describe("parsear: potencia asociativa a derecha", () => {
  it("^ es asociativo a derecha (2^3^2 => 2^(3^2))", () => {
    expect(ast("2^3^2")).toEqual({
      clase: "binario",
      op: "^",
      izq: { clase: "numero", valor: 2 },
      der: {
        clase: "binario",
        op: "^",
        izq: { clase: "numero", valor: 3 },
        der: { clase: "numero", valor: 2 },
      },
    });
  });

  it("^ tiene mayor precedencia que × (2×3^2 => 2×(3^2))", () => {
    expect(ast("2×3^2")).toEqual({
      clase: "binario",
      op: "×",
      izq: { clase: "numero", valor: 2 },
      der: {
        clase: "binario",
        op: "^",
        izq: { clase: "numero", valor: 3 },
        der: { clase: "numero", valor: 2 },
      },
    });
  });
});

describe("parsear: operadores unarios prefijos y postfijos", () => {
  it("construye un nodo unarioPre para una funcion prefija", () => {
    expect(ast("sin30")).toEqual({
      clase: "unarioPre",
      fn: "sin",
      arg: { clase: "numero", valor: 30 },
    });
  });

  it("encadena funciones prefijas (sin cos 0)", () => {
    expect(ast("sincos0")).toEqual({
      clase: "unarioPre",
      fn: "sin",
      arg: {
        clase: "unarioPre",
        fn: "cos",
        arg: { clase: "numero", valor: 0 },
      },
    });
  });

  it("construye un nodo unarioPost para x²", () => {
    expect(ast("5x²")).toEqual({
      clase: "unarioPost",
      op: "x²",
      arg: { clase: "numero", valor: 5 },
    });
  });

  it("aplica postfijos encadenados de izquierda a derecha (5x²x³)", () => {
    expect(ast("5x²x³")).toEqual({
      clase: "unarioPost",
      op: "x³",
      arg: {
        clase: "unarioPost",
        op: "x²",
        arg: { clase: "numero", valor: 5 },
      },
    });
  });

  it("el postfijo % envuelve su operando", () => {
    expect(ast("50%")).toEqual({
      clase: "unarioPost",
      op: "%",
      arg: { clase: "numero", valor: 50 },
    });
  });

  it("^ asocia a derecha por debajo del postfijo (2^3x² => 2^(3x²))", () => {
    expect(ast("2^3x²")).toEqual({
      clase: "binario",
      op: "^",
      izq: { clase: "numero", valor: 2 },
      der: {
        clase: "unarioPost",
        op: "x²",
        arg: { clase: "numero", valor: 3 },
      },
    });
  });
});

describe("parsear: errores de parentesis", () => {
  it("lanza PARENTESIS ante apertura sin cierre", () => {
    try {
      ast("(2+3");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.PARENTESIS);
    }
  });

  it("lanza PARENTESIS ante cierre sobrante", () => {
    try {
      ast("2+3)");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.PARENTESIS);
    }
  });

  it("lanza PARENTESIS ante cierre inesperado en posicion de operando", () => {
    try {
      ast("2+)");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.PARENTESIS);
    }
  });
});

describe("parsear: errores de sintaxis", () => {
  it("lanza SINTAXIS ante lista de tokens vacia", () => {
    try {
      parsear([]);
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.SINTAXIS);
    }
  });

  it("lanza SINTAXIS ante expresion incompleta (operador al final)", () => {
    try {
      ast("2+");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.SINTAXIS);
    }
  });

  it("lanza SINTAXIS ante operador binario sin operando izquierdo", () => {
    try {
      ast("×3");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.SINTAXIS);
    }
  });

  it("lanza SINTAXIS ante dos operandos consecutivos (3 4)", () => {
    try {
      ast("3 4");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.SINTAXIS);
    }
  });

  it("lanza SINTAXIS ante postfijo sin operando", () => {
    try {
      ast("x²");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.SINTAXIS);
    }
  });

  it("lanza PARENTESIS ante parentesis vacios () (cierre sin operando)", () => {
    // El `)` aparece donde se esperaba un operando: se clasifica como
    // desbalance de parentesis, igual que un cierre inesperado (Requirement 4.5).
    try {
      ast("()");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorCalculo);
      expect(e.tipo).toBe(TipoError.PARENTESIS);
    }
  });
});
