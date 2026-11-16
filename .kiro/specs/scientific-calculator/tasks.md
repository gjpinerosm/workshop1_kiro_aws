# Implementation Plan: Calculadora Científica (Casio fx-82MS)

## Overview

El plan construye la calculadora de forma incremental en un único archivo HTML con CSS y JavaScript embebidos (Requirement 1.7). Se parte del andamiaje del archivo, luego se implementa el Motor_Cálculo puro (tokenizer → parser → evaluator) de abajo hacia arriba, seguido del estado y Ans, el Display Controller, la maquetación de la UI y, por último, el Input Handler que conecta todo. Las pruebas basadas en propiedades (fast-check) se colocan junto a cada pieza del motor para detectar errores temprano, y las pruebas de ejemplo/snapshot cubren la UI y los casos borde. El motor se mantiene como función pura sin dependencias del DOM para poder verificarlo de forma aislada.

## Tasks

- [x] 1. Crear el andamiaje del archivo HTML único
  - Crear `index.html` con la estructura base: `<!DOCTYPE html>`, `<head>` con `<style>` embebido vacío y `<body>` con `<script>` embebido vacío, sin dependencias externas
  - Definir contenedores raíz: carcasa, área de Pantalla (Línea_Superior y Línea_Inferior) y rejilla de teclado, como marcadores de posición vacíos
  - Preparar el esqueleto del módulo JavaScript (IIFE o módulo) que expondrá el Motor_Cálculo, el estado, el Display Controller y el Input Handler
  - _Requirements: 1.1, 1.2, 1.7_

- [x] 2. Implementar el Tokenizer del Motor_Cálculo
  - [x] 2.1 Implementar `tokenizar(expresión) -> Token[]`
    - Reconocer tokens NÚMERO (decimales con punto `.`), OPERADOR (`+ − × ÷ ^`), FUNCIÓN_PREFIJA (`sin cos tan log ln √ ∛`), OPERADOR_POSTFIJO (`x² x³ x⁻¹ %`), PAREN_IZQ, PAREN_DER y CONSTANTE (`π`)
    - Interpretar la notación `EXP`: mantisa seguida de `E` y exponente entero; validar que exista mantisa y que el exponente sea entero
    - Lanzar/propagar `ErrorCálculo(SINTAXIS)` ante lexemas no reconocidos o EXP mal formada, y `EXPONENTE_FUERA_RANGO` cuando el exponente EXP esté fuera de −99..99
    - _Requirements: 3.7, 4.2, 8.2, 8.3, 8.4, 8.5_
x
  - [x] 2.2 Escribir prueba basada en propiedades para la equivalencia de la notación EXP
    - **Property 8: La notación exponencial equivale a M × 10^N**
    - **Validates: Requirements 8.2, 8.3**
    - Usar fast-check con ≥100 iteraciones y comparación por oráculo con tolerancia de 10 cifras significativas; etiqueta: `Feature: scientific-calculator, Property 8`

  - [x] 2.3 Escribir prueba basada en propiedades para el exponente EXP fuera de rango
    - **Property 15: El exponente fuera de rango produce error específico**
    - **Validates: Requirements 8.5**
    - fast-check con ≥100 iteraciones generando `|N| > 99`; verificar `TipoError = EXPONENTE_FUERA_RANGO` sin excepciones no controladas

- [x] 3. Implementar el Parser recursivo descendente del Motor_Cálculo
  - [x] 3.1 Implementar `parsear(tokens) -> NodoAST`
    - Codificar la gramática por niveles de precedencia: `términoAdit → términoMult → potencia (^ asociativo a derecha) → unarioPost → unarioPre → primario`
    - Construir nodos AST: `numero`, `constante`, `binario`, `unarioPre`, `unarioPost`
    - Detectar paréntesis no balanceados o mal anidados → `ErrorCálculo(PARENTESIS)` y entrada incompleta/inválida → `ErrorCálculo(SINTAXIS)`
    - _Requirements: 3.5, 3.7, 4.1, 4.5_

  - [x] 3.2 Escribir prueba basada en propiedades para los paréntesis no balanceados
    - **Property 12: Los paréntesis no balanceados producen error de paréntesis**
    - **Validates: Requirements 4.5**
    - fast-check con ≥100 iteraciones generando paréntesis descompensados; verificar `TipoError = PARENTESIS`

  - [x] 3.3 Escribir prueba basada en propiedades para las entradas mal formadas
    - **Property 13: Las entradas mal formadas producen error de sintaxis**
    - **Validates: Requirements 3.7, 6.4, 8.4**
    - fast-check con ≥100 iteraciones generando cadenas inválidas/incompletas (incluida EXP sin mantisa y argumentos de función mal formados); verificar `TipoError = SINTAXIS` sin excepciones no controladas

