# Acciones Comerciales — Sistema de diseño

Estado del sistema **tal cual está hoy** (May 2026), extraído del
`styles.css` y del `index.html` actuales. Sirve como baseline antes
del rework visual: nada acá es "como debería ser", todo es "cómo es".

Notas críticas al final.

---

## Paleta

### Tokens actuales (`:root`)

| Token        | Valor      | Uso                                              |
|--------------|------------|--------------------------------------------------|
| `--azul`     | `#001F5B`  | Marca primaria. Topbar, login bg, botones CTA.   |
| `--azul-m`   | `#003DA5`  | Azul medio. Focus rings, links, hover, énfasis.  |
| `--dorado`   | `#F5A800`  | Marca acento. Badges, spinner, etiquetas PDV.    |
| `--gris-f`   | `#F2F5FA`  | Fondo general del body, cards secundarios.       |
| `--gris-b`   | `#DDE3EE`  | Bordes, dividers, fondos inactivos.              |
| `--txt`      | `#1A1A2E`  | Texto principal.                                 |
| `--txt-s`    | `#5A6478`  | Texto secundario, labels, meta.                  |
| `--rojo`     | `#C0392B`  | Errores, alertas, indicador PTC.                 |
| `--rojo-l`   | `#FDECEA`  | Fondo de estado de error.                        |
| `--verde`    | `#1A7A3C`  | Éxito, detalles de producto en la calculadora.   |

### Colores hardcodeados (no tokenizados — deuda)

- Etiquetas de segmento: `#6DD49A` / `#0F5229` (verde claro)
- Etiquetas CCC: `#FB923C` / `#431407` / `#FFEDD5` / `#9A3412` (naranja)
- Etiquetas PDV activas: `#FFE08A` / `#5A3A00` / `#E8A800`
- Canal filters: `#4A5568` / `#2D3748` / `#B0BAC8` / `#EEF1F6`
- Offline badge: `#FFF3CD` / `#7A5500` / `#F5C842`
- Bg de filas hover, gradients de scroll fade, sombras varias

Hay al menos **15+ colores fuera del sistema**. Candidato fuerte a
consolidar durante el rework.

### Sombras

| Uso                                | Valor                                  |
|------------------------------------|----------------------------------------|
| Card de login                      | `0 24px 64px rgba(0,0,0,.3)`           |
| Topbar (sticky)                    | `0 2px 14px rgba(0,0,0,.18)`           |
| Sheets (calc, plan, muro)          | `0 8px 40px rgba(0,31,91,.18)`         |
| Cfg bottom                         | `0 -4px 24px rgba(0,31,91,.12)`        |
| Cfgwrap (barra inferior)           | `0 -2px 12px rgba(0,31,91,.07)`        |
| Suggestions dropdown               | `0 4px 20px rgba(0,31,91,.15)`         |
| Focus ring (azul)                  | `0 0 0 3px rgba(0,61,165,.09)`         |
| Focus ring (PIN, más grueso)       | `0 0 0 4px rgba(0,61,165,.1)`          |

Las sombras de marca (`rgba(0,31,91,...)`) son la firma visual sutil de
la app. El blanco-y-azul de los sheets se siente "Quilmes" gracias a esto.

---

## Tipografía

### Familias

| Familia    | Usos                                                  |
|------------|-------------------------------------------------------|
| **DM Sans** (400/500/600/700) | UI text, labels, botones, copy general |
| **DM Mono** (400/600)         | Códigos PDV, SKU, precios, totales, números |

Ambas cargadas desde Google Fonts. No hay system-font fallback estratégico
todavía — si Google Fonts falla, cae a `sans-serif`.

### Tamaños observados (extraídos del CSS)

| px  | Donde aparece                                          |
|-----|--------------------------------------------------------|
| 9   | calc-result-lbl                                        |
| 10  | tabs activos, etiq counts, dias chips, table headers   |
| 11  | labels secundarios, chips de historial, etiquetas      |
| 12  | celdas de tabla, copy denso, hints                     |
| 13  | sub-titles, errores, copy general                      |
| 14  | títulos de sheets, sheet-nombre                        |
| 15  | título de login, body principal, botones primarios     |
| 18  | search input (con letter-spacing 2px)                  |
| 20  | íconos de close                                        |
| 23  | título de login (ltitle)                               |
| 26  | código de PDV en result header (rcod, hero)            |
| 28  | PIN boxes (dígitos individuales)                       |

