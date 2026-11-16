// Pruebas de ejemplo (unit tests) de estados puntuales y casos borde del
// Display y las transiciones de estado (tarea 9.5).
//
// Complementan las pruebas basadas en propiedades con ejemplos concretos y
// deterministas de los comportamientos que el diseño fija como puntuales:
//  - Valor inicial "0" en la Linea_Inferior (Requirement 2.4).
//  - Borrado total AC: Expresion vacia, Linea_Inferior "0" y Ans 0
//    (Requirement 9.1).
//  - Ans sin Resultado previo inserta "0" (Requirement 9.5).
//  - Sustitucion de π por Math.PI al evaluar (Requirement 8.1).
//  - DEL sobre Expresion vacia deja el estado y la Linea_Inferior intactos
//    (Requirement 9.3).
//  - Desplazamiento horizontal de una Expresion larga manteniendo visibles los
//    ultimos caracteres y el cursor (Requirement 2.5).
//
// Estas son pruebas de ejemplo (no PBT) y no modifican los modulos fuente: solo
// consumen las firmas publicas de state.js, display.js y engine.js.
//
// Requirements: 2.4, 2.5, 8.1, 9.1, 9.3, 9.5.

import { describe, it, expect } from "vitest";
import {
  estadoInicial,
  insertarToken,
  del,
  ac,
  insertarAns,
} from "./state.js";
import { derivarLineas, ventanaLineaSuperior } from "./display.js";
import { evaluar } from "./engine.js";

describe("Display: valor inicial de la Linea_Inferior (Requirement 2.4)", () => {
  it("al inicio, sin ningun calculo previo, la Linea_Inferior muestra '0'", () => {
    const estado = estadoInicial();
    expect(estado.lineaInferior).toBe("0");
    expect(derivarLineas(estado).lineaInferior).toBe("0");
  });
});

describe("AC: borrado total restablece el estado inicial (Requirement 9.1)", () => {
  it("tras AC la Expresion queda vacia, la Linea_Inferior '0' y Ans 0", () => {
    // Partimos de un estado con Expresion, cursor avanzado y un Ans/Resultado
    // simulados para comprobar que AC los limpia por completo.
    const sucio = {
      ...insertarToken(estadoInicial(), "12+34"),
      lineaInferior: "46",
      ans: 46,
      tieneResultado: true,
    };

    const limpio = ac(sucio);

    expect(limpio.expresion).toBe("");
    expect(limpio.cursor).toBe(0);
    expect(limpio.lineaInferior).toBe("0");
    expect(limpio.ans).toBe(0);
    expect(limpio.tieneResultado).toBe(false);
    expect(derivarLineas(limpio)).toEqual({ lineaSuperior: "", lineaInferior: "0" });
  });
});

describe("Ans sin Resultado previo (Requirement 9.5)", () => {
  it("inserta '0' en la Expresion cuando aun no hay Resultado calculado", () => {
    const inicial = estadoInicial();
    expect(inicial.ans).toBe(0);
    expect(inicial.tieneResultado).toBe(false);

    const conAns = insertarAns(inicial);

    // El valor de Ans sin Resultado previo es 0, por lo que se inserta "0".
    expect(conAns.expresion).toBe("0");
    expect(conAns.cursor).toBe(1);
    // La Linea_Superior refleja la Expresion con el "0" insertado.
    expect(derivarLineas(conAns).lineaSuperior).toBe("0");
  });
});

describe("Sustitucion de π por Math.PI al evaluar (Requirement 8.1)", () => {
  it("evaluar('π') devuelve Math.PI", () => {
    const resultado = evaluar("π");
    expect(resultado.ok).toBe(true);
    expect(resultado.valor).toBe(Math.PI);
  });

  it("π participa en la Expresion con su valor numerico (π×2 = 2·Math.PI)", () => {
    const resultado = evaluar("π×2");
    expect(resultado.ok).toBe(true);
    expect(resultado.valor).toBeCloseTo(Math.PI * 2, 12);
  });

  it("la Linea_Inferior de π conserva al menos 10 digitos significativos", () => {
    const { valor } = evaluar("π");
    const estado = {
      ...estadoInicial(),
      expresion: "π",
      lineaInferior: String(Number(valor.toPrecision(12))),
      ans: valor,
      tieneResultado: true,
    };
    const { lineaInferior } = derivarLineas(estado);
    // 3.14159265359 arranca por "3.1415926535..." -> empieza como Math.PI.
    expect(lineaInferior.startsWith("3.14159265")).toBe(true);
    const digitosSignificativos = lineaInferior.replace(/[-.]/g, "").length;
    expect(digitosSignificativos).toBeGreaterThanOrEqual(10);
  });
});

describe("DEL sobre Expresion vacia (Requirement 9.3)", () => {
  it("no cambia el estado ni la Linea_Inferior cuando la Expresion esta vacia", () => {
    const inicial = estadoInicial();
    const despues = del(inicial);

    expect(despues.expresion).toBe("");
    expect(despues.cursor).toBe(0);
    // La Linea_Inferior previa se conserva intacta (no se toca con DEL).
    expect(despues.lineaInferior).toBe(inicial.lineaInferior);
    expect(despues).toEqual(inicial);
  });

  it("conserva una Linea_Inferior no inicial al pulsar DEL con Expresion vacia", () => {
    // Estado con Expresion vacia pero con un Resultado previo mostrado.
    const conResultado = {
      ...estadoInicial(),
      lineaInferior: "42",
      ans: 42,
      tieneResultado: true,
    };
    const despues = del(conResultado);
    expect(despues.expresion).toBe("");
    expect(despues.lineaInferior).toBe("42");
    expect(despues).toEqual(conResultado);
  });
});

describe("Desplazamiento de una Expresion larga (Requirement 2.5)", () => {
  const ancho = 10;

  it("muestra los ultimos 'ancho' caracteres cuando el cursor esta al final", () => {
    // Expresion mas larga que el ancho; cursor al final (caso por defecto al
    // seguir escribiendo).
    const expresion = "1+2+3+4+5+6+7+8+9"; // longitud 17 > 10
    const estado = { ...estadoInicial(), expresion, cursor: expresion.length };

    const ventana = ventanaLineaSuperior(expresion, estado.cursor, ancho);
    expect(ventana).toHaveLength(ancho);
    expect(ventana).toBe(expresion.slice(expresion.length - ancho));
    // El cursor (final de la Expresion) queda dentro de la ventana visible.
    expect(expresion.endsWith(ventana)).toBe(true);

    // derivarLineas con ancho produce la misma ventana en la Linea_Superior.
    expect(derivarLineas(estado, ancho).lineaSuperior).toBe(ventana);
  });

  it("mantiene visible el cursor cuando esta antes del final de la Expresion", () => {
    const expresion = "1+2+3+4+5+6+7+8+9"; // longitud 17
    const cursor = 3; // el cursor cae lejos del final

    const ventana = ventanaLineaSuperior(expresion, cursor, ancho);
    expect(ventana).toHaveLength(ancho);
    // La ventana se desplaza para empezar en el cursor y mantenerlo visible.
    expect(ventana).toBe(expresion.slice(cursor, cursor + ancho));
  });

  it("devuelve la Expresion completa cuando cabe en el ancho visible", () => {
    const expresion = "1+2+3"; // longitud 5 <= 10
    const estado = { ...estadoInicial(), expresion, cursor: expresion.length };
    expect(ventanaLineaSuperior(expresion, estado.cursor, ancho)).toBe(expresion);
    expect(derivarLineas(estado, ancho).lineaSuperior).toBe(expresion);
  });
});