- [x] 4. Implementar el Evaluator del Motor_Cálculo (aritmética, paréntesis y precedencia)
  - [x] 4.1 Implementar `evaluar(expresión) -> { ok, valor } | { ok:false, error }` para aritmética base
    - Recorrer el AST evaluando `+ − × ÷ ^` y paréntesis con precedencia estándar sobre `Number` de JS
    - Señalar `DIVISION_POR_CERO` cuando el divisor de `÷` sea 0 y `DESBORDAMIENTO` ante resultados no finitos (`±Infinity`)
    - Nunca lanzar excepciones no controladas: todo fallo se devuelve como `ErrorCálculo` tipado
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 4.1_

  - [x] 4.2 Escribir prueba basada en propiedades para la precedencia aritmética
    - **Property 1: La evaluación aritmética respeta la precedencia de operadores**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1**
    - fast-check con ≥100 iteraciones comparando contra un evaluador de referencia con tolerancia de 10 cifras significativas

  - [x] 4.3 Escribir prueba basada en propiedades para la división por cero
    - **Property 10: La división por cero produce error sin alterar la Expresión**
    - **Validates: Requirements 3.6, 7.8**
    - fast-check con ≥100 iteraciones evaluando `n ÷ 0` y `0⁻¹`; verificar `TipoError = DIVISION_POR_CERO` y Expresión sin modificar

  - [x] 4.4 Escribir prueba basada en propiedades para el desbordamiento
    - **Property 14: Los resultados no representables producen desbordamiento**
    - **Validates: Requirements 3.8, 7.10**
    - fast-check con ≥100 iteraciones con operandos extremos; verificar `TipoError = DESBORDAMIENTO`

- [x] 5. Checkpoint - Motor base verificado
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Ampliar el Evaluator con porcentaje, trigonometría, logaritmos, potencias y raíces
  - [x] 6.1 Implementar el operador de porcentaje y las constantes
    - `%` divide el valor entre 100; sustituir `π` por `Math.PI` (≥ 3.1415926535)
    - _Requirements: 4.4, 8.1_

  - [x] 6.2 Escribir prueba basada en propiedades para el porcentaje
    - **Property 2: El porcentaje divide entre cien**
    - **Validates: Requirements 4.4**
    - fast-check con ≥100 iteraciones comparando `v%` con `v/100` con tolerancia de 10 cifras significativas

  - [x] 6.3 Implementar las funciones trigonométricas en grados
    - Convertir grados a radianes (`rad = grados × π / 180`) antes de `Math.sin/cos/tan`
    - Señalar `DOMINIO` en `tan` cuando `cos(argumento)=0` (90°+180°·k) y normalizar a `0` resultados con `|valor| < 1e-10`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.4 Escribir prueba basada en propiedades para las funciones trigonométricas
    - **Property 3: Las funciones trigonométricas operan en grados**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - fast-check con ≥100 iteraciones en el rango −999999999..999999999 contra el oráculo `Math.sin/cos/tan(θ×π/180)` con tolerancia de 10 cifras significativas

  - [x] 6.5 Escribir prueba basada en propiedades para la normalización trigonométrica a cero
    - **Property 4: Los resultados trigonométricos despreciables se normalizan a cero**
    - **Validates: Requirements 5.6**
    - fast-check con ≥100 iteraciones para ángulos cuyo resultado tiene `|valor| < 1e-10`; verificar que la Línea_Inferior muestra exactamente `0`

  - [x] 6.6 Implementar logaritmos, potencias y raíces
    - `log` = base 10 y `ln` = base e exigen argumento > 0 (si no, `DOMINIO`); `√` exige argumento ≥ 0 (`DOMINIO` si negativo); `∛` admite negativos; `x²`, `x³`, `x⁻¹` y `^`
    - `x⁻¹` de 0 → `DIVISION_POR_CERO`; resultados no finitos → `DESBORDAMIENTO`
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [x] 6.7 Escribir prueba basada en propiedades para los logaritmos
    - **Property 5: Los logaritmos coinciden con su oráculo**
    - **Validates: Requirements 6.1, 6.2**
    - fast-check con ≥100 iteraciones para `v > 0` comparando `log` con `Math.log10` y `ln` con `Math.log` con tolerancia de 10 cifras significativas

  - [x] 6.8 Escribir prueba basada en propiedades para potencias y raíces
    - **Property 6: Potencias y raíces coinciden con su oráculo**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5, 7.6, 7.7**
    - fast-check con ≥100 iteraciones comparando `x²`, `x³`, `√`, `∛` y `b^e` contra `Math.pow/sqrt/cbrt` con tolerancia de 10 cifras significativas

  - [x] 6.9 Escribir prueba basada en propiedades para operaciones inversas
    - **Property 7: Raíz e inverso son operaciones inversas de potencia**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
    - fast-check con ≥100 iteraciones verificando `√(v²)=|v|`, `∛(v³)=v` y `(v⁻¹)⁻¹=v` con tolerancia de 10 cifras significativas

  - [x] 6.10 Escribir prueba basada en propiedades para los errores de dominio
    - **Property 11: Los argumentos fuera de dominio producen error de dominio**
    - **Validates: Requirements 5.5, 6.3, 7.9**
    - fast-check con ≥100 iteraciones para `log/ln` de ≤0, `√` de negativo y `tan(90+180·k)`; verificar `TipoError = DOMINIO` y Expresión sin modificar