**12 tamaños distintos.** Demasiados. La jerarquía no es legible al ojo;
los saltos son arbitrarios. Candidato a reducir a una escala modular.

### Pesos

400, 500, 600, 700, 800. Cinco pesos. El 800 sólo aparece en
`.lbadge` y `.tbadge` (los chips uppercase con letterspacing).

### Letter-spacing y mayúsculas

- Uppercase + letter-spacing en labels chicos (`.slbl`, `.clbl`,
  `.calc-lbl`, headers de tabla): `.4` a `1px`.
- Letter-spacing 2px en el search input (el código PDV se ve "estirado").
- Letter-spacing 2px en `.rcod` (el código del cliente en el header).
- `-.3px` a `-.5px` en títulos grandes (compensación óptica estándar).

---

## Espaciado

No hay una escala formal; los valores que aparecen en el CSS son:

`2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 20, 22, 24, 28, 30, 32, 40, 64, 80`

Más de 20 valores únicos. Una escala razonable (4, 8, 12, 16, 24, 32, 48, 64)
ya cubriría el 90% sin pérdida funcional.

---

## Radios

Valores en uso: `6, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28`. Patrón
implícito:

| Radio | Uso                                                |
|-------|----------------------------------------------------|
| 6     | Badges chicos de marca (`.tbadge`, `.muro-btn`)    |
| 8     | Chips chicos, dia checkboxes                       |
| 9-10  | Botones secundarios, controles del topbar          |
| 10-11 | Inputs, botones de configuración                   |
| 12-14 | Cards, sheets internos, inputs grandes             |
| 20    | Pills, chips, badges redondeados                   |
| 24-28 | Sheets full-width, login card (más "blob")         |

Consolidar a 4 o 5 radios bien definidos: `6, 10, 14, 20, 28`.

---

## Motion

| Duración        | Easing                              | Donde                          |
|-----------------|-------------------------------------|--------------------------------|
| `.1s` – `.15s`  | default                             | Hover de items, press feedback |
| `.18s`          | default                             | Inputs, transiciones de borde  |
| `.2s`           | default                             | Pill chevron rotate            |
| `.25s`          | ease                                | Fade-in de resultados          |
| `.32s`          | `cubic-bezier(.4,0,.2,1)`           | Sheets entrando (calc, plan, muro) |
| `.6s` – `.65s`  | linear infinite                     | Spinner de loading             |

Press feedback consistente: `transform: scale(.93 a .97)` en `:active`.
Esa micro-confirmación táctil es **buena, hay que conservarla**.

---

## Iconografía

**Todo emojis Unicode**, sin librería de íconos.

| Emoji  | Función                          |
|--------|----------------------------------|
| 🔍 🔎  | Buscar                           |
| 📍     | Maps / ubicación                 |
| 📌     | GPS / cercanos                   |
| 📋     | Vacío (sin acciones)             |
| 💬     | Muro / comentarios               |
| ⚙      | Configuración                    |
| ↻      | Refresh                          |
| ✉      | Enviar (WhatsApp)                |
| ✕      | Cerrar                           |
| ▼ ▲    | Chevrons                         |
| − +    | Quantity steppers                |

Funciona pero **renderiza distinto en cada SO** (iOS color, Android plano,
Windows otra cosa). Y hay 11+ glyphs distintos sin un estilo unificado.
Reemplazar por un SVG set (ej: Lucide, Phosphor) sería un upgrade
visual grande con poco riesgo.

---

## Componentes (inventario)

### Pantallas principales

1. **Login** — Card centrada en fondo `--azul` sólido, 4 inputs PIN
   monospace + botón "Entrar".
2. **App** (post-login) — Topbar sticky azul + cuerpo scrolleable +
   barra de config fija inferior.

### Topbar (sticky, azul)

- Badge "Quilmes" dorado, nombre del distribuidor (clickeable, abre
  dropdown para cambiar), botón "Salir" semi-transparente.

### Search

- Label en uppercase, input grande con letter-spacing 2 (el código se
  ve "técnico"), botón buscar + botón GPS al lado.
