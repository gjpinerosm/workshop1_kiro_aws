# Requirements Document

## Introduction

Esta funcionalidad consiste en una calculadora científica web que replica visualmente el modelo Casio fx-82MS. La calculadora se implementa en un único archivo HTML con CSS y JavaScript, ejecutándose en el navegador. Reproduce la carcasa oscura, la pantalla LCD de dos líneas y las teclas grises con etiquetas multifunción características del modelo físico.

La pantalla muestra la expresión introducida en la línea superior y el resultado en la línea inferior. La calculadora soporta operaciones aritméticas (suma, resta, multiplicación, división), paréntesis, decimales, porcentaje, funciones científicas (trigonométricas, logarítmicas, potencias, raíces) y teclas de control (AC, DEL, Ans, =). El separador decimal utilizado en toda la calculadora es el carácter punto (.), conforme al estándar de las calculadoras científicas y a la interpretación numérica de JavaScript. Las teclas específicas del hardware físico (SHIFT, ALPHA, MODE, RCL, nCr, hyp y funciones estadísticas) son decorativas en esta versión.

## Glossary

- **Calculadora**: El sistema web completo que replica la Casio fx-82MS, compuesto por la interfaz visual y el motor de cálculo.
- **Pantalla**: El componente LCD de dos líneas que muestra la expresión y el resultado.
- **Línea_Superior**: La línea de la Pantalla que muestra la expresión matemática introducida por el usuario.
- **Línea_Inferior**: La línea de la Pantalla que muestra el resultado del cálculo o el valor actual.
- **Motor_Cálculo**: El componente de JavaScript que evalúa la expresión matemática y produce el resultado.
- **Expresión**: La secuencia de números, operadores, funciones y paréntesis introducida por el usuario.
- **Resultado**: El valor numérico obtenido al evaluar la Expresión.
- **Ans**: El valor del último Resultado calculado, almacenado para su reutilización.
- **Tecla_Decorativa**: Una tecla visible en la interfaz que replica el modelo físico pero no ejecuta ninguna función en esta versión.
- **Operador_Aritmético**: Uno de los símbolos de suma (+), resta (−), multiplicación (×) o división (÷).
- **Función_Científica**: Una operación matemática avanzada como seno, coseno, tangente, logaritmo, potencia o raíz.
- **Separador_Decimal**: El carácter punto (.) utilizado para separar la parte entera de la parte fraccionaria de un número, conforme al estándar de las calculadoras científicas (como la Casio fx-82MS) y a la interpretación numérica de JavaScript.

## Requirements

### Requirement 1: Interfaz visual estilo Casio fx-82MS

**User Story:** Como usuario, quiero una calculadora que replique visualmente la Casio fx-82MS, para tener una experiencia familiar al modelo físico.

#### Acceptance Criteria

1. THE Calculadora SHALL mostrar una carcasa de color oscuro que contiene la Pantalla en la parte superior y el teclado debajo de la Pantalla.
2. THE Calculadora SHALL mostrar la Pantalla como un área LCD en la parte superior de la carcasa compuesta por la Línea_Superior y la Línea_Inferior, visibles de forma simultánea.
3. WHEN la Calculadora se carga, THE Calculadora SHALL mostrar la Línea_Superior y la Línea_Inferior vacías.
4. THE Calculadora SHALL mostrar teclas de color gris, cada una con al menos una etiqueta de texto legible asociada a su función.
5. WHERE una tecla tiene funciones multifunción en el modelo físico, THE Calculadora SHALL mostrar las etiquetas secundarias asociadas a la tecla, diferenciadas visualmente de la etiqueta principal.
6. THE Calculadora SHALL distribuir los elementos del teclado de modo que todas las teclas y la Pantalla sean visibles sin desplazamiento (scroll) dentro de la ventana del navegador.
7. THE Calculadora SHALL ejecutarse en un navegador web desde un único archivo HTML que incluye el CSS y el JavaScript en ese mismo archivo, sin requerir archivos externos adicionales.

### Requirement 2: Pantalla de dos líneas

**User Story:** Como usuario, quiero ver la expresión y el resultado simultáneamente, para verificar lo que he introducido antes y después de calcular.

#### Acceptance Criteria