- [x] 7. Checkpoint - Motor científico completo verificado
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implementar el estado central y la gestión de Ans
  - [x] 8.1 Implementar `CalculatorState` y las transiciones puras de estado
    - Definir `CalculatorState { expresion, cursor, lineaInferior, ans, tieneResultado, estadoError }`
    - Implementar transiciones puras: inserción de token, inserción del Separador_Decimal con validación de un único `.`, DEL, AC, inserción de Ans y aplicación del Resultado/Error tras `=`
    - Reglas de Ans: éxito almacena Ans nuevo (9.6); fallo conserva Ans y Línea_Inferior previa (9.7, 2.3); AC/inicio dejan Ans en `0` y Línea_Inferior en `0` (9.1, 9.5); DEL sobre Expresión vacía no cambia nada (9.3)
    - _Requirements: 2.2, 2.3, 4.2, 4.3, 9.1, 9.2, 9.4, 9.5, 9.6, 9.7_

  - [x] 8.2 Escribir prueba basada en propiedades para el único separador decimal
    - **Property 9: Un número contiene a lo sumo un separador decimal**
    - **Validates: Requirements 4.2, 4.3**
    - fast-check con ≥100 iteraciones insertando `.` varias veces; verificar exactamente un `.` por número

  - [x] 8.3 Escribir prueba basada en propiedades para el éxito del cálculo y Ans
    - **Property 16: Un cálculo válido conserva la Expresión y almacena Ans**
    - **Validates: Requirements 2.2, 9.6**
    - fast-check con ≥100 iteraciones sobre Expresiones válidas; verificar Expresión intacta, Resultado en Línea_Inferior y Ans actualizado

  - [x] 8.4 Escribir prueba basada en propiedades para el fallo del cálculo y conservación de Ans
    - **Property 17: Un cálculo fallido conserva la Expresión, la Línea_Inferior previa y Ans**
    - **Validates: Requirements 2.3, 9.7**
    - fast-check con ≥100 iteraciones sobre Expresiones inválidas con estado inicial arbitrario; verificar Expresión intacta, `ans=a` y conservación de `L` salvo indicación de error

  - [x] 8.5 Escribir prueba basada en propiedades para DEL
    - **Property 18: DEL elimina exactamente el último carácter**
    - **Validates: Requirements 9.2**
    - fast-check con ≥100 iteraciones sobre Expresiones no vacías; verificar longitud −1 y prefijo de la original

  - [x] 8.6 Escribir prueba basada en propiedades para la inserción de Ans
    - **Property 19: Insertar Ans coloca el último Resultado en el cursor**
    - **Validates: Requirements 9.4**
    - fast-check con ≥100 iteraciones con Resultado previo `r` y cursor `p`; verificar inserción de la representación de `r` en `p`

  - [x] 8.7 Escribir prueba basada en propiedades para las teclas decorativas
    - **Property 20: Las teclas decorativas no tienen efecto**
    - **Validates: Requirements 10.2, 10.3, 10.4**
    - fast-check con ≥100 iteraciones y estado arbitrario; verificar estado idéntico y que no se invoca el Motor_Cálculo

