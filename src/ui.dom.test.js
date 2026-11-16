// Pruebas de ejemplo/snapshot del DOM de la UI (tarea 10.2).
//
// Verifican que `index.html` (archivo unico, Req 1.7) contiene la maquetacion
// estilo Casio fx-82MS descrita en el Requirement 1: carcasa oscura, Pantalla
// LCD de dos lineas vacias al cargar, teclas grises con etiqueta principal y
// etiquetas secundarias diferenciadas, disposicion sin scroll y las seis
// Teclas_Decorativas.
//
// Estas pruebas son resistentes a cambios concurrentes: leen `index.html` en
// tiempo de ejecucion y afirman sobre la ESTRUCTURA del DOM (ids, data-key,
// clases) y la presencia de reglas CSS, en lugar de snapshots de cadena
// exacta. Asi, la tarea 11.1 puede reescribir el <script> embebido (cableado
// de eventos) sin romperlas, siempre que preserve el marcado.
//
// jsdom no esta disponible en este proyecto; se usan aserciones de
// regex/cadena sobre el contenido HTML con una degradacion elegante.
//
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.1.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, "..", "index.html");

/** Contenido crudo de index.html, leido una sola vez. */
let html = "";
/** Bloque <style> ... </style> embebido (CSS de la Calculadora). */
let styleBlock = "";
/** Marcado de <body> ... </body> sin los <script> (solo estructura DOM). */
let bodyMarkup = "";

beforeAll(() => {
  html = readFileSync(INDEX_PATH, "utf8");

  const style = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  styleBlock = style ? style[1] : "";

  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let markup = body ? body[1] : "";
  // Excluir los <script> embebidos: solo nos interesa la estructura del DOM,
  // que es lo que la tarea 11.1 debe preservar aunque reescriba el script.
  markup = markup.replace(/<script[\s\S]*?<\/script>/gi, "");
  bodyMarkup = markup;
});

/**
 * Extrae la etiqueta de apertura de un elemento identificado por su id.
 * Devuelve "" si no se encuentra.
 */