1. WHEN el usuario introduce caracteres de una Expresión, THE Calculadora SHALL mostrar la Expresión completa en la Línea_Superior en un plazo de 100 milisegundos tras cada pulsación.
2. WHEN el usuario pulsa la tecla igual (=) y la Expresión es sintácticamente válida, THE Calculadora SHALL mostrar el Resultado en la Línea_Inferior y mantener la Expresión en la Línea_Superior.
3. IF el usuario pulsa la tecla igual (=) y la Expresión es sintácticamente inválida o está vacía, THEN THE Calculadora SHALL mantener la Expresión en la Línea_Superior, conservar el valor previo de la Línea_Inferior y mostrar una indicación de error sin modificar la Expresión introducida.
4. WHILE no se ha calculado ningún Resultado desde el inicio o desde el último borrado total, THE Calculadora SHALL mostrar el valor cero (0) en la Línea_Inferior.
5. IF la longitud de la Expresión excede el número de caracteres visibles de la Línea_Superior, THEN THE Calculadora SHALL desplazar el contenido horizontalmente para mantener visibles los últimos caracteres introducidos, incluido el cursor de entrada.
6. IF la longitud del Resultado excede el número de caracteres visibles de la Línea_Inferior, THEN THE Calculadora SHALL mostrar el Resultado en notación científica dentro del ancho visible de la Línea_Inferior.

### Requirement 3: Operaciones aritméticas básicas

**User Story:** Como usuario, quiero realizar operaciones aritméticas básicas, para efectuar cálculos cotidianos.

#### Acceptance Criteria

1. WHEN el usuario introduce una Expresión con el Operador_Aritmético de suma y pulsa igual (=), THE Motor_Cálculo SHALL calcular la suma de los operandos y mostrar el Resultado en la Línea_Inferior con una precisión mínima de 10 dígitos significativos.
2. WHEN el usuario introduce una Expresión con el Operador_Aritmético de resta y pulsa igual (=), THE Motor_Cálculo SHALL calcular la diferencia de los operandos y mostrar el Resultado en la Línea_Inferior con una precisión mínima de 10 dígitos significativos.
3. WHEN el usuario introduce una Expresión con el Operador_Aritmético de multiplicación y pulsa igual (=), THE Motor_Cálculo SHALL calcular el producto de los operandos y mostrar el Resultado en la Línea_Inferior con una precisión mínima de 10 dígitos significativos.
4. WHEN el usuario introduce una Expresión con el Operador_Aritmético de división y pulsa igual (=), THE Motor_Cálculo SHALL calcular el cociente de los operandos y mostrar el Resultado en la Línea_Inferior con una precisión mínima de 10 dígitos significativos.
5. THE Motor_Cálculo SHALL evaluar la Expresión respetando la precedencia estándar de operadores, en la que la multiplicación y la división se evalúan antes que la suma y la resta, y evaluando los operadores de igual precedencia de izquierda a derecha.
6. IF el usuario introduce una división cuyo divisor es cero y pulsa igual (=), THEN THE Calculadora SHALL mostrar un mensaje de error indicando división por cero en la Línea_Inferior y conservar la Expresión introducida en la Línea_Superior sin modificar.
7. IF el usuario pulsa igual (=) cuando la Expresión está incompleta o contiene sintaxis no válida, THEN THE Calculadora SHALL mostrar un mensaje de error indicando expresión no válida en la Línea_Inferior y conservar la Expresión introducida en la Línea_Superior sin modificar.
8. IF el Resultado de una operación excede el rango representable por la Calculadora, THEN THE Calculadora SHALL mostrar un mensaje de error indicando desbordamiento en la Línea_Inferior y conservar la Expresión introducida en la Línea_Superior sin modificar.

### Requirement 4: Paréntesis, decimales y porcentaje

**User Story:** Como usuario, quiero usar paréntesis, decimales y porcentaje, para construir expresiones con el orden y el formato que necesito.

#### Acceptance Criteria

1. WHEN el usuario introduce paréntesis en una Expresión y pulsa igual (=), THE Motor_Cálculo SHALL evaluar primero las operaciones contenidas en los paréntesis más internos y resolver los paréntesis anidados desde el nivel más interno hacia el más externo antes de aplicar las operaciones externas.
2. WHEN el usuario introduce el Separador_Decimal punto (.) en un número que aún no contiene el carácter punto (.), THE Calculadora SHALL incorporar el carácter punto (.) al número en la Expresión.
3. IF el usuario introduce el Separador_Decimal punto (.) en un número que ya contiene el carácter punto (.), THEN THE Calculadora SHALL ignorar la pulsación y mantener la Expresión sin cambios.
4. WHEN el usuario aplica el operador de porcentaje (%) a un valor y pulsa igual (=), THE Motor_Cálculo SHALL calcular el valor dividido entre cien y mostrar el Resultado en la Línea_Inferior.
5. IF el usuario introduce una Expresión con paréntesis no balanceados y pulsa igual (=), THEN THE Calculadora SHALL mostrar un mensaje de error indicando paréntesis no balanceados en la Línea_Inferior y conservar la Expresión introducida sin modificarla en la Línea_Superior.

### Requirement 5: Funciones trigonométricas

**User Story:** Como usuario, quiero calcular funciones trigonométricas, para resolver problemas que involucran ángulos.

#### Acceptance Criteria

