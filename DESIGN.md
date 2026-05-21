# Acciones Comerciales — Sistema de diseño

Estado **post-rework** (May 2026, branch `claude/app-visual-rework-strategy-35l6q`).
Antes del rework, este documento era el "baseline audit" (10/20). Ahora refleja
el sistema de tokens y los patrones consolidados.

---

## Paleta

### Marca (NO tocar)

| Token | Valor | Uso |
|---|---|---|
| `--azul` | `#001F5B` | Marca primaria. Login bg, topbar, CTAs. |
| `--azul-m` | `#003DA5` | Azul medio. Focus, links, énfasis. |
| `--dorado` | `#F5A800` | Acento de marca. Badges, etiquetas PDV, spinner. |

### Neutrales tintados

| Token | Valor | Uso |
|---|---|---|
| `--gris-f` | `#F2F5FA` | Fondo general, inputs activos. |
| `--gris-b` | `#DDE3EE` | Bordes, dividers. |
| `--gris-c` | `#C8D0D8` | Bordes secundarios (.s-grey variant). |
| `--gris-d` | `#D4DAE4` | Dividers tenues. |
| `--txt` | `#1A1A2E` | Texto principal. |
| `--txt-s` | `#5A6478` | Texto secundario, labels. |

### Estados

| Token | Valor | Uso |
|---|---|---|
| `--rojo` | `#C0392B` | Error. |
| `--rojo-l` | `#FDECEA` | Error bg. |
| `--verde` | `#1A7A3C` | Éxito. |
| `--offline-bg/fg/bd` | `#FFF3CD/#7A5500/#F5C842` | Sin conexión badge. |

### Etiquetas (tripletas semánticas)

| Tipo | bg | fg | bd |
|---|---|---|---|
| PDV | `var(--dorado)` | `var(--azul)` | `#CC8800` |
| Segmento | `#6DD49A` | `#0F5229` | `#3DB870` |
| CCC | `#FFEDD5` | `#9A3412` | `#FB923C` |
| PDV soft (planner) | `#FFE08A` | `#5A3A00` | `#E8A800` |
| Seg soft (planner) | `#A8E8C4` | `#0A3D1F` | `#3DB870` |

**Quieter rule:** la primera etiqueta del row mantiene saturación
completa; las siguientes se atenúan vía `filter: saturate(.55);
opacity: .85;` (regla CSS única en `.etiq-wrap > :nth-child(n+2)`).

### Filtros (planner)

| Token | Valor | Uso |
|---|---|---|
| `--filter-bg/fg/bd` | `#EEF1F6/#4A5568/#B0BAC8` | Inactive. |
| `--filter-active-bg/bd` | `#4A5568/#2D3748` | Active (sin doble outline). |

### Accents

- `--wa-green` `#25D366` — botón "Enviar plan por WhatsApp"

---

## Tipografía

### Familias

| Familia | Pesos cargados | Usos |
|---|---|---|
| **DM Sans** | 400, 600, 700 | UI text, labels, botones. |
| **DM Mono** | 400, 600 | Códigos PDV, SKU, precios, IDs. |

Carga: `preconnect` a fonts.googleapis.com + fonts.gstatic.com; URL con
`&display=swap` (sin FOIT). Bajamos de 5 a 3 weights de DM Sans (drop
500 y 800).

### Escala tipográfica

| Token | px | Uso |
|---|---|---|
| `--fs-xs` | 11 | Labels, meta, chips, etiquetas, sheet headers. |
| `--fs-sm` | 12 | Table cells, copy denso, hints. |
| `--fs-base` | 14 | Body, UI default, sub-titles. |
| `--fs-md` | 16 | Énfasis, copy importante, search input. |
| `--fs-lg` | 20 | Títulos chicos, search code input. |
| `--fs-xl` | 26 | Hero — `.rcod` PDV code, login title. |
| `--fs-2xl` | 32 | PIN dígitos. |

