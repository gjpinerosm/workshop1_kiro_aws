// Pruebas de ejemplo (unit tests) del Display Controller de dos lineas
// (tarea 9.1).
//
// Verifican la derivacion pura de las dos lineas de la Pantalla a partir del
// CalculatorState (derivarLineas) y el volcado en el DOM (renderizar):
//  - Linea_Superior refleja la Expresion completa (Requirements 2.1, 2.2).
//  - Linea_Inferior muestra el Resultado formateado, "0" sin calculo previo o
//    el mensaje de error del TipoError (Requirements 2.2, 2.3, 2.4).
//
// La escritura en el DOM se prueba con un stub minimo (objetos con textContent),
// sin dependencias de jsdom. El desplazamiento horizontal y la notacion
// cientifica por ancho son de la tarea 9.2 y no se prueban aqui.
//
// Requirements: 2.1, 2.2, 2.3, 2.4.

import { describe, it, expect } from "vitest";
import {
  estadoInicial,
  insertarToken,
  aplicarIgual,
  EstadoError,
} from "./state.js";
import { TipoError } from "./engine.js";
import { derivarLineas, renderizar, formatearResultado } from "./display.js";

// Nodo DOM minimo: solo necesitamos la propiedad textContent para renderizar.
function nodoStub() {
  return { textContent: null };
}

describe("derivarLineas", () => {
  it("al inicio: Linea_Superior vacia y Linea_Inferior '0' (Requirements 1.3, 2.4)", () => {
    const { lineaSuperior, lineaInferior } = derivarLineas(estadoInicial());
    expect(lineaSuperior).toBe("");
    expect(lineaInferior).toBe("0");
  });

  it("Linea_Superior refleja la Expresion completa introducida (Requirements 2.1, 2.2)", () => {
    const estado = insertarToken(estadoInicial(), "2+3×4");
    expect(derivarLineas(estado).lineaSuperior).toBe("2+3×4");
  });

  it("tras un calculo valido muestra el Resultado en la Linea_Inferior y conserva la Expresion (Requirement 2.2)", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "2+3"));
    const { lineaSuperior, lineaInferior } = derivarLineas(estado);
    expect(lineaSuperior).toBe("2+3");
    expect(lineaInferior).toBe("5");
  });

  it("formatea el Resultado con al menos 10 digitos significativos sin ceros no significativos", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "1÷3"));
    const { lineaInferior } = derivarLineas(estado);
    // 1/3 con >= 10 cifras significativas, sin ceros finales superfluos.
    expect(lineaInferior).toBe(formatearResultado(1 / 3));
    const digitosSignificativos = lineaInferior.replace(/[-.]/g, "").replace(/^0+/, "").length;
    expect(digitosSignificativos).toBeGreaterThanOrEqual(10);
    expect(lineaInferior).not.toMatch(/0$/);
  });

  it("tras un fallo muestra el mensaje de error del TipoError en la Linea_Inferior y conserva la Expresion (Requirement 2.3)", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "1÷0"));
    const { lineaSuperior, lineaInferior } = derivarLineas(estado);
    expect(estado.estadoError).toBe(TipoError.DIVISION_POR_CERO);
    expect(lineaSuperior).toBe("1÷0");
    expect(lineaInferior).toBe(estado.lineaInferior);
    expect(lineaInferior).not.toBe("0");
  });

  it("conserva la Linea_Inferior previa cuando el calculo falla (Requirement 2.3)", () => {
    const conResultado = aplicarIgual(insertarToken(estadoInicial(), "2+2"));
    // Se edita la Expresion a una invalida y se vuelve a pulsar '='.
    const editado = insertarToken({ ...conResultado }, "+");
    const fallido = aplicarIgual(editado);
    const { lineaInferior } = derivarLineas(fallido);
    // La Linea_Inferior pasa a la indicacion de error (unica sustitucion permitida).
    expect(lineaInferior).toBe(fallido.lineaInferior);
    expect(fallido.estadoError).not.toBe(EstadoError.NINGUNO);
  });

  it("es pura: no muta el estado recibido", () => {
    const estado = insertarToken(estadoInicial(), "7");
    const copia = { ...estado };
    derivarLineas(estado);
    expect(estado).toEqual(copia);
  });
});

