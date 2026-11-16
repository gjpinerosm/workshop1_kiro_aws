// Input Handler puro de la calculadora cientifica Casio fx-82MS (tarea 11.1).
//
// Traduce cada pulsacion (un DescriptorTecla: la cadena `data-key` de la UI o la
// tecla fisica ya normalizada a ese mismo descriptor) a la transicion de estado
// correspondiente de state.js. manejarTecla es una funcion PURA: recibe el
// DescriptorTecla y el CalculatorState actual y devuelve el nuevo
// CalculatorState, sin tocar el DOM ni mutar el estado recibido. Esto permite
// verificar el mapeo de forma aislada (unit tests) y reutilizar la misma logica
// desde el cableado de eventos embebido en index.html.
//
// Mapeo (design.md -> Input Handler):
//  - digitos, operadores (`+ − × ÷ ^`), `(`, `)`, `π`, `EXP`, funciones
//    (`sin cos tan log ln √ ∛ x² x³ x⁻¹ %`) -> insertarToken (insertan su token
//    en la posicion del cursor dentro de la Expresion).
//  - `.` (Separador_Decimal) -> insertarDecimal (valida un unico `.` por numero,
//    Requirements 4.2, 4.3).
//  - `DEL` -> del (borra el ultimo caracter; Expresion vacia no cambia nada,
//    Requirements 9.2, 9.3).
//  - `AC` -> ac (vacia la Expresion y pone "0" en la Linea_Inferior,
//    Requirements 9.1, 9.5).
//  - `Ans` -> insertarAns (inserta el ultimo Resultado o 0, Requirements 9.4,
//    9.5).
//  - `=` -> aplicarIgual (invoca el Motor_Calculo; Requirements 2.2, 2.3, 9.6,
//    9.7).
//  - teclas decorativas (`SHIFT ALPHA MODE RCL nCr hyp`) -> teclaDecorativa
//    (accion nula; Requirements 10.2, 10.3, 10.4).
//  - cualquier descriptor desconocido -> accion nula (se ignora sin alterar el
//    estado, de modo que una tecla fisica no mapeada nunca rompe la invariante).
//
// Requirements: 2.1, 2.2, 2.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.2, 10.3,
// 10.4.

import {
  insertarToken,
  insertarDecimal,
  del,
  ac,
  insertarAns,
  aplicarIgual,
  teclaDecorativa,
} from "./state.js";

// Conjunto de Teclas_Decorativas que, al pulsarse, no producen ningun efecto
// sobre el estado (design.md -> "teclas decorativas -> accion nula";
// Requirement 10.1 las muestra de forma permanente). Se expone para que la UI y
// las pruebas compartan una unica definicion y no diverjan.
export const TECLAS_DECORATIVAS = Object.freeze([
  "SHIFT",
  "ALPHA",
  "MODE",
  "RCL",
  "nCr",
  "hyp",
]);

const DECORATIVAS = new Set(TECLAS_DECORATIVAS);

// Descriptores de control con transicion propia (no son inserciones de token).
const CONTROLES = Object.freeze({
  DEL: del,
  AC: ac,
  Ans: insertarAns,
  "=": aplicarIgual,
});

// Indica si un DescriptorTecla corresponde a una Tecla_Decorativa.
export function esDecorativa(tecla) {
  return DECORATIVAS.has(tecla);
}

// manejarTecla(tecla, estado) -> CalculatorState
//
// Aplica al `estado` la transicion que corresponde al DescriptorTecla `tecla` y
// devuelve el nuevo estado. Funcion pura: no muta `estado` ni accede al DOM.
//
// El orden de resolucion es:
//  1. Teclas decorativas -> accion nula (teclaDecorativa).
//  2. Controles con transicion propia (DEL, AC, Ans, =).
//  3. Separador decimal `.` -> insertarDecimal (validacion de un unico `.`).
//  4. Resto de descriptores de entrada (digitos, operadores, parentesis, π,
//     EXP, funciones) -> insertarToken con el propio descriptor como lexema; el
//     `data-key` de la UI coincide con el lexema que reconoce el Motor_Calculo.
//  5. Descriptor vacio/desconocido -> accion nula (se ignora).
export function manejarTecla(tecla, estado) {
  // Descriptor ausente o no textual: no hacer nada (robustez ante teclas
  // fisicas no mapeadas).
  if (typeof tecla !== "string" || tecla.length === 0) {
    return estado;
  }

  // 1. Teclas decorativas: accion nula explicita (Requirements 10.2, 10.3, 10.4).
  if (DECORATIVAS.has(tecla)) {
    return teclaDecorativa(estado);
  }

  // 2. Controles con transicion dedicada.
  const control = CONTROLES[tecla];
  if (control) {
    return control(estado);
  }

  // 3. Separador decimal con su validacion propia (Requirements 4.2, 4.3).
  if (tecla === ".") {
    return insertarDecimal(estado);
  }

  // 4. Resto de entradas: insertar el token tal cual (digitos, operadores,
  //    parentesis, π, EXP y funciones; Requirement 2.1).
  return insertarToken(estado, tecla);
}
