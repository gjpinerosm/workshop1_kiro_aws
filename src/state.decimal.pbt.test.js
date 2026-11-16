// Feature: scientific-calculator, Property 9: Un número contiene a lo sumo un
// separador decimal. Para todo número en construcción, insertar el
// Separador_Decimal `.` una o más veces deja el número con exactamente un `.`
// (el primero se incorpora; los siguientes se ignoran y dejan la Expresión sin
// cambios).
//
// Validates: Requirements 4.2, 4.3
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Construye un
// estado con un segmento numérico de dígitos, sitúa el cursor dentro de ese
// segmento e inserta `.` varias veces mediante insertarDecimal. Verifica:
//  - tras la primera inserción el `.` se incorpora al número (Requirement 4.2);
//  - las inserciones posteriores se ignoran y dejan la Expresión sin cambios
//    (Requirement 4.3);
//  - el segmento numérico contiguo que rodea el punto de inserción contiene a
//    lo sumo un `.` (invariante global de la propiedad).

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { estadoInicial, insertarToken, insertarDecimal } from "./state.js";

// Explora el segmento numérico contiguo (dígitos y `.`) que incluye la posición
// `cursor` y cuenta cuántos `.` contiene. Replica la noción de "número en
// construcción" usada por state.insertarDecimal para comprobar la invariante.
function contarPuntosSegmento(expresion, cursor) {
  let inicio = cursor;
  while (inicio > 0 && esCaracterNumerico(expresion[inicio - 1])) {
    inicio--;
  }
  let fin = cursor;
  while (fin < expresion.length && esCaracterNumerico(expresion[fin])) {
    fin++;
  }
  let puntos = 0;
  for (let i = inicio; i < fin; i++) {
    if (expresion[i] === ".") puntos++;
  }
  return puntos;
}

function esCaracterNumerico(c) {
  return c === "." || (c >= "0" && c <= "9");
}

describe("Property 9: Un número contiene a lo sumo un separador decimal", () => {
  it("insertar `.` una o más veces deja exactamente un `.` por número y las pulsaciones extra no cambian la Expresión", () => {
    // Generador de un número en construcción compuesto solo por dígitos (sin
    // `.` previo): parte izquierda y parte derecha del punto de inserción. Se
    // garantiza al menos un dígito en total para tener un segmento numérico no
    // vacío donde el `.` tenga sentido. El cursor se coloca entre ambas partes.
    const digitos = fc.stringOf(
      fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"),
      { minLength: 0, maxLength: 8 }
    );

    fc.assert(
      fc.property(
        digitos,
        digitos,
        fc.integer({ min: 1, max: 6 }),
        (izquierda, derecha, pulsaciones) => {
          // Asegurar al menos un dígito en el segmento numérico.
          if (izquierda.length + derecha.length === 0) {
            izquierda = "0";
          }

          // Construir un estado con el número `izquierda+derecha` y el cursor
          // situado dentro del segmento (entre ambas mitades).
          let estado = estadoInicial();
          estado = insertarToken(estado, izquierda + derecha);
          estado = { ...estado, cursor: izquierda.length };

          // Primera inserción: el `.` se incorpora al número (Requirement 4.2).
          const estadoTrasPrimer = insertarDecimal(estado);
          const esperadoTrasPrimer =
            izquierda + "." + derecha;
          expect(estadoTrasPrimer.expresion).toBe(esperadoTrasPrimer);
          expect(contarPuntosSegmento(
            estadoTrasPrimer.expresion,
            estadoTrasPrimer.cursor
          )).toBe(1);

          // Pulsaciones adicionales: se ignoran y dejan la Expresión sin cambios
          // (Requirement 4.3). El segmento sigue teniendo exactamente un `.`.
          let actual = estadoTrasPrimer;
          for (let i = 1; i < pulsaciones; i++) {
            const siguiente = insertarDecimal(actual);
            expect(siguiente.expresion).toBe(actual.expresion);
            expect(contarPuntosSegmento(
              siguiente.expresion,
              siguiente.cursor
            )).toBe(1);
            actual = siguiente;
          }

          // Invariante global de la propiedad: a lo sumo un `.` en el número.
          expect(contarPuntosSegmento(actual.expresion, actual.cursor))
            .toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 200 }
    );
  });
});