1. WHEN el usuario aplica la función seno a un valor numérico en el rango de -999999999 a 999999999 grados y pulsa igual (=), THE Motor_Cálculo SHALL calcular el seno del valor y mostrar el Resultado en la Línea_Inferior con una precisión de al menos 10 dígitos significativos.
2. WHEN el usuario aplica la función coseno a un valor numérico en el rango de -999999999 a 999999999 grados y pulsa igual (=), THE Motor_Cálculo SHALL calcular el coseno del valor y mostrar el Resultado en la Línea_Inferior con una precisión de al menos 10 dígitos significativos.
3. WHEN el usuario aplica la función tangente a un valor numérico en el rango de -999999999 a 999999999 grados y pulsa igual (=), THE Motor_Cálculo SHALL calcular la tangente del valor y mostrar el Resultado en la Línea_Inferior con una precisión de al menos 10 dígitos significativos.
4. THE Motor_Cálculo SHALL interpretar el argumento de las funciones trigonométricas en grados sexagesimales.
5. IF el usuario aplica la función tangente a un valor cuyo coseno es cero (90 grados más múltiplos de 180 grados), THEN THE Motor_Cálculo SHALL mostrar un mensaje de error indicando que el resultado no está definido y conservar la Expresión introducida sin modificarla.
6. WHEN el Resultado de una función trigonométrica tiene un valor absoluto menor que 0.0000000001, THE Motor_Cálculo SHALL mostrar el Resultado como 0 en la Línea_Inferior.

### Requirement 6: Funciones logarítmicas

**User Story:** Como usuario, quiero calcular logaritmos, para resolver problemas con escalas exponenciales.

#### Acceptance Criteria

1. WHEN el usuario aplica la función logaritmo decimal (log) a un valor mayor que cero y pulsa igual (=), THE Motor_Cálculo SHALL calcular el logaritmo en base diez del valor y mostrar el Resultado en la Línea_Inferior con una precisión mínima de 10 dígitos significativos.
2. WHEN el usuario aplica la función logaritmo natural (ln) a un valor mayor que cero y pulsa igual (=), THE Motor_Cálculo SHALL calcular el logaritmo en base e del valor y mostrar el Resultado en la Línea_Inferior con una precisión mínima de 10 dígitos significativos.
3. IF el usuario aplica una función logarítmica (log o ln) a un valor igual a cero o negativo y pulsa igual (=), THEN THE Calculadora SHALL mostrar un mensaje de error indicando que el argumento está fuera del dominio en la Línea_Inferior y conservar la Expresión introducida sin modificarla.
4. IF el usuario aplica una función logarítmica (log o ln) a una Expresión sintácticamente inválida o incompleta y pulsa igual (=), THEN THE Calculadora SHALL mostrar un mensaje de error indicando entrada inválida en la Línea_Inferior y conservar la Expresión introducida sin modificarla.

### Requirement 7: Potencias y raíces

**User Story:** Como usuario, quiero calcular potencias y raíces, para resolver operaciones con exponentes.

#### Acceptance Criteria

1. WHEN el usuario aplica la función cuadrado (x²) a un valor y pulsa igual (=), THE Motor_Cálculo SHALL calcular el valor elevado a la potencia dos y mostrar el Resultado en la Línea_Inferior.
2. WHEN el usuario aplica la función cubo (x³) a un valor y pulsa igual (=), THE Motor_Cálculo SHALL calcular el valor elevado a la potencia tres y mostrar el Resultado en la Línea_Inferior.
3. WHEN el usuario aplica la función inverso (x⁻¹) a un valor distinto de cero y pulsa igual (=), THE Motor_Cálculo SHALL calcular el recíproco (1 dividido por el valor) y mostrar el Resultado en la Línea_Inferior.
4. WHEN el usuario aplica la función raíz cuadrada (√) a un valor mayor o igual a cero y pulsa igual (=), THE Motor_Cálculo SHALL calcular la raíz cuadrada del valor y mostrar el Resultado en la Línea_Inferior.
5. WHEN el usuario aplica la función raíz cúbica (∛) a un valor y pulsa igual (=), THE Motor_Cálculo SHALL calcular la raíz cúbica del valor, admitiendo valores negativos, y mostrar el Resultado en la Línea_Inferior.
6. WHEN el usuario aplica el operador de potencia (^) entre una base y un exponente y pulsa igual (=), THE Motor_Cálculo SHALL calcular la base elevada al exponente y mostrar el Resultado en la Línea_Inferior.
7. THE Motor_Cálculo SHALL calcular todas las potencias y raíces con una precisión mínima de 10 dígitos significativos.
8. IF el usuario aplica la función inverso (x⁻¹) a un valor igual a cero y pulsa igual (=), THEN THE Calculadora SHALL mostrar un mensaje de error indicando que la división entre cero no está definida en la Línea_Inferior y conservar la Expresión introducida sin modificarla.
9. IF el usuario aplica la función raíz cuadrada (√) a un valor negativo y pulsa igual (=), THEN THE Calculadora SHALL mostrar un mensaje de error indicando que el valor está fuera del dominio real en la Línea_Inferior y conservar la Expresión introducida sin modificarla.
10. IF el resultado de una potencia o raíz excede el rango numérico representable por la Calculadora, THEN THE Calculadora SHALL mostrar un mensaje de error indicando desbordamiento numérico en la Línea_Inferior y conservar la Expresión introducida sin modificarla.

