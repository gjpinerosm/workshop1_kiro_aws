// Feature: scientific-calculator, Property 22: Los resultados cuya
// representacion decimal excede el ancho visible de la Linea_Inferior se
// muestran en notacion cientifica dentro de ese ancho.
//
// Validates: Requirements 2.6
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera
// Resultados numericos `valor` cuya representacion decimal canonica
// (formatearResultado) excede un `ancho` representativo de una Pantalla LCD
// (10..16 caracteres) y verifica que formatearLineaInferiorAncho(valor, ancho)
// devuelve una cadena que:
//   (a) esta en notacion cientifica/exponencial (contiene 'e' o 'E'), y
//   (b) no excede el ancho visible (longitud <= ancho).
//
// TEST-ONLY: no se modifica src/display.js. El test importa formatearResultado
// para detectar que casos generados realmente exceden el ancho (precondicion
// del subdominio de la propiedad) y descarta los que caben en decimal.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatearLineaInferiorAncho, formatearResultado } from "./display.js";

describe("Property 22: Los resultados que exceden el ancho se muestran en notacion cientifica", () => {
  it("formatearLineaInferiorAncho devuelve notacion cientifica dentro del ancho cuando el decimal lo excede", () => {
    // Ancho visible representativo de una Pantalla LCD de la Casio fx-82MS.
    // En este rango (10..16) la forma cientifica mas compacta de cualquier
    // numero finito de JS (mantisa minima + exponente de a lo sumo 3 digitos,
    // p. ej. "-1e-308") siempre cabe, de modo que el ancho no es el cuello de
    // botella de la propiedad.
    const ancho = fc.integer({ min: 10, max: 16 });

    // Generador de Resultados numericos finitos y no nulos (formatearResultado
    // devuelve "0" para el cero y los no finitos; esos casos no producen ni
    // requieren notacion cientifica, Requirement 2.6). Se cubren magnitudes
    // muy grandes y muy pequenas, donde la representacion decimal se alarga y
    // tiende a exceder el ancho visible.
    const valor = fc
      .double({ noNaN: true, noDefaultInfinity: true })
      .filter((v) => Number.isFinite(v) && v !== 0);

    fc.assert(
      fc.property(valor, ancho, (v, w) => {
        const decimal = formatearResultado(v);

        // Precondicion del subdominio de la propiedad: solo interesan los
        // Resultados cuya representacion decimal EXCEDE el ancho visible. Los
        // que caben se muestran tal cual (no aplica notacion cientifica) y
        // quedan fuera del alcance de esta propiedad.
        fc.pre(decimal.length > w);

        const salida = formatearLineaInferiorAncho(v, w);

        // La funcion nunca debe lanzar y siempre devuelve una cadena.
        expect(typeof salida).toBe("string");

        // (a) La salida esta en notacion cientifica/exponencial.
        expect(/[eE]/.test(salida)).toBe(true);

        // (b) La salida cabe dentro del ancho visible de la Linea_Inferior.
        expect(salida.length).toBeLessThanOrEqual(w);
      }),
      { numRuns: 300 }
    );
  });
});
