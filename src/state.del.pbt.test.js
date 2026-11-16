// Feature: scientific-calculator, Property 18: DEL elimina exactamente el
// ultimo caracter.
//
// Para toda Expresion no vacia con el cursor al final (el caso normal tras una
// insercion), aplicar `del` produce una Expresion cuya longitud es exactamente
// uno menos que la original y que es el prefijo de la original sin su ultimo
// caracter. Es decir, DEL elimina unicamente el ultimo caracter introducido.
//
// Validates: Requirements 9.2
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Genera
// Expresiones no vacias arbitrarias, construye un estado con el cursor situado
// al final de la Expresion (posicion normal tras teclear) y verifica:
//   - longitud(resultado) === longitud(original) - 1
//   - resultado === original.slice(0, -1)  (prefijo sin el ultimo caracter)
//   - el cursor retrocede una posicion
//
// NO se modifica src/state.js (prueba de solo lectura sobre la transicion).

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { estadoInicial, del } from "./state.js";

describe("Property 18: DEL elimina exactamente el ultimo caracter", () => {
  it("del sobre una Expresion no vacia con cursor al final deja longitud -1 y prefijo de la original", () => {
    // Generador de Expresiones no vacias. No necesita ser sintacticamente
    // valida: `del` opera a nivel de caracteres de la Expresion y no invoca al
    // Motor_Calculo, por lo que la propiedad debe cumplirse para cualquier
    // cadena de al menos un caracter. Se usa string unicode para cubrir tambien
    // los simbolos de la calculadora (×, ÷, √, π, ...).
    const expresionNoVacia = fc.string({ minLength: 1, maxLength: 40 });

    fc.assert(
      fc.property(expresionNoVacia, (expresion) => {
        // Precondicion del subdominio: Expresion no vacia.
        expect(expresion.length).toBeGreaterThanOrEqual(1);

        // Estado con el cursor al final de la Expresion: es la posicion normal
        // tras insertar tokens, donde "ultimo caracter introducido" coincide
        // con el caracter anterior al cursor que `del` elimina.
        const estado = {
          ...estadoInicial(),
          expresion,
          cursor: expresion.length,
        };

        const siguiente = del(estado);

        // Longitud exactamente uno menos que la original.
        expect(siguiente.expresion.length).toBe(expresion.length - 1);

        // El resultado es el prefijo de la original sin su ultimo caracter.
        expect(siguiente.expresion).toBe(expresion.slice(0, -1));

        // El cursor retrocede una posicion (sigue al final de la nueva
        // Expresion).
        expect(siguiente.cursor).toBe(expresion.length - 1);

        // La Expresion original (string inmutable) no se ve alterada.
        expect(estado.expresion).toBe(expresion);
      }),
      { numRuns: 200 }
    );
  });
});
