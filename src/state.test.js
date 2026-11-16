// Pruebas de ejemplo (unit tests) del estado central y las transiciones puras
// de la calculadora (tarea 8.1).
//
// Verifican el estado inicial del modelo CalculatorState y cada transicion
// pura: insertarToken, insertarDecimal (un unico `.` por numero), del (DEL), ac
// (AC), insertarAns (Ans) y aplicarIgual (`=`), incluyendo las reglas de Ans en
// exito/fallo y la inmutabilidad del estado recibido.
//
// Requirements: 2.2, 2.3, 4.2, 4.3, 9.1, 9.2, 9.4, 9.5, 9.6, 9.7.

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
import { TipoError } from "./engine.js";

describe("estadoInicial", () => {
  it("devuelve Expresion vacia, cursor 0, Linea_Inferior '0', Ans 0, sin Resultado ni error", () => {
    expect(estadoInicial()).toEqual({
      expresion: "",
      cursor: 0,
      lineaInferior: "0",
      ans: 0,
      tieneResultado: false,
      estadoError: EstadoError.NINGUNO,
    });
  });
});

describe("insertarToken", () => {
  it("inserta el texto en el cursor y avanza el cursor", () => {
    const s0 = estadoInicial();
    const s1 = insertarToken(s0, "1");
    const s2 = insertarToken(s1, "2");
    expect(s2.expresion).toBe("12");
    expect(s2.cursor).toBe(2);
  });

  it("inserta en medio de la Expresion en la posicion del cursor", () => {
    const estado = { ...estadoInicial(), expresion: "13", cursor: 1 };
    const s1 = insertarToken(estado, "2");
    expect(s1.expresion).toBe("123");
    expect(s1.cursor).toBe(2);
  });

  it("no muta el estado recibido (pureza)", () => {
    const s0 = estadoInicial();
    insertarToken(s0, "5");
    expect(s0.expresion).toBe("");
    expect(s0.cursor).toBe(0);
  });

  it("inserta lexemas multicaracter (funciones) completos", () => {
    const s1 = insertarToken(estadoInicial(), "sin");
    expect(s1.expresion).toBe("sin");
    expect(s1.cursor).toBe(3);
  });
});

describe("insertarDecimal: un unico separador por numero (Req 4.2, 4.3)", () => {
  it("incorpora el punto cuando el numero aun no tiene uno", () => {
    const estado = { ...estadoInicial(), expresion: "3", cursor: 1 };
    const s1 = insertarDecimal(estado);
    expect(s1.expresion).toBe("3.");
    expect(s1.cursor).toBe(2);
  });

  it("ignora el punto cuando el numero ya contiene uno (Expresion sin cambios)", () => {
    const estado = { ...estadoInicial(), expresion: "3.14", cursor: 4 };
    const s1 = insertarDecimal(estado);
    expect(s1).toBe(estado);
  });

  it("detecta el punto a la derecha del cursor dentro del mismo numero", () => {
    // Cursor antes de "14" en "3.14": el segmento numerico "3.14" ya tiene `.`.
    const estado = { ...estadoInicial(), expresion: "3.14", cursor: 2 };
    expect(insertarDecimal(estado)).toBe(estado);
  });

  it("permite un punto en un numero distinto separado por un operador", () => {
    // "1.2+3|" -> insertar `.` afecta solo al numero "3".
    const estado = { ...estadoInicial(), expresion: "1.2+3", cursor: 5 };
    const s1 = insertarDecimal(estado);
    expect(s1.expresion).toBe("1.2+3.");
  });

  it("inserta el punto inicial de un decimal que empieza por `.`", () => {
    const s1 = insertarDecimal(estadoInicial());
    expect(s1.expresion).toBe(".");
  });
});

describe("del (DEL)", () => {
  it("elimina el caracter anterior al cursor", () => {
    const estado = { ...estadoInicial(), expresion: "123", cursor: 3 };
    const s1 = del(estado);
    expect(s1.expresion).toBe("12");
    expect(s1.cursor).toBe(2);
  });

  it("no modifica nada cuando la Expresion esta vacia (Req 9.3)", () => {
    const s0 = estadoInicial();
    const s1 = del(s0);
    expect(s1).toBe(s0);
    expect(s1.lineaInferior).toBe("0");
  });

  it("conserva la Linea_Inferior previa al borrar con Expresion vacia", () => {
    const estado = {
      ...estadoInicial(),
      expresion: "",
      lineaInferior: "42",
      ans: 42,
      tieneResultado: true,
    };
    const s1 = del(estado);
    expect(s1.lineaInferior).toBe("42");
  });

  it("elimina en medio de la Expresion en la posicion del cursor", () => {
    const estado = { ...estadoInicial(), expresion: "123", cursor: 2 };
    const s1 = del(estado);
    expect(s1.expresion).toBe("13");
    expect(s1.cursor).toBe(1);
  });
});

