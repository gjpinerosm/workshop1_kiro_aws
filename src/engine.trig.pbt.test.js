// Feature: scientific-calculator, Property 3: Las funciones trigonometricas
// operan en grados.
//
// Para todo angulo θ en el rango −999999999 a 999999999 grados, `sin(θ)`,
// `cos(θ)` y `tan(θ)` (cuando esta definida) coinciden, dentro de una
// tolerancia de 10 cifras significativas, con el oraculo
// `Math.sin/cos/tan(θ × π / 180)`.
//
// Validates: Requirements 5.1, 5.2, 5.3, 5.4
//
// Prueba basada en propiedades con fast-check (>=100 iteraciones). Se genera un
// angulo entero θ en −999999999..999999999 y se evalua `sinθ`, `cosθ` y `tanθ`
// a traves del Motor_Calculo, comparando contra el oraculo que convierte a
// radianes (θ × π / 180) y aplica Math.sin/cos/tan.
//
// Representacion de angulos negativos: la gramatica del motor (design.md ->
// Parser) no define el menos unario, por lo que un `−` inicial seria un
// operador binario sin operando izquierdo. Para cubrir el rango negativo se
// construye el argumento como la resta `0−|θ|` dentro de un parentesis, p. ej.
// `sin(0−45)`, que el motor evalua a −45 grados. Los angulos no negativos usan
// la forma directa `sin(θ)`.
//
// Subdominios excluidos (cubiertos por otras propiedades):
//  - tan en sus singularidades 90°+180°·k, donde cos(θ)=0 y el motor devuelve
//    DOMINIO (Requirement 5.5, Property 11).
//  - Resultados cuyo |valor| < 1e-10, que el motor normaliza a 0 exacto
//    (Requirement 5.6, Property 4). La comparacion por cifras significativas no
//    es adecuada cerca de cero, por lo que esos casos se descartan aqui.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluar } from "./engine.js";

// Factor de conversion de grados a radianes identico al del motor.
const GRADOS_A_RADIANES = Math.PI / 180;

// Umbral de normalizacion a cero del motor (Requirement 5.6). Los resultados
// con magnitud menor se muestran como 0 exacto y pertenecen a Property 4.
const UMBRAL_CERO = 1e-10;

// Tolerancia relativa equivalente a 10 cifras significativas: dos valores se
// consideran iguales si |a-b| <= tol * max(1, |a|, |b|). Con tol = 1e-10 se
// exigen ~10 cifras significativas coincidentes, acomodando el redondeo de
// IEEE-754 que comparten el motor y el oraculo.
function cercaDiezCifras(a, b) {
  const escala = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-10 * escala;
}

// Construye la Expresion `fn(arg)` donde arg representa el angulo θ con los
// glifos que acepta el tokenizer. Para θ < 0 se usa `0−|θ|` (el menos binario),
// ya que la gramatica no admite menos unario.
function construirExpresion(fn, theta) {
  const argumento = theta < 0 ? `(0−${Math.abs(theta)})` : `(${theta})`;
  return `${fn}${argumento}`;
}

describe("Property 3: Las funciones trigonometricas operan en grados", () => {
  // Generador de angulos enteros en el rango de los requisitos 5.1-5.3.
  const anguloEnGrados = fc.integer({ min: -999999999, max: 999999999 });

  it("evaluar `sinθ` coincide con Math.sin(θ×π/180) dentro de 10 cifras significativas", () => {
    fc.assert(
      fc.property(anguloEnGrados, (theta) => {
        const rad = theta * GRADOS_A_RADIANES;
        const esperado = Math.sin(rad);

        // Descartar el subdominio normalizado a 0 (Property 4).
        fc.pre(Math.abs(esperado) >= UMBRAL_CERO);

        const expresion = construirExpresion("sin", theta);

        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        expect(resultado.ok).toBe(true);
        expect(cercaDiezCifras(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("evaluar `cosθ` coincide con Math.cos(θ×π/180) dentro de 10 cifras significativas", () => {
    fc.assert(
      fc.property(anguloEnGrados, (theta) => {
        const rad = theta * GRADOS_A_RADIANES;
        const esperado = Math.cos(rad);

        // Descartar el subdominio normalizado a 0 (Property 4).
        fc.pre(Math.abs(esperado) >= UMBRAL_CERO);

        const expresion = construirExpresion("cos", theta);

        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        expect(resultado.ok).toBe(true);
        expect(cercaDiezCifras(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("evaluar `tanθ` (cuando esta definida) coincide con Math.tan(θ×π/180) dentro de 10 cifras significativas", () => {
    fc.assert(
      fc.property(anguloEnGrados, (theta) => {
        const rad = theta * GRADOS_A_RADIANES;

        // tan no esta definida donde cos(θ)=0 (90°+180°·k): el motor devuelve
        // DOMINIO. Se descarta ese subdominio (Property 11), replicando el
        // mismo criterio de umbral que usa el motor.
        fc.pre(Math.abs(Math.cos(rad)) >= UMBRAL_CERO);

        const esperado = Math.tan(rad);

        // Descartar el subdominio normalizado a 0 (Property 4).
        fc.pre(Math.abs(esperado) >= UMBRAL_CERO);

        const expresion = construirExpresion("tan", theta);

        let resultado;
        expect(() => {
          resultado = evaluar(expresion);
        }).not.toThrow();

        expect(resultado.ok).toBe(true);
        expect(cercaDiezCifras(resultado.valor, esperado)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