describe("renderizar", () => {
  it("escribe ambas lineas en los nodos del DOM (lineaSuperior/lineaInferior)", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "6×7"));
    const superior = nodoStub();
    const inferior = nodoStub();
    renderizar(estado, { lineaSuperior: superior, lineaInferior: inferior });
    expect(superior.textContent).toBe("6×7");
    expect(inferior.textContent).toBe("42");
  });

  it("acepta los alias superior/inferior para los nodos", () => {
    const estado = insertarToken(estadoInicial(), "9");
    const superior = nodoStub();
    const inferior = nodoStub();
    renderizar(estado, { superior, inferior });
    expect(superior.textContent).toBe("9");
    expect(inferior.textContent).toBe("0");
  });

  it("escribe el mensaje de error en la Linea_Inferior tras un fallo (Requirement 2.3)", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "1÷0"));
    const superior = nodoStub();
    const inferior = nodoStub();
    renderizar(estado, { lineaSuperior: superior, lineaInferior: inferior });
    expect(superior.textContent).toBe("1÷0");
    expect(inferior.textContent).toBe(estado.lineaInferior);
  });

  it("no falla si faltan nodos en domRefs", () => {
    const estado = estadoInicial();
    expect(() => renderizar(estado, {})).not.toThrow();
    expect(() => renderizar(estado, undefined)).not.toThrow();
  });
});

// -----------------------------------------------------------------------------
// Tarea 9.2: desplazamiento horizontal y notacion cientifica por ancho
// (Requirements 2.5, 2.6).
// -----------------------------------------------------------------------------

import {
  ventanaLineaSuperior,
  formatearLineaInferiorAncho,
} from "./display.js";

describe("ventanaLineaSuperior (desplazamiento horizontal, Requirement 2.5)", () => {
  it("devuelve la Expresion completa cuando cabe en el ancho", () => {
    expect(ventanaLineaSuperior("2+3", 3, 10)).toBe("2+3");
    expect(ventanaLineaSuperior("1234567890", 10, 10)).toBe("1234567890");
  });

  it("muestra los ultimos caracteres cuando el cursor esta al final", () => {
    // Expresion de 15 chars, ancho 10: ventana de los ultimos 10 caracteres.
    const expr = "123456789012345";
    expect(ventanaLineaSuperior(expr, expr.length, 10)).toBe("6789012345");
    expect(ventanaLineaSuperior(expr, expr.length, 10)).toBe(expr.slice(-10));
    expect(ventanaLineaSuperior(expr, expr.length, 10).length).toBe(10);
  });

  it("mantiene visible el cursor cuando cae antes de la ventana anclada al final", () => {
    const expr = "ABCDEFGHIJKLMNOP"; // 16 chars
    // Cursor en la posicion 2: la ventana anclada al final (6..16) no lo veria;
    // debe desplazarse para empezar en el cursor.
    const ventana = ventanaLineaSuperior(expr, 2, 10);
    expect(ventana.length).toBe(10);
    expect(ventana).toBe(expr.slice(2, 12));
    // El caracter en la posicion del cursor queda dentro de la ventana.
    expect(ventana[0]).toBe(expr[2]);
  });

  it("normaliza cursor fuera de rango y anchos invalidos", () => {
    const expr = "0123456789ABCDEF"; // 16 chars
    // Cursor negativo -> 0: ventana empieza al inicio.
    expect(ventanaLineaSuperior(expr, -5, 8)).toBe(expr.slice(0, 8));
    // Cursor mas alla del final -> final: ultimos 8.
    expect(ventanaLineaSuperior(expr, 999, 8)).toBe(expr.slice(-8));
    // Ancho invalido -> Expresion completa.
    expect(ventanaLineaSuperior(expr, 4, 0)).toBe(expr);
    expect(ventanaLineaSuperior(expr, 4, -1)).toBe(expr);
    expect(ventanaLineaSuperior(expr, 4, undefined)).toBe(expr);
  });
});