describe("ac (AC)", () => {
  it("vacia la Expresion, pone '0' en Linea_Inferior y Ans 0 (Req 9.1, 9.5)", () => {
    const estado = {
      expresion: "9+9",
      cursor: 3,
      lineaInferior: "18",
      ans: 18,
      tieneResultado: true,
      estadoError: EstadoError.DOMINIO,
    };
    const s1 = ac(estado);
    expect(s1).toEqual(estadoInicial());
  });
});

describe("insertarAns (Ans)", () => {
  it("inserta '0' cuando no hay Resultado previo (Req 9.5)", () => {
    const s1 = insertarAns(estadoInicial());
    expect(s1.expresion).toBe("0");
    expect(s1.cursor).toBe(1);
  });

  it("inserta la representacion numerica del ultimo Resultado en el cursor (Req 9.4)", () => {
    const estado = {
      ...estadoInicial(),
      expresion: "1+",
      cursor: 2,
      ans: 42,
      tieneResultado: true,
    };
    const s1 = insertarAns(estado);
    expect(s1.expresion).toBe("1+42");
    expect(s1.cursor).toBe(4);
  });

  it("inserta en la posicion del cursor cuando esta en medio", () => {
    const estado = {
      ...estadoInicial(),
      expresion: "+1",
      cursor: 0,
      ans: 7,
      tieneResultado: true,
    };
    const s1 = insertarAns(estado);
    expect(s1.expresion).toBe("7+1");
    expect(s1.cursor).toBe(1);
  });
});

describe("aplicarIgual (`=`)", () => {
  it("exito: conserva la Expresion, muestra el Resultado y almacena Ans (Req 2.2, 9.6)", () => {
    const estado = { ...estadoInicial(), expresion: "2+3", cursor: 3 };
    const s1 = aplicarIgual(estado);
    expect(s1.expresion).toBe("2+3");
    expect(s1.lineaInferior).toBe("5");
    expect(s1.ans).toBe(5);
    expect(s1.tieneResultado).toBe(true);
    expect(s1.estadoError).toBe(EstadoError.NINGUNO);
  });

  it("fallo: conserva Expresion, Ans previo y fija el error (Req 2.3, 9.7)", () => {
    const estado = {
      ...estadoInicial(),
      expresion: "1÷0",
      cursor: 3,
      lineaInferior: "99",
      ans: 99,
      tieneResultado: true,
    };
    const s1 = aplicarIgual(estado);
    expect(s1.expresion).toBe("1÷0");
    expect(s1.ans).toBe(99);
    expect(s1.estadoError).toBe(TipoError.DIVISION_POR_CERO);
    // La Linea_Inferior previa se sustituye por la indicacion de error.
    expect(s1.lineaInferior).not.toBe("99");
  });

  it("fallo por sintaxis: Expresion incompleta conserva Ans y marca SINTAXIS", () => {
    const estado = { ...estadoInicial(), expresion: "2+", cursor: 2, ans: 3 };
    const s1 = aplicarIgual(estado);
    expect(s1.expresion).toBe("2+");
    expect(s1.ans).toBe(3);
    expect(s1.estadoError).toBe(TipoError.SINTAXIS);
  });

  it("formatea el Resultado con al menos 10 cifras significativas", () => {
    const estado = { ...estadoInicial(), expresion: "1÷3", cursor: 3 };
    const s1 = aplicarIgual(estado);
    // 1/3 con toPrecision(12) recortando ceros no significativos.
    expect(s1.lineaInferior.startsWith("0.333333333")).toBe(true);
  });

  it("usa `=` sobre Ans insertado para encadenar calculos", () => {
    // 2+3=5, luego Ans+1 = 6.
    const r1 = aplicarIgual({ ...estadoInicial(), expresion: "2+3", cursor: 3 });
    const conAns = insertarAns({ ...r1, expresion: "", cursor: 0 });
    const r2 = aplicarIgual(insertarToken(conAns, "+1"));
    expect(r2.ans).toBe(6);
    expect(r2.lineaInferior).toBe("6");
  });
});