function openingTagById(source, id) {
  const re = new RegExp(`<([a-zA-Z0-9]+)\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i");
  const m = source.match(re);
  return m ? m[0] : "";
}

/**
 * Devuelve todas las etiquetas de apertura de <button ...> del marcado,
 * junto con el valor de su atributo data-key (o null si no lo tiene).
 */
function buttonsWithDataKey(source) {
  const buttons = source.match(/<button\b[^>]*>/gi) || [];
  return buttons.map((tag) => {
    const dk = tag.match(/\bdata-key=["']([^"']*)["']/i);
    return { tag, dataKey: dk ? dk[1] : null };
  });
}

describe("archivo unico autocontenido (Req 1.7)", () => {
  it("existe y no esta vacio", () => {
    expect(html.length).toBeGreaterThan(0);
  });

  it("incluye el CSS en un <style> embebido", () => {
    expect(/<style[^>]*>[\s\S]*?<\/style>/i.test(html)).toBe(true);
    expect(styleBlock.trim().length).toBeGreaterThan(0);
  });

  it("incluye el JavaScript en un <script> embebido", () => {
    expect(/<script\b[^>]*>[\s\S]*?<\/script>/i.test(html)).toBe(true);
  });

  it("no referencia hojas de estilo externas via <link rel=stylesheet>", () => {
    const links = html.match(/<link\b[^>]*>/gi) || [];
    const stylesheetLinks = links.filter((l) =>
      /rel=["']?stylesheet/i.test(l),
    );
    expect(stylesheetLinks).toEqual([]);
  });

  it("no referencia JavaScript externo via <script src=...> ni modulos locales de src/*.js", () => {
    const scripts = html.match(/<script\b[^>]*>/gi) || [];
    // Ningun <script> debe tener atributo src (todo el JS va embebido).
    const withSrc = scripts.filter((s) => /\bsrc=/i.test(s));
    expect(withSrc).toEqual([]);
    // Un <script type="module"> que importe src/*.js rompe la
    // autocontencion (Req 1.7): no debe haber imports a modulos locales.
    expect(/import\s+[^;]*["']\.\.?\/src\//i.test(html)).toBe(false);
    expect(/from\s+["']\.\.?\/src\//i.test(html)).toBe(false);
  });
});

describe("carcasa oscura (Req 1.1)", () => {
  it("contiene un contenedor con clase 'carcasa'", () => {
    expect(/class=["'][^"']*\bcarcasa\b[^"']*["']/i.test(bodyMarkup)).toBe(true);
  });

  it("define una regla CSS .carcasa con un fondo oscuro", () => {
    const rule = styleBlock.match(/\.carcasa\s*\{([\s\S]*?)\}/i);
    expect(rule).not.toBeNull();
    const body = rule[1];
    // El fondo debe declararse (background / background-color).
    expect(/background(-color)?\s*:/i.test(body)).toBe(true);
    // Debe usar un color oscuro: hex corto con digitos bajos (p.ej. #15171b,
    // #2b2f36) o un gradiente hacia negro. Comprobamos que aparece al menos
    // un hex oscuro en la declaracion de fondo.
    const hexes = body.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi) || [];
    const hasDarkHex = hexes.some((hex) => {
      let h = hex.slice(1);
      if (h.length === 3) {
        h = h
          .split("")
          .map((c) => c + c)
          .join("");
      }
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      // Luminosidad relativa aproximada; "oscuro" = por debajo del punto medio.
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      return lum < 110;
    });
    expect(hasDarkHex).toBe(true);
  });

  it("la Pantalla aparece antes que el teclado en el orden del documento (Pantalla arriba, teclado debajo)", () => {
    const idxPantalla = bodyMarkup.search(/\bid=["']pantalla["']/i);
    const idxTeclado = bodyMarkup.search(/\bid=["']teclado["']/i);
    expect(idxPantalla).toBeGreaterThanOrEqual(0);
    expect(idxTeclado).toBeGreaterThanOrEqual(0);
    expect(idxPantalla).toBeLessThan(idxTeclado);
  });
});

describe("Pantalla LCD de dos lineas (Req 1.2, 1.3)", () => {
  it("contiene la Linea_Superior y la Linea_Inferior", () => {
    expect(openingTagById(bodyMarkup, "linea-superior")).not.toBe("");
    expect(openingTagById(bodyMarkup, "linea-inferior")).not.toBe("");
  });

  it("ambas lineas residen dentro de la Pantalla", () => {
    const pantalla = bodyMarkup.match(
      /<section\b[^>]*\bid=["']pantalla["'][^>]*>([\s\S]*?)<\/section>/i,
    );
    expect(pantalla).not.toBeNull();
    const inner = pantalla[1];
    expect(/\bid=["']linea-superior["']/i.test(inner)).toBe(true);
    expect(/\bid=["']linea-inferior["']/i.test(inner)).toBe(true);
  });

  it("al cargar, la Linea_Superior y la Linea_Inferior estan vacias en el DOM (Req 1.3)", () => {
    const sup = bodyMarkup.match(
      /<div\b[^>]*\bid=["']linea-superior["'][^>]*>([\s\S]*?)<\/div>/i,
    );
    const inf = bodyMarkup.match(
      /<div\b[^>]*\bid=["']linea-inferior["'][^>]*>([\s\S]*?)<\/div>/i,
    );
    expect(sup).not.toBeNull();
    expect(inf).not.toBeNull();
    expect(sup[1].trim()).toBe("");
    expect(inf[1].trim()).toBe("");
  });
});

describe("teclas grises con etiquetas (Req 1.4, 1.5)", () => {
  it("define una regla CSS .tecla con un fondo gris y color de texto", () => {
    const rule = styleBlock.match(/\.tecla\s*\{([\s\S]*?)\}/i);
    expect(rule).not.toBeNull();
    const body = rule[1];
    expect(/background(-color)?\s*:/i.test(body)).toBe(true);
    expect(/color\s*:/i.test(body)).toBe(true);
  });

  it("cada tecla tiene una etiqueta principal legible", () => {
    const botones =
      bodyMarkup.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || [];
    expect(botones.length).toBeGreaterThan(0);
    for (const b of botones) {
      const principal = b.match(
        /<span\b[^>]*class=["'][^"']*\bprincipal\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
      );
      expect(principal).not.toBeNull();
      expect(principal[1].trim().length).toBeGreaterThan(0);
    }
  });

  it("existen etiquetas secundarias (multifuncion) en al menos una tecla", () => {
    expect(
      /class=["'][^"']*\bsecundaria\b[^"']*["']/i.test(bodyMarkup),
    ).toBe(true);
  });

  it("las etiquetas secundarias estan diferenciadas visualmente de la principal en el CSS", () => {
    const rule = styleBlock.match(
      /\.tecla\s+\.secundaria\s*\{([\s\S]*?)\}/i,
    );
    expect(rule).not.toBeNull();
    const body = rule[1];
    // Diferenciada: distinto tamano de fuente y/o posicionamiento respecto a
    // la etiqueta principal.
    expect(/font-size\s*:/i.test(body) || /position\s*:/i.test(body)).toBe(
      true,
    );
  });
});

describe("disposicion sin scroll (Req 1.6)", () => {
  it("usa dimensionado al viewport (vh/vmin/vw) en el CSS", () => {
    expect(/\b\d*\.?\d+v(h|w|min|max)\b/i.test(styleBlock)).toBe(true);
  });

  it("evita el scroll de pagina con overflow: hidden en body o carcasa", () => {
    expect(/overflow\s*:\s*hidden/i.test(styleBlock)).toBe(true);
  });
});

describe("Teclas_Decorativas (Req 10.1)", () => {
  const DECORATIVAS = ["SHIFT", "ALPHA", "MODE", "RCL", "nCr", "hyp"];

  it("estan presentes las seis Teclas_Decorativas con su data-key", () => {
    const keys = buttonsWithDataKey(bodyMarkup)
      .map((b) => b.dataKey)
      .filter((k) => k !== null);
    for (const d of DECORATIVAS) {
      expect(keys).toContain(d);
    }
  });

  it("cada Tecla_Decorativa muestra su etiqueta de texto correspondiente", () => {
    const botones =
      bodyMarkup.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || [];
    for (const d of DECORATIVAS) {
      const boton = botones.find((b) =>
        new RegExp(`\\bdata-key=["']${d}["']`).test(b),
      );
      expect(boton, `boton decorativo ${d}`).toBeDefined();
      const principal = boton.match(
        /<span\b[^>]*class=["'][^"']*\bprincipal\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
      );
      expect(principal).not.toBeNull();
      expect(principal[1].trim()).toBe(d);
    }
  });
});