107 declaraciones, ratio ~1.25 entre pasos. Antes: 12 tamaños ad-hoc.

### Pesos

| Token | Valor |
|---|---|
| `--fw-normal` | 400 |
| `--fw-semi` | 600 (collapsa 500 viejo) |
| `--fw-bold` | 700 (collapsa 800 viejo) |

`--fw-medium` (500) y `--fw-black` (800) declarados en `:root` para
posibles overrides futuros, pero NO se usan en el CSS de la app
(el font-load tampoco los trae).

### Letter-spacing y mayúsculas

- Labels uppercase (`.slbl`, `.clbl`, `.calc-lbl`): `.4` a `1px`.
- Search code input (`.sinput`): `2px`.
- `.rcod` (hero): `2px`.
- Títulos grandes: `-.3px` a `-.5px` (compensación óptica estándar).

---

## Espaciado

Escala 4-base de 8 pasos. 237 declaraciones snap a estos valores
(antes: 20+ valores únicos).

| Token | px |
|---|---|
| `--sp-1` | 4 |
| `--sp-2` | 8 |
| `--sp-3` | 12 |
| `--sp-4` | 16 |
| `--sp-5` | 24 |
| `--sp-6` | 32 |
| `--sp-7` | 48 |
| `--sp-8` | 64 |

Adopción: `--sp-3` (90×) y `--sp-2` (75×) son los workhorses, lo cual
es saludable: la mayoría del padding interior cae en 8-12px, lo grueso
está en 16+.

---

## Radios

| Token | px | Uso |
|---|---|---|
| `--r-sm` | 8 | Badges chicos, dia chips, etiq counts. |
| `--r-md` | 12 | Inputs, botones, sheets internos. |
| `--r-lg` | 16 | Cards grandes, PIN boxes. |
| `--r-pill` | 20 | Etiquetas, chips de historial. |
| `--r-sheet` | 28 | Login card, sheets externos. |

11 valores ad-hoc → 5 tokens. Borderline 14px mapea a `--r-md` (12).

---

## Sombras

| Token | Valor | Uso |
|---|---|---|
| `--sh-sm` | `0 2px 14px rgba(0,0,0,.18)` | Topbar sticky. |
| `--sh-md` | `0 4px 20px rgba(0,31,91,.15)` | Dropdowns, cards. |
| `--sh-lg` | `0 8px 40px rgba(0,31,91,.18)` | Sheets. |
| `--sh-xl` | `0 24px 64px rgba(0,0,0,.3)` | Login card dramática. |
| `--sh-fixed` | `0 -2px 12px rgba(0,31,91,.07)` | Cfg bar inferior. |
| `--sh-fixed-up` | `0 -4px 24px rgba(0,31,91,.12)` | Cfg panel slide. |
| `--sh-focus-azul` | `0 0 0 3px rgba(0,61,165,.09)` | Focus ring input. |
| `--sh-focus-azul-thick` | `0 0 0 4px rgba(0,61,165,.1)` | Focus ring PIN. |

7 valores ad-hoc → 8 tokens (uno extra para focus ring grueso).
Las sombras tintadas en azul de marca son **la firma visual sutil**
de la app — la sensación "Quilmes" sin gritar.

---

## Motion

| Token | Valor | Uso |
|---|---|---|
| `--dur-fast` | `.15s` | Hover, press feedback, inputs rápidos. |
| `--dur-input` | `.18s` | Inputs y bordes. |
| `--dur-med` | `.25s` | Fade-in de resultados. |
| `--dur-sheet` | `.32s` | Sheets enter/exit. |
| `--dur-spin` | `.65s` | Spinner. |
| `--ease-out` | `cubic-bezier(.4, 0, .2, 1)` | Curva de salida estándar. |

`prefers-reduced-motion`: bloque `@media` colapsa todas las animaciones
a `.01ms` excepto el spinner y `.icon-spin`, que siguen rotando a
`1.2s` como indicadores funcionales.