### Requirement 8: Constantes y notación exponencial

**User Story:** Como usuario, quiero usar la constante π y la notación exponencial, para introducir valores científicos con precisión.

#### Acceptance Criteria

1. WHEN el usuario introduce la constante pi (π) en una Expresión, THE Motor_Cálculo SHALL sustituir π por su valor numérico con una precisión de al menos diez cifras decimales (3.1415926535).
2. WHEN el usuario introduce la notación exponencial (EXP) con una mantisa M y un exponente entero N, THE Motor_Cálculo SHALL interpretar el valor como M multiplicado por diez elevado a N (M × 10^N).
3. WHERE la notación exponencial está en uso, THE Motor_Cálculo SHALL aceptar exponentes enteros en el rango de -99 a 99.
4. IF el usuario introduce la notación exponencial sin una mantisa, o con una mantisa o un exponente no numérico, THEN THE Motor_Cálculo SHALL rechazar la Expresión, mostrar un mensaje de error indicando entrada inválida en la Línea_Inferior y conservar la Expresión introducida sin evaluarla.
5. IF el exponente introducido en la notación exponencial está fuera del rango de -99 a 99, THEN THE Motor_Cálculo SHALL rechazar la Expresión, mostrar un mensaje de error indicando exponente fuera de rango en la Línea_Inferior y conservar la Expresión introducida sin evaluarla.

### Requirement 9: Teclas de control

**User Story:** Como usuario, quiero teclas de control para borrar y reutilizar resultados, para corregir entradas y encadenar cálculos.

#### Acceptance Criteria

1. WHEN el usuario pulsa la tecla borrar todo (AC), THE Calculadora SHALL vaciar la Expresión de la Línea_Superior y mostrar el carácter cero (0) en la Línea_Inferior.
2. WHEN el usuario pulsa la tecla borrar (DEL) y la Expresión contiene al menos un carácter, THE Calculadora SHALL eliminar únicamente el último carácter introducido en la Expresión.
3. IF el usuario pulsa la tecla borrar (DEL) y la Expresión está vacía, THEN THE Calculadora SHALL mantener la Expresión vacía sin modificar la Línea_Inferior.
4. WHEN el usuario pulsa la tecla Ans, THE Calculadora SHALL insertar el valor numérico del último Resultado calculado en la posición actual del cursor dentro de la Expresión.
5. WHILE no se ha calculado ningún Resultado previo desde el inicio de la sesión o desde la última pulsación de borrar todo (AC), THE Calculadora SHALL usar el valor numérico cero (0) como valor de Ans.
6. WHEN el usuario pulsa la tecla igual (=) y el Motor_Cálculo evalúa la Expresión sin error, THE Calculadora SHALL almacenar el Resultado calculado como el nuevo valor de Ans.
7. IF el usuario pulsa la tecla igual (=) y el Motor_Cálculo no puede evaluar la Expresión, THEN THE Calculadora SHALL conservar el valor de Ans previo sin modificarlo.

### Requirement 10: Teclas decorativas

**User Story:** Como usuario, quiero ver las teclas del modelo físico aunque no tengan función, para que la calculadora conserve su apariencia fiel.

#### Acceptance Criteria

1. THE Calculadora SHALL mostrar de forma permanente las Teclas_Decorativas SHIFT, ALPHA, MODE, RCL, nCr y hyp, cada una con su etiqueta de texto correspondiente visible y legible.
2. WHEN el usuario pulsa cualquiera de las Teclas_Decorativas (SHIFT, ALPHA, MODE, RCL, nCr o hyp), THE Calculadora SHALL mantener la Expresión sin modificación alguna respecto a su contenido inmediatamente anterior a la pulsación.
3. WHEN el usuario pulsa cualquiera de las Teclas_Decorativas (SHIFT, ALPHA, MODE, RCL, nCr o hyp), THE Calculadora SHALL mantener el Resultado mostrado en la Línea_Inferior sin modificación alguna respecto a su contenido inmediatamente anterior a la pulsación.
4. WHEN el usuario pulsa cualquiera de las Teclas_Decorativas (SHIFT, ALPHA, MODE, RCL, nCr o hyp), THE Calculadora SHALL abstenerse de invocar al Motor_Cálculo y de registrar la pulsación en la Expresión.