describe("formatearLineaInferiorAncho (notacion cientifica, Requirement 2.6)", () => {
  it("devuelve la representacion decimal cuando cabe en el ancho", () => {
    expect(formatearLineaInferiorAncho(42, 10)).toBe("42");
    expect(formatearLineaInferiorAncho(1 / 3, 14)).toBe(formatearResultado(1 / 3));
  });

  it("formatea en notacion cientifica cuando el decimal excede el ancho", () => {
    const valor = 123456789012345; // 15 digitos
    const ancho = 10;
    const salida = formatearLineaInferiorAncho(valor, ancho);
    expect(salida.length).toBeLessThanOrEqual(ancho);
    expect(salida).toMatch(/e/i); // notacion cientifica
    // Oraculo: la cadena cientifica representa el mismo valor con la precision
    // que permite el ancho. La notacion cientifica trunca cifras, por lo que se
    // compara con una tolerancia relativa (no absoluta): el error relativo debe
    // ser pequeño respecto a la magnitud del valor.
    const reconstruido = Number(salida);
    expect(Number.isFinite(reconstruido)).toBe(true);
    const errorRelativo = Math.abs(reconstruido - valor) / Math.abs(valor);
    expect(errorRelativo).toBeLessThan(1e-2);
  });

  it("maneja valores muy pequeños en notacion cientifica dentro del ancho", () => {
    const valor = 0.0000000123456;
    const ancho = 10;
    const salida = formatearLineaInferiorAncho(valor, ancho);
    expect(salida.length).toBeLessThanOrEqual(ancho);
    expect(salida).toMatch(/e-/i);
  });

  it("no reformatea el cero ni los valores no finitos", () => {
    expect(formatearLineaInferiorAncho(0, 3)).toBe("0");
    expect(formatearLineaInferiorAncho(Infinity, 3)).toBe("0");
  });

  it("con ancho invalido devuelve la representacion decimal canonica", () => {
    const valor = 123456789012345;
    expect(formatearLineaInferiorAncho(valor, undefined)).toBe(formatearResultado(valor));
  });
});

describe("derivarLineas con ancho visible (Requirements 2.5, 2.6)", () => {
  it("sin ancho conserva el comportamiento de la tarea 9.1 (lineas completas)", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "123456789+987654321"));
    const sinAncho = derivarLineas(estado);
    expect(sinAncho.lineaSuperior).toBe("123456789+987654321");
  });

  it("recorta la Linea_Superior cuando la Expresion excede el ancho", () => {
    const expr = "1+2+3+4+5+6+7+8+9"; // 17 chars
    const estado = insertarToken(estadoInicial(), expr); // cursor al final
    const { lineaSuperior } = derivarLineas(estado, 8);
    expect(lineaSuperior.length).toBe(8);
    expect(lineaSuperior).toBe(expr.slice(-8));
  });

  it("muestra el Resultado en notacion cientifica cuando no cabe (Requirement 2.6)", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "123456789×1000000"));
    const ancho = 10;
    const { lineaInferior } = derivarLineas(estado, ancho);
    expect(lineaInferior.length).toBeLessThanOrEqual(ancho);
    expect(lineaInferior).toMatch(/e/i);
  });

  it("no aplica notacion cientifica a los mensajes de error", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "1÷0"));
    const { lineaInferior } = derivarLineas(estado, 5);
    // El mensaje de error se muestra tal cual (no se convierte a cientifica).
    expect(lineaInferior).toBe(estado.lineaInferior);
    expect(lineaInferior).not.toMatch(/^\d+(\.\d+)?e/i);
  });

  it("no aplica notacion cientifica al '0' inicial", () => {
    const { lineaInferior } = derivarLineas(estadoInicial(), 1);
    expect(lineaInferior).toBe("0");
  });

  it("deja la Linea_Inferior intacta cuando el Resultado cabe en el ancho", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "6×7"));
    const { lineaInferior } = derivarLineas(estado, 10);
    expect(lineaInferior).toBe("42");
  });
});

describe("renderizar con ancho visible", () => {
  it("escribe la ventana recortada de la Linea_Superior", () => {
    const expr = "1+2+3+4+5+6+7+8+9";
    const estado = insertarToken(estadoInicial(), expr);
    const superior = nodoStub();
    const inferior = nodoStub();
    renderizar(estado, { lineaSuperior: superior, lineaInferior: inferior }, 8);
    expect(superior.textContent).toBe(expr.slice(-8));
    expect(superior.textContent.length).toBe(8);
  });

  it("escribe el Resultado en notacion cientifica cuando no cabe", () => {
    const estado = aplicarIgual(insertarToken(estadoInicial(), "123456789×1000000"));
    const superior = nodoStub();
    const inferior = nodoStub();
    renderizar(estado, { lineaSuperior: superior, lineaInferior: inferior }, 10);
    expect(inferior.textContent.length).toBeLessThanOrEqual(10);
    expect(inferior.textContent).toMatch(/e/i);
  });
});