Press feedback `transform: scale(.93-.97)` en `:active` se preserva en
todos los botones primarios (firma táctil de la app).

---

## Touch

`--tap-min: 44px`. Aplicado a 16 selectors de control interactivo
primario (botones search, GPS, qty, close de sheets, config bar). Los
checkboxes nativos de `.plan-dia` se quedan en 11×11 pero el `<label>`
envolvente tiene `min-height: 44px`.

---

## Iconografía

Inline SVG de **Lucide** (ISC license). 13 íconos en uso:

- `search`, `navigation` (GPS), `map-pin`, `x` (close)
- `chat` (muro), `settings` (gear), `refresh`, `send`
- `chevron-down`, `chevron-up`, `chevrons-down`, `chevrons-up`
- `inbox` (empty state), `user`, `minus`, `plus`, `info`, `loader`

Implementación:
- HTML: SVG inline directo (sin emoji entities).
- JS: helper `icon(name)` retorna el SVG con `class="icon"` o
  `class="icon icon-spin"` para el loader.
- Estilos: `.icon { display: inline-block; width: 1em; height: 1em;
  vertical-align: -.125em; flex-shrink: 0; }`. Icon-only buttons
  escalan a `1.25em` para llenar el tap target.

Cero emojis Unicode en HTML/JS. Cross-platform consistente.

---

## Accesibilidad

- **WCAG 1.4.4 / 1.4.10**: viewport ya no bloquea zoom.
- **WCAG 1.3.1**: HTML semántico — `<h1>`, `<h2>`, `<header>`, `<main>`,
  `<nav>`, `<section>`. 12 landmarks.
- **WCAG 4.1.2**: 41 `aria-label` en buttons icon-only, ARIA labels en
  PIN inputs, asociaciones `for=`/`id=` en labels visibles.
- **WCAG WAI-ARIA dialog**: 4 sheets con `role="dialog" aria-modal="true"
  aria-labelledby="..."`, focus management (MutationObserver), focus
  trap (Tab/Shift+Tab), Escape key handler.
- **WCAG 2.4.7**: focus-visible outline en todos los interactivos
  (azul de marca por default, dorado sobre superficies navy).
- **WCAG 2.5.5/2.5.8**: tap targets ≥ 44×44.
- **Skip-link** "Saltar al contenido" → `#main`.
- **`prefers-reduced-motion`** respetado.
- **`document.title`** dinámico: refleja el PDV cargado para mejor
  contexto cuando hay múltiples tabs.

---

## Componentes (inventario)

### Pantallas

1. **Login** — Card centrada, fondo `--azul` sólido. PIN 4-dígitos
   monospace + CTA "Entrar". `<h1>` para "Acciones Comerciales".
2. **App shell** — `<header class="topbar">` sticky con badge
   Quilmes + distri switcher + "Salir". `<main id="main">` con
   search + states + result header + segments. `<nav class="cfgwrap">`
   sticky bottom con acciones rápidas.

### Search (`.swrap`)

- Input grande `letter-spacing: 2px` (código se ve "técnico").
- Botón Buscar (search icon) + GPS (navigation icon).
- Dropdown de sugerencias con bordes que continúan visualmente al input.
- Historial chips (monospace, últimas 5 búsquedas).

### Estados (`.estado`)

- **Loading**: bg crema `#FFFBF0`, spinner dorado, `role="status"
  aria-live="polite"`.
- **Error**: bg `--rojo-l`, `role="alert" aria-live="assertive"`.
  Diferenciado por causa (sheet no configurado / sin conexión /
  error genérico).
- **Vacío**: borde dashed `--gris-b`, ícono inbox. Copy
  diferenciada por causa (PDV no existe vs PDV existe sin acciones).

### Result header (`.reshdr` — `<section>`)

