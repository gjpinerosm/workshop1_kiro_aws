// Prueba de ejemplo de latencia de actualizacion de la Linea_Superior (tarea
// 11.2).
//
// Requirement 2.1: tras cada pulsacion, la Linea_Superior debe reflejar la
// Expresion completa en un plazo de 100 ms. Esta prueba de ejemplo (no PBT)
// recorre el flujo real de una pulsacion extremo a extremo sin tocar los
// modulos de origen:
//
//   tecla -> manejarTecla(tecla, estado) -> nuevo estado
//         -> renderizar(nuevo estado, domRefs) -> domRefs.lineaSuperior.textContent
//
// Se usa un stub minimo del DOM (objetos planos con textContent) como refs de
// la Pantalla, de modo que renderizar vuelque la Linea_Superior sobre ellos sin
// necesidad de un entorno DOM. Se mide el tiempo transcurrido entre justo antes
// de procesar la pulsacion y justo despues de escribir en el nodo, y se afirma
// que (a) la actualizacion ocurrio (el nodo contiene la nueva Expresion) y (b)
// el tiempo transcurrido es <= 100 ms.
//
// La medicion es determinista por construccion: el flujo es sincrono y puro, de
// modo que el tiempo transcurrido corresponde unicamente al coste de computo de
// la transicion y el volcado, holgadamente por debajo del limite.
//
// Requirements: 2.1.

import { describe, it, expect } from "vitest";
import { estadoInicial } from "./state.js";
import { manejarTecla } from "./input.js";
import { renderizar } from "./display.js";

// Reloj monotono de alta resolucion cuando esta disponible; si no, Date.now.
const ahora =
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? () => performance.now()
    : () => Date.now();

// Crea un stub minimo del DOM: nodos con textContent escribible, equivalentes a
// los nodos de la Pantalla que espera renderizar ({ lineaSuperior, lineaInferior }).
function crearDomStub() {
  return {
    lineaSuperior: { textContent: "" },
    lineaInferior: { textContent: "" },
  };
}

// Procesa una pulsacion extremo a extremo midiendo la latencia hasta que la
// Linea_Superior queda actualizada en el stub del DOM. Devuelve el nuevo estado
// y los milisegundos transcurridos.
function pulsarYMedir(tecla, estado, domRefs) {
  const inicio = ahora();
  const nuevoEstado = manejarTecla(tecla, estado);
  renderizar(nuevoEstado, domRefs);
  const transcurridoMs = ahora() - inicio;
  return { nuevoEstado, transcurridoMs };
}

const LIMITE_MS = 100;

describe("latencia de actualizacion de la Linea_Superior (Requirement 2.1)", () => {
  it("una unica pulsacion de digito refleja la Expresion en <= 100 ms", () => {
    const domRefs = crearDomStub();
    const { nuevoEstado, transcurridoMs } = pulsarYMedir(
      "7",
      estadoInicial(),
      domRefs
    );

    // (a) La actualizacion ocurrio: la Linea_Superior muestra la nueva Expresion.
    expect(nuevoEstado.expresion).toBe("7");
    expect(domRefs.lineaSuperior.textContent).toBe("7");
    // (b) Dentro del plazo de 100 ms tras la pulsacion.
    expect(transcurridoMs).toBeLessThanOrEqual(LIMITE_MS);
  });

  it("cada pulsacion de una secuencia actualiza la Linea_Superior en <= 100 ms", () => {
    const domRefs = crearDomStub();
    let estado = estadoInicial();
    // Secuencia representativa: digitos, operadores, parentesis y funcion.
    const secuencia = ["(", "2", "+", "3", ")", "×", "sin", "9", "0", ")"];

    for (const tecla of secuencia) {
      const { nuevoEstado, transcurridoMs } = pulsarYMedir(tecla, estado, domRefs);
      estado = nuevoEstado;
      // Tras cada pulsacion la Linea_Superior refleja la Expresion completa...
      expect(domRefs.lineaSuperior.textContent).toBe(estado.expresion);
      // ...dentro del plazo de 100 ms (Requirement 2.1).
      expect(transcurridoMs).toBeLessThanOrEqual(LIMITE_MS);
    }

    // La Expresion final acumula toda la secuencia introducida.
    expect(estado.expresion).toBe("(2+3)×sin90)");
    expect(domRefs.lineaSuperior.textContent).toBe(estado.expresion);
  });

  it("acepta refs con los alias { superior, inferior } y respeta el plazo", () => {
    // renderizar admite el alias { superior, inferior }; comprobamos que el
    // flujo y la latencia se mantienen con esa forma de refs.
    const domRefs = { superior: { textContent: "" }, inferior: { textContent: "" } };
    const inicio = ahora();
    const nuevoEstado = manejarTecla("5", estadoInicial());
    renderizar(nuevoEstado, domRefs);
    const transcurridoMs = ahora() - inicio;

    expect(domRefs.superior.textContent).toBe("5");
    expect(transcurridoMs).toBeLessThanOrEqual(LIMITE_MS);
  });
});