- Dropdown de sugerencias debajo (border-radius continúa el del input
  con un hack visual de border-merge).
- Chips de historial (últimas 5 búsquedas) en monospace.

### Estados

- **Loading**: bg crema (`#FFFBF0`), spinner dorado, copy centrado.
- **Error**: bg rojo-claro (`--rojo-l`).
- **Vacío**: borde dasheado gris, emoji 📋.

### Result header (card azul)

- Código PDV gigante en monospace + razón social + domicilio +
  badge de canal + link a Maps + botón Muro + botón toggle "colapsar todo".
- Debajo: tabs de "negocio" + chips de etiquetas (PDV / segmento / CCC).

### Segment blocks (acordeón colapsable)

- Cada segmento tiene su color de borde, fondo claro, fondo medio (header)
  y color dark (texto). Usan CSS vars dinámicas `--s-light --s-mid
  --s-border --s-dark` seteadas inline.
- Header con título + bubbles de detalle + chevron.
- Body: tabla de precios scrolleable horizontalmente con primeras
  2 columnas sticky.
- Variante `.s-grey` para segmentos sin precios.

### Bottom sheets (top-down)

- **Calculadora** — SKU + descuento → precio por bulto / unitario / PTC / total.
- **Planificador** — Filtros (supervisor, vendedor, días, canal, etiquetas) + tabla de PDVs.
- **Muro** — Lista de comentarios + textarea para agregar.
- **Nearby (GPS)** — Lista de PDVs cercanos ordenados por distancia.

Todos entran con `translateY(-100%) → 0`, `.32s cubic-bezier(.4,0,.2,1)`.
Cierran con click en overlay o botón ✕.

### Barra de configuración (sticky bottom)

- Botones inline: ⚙ Config, ↻ Refresh, Bt (unitario toggle), PTR/PTC
  toggle, Markup %, Calc, Planificador.
- Configuración se abre como sheet desde abajo (75vh max).

---

## Deuda visual identificada

1. **Inline styles en HTML** — `style="..."` en al menos 15 lugares
   del `index.html`. Mezcla peligrosa con el CSS, hace el diff visual
   ruidoso. Hay que extraer a clases.
2. **Demasiadas vars no tokenizadas** — Los colores de segmentos,
   etiquetas y filtros viven hardcoded. Habría que llevarlos a `:root`
   o a un objeto de tokens más explícito.
3. **Escala tipográfica inconsistente** — 12 tamaños. Reducir a 7-8.
4. **Escala de espaciado libre** — 20+ valores. Reducir a 8.
5. **Emojis como iconos** — Inconsistente cross-platform. Reemplazar
   por SVG set.
6. **Etiquetas y chips visualmente ruidosos** — Cada tipo tiene su
   color, su borde, su radius, su activeshadow. La pantalla con todas
   las etiquetas activas satura. Necesita jerarquía visual mejor.
7. **Botones en la barra inferior** son 6+ controles apretados,
   varios sólo con label corto ("Bt", "PTR", "30%"). Difíciles de
   entender sin tooltips, y los tooltips no se ven en mobile.
8. **Sin estados de foco consistentes** — el focus ring azul aparece en
   inputs pero no en botones. Accesibilidad floja.
9. **Sin dark mode**, sin preferencia de movimiento reducido
   (`prefers-reduced-motion`), sin tamaños de toque medidos.
10. **Sin baseline grid** — los elementos se alinean ad-hoc, no a una
    grilla de 4 u 8 px.

---

## Lo que SÍ funciona y hay que preservar

- **Identidad cromática Quilmes** (azul + dorado) — es lo que hace
  reconocible la app. No tocar.
- **DM Sans + DM Mono** — el contraste entre sans para UI y mono para
  códigos/precios es funcional y se ve "profesional".
- **Press feedback `scale(.93-.97)`** — los toques se sienten.
- **Sheets top-down con `cubic-bezier(.4,0,.2,1)`** — la animación es
  buena, conservar timing.
- **Código PDV gigante en `rcod`** — la "estrella" de la pantalla.
  Conservar tamaño/peso y prominencia.
- **Sombras tintadas en azul de marca** — sutil pero hace la app
  reconocible.
- **Stickyness** de la topbar y de la barra de config inferior — la
  navegación es predecible.