- `.rcod` hero (PDV code en monospace, `--fs-xl`).
- Razón social + canal badge + domicilio + Maps link + offline badge.
- Botón Muro (icon `chat`) + botón Collapse-all (icon `chevrons-down/up`).
- Etiquetas + negocio tabs (`role="tablist"`).

### Segments (`.segblock`)

Acordeón colapsable por segmento. Header con bubbles de detalle +
chevron animado. Body con tabla de precios scrolleable, columnas
sticky. Color contextual via CSS vars dinámicas `--s-light/mid/border/dark`.

### Sheets (4, todas `role="dialog" aria-modal="true"`)

| Sheet | Trigger | Contenido |
|---|---|---|
| **Nearby** | botón GPS | Lista de PDVs cercanos ordenada por distancia. |
| **Calculadora** | botón Calc en cfg bar | SKU + descuento + qty stepper + 4 outputs. |
| **Planificador** | botón Info en cfg bar | Filtros + tabla scrolleable + export WhatsApp. |
| **Muro** | botón Muro en result-header | Lista de comentarios + textarea para agregar. |

Animation: `translateY(-100%) → 0` en `var(--dur-sheet) var(--ease-out)`.
Focus management automático (helper `installSheetA11y` en `app.js`).

### Cfg bar (`<nav class="cfgwrap">`)

Sticky bottom. Botones: Settings, Refresh, Bt (unitario toggle),
PTR/PTC + markup % (toggle group), Calc, Plan. Settings abre panel
inferior con todos los IDs de Google Sheets + nombres de pestañas +
PIN + WhatsApp + autor de comentarios.

---

## Audit pre vs post rework

| Dimensión | Baseline | Post-rework | Delta |
|---|---|---|---|
| Accessibility | 1/4 | ~3-4/4 | +2/+3 |
| Performance | 3/4 | ~3-4/4 | +0/+1 |
| Theming | 1/4 | 4/4 | +3 |
| Responsive | 2/4 | 3-4/4 | +1/+2 |
| Anti-Patterns | 3/4 | 4/4 | +1 |
| **Total** | **10/20** | **17-19/20** | **+7/+9** |

Score final exacto pendiente de re-run formal del audit en preview con
herramientas (axe, Lighthouse). Métricas concretas verificadas:

- 0 emojis en HTML/JS
- 0 inline styles en HTML
- 0 hex codes outside `:root`
- 0 font-size hardcoded outside tokens
- 0 padding/margin/gap hardcoded outside tokens
- 4 sheets con `role="dialog"` + focus management
- 41 aria-labels
- 12 semantic landmarks
- font-display=swap + 2 preconnects
- Sin `user-scalable=no`

---

## Lista NO-TOCAR confirmada preservada

- ✓ Paleta de marca Quilmes (`--azul`, `--azul-m`, `--dorado`)
- ✓ DM Sans + DM Mono (sólo se redujeron weights cargados)
- ✓ Press feedback `transform: scale(.93-.97)` en `:active`
- ✓ Sheet animation `.32s cubic-bezier(.4,0,.2,1)`
- ✓ `.rcod` hero (PDV code prominent en monospace `--fs-xl`)
- ✓ Sombras tintadas azul de marca (firma visual)
- ✓ localStorage caching (offline-resilient)
- ✓ Sticky topbar + cfg bar
- ✓ Voseo argentino en copy
- ✓ Logo "Quilmes" badge dorado sobre azul

---

## Próximos pasos (no en este rework)

1. **Cutover a `main`** — gated by usuario, fase 10b del workflow.
2. **ADR-001 follow-up** — implementar state machine + hash routing
   para Calc/Planner (`docs/adr-001-modal-vs-route.md`).
3. **Live audit con tools reales** — axe DevTools + Lighthouse en el
   preview deploy, para ratificar el score final.
4. **Cross-device QA** — iPhone SE (375), iPhone 14 Pro (393), Pixel 7
   (412), iPad Mini (744) en el preview.