- [x] 9. Implementar el Display Controller de dos líneas
  - [x] 9.1 Implementar `renderizar(estado)` para ambas líneas
    - Línea_Superior refleja la Expresión completa; Línea_Inferior muestra Resultado, `0` sin cálculo previo o el mensaje de error del `TipoError`
    - Formatear el Resultado con al menos 10 dígitos significativos recortando ceros no significativos
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 9.2 Implementar el desplazamiento horizontal y la notación científica por desbordamiento de ancho
    - Desplazar la Línea_Superior manteniendo visibles los últimos caracteres y el cursor cuando excede el ancho
    - Formatear la Línea_Inferior en notación científica dentro del ancho visible cuando el Resultado no cabe
    - _Requirements: 2.5, 2.6_

  - [x] 9.3 Escribir prueba basada en propiedades para el reflejo de la Línea_Superior
    - **Property 21: La Línea_Superior refleja la Expresión introducida**
    - **Validates: Requirements 2.1**
    - fast-check con ≥100 iteraciones sobre secuencias de entrada válidas; verificar igualdad entre Línea_Superior y Expresión del estado

  - [x] 9.4 Escribir prueba basada en propiedades para la notación científica por ancho
    - **Property 22: Los resultados que exceden el ancho se muestran en notación científica**
    - **Validates: Requirements 2.6**
    - fast-check con ≥100 iteraciones con Resultados cuya representación decimal excede el ancho; verificar cadena en notación científica dentro del ancho visible

  - [x] 9.5 Escribir pruebas de ejemplo de estados puntuales y casos borde del Display
    - Valor inicial `0` en la Línea_Inferior, comportamiento de AC, Ans=0 sin Resultado previo, sustitución de `π`, `DEL` sobre Expresión vacía y desplazamiento de una Expresión larga
    - _Requirements: 2.4, 2.5, 8.1, 9.1, 9.3, 9.5_

- [x] 10. Maquetar la UI estilo Casio fx-82MS (HTML + CSS embebidos)
  - [x] 10.1 Construir la carcasa, la Pantalla y la rejilla de teclado
    - Carcasa oscura con la Pantalla LCD de dos líneas arriba y el teclado debajo; Líneas superior e inferior vacías al cargar
    - Teclas grises con etiqueta principal legible y etiquetas secundarias multifunción diferenciadas visualmente; incluir las seis teclas decorativas (SHIFT, ALPHA, MODE, RCL, nCr, hyp) y todas las teclas de función/operador/control
    - Disponer todo para que la Pantalla y las teclas sean visibles sin scroll dentro de la ventana
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 10.1_

  - [x] 10.2 Escribir pruebas de ejemplo/snapshot del DOM de la UI
    - Verificar carcasa oscura, Pantalla de dos líneas, teclas grises con etiquetas, etiquetas secundarias, visibilidad sin scroll, presencia de las seis teclas decorativas y que todo reside en un único archivo HTML
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.1_

- [x] 11. Implementar el Input Handler y conectar UI, estado, motor y display
  - [x] 11.1 Implementar `manejarTecla(tecla, estado)` y el cableado de eventos
    - Mapear dígitos, operadores, `(`, `)`, `.`, `π`, `EXP` y funciones a inserción de token; `DEL`, `AC`, `Ans` a sus transiciones de estado; `=` a la invocación del Motor_Cálculo; teclas decorativas a acción nula
    - Cablear eventos de ratón y teclado físico a `manejarTecla`, actualizar el estado y re-renderizar con el Display Controller
    - _Requirements: 2.1, 2.2, 2.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.2, 10.3, 10.4_

  - [x] 11.2 Escribir prueba de ejemplo de latencia de actualización
    - Verificar que la Línea_Superior se actualiza en ≤100 ms tras una pulsación
    - _Requirements: 2.1_

- [x] 12. Checkpoint final - Integración completa verificada
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas) y pueden omitirse para un MVP más rápido.
- Cada tarea referencia requisitos concretos para trazabilidad.
- Las pruebas basadas en propiedades usan fast-check con un mínimo de 100 iteraciones y comparan contra oráculos con tolerancia de 10 cifras significativas en las propiedades numéricas.
- Cada prueba de propiedad lleva la etiqueta `Feature: scientific-calculator, Property {número}: {texto}` conforme al diseño.
- Las propiedades de condición de error generan entradas en el subdominio de fallo y verifican el `TipoError` esperado sin excepciones no controladas.
- Los checkpoints aseguran validación incremental del motor antes de construir la UI.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.6"] },
    { "id": 6, "tasks": ["6.4", "6.5", "6.7", "6.8", "6.9", "6.10", "8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "9.1"] },
    { "id": 8, "tasks": ["9.2", "10.1"] },
    { "id": 9, "tasks": ["9.3", "9.4", "9.5", "10.2", "11.1"] },
    { "id": 10, "tasks": ["11.2"] }
  ]
}
```
