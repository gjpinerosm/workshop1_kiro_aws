// Feature: scientific-calculator, Property 4: Los resultados trigonometricos
// despreciables se normalizan a cero.
//
// Validates: Requirements 5.6
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Para todo
// angulo (en grados) cuyo resultado trigonometrico tiene |valor| < 1e-10, el
// Motor_Calculo normaliza el resultado a 0 exacto, de modo que la Linea_Inferior
// muestra exactamente `0`.
//
// La gramatica del motor (design.md -> Parser) no define el menos unario, por lo
// que todos los angulos se construyen con enteros no negativos. Se generan tres
// familias de angulos cuyo resultado trigonometrico es matematicamente cero:
//   - sin(180·k)          -> seno de un multiplo de 180° es 0
//   - cos(90 + 180·k)     -> coseno en 90° + 180°·k es 0
//   - sin(0)              -> caso base
// En todos ellos el valor real es 0 (o un residuo de punto flotante con
// |valor| < 1e-10), por lo que el motor debe devolver el 0 exacto.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar } from "./engine.js";

describe("Property 4: Los resultados trigonometricos despreciables se normalizan a cero", () => {
  it("evaluar angulos con resultado trigonometrico despreciable devuelve exactamente 0", () => {
    // Factor k no negativo acotado. Se limita a un rango modesto porque para
    // angulos en grados muy grandes la conversion a radianes acumula error de
    // punto flotante y el residuo de Math.sin/cos puede superar el umbral de
    // normalizacion 1e-10 (dejando de pertenecer al subdominio "resultado
    // despreciable"). Con k pequeno el residuo permanece muy por debajo de
    // 1e-10. Un guard adicional (fc.pre) descarta cualquier caso que, aun asi,
    // caiga fuera del subdominio objetivo.
    const k = fc.integer({ min: 0, max: 1000 });

    // Selector de la familia de angulo a probar.
    const familia = fc.constantFrom("sin180k", "cos90", "sin0");

    fc.assert(
      fc.property(k, familia, (factor, tipo) => {
        let expresion;
        switch (tipo) {
          case "sin180k":
            // sin(180×k): seno de un multiplo de 180° es 0.
            expresion = `sin(180×${factor})`;
            break;
          case "cos90":
            // cos(90 + 180×k): coseno en 90°+180°·k es 0.
            expresion = `cos(90+180×${factor})`;
            break;
          case "sin0":
            // sin(0): caso base, resultado exactamente 0.
            expresion = "sin(0)";
            break;
        }

        // Precondicion del subdominio: el oraculo directo sobre grados confirma
        // que el resultado trigonometrico es efectivamente despreciable.
        const grados =
          tipo === "sin180k"
            ? 180 * factor
            : tipo === "cos90"
              ? 90 + 180 * factor
              : 0;
        const rad = (grados * Math.PI) / 180;
        const oraculo = tipo === "cos90" ? Math.cos(rad) : Math.sin(rad);
        // Guard: solo nos interesan los angulos cuyo resultado es despreciable
        // (|valor| < 1e-10). Si el error de punto flotante lo saca del
        // subdominio, se descarta la iteracion sin contarla como fallo.
        fc.pre(Math.abs(oraculo) < 1e-10);

        // El motor nunca debe lanzar: devuelve un resultado tipado.
        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        // El calculo debe ser exitoso y el valor normalizado a 0 exacto.
        expect(resultado.ok).toBe(true);
        expect(resultado.valor).toBe(0);
        // Normalizacion estricta: exactamente el numero 0 (la Linea_Inferior
        // mostrara "0"), nunca un residuo como 1.2e-16 ni -0.
        expect(Object.is(resultado.valor, 0)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
