# Plan de Rework Visual — Acciones Comerciales

**Rama de trabajo:** `claude/app-visual-rework-strategy-35l6q`
**Producción:** `main` → `cmq.gmcmq.workers.dev` (intocable hasta el cutover)
**Baseline audit:** 10/20 (Acceptable, significant work needed) — ver sección "Hallazgos"
**Objetivo:** 18+/20 sin cambiar la marca Quilmes ni la velocidad operativa

---

## Principios rectores

Todo lo que sigue se mide contra estos cinco principios. Si una decisión los
contradice, no se hace.

1. **Cero regresión funcional.** El vendedor que abre la app mañana no
   debería notar que cambiamos nada operativo. Login → buscar → ver datos
   sigue siendo el mismo flujo, en el mismo orden, con la misma velocidad.
2. **Identidad Quilmes intacta.** Azul `#001F5B` + dorado `#F5A800` siguen
   siendo los protagonistas. DM Sans + DM Mono se conservan.
3. **Cada commit es reversible.** Una fase rota se revierte con un `git
   revert <sha>` sin tocar las demás.
4. **Cada fase pasa por preview antes de mergear.** El preview deploy de
   Cloudflare es el "staging" de facto. Nada llega a prod sin ojos humanos
   en preview primero.
5. **A11y es no-negociable.** WCAG AA es el piso. Vendedores con
   discapacidad visual o motora son usuarios reales del producto.

---

## Lista de NO-TOCAR (preservar explícitamente)

Sacado de la sección "Positive Findings" del audit:

- Paleta de marca (`--azul #001F5B`, `--dorado #F5A800`, `--azul-m #003DA5`)
- DM Sans + DM Mono y el split sans/mono para UI vs códigos
- Press feedback `transform: scale(.93-.97)` en `:active`
- Sheet animations `.32s cubic-bezier(.4,0,.2,1)`
- Prominencia del `.rcod` (código PDV gigante en monospace) en el result header
- Sombras tintadas en azul de marca (`rgba(0,31,91,...)`) — firma visual
- localStorage caching y comportamiento offline
- Sticky topbar + barra de config sticky abajo
- Voseo argentino en todo el copy
- El logo "Quilmes" badge en dorado sobre azul en la topbar
- Sin dark mode (no hay caso de uso real y la marca es brillante)

---

## Métricas de éxito

Por fase:
- Preview deploy se construye sin errores
- Todos los flujos manuales pasan smoke test (login, búsqueda, calc, plan, muro, nearby, config)
- Cero console errors en DevTools
- Audit re-run muestra mejora vs anterior

Al final del rework:
- Audit Health Score ≥ 18/20
- Lighthouse a11y ≥ 95
- Tiempo desde "Entrar" hasta primer dato en pantalla ≤ 3s
- Cero regresiones reportadas por usuarios en la primera semana post-cutover

---

## Estado actual

| Hecho | Commit |
|---|---|
| Skill Impeccable instalada | `f47faa7` |
| CSS/JS extraídos de index.html a archivos separados | `34a3313` |
| PRODUCT.md + DESIGN.md (contexto para skill) | `571bc29` |
| wrangler.jsonc + .assetsignore (preview deploy funcionando) | `034781b` |

Baseline visual y a11y documentado en el audit (ver `DESIGN.md` para el
inventario de deuda + sección Hallazgos abajo para detalle).

---

## Hallazgos a atacar (resumen del audit)

20 issues totales: **2 P0 · 6 P1 · 7 P2 · 5 P3**

| ID | Severidad | Issue | Fase asignada |
|---|---|---|---|
| P0.1 | P0 | Viewport bloquea zoom (`user-scalable=no`) | 1 |
| P0.2 | P0 | Cero semantic HTML — sin h1/main/header/nav | 1 |
| P1.1 | P1 | Buttons emoji-only sin `aria-label` | 1 |
| P1.2 | P1 | 4 sheets sin `role="dialog"` / focus trap / Escape | 1 |
| P1.3 | P1 | Touch targets <44×44px | 3 |
| P1.4 | P1 | 32 inline `style="..."` en HTML | 2 |
| P1.5 | P1 | 15+ colores hardcoded fuera de tokens | 2 |
| P1.6 | P1 | Focus rings sólo en inputs, cero en buttons | 1 |
| P2.1 | P2 | Escala tipográfica con 12 tamaños arbitrarios | 4 |
| P2.2 | P2 | Escala de espaciado con 20+ valores únicos | 5 |
| P2.3 | P2 | 11 radios distintos | 2 |
| P2.4 | P2 | Emojis como íconos (11+ glyphs cross-SO) | 6 |
| P2.5 | P2 | Fonts sin estrategia de carga (FOIT en 3G) | 6 |
| P2.6 | P2 | `<title>` no cambia con el estado | 1 |
| P2.7 | P2 | Etiquetas saturan visualmente cuando hay 3+ | 7 |
| P3.1 | P3 | No respeta `prefers-reduced-motion` | 9 |
| P3.2 | P3 | Modal-first reflex en Calc y Planner | 8 |
| P3.3 | P3 | Empty states genéricos | 9 |
| P3.4 | P3 | Locale es-AR explícito faltante en algunos `Intl` | 6 |
| P3.5 | P3 | 7 sombras distintas → consolidar | 2 |

---

# Fases

Cada fase es un bloque de 1-3 commits que se pueden revertir
independientemente. Las fases se ejecutan en orden porque tienen
dependencias reales:

```
Fase 1 (Harden a11y) ──┐
                       ├─► Fase 3 (Adapt touch)
Fase 2 (Extract tokens)┤
                       ├─► Fase 4 (Typeset)
                       ├─► Fase 5 (Layout)
                       ├─► Fase 6 (Polish: iconos + fonts)
                       └─► Fase 7 (Quieter: etiquetas)
Fase 8 (Critique modal pattern) — strategic, paralela
Fase 9 (Animate + Clarify) — refinements
Fase 10 (Final polish + cutover)
```

---

## Fase 1 — Harden (a11y crítica)

**Cubre:** P0.1, P0.2, P1.1, P1.2, P1.6, P2.6
**Comandos Impeccable equivalentes:** `/impeccable harden`
**Estimación:** 2 commits
**Riesgo:** Bajo. Cambios semánticos y atributos ARIA; visualmente
casi imperceptibles. Mucho upside legal/ético.

### Cambios

1. **Restaurar zoom del usuario**
   - `index.html:5`: eliminar `maximum-scale=1.0, user-scalable=no`.
   - Dejar `width=device-width, initial-scale=1.0`.

2. **Semantic HTML + landmarks**
   - `.ltitle` (login) → `<h1>`
   - Sheet titles (`.calc-title`, `.nearby-title`, `.muro-title`, plan title) → `<h2>`
   - `.estado` titles → `<h2>` o `<p role="status">` según contexto
   - `<div class="topbar">` → `<header class="topbar">`
   - Wrap del contenido de la app post-topbar en `<main>`
   - `<div class="cfgwrap">` → `<nav class="cfgwrap" aria-label="Acciones">` (tiene los botones de calc/plan/refresh/etc.)
   - Skip-link al inicio del `<body>`: `<a href="#main" class="skip-link">Saltar al contenido</a>`

3. **ARIA labels en buttons emoji-only**
   - `#btn-buscar` 🔍 → `aria-label="Buscar"`
   - `#btn-gps` 📌 → `aria-label="PDVs cercanos"`
   - `#btn-nearby-cerrar` ✕ → `aria-label="Cerrar"`
   - `#btn-muro-cerrar` ✕ → `aria-label="Cerrar Muro"`
   - `#btn-muro` 💬 → `aria-label="Abrir Muro"`
   - `#btn-tog` ▼▼ → `aria-label="Colapsar segmentos"` / `aria-expanded`
   - `#btn-cfg` ⚙ → `aria-label="Configuración"`
   - `#btn-refresh` ↻ → `aria-label="Actualizar precios"`
   - `#btn-plan-cerrar` ✕ → `aria-label="Cerrar planificador"`
   - `#btn-plan-wa` ✉ → `aria-label="Enviar plan por WhatsApp"`
   - `.calc-qty-minus` − → `aria-label="Disminuir bultos"`
   - `.calc-qty-plus` + → `aria-label="Aumentar bultos"`
   - Y todos los `title=""` los convierto en `aria-label` cuando son la única descripción.

4. **`role="dialog"` + focus trap + Escape en los 4 sheets**
   - `.calc-sheet`, `.plan-sheet`, `.muro-sheet`, `.nearby-sheet`:
     - `role="dialog" aria-modal="true" aria-labelledby="<id-del-título>"`
     - Al abrir: mover foco al título o al primer interactivo. Guardar elemento previo.
     - Al cerrar: devolver foco al elemento que abrió el sheet.
     - Escape key handler que dispara el botón de cierre correspondiente.
     - Focus trap dentro del sheet (Tab del último → primero, Shift+Tab del primero → último).
   - Helper JS común en `app.js`: `installDialog(sheetEl, openerEl)`.

5. **Focus rings en buttons**
   - `styles.css`: agregar regla genérica
     ```css
     button:focus-visible, a:focus-visible, [role="button"]:focus-visible {
       outline: 2px solid var(--azul-m);
       outline-offset: 2px;
     }
     ```
   - Ajustes específicos donde el outline choque con el bg azul (botones blancos sobre azul): outline dorado en esos casos.

6. **Document title dinámico**
   - Al cargar resultado de un PDV: `document.title = ${codigo} — ${rs.slice(0,30)} · Acciones Comerciales`.
   - Al cerrar/limpiar: volver a `Acciones Comerciales`.

### Acceptance

- axe DevTools en el preview: 0 issues de severidad "serious" o "critical".
- Lighthouse a11y ≥ 90.
- Pinch zoom funciona en mobile real.
- Tab navega ordenadamente por: PIN inputs → Entrar → (post-login) → topbar dropdown → search input → buscar → GPS → resultado → segmentos → barra config.
- Escape cierra cualquiera de los 4 sheets.
- Al abrir Calc, foco arranca en `#calc-sku`. Al cerrar, foco vuelve al botón Calc.
- Lectura con VoiceOver/TalkBack anuncia "Acciones Comerciales, encabezado nivel 1" en login.

---

## Fase 2 — Extract (sistema de tokens completo)

**Cubre:** P1.4, P1.5, P2.3, P3.5
**Comando Impeccable:** `/impeccable extract`
**Estimación:** 3 commits (tokens nuevos, mover hardcodes, mover inline styles)
**Riesgo:** Medio. Tocamos casi todo el CSS, pero el cambio es valor-por-valor; el visual debe quedar idéntico.

### 2.1 — Expandir `:root` con sistema completo

Nuevo bloque de tokens (semántico, no abstracto):

```css
:root {
  /* Marca (existentes — no tocar) */
  --azul: #001F5B;
  --azul-m: #003DA5;
  --dorado: #F5A800;
  --gris-f: #F2F5FA;
  --gris-b: #DDE3EE;
  --txt: #1A1A2E;
  --txt-s: #5A6478;
  --rojo: #C0392B;
  --rojo-l: #FDECEA;
  --verde: #1A7A3C;

  /* Espaciado — escala 4-base */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;
  --sp-7: 48px;
  --sp-8: 64px;

  /* Tipografía — escala modular ratio 1.25 */
  --fs-xs: 11px;     /* labels, meta, chips chicos */
  --fs-sm: 12px;     /* copy denso, table cells */
  --fs-base: 14px;   /* body, UI default */
  --fs-md: 16px;     /* énfasis, copy importante */
  --fs-lg: 20px;     /* títulos chicos, search input */
  --fs-xl: 26px;     /* hero (.rcod) */
  --fs-2xl: 32px;    /* extra, PIN dígitos */

  --fw-normal: 400;
  --fw-medium: 500;
  --fw-semi: 600;
  --fw-bold: 700;
  --fw-black: 800;   /* sólo badges uppercase */

  /* Radios */
  --r-sm: 8px;       /* badges chicos, chips dia */
  --r-md: 12px;      /* inputs, botones */
  --r-lg: 16px;      /* cards, sheets internos */
  --r-pill: 20px;    /* etiquetas, chips de historial */
  --r-sheet: 28px;   /* login card, sheet bottom */

  /* Sombras */
  --sh-sm: 0 2px 14px rgba(0, 0, 0, .18);                /* sticky topbar */
  --sh-md: 0 4px 20px rgba(0, 31, 91, .15);              /* dropdowns, cards */
  --sh-lg: 0 8px 40px rgba(0, 31, 91, .18);              /* sheets */
  --sh-xl: 0 24px 64px rgba(0, 0, 0, .3);                /* login card */
  --sh-fixed: 0 -2px 12px rgba(0, 31, 91, .07);          /* cfg bar inferior */

  /* Tags / etiquetas — tripletas semánticas */
  --tag-pdv-bg: var(--dorado);
  --tag-pdv-fg: var(--azul);
  --tag-pdv-bd: #CC8800;

  --tag-seg-bg: #6DD49A;
  --tag-seg-fg: #0F5229;
  --tag-seg-bd: #3DB870;

  --tag-ccc-bg: #FFEDD5;
  --tag-ccc-fg: #9A3412;
  --tag-ccc-bd: #FB923C;

  /* Filtros (planner) */
  --filter-bg: #EEF1F6;
  --filter-fg: #4A5568;
  --filter-bd: #B0BAC8;
  --filter-active-bg: #4A5568;
  --filter-active-bd: #2D3748;

  /* Estados */
  --offline-bg: #FFF3CD;
  --offline-fg: #7A5500;
  --offline-bd: #F5C842;

  /* Motion */
  --ease-out: cubic-bezier(.4, 0, .2, 1);
  --dur-fast: .15s;
  --dur-med: .25s;
  --dur-sheet: .32s;
  --dur-spin: .65s;

  /* Touch */
  --tap-min: 44px;
}
```

### 2.2 — Reemplazar hardcodes en styles.css

Pass mecánico: cada hex/px que matchee un token se reemplaza por `var(--*)`.
Búsqueda y reemplazo por par. Ejemplos:
- Todos los `12px` de padding/margin → `var(--sp-3)`
- Todos los `#FB923C` → tokens `--tag-ccc-*`
- Todos los `border-radius: 20px` → `var(--r-pill)`
- Sombras → `var(--sh-*)` (las que no matchean exactamente, se documentan
  como excepción razonada o se ajustan al token más cercano).

Excepciones permitidas (no tokenizar):
- Valores únicos contextuales (`max-width: 360px` del login card)
- Cálculos `calc(...)` específicos

### 2.3 — Mover los 32 inline `style="..."` a clases

Pass por `index.html`: cada `style="display:flex;..."` se convierte en
una clase semántica en `styles.css`. Para los casos one-off no semánticos,
usar nombres descriptivos (`.row-min-w-0`, `.flex-1-truncate`) y agruparlos
en una sección "/* UTILITIES */" al final del CSS.

### Acceptance

- 0 hex codes (excepto en `:root`) en `styles.css`.
- 0 `style="..."` en `index.html`.
- Visual idéntico al baseline (diff de screenshots ≤2px en pixel diff).
- Build de Cloudflare sigue verde.
- DESIGN.md actualizado con la nueva tabla de tokens.

---

## Fase 3 — Adapt (touch targets)

**Cubre:** P1.3
**Comando Impeccable:** `/impeccable adapt`
**Estimación:** 1 commit
**Riesgo:** Bajo. Tipo "más grande nunca es peor en mobile".

### Cambios

- `.calc-qty-btn`: 34×34 → 44×44 (`width: var(--tap-min); height: var(--tap-min)`).
- `.plan-dia`: el checkbox queda 11×11 pero el `<label>` envolvente se
  fuerza a 44px de altura — el `:has(input:checked)` ya está, sólo agrandar
  el target.
- `.sbtn` y `.sbtn-gps`: altura explícita 44px (hoy width 46px sin height).
- `.negocio-tab`: padding `var(--sp-2) var(--sp-3)` (8/12) en lugar del actual `5px 12px`, llega a ~36px de altura. Aceptable para chips secundarios; alternativa: dejar como están si forman parte de un cluster scrolleable horizontal donde individualmente son secundarios.
- `.cfgtoggle` (botón engranaje en la barra inferior): width 44.
- `.crefresh`: altura ya es 36 → subir a 44.
- `.muro-close`, `.nearby-close`, `#btn-plan-cerrar`: padding extendido para llegar a 44×44 sin agrandar el ✕ visualmente (`padding: 12px`).

### Acceptance

- Cada interactivo principal cumple 44×44 (mínimo WCAG 2.5.8 AA).
- Layout visualmente conservado (probar en iPhone SE 375px, no debería romper).
- No aparece scroll horizontal en ninguna pantalla principal.

---

## Fase 4 — Typeset (escala tipográfica)

**Cubre:** P2.1
**Comando Impeccable:** `/impeccable typeset`
**Estimación:** 1 commit
**Riesgo:** Medio. El visual cambia perceptiblemente — algunos textos crecen o achican.

### Mapping de tamaños actuales → escala nueva

| Actual | Nuevo | Token |
|--------|-------|-------|
| 9px | 11px | --fs-xs |
| 10px | 11px | --fs-xs |
| 11px | 11px | --fs-xs |
| 12px | 12px | --fs-sm |
| 13px | 14px | --fs-base |
| 14px | 14px | --fs-base |
| 15px | 16px | --fs-md |
| 18px | 20px | --fs-lg |
| 20px | 20px | --fs-lg |
| 23px | 26px | --fs-xl |
| 26px | 26px | --fs-xl |
| 28px | 32px | --fs-2xl |

Justificación: subir el piso de 9-10px a 11px mejora legibilidad en la
calle bajo sol. Los saltos quedan en pasos de ~1.25, jerarquía clara.

### Decisiones de hierarchy específicas

- `.rcod` (código PDV hero): se queda en `--fs-xl` 26px monospace, bold.
- `.ltitle` (login): `--fs-xl` 26px en lugar de 23.
- Sheet titles: `--fs-base` 14px → `--fs-md` 16px (más jerarquía vs body).
- Labels uppercase (`.slbl`, `.clbl`, `.calc-lbl`): `--fs-xs` con
  letter-spacing aumentado.
- Etiquetas/chips: `--fs-xs`, weight `--fw-bold`.
- Tablas de precios: cells `--fs-sm` mono, headers `--fs-xs` uppercase.

### Acceptance

- Máximo 7 tamaños tipográficos en uso (`--fs-xs` a `--fs-2xl`).
- Todos los `font-size:` en CSS referencian un token.
- Smoke test visual: ningún texto queda más chico que antes salvo
  intencionalmente (los 9-10px viejos suben a 11).
- Lectura subjetiva mejora al revisar en mobile bajo luz fuerte.

---

## Fase 5 — Layout (ritmo de espaciado)

**Cubre:** P2.2
**Comando Impeccable:** `/impeccable layout`
**Estimación:** 1 commit
**Riesgo:** Medio. Cambios sutiles pero generalizados.

### Mapping de espaciado

Cualquier valor px de padding/margin/gap se mapea al `--sp-N` más
cercano de la escala 4/8/12/16/24/32/48/64.

Aproximación:
- 2, 3, 4 → `--sp-1` (4)
- 5, 6, 7, 8 → `--sp-2` (8)
- 9, 10, 11, 12, 13, 14 → `--sp-3` (12) [borderline 14 puede ir a `--sp-4`]
- 15, 16, 17, 18, 19, 20 → `--sp-4` (16) [borderline 20 puede ir a `--sp-5`]
- 22, 24, 26, 28 → `--sp-5` (24)
- 30, 32 → `--sp-6` (32)
- 40 → `--sp-7` (48) [salto justificable]
- 64+ → `--sp-8` (64)

### Decisiones específicas

- Margen vertical entre bloques (search → estado → reshdr → segments):
  `--sp-4` (16px) consistente.
- Padding interno de cards/sheets: `--sp-4` o `--sp-5` según jerarquía.
- Gap dentro de un grupo (botones de la cfgwrap, etiquetas en un row):
  `--sp-2` (8).
- Padding del `body { padding-bottom }`: `--sp-8` (era 80, ahora 64; el
  fixed-bottom config bar mide menos).

### Acceptance

- Máximo 8 valores de espaciado en uso, todos vía token.
- Ritmo vertical más predecible al hacer scroll.
- No hay elementos pegados (gap 0 indebido) ni separados de más.

---

## Fase 6 — Polish (íconos SVG + font loading)

**Cubre:** P2.4, P2.5, P3.4
**Comando Impeccable:** `/impeccable polish`
**Estimación:** 2 commits (uno por íconos, otro por fonts)
**Riesgo:** Medio para íconos (cambio visual notable), bajo para fonts.

### 6.1 — Reemplazar emojis por SVG inline set

Inventario de emojis en uso y reemplazo. Set elegido: **Lucide**
(licencia ISC, líneas 24×24 stroke 2, ya lo usa media industria, está
bueno para enterprise mobile).

| Emoji actual | Función | Lucide icon |
|--------------|---------|-------------|
| 🔍 (`&#128269;`) | Buscar | `search` |
| 📌 (`&#128207;`) | GPS / cercanos | `crosshair` o `map-pin` |
| 📍 (`&#128205;`) | Maps | `map-pin` |
| 📋 (`&#128203;`) | Estado vacío | `inbox` o `clipboard-list` |
| 💬 (`&#128172;`) | Muro | `message-square` |
| ⚙ (`&#9881;`) | Config | `settings-2` |
| ↻ (`&#8635;`) | Refresh | `refresh-cw` |
| ✉ (`&#128232;`) | Enviar WhatsApp | `send` o `message-circle` |
| ✕ (`&#10005;`) | Cerrar | `x` |
| ▼ ▲ (`&#9660;` `&#9650;`) | Chevrons | `chevron-down/up` |
| − + | Quantity | `minus`, `plus` |

Implementación:
- Crear `icons.js` con `function icon(name, size=20)` que retorna el
  HTML del SVG. ~12 íconos × ~150 bytes = ~2KB total.
- Reemplazar cada literal HTML/JS por `icon('search')` etc.
- En CSS, los íconos heredan `currentColor` para tintarse con el color
  del botón.

Justificación: 11+ glyphs Unicode que renderizan distinto cross-platform.
Lucide stroke uniformizado mejora visual cohesion sin tocar marca.

### 6.2 — Estrategia de fonts

- URL de Google Fonts actual: agregar `&display=swap`.
- Antes del `<link rel="stylesheet">` de Google Fonts, agregar
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`.
- Preload del peso más usado: `<link rel="preload" as="font"
  type="font/woff2" href="..." crossorigin>` para DM Sans 400 y 600.
- Reducir pesos cargados de 5 a 3: 400, 600, 700 (eliminar 500 y 800;
  el 800 sólo lo usa el badge — pasar a 700 + letter-spacing).
- `font-display: swap` evita FOIT; si Google Fonts cae, el sistema
  cae a `sans-serif` (legible).

### 6.3 — Locale `Intl` explícito

- En `app.js`, todo `Intl.NumberFormat()` / `Intl.DateTimeFormat()`
  llama con `'es-AR'` explícito (no `undefined` que toma del browser).
- Asegura que precios siempre se vean `$1.234,56` aunque el browser
  esté en otro locale.

### Acceptance

- 0 emojis en `index.html` y `app.js` (excepto si quedan en `.md`).
- Lighthouse FCP/LCP no empeoran (idealmente mejoran con preload).
- DM Mono y DM Sans cargan sin FOIT visible en throttled 3G.
- Cifras siempre en formato argentino.

---

## Fase 7 — Quieter (etiquetas)

**Cubre:** P2.7
**Comando Impeccable:** `/impeccable quieter`
**Estimación:** 1 commit
**Riesgo:** Bajo. Cambio visual focalizado en una zona.

### Cambios

Una fila de result-header con etiqueta PDV + segmento + CCC + canal +
3 negocio-tabs hoy es un arcoíris. Reducir saturación cromática
manteniendo distinción:

- **Etiqueta principal (la primera, la más relevante)**: full saturación.
  Visualmente "esta es LA etiqueta".
- **Etiquetas secundarias**: opacidad 80% o saturación reducida.
- **Negocio tabs**: cuando hay etiquetas activas en la misma fila,
  bajan a outline-only (border + color, sin fill).
- **Eliminar dobles bordes + shadows en estado activo**: hoy el active
  state agrega `box-shadow: 0 0 0 2px rgba(...)`. Reemplazar por
  cambio de peso visual sutil (background más sólido).
- **Definir orden visual prioritario por tipo**: PDV > Segmento > CCC.
  El primero brilla, los siguientes acompañan.

### Acceptance

- Una fila con 4 etiquetas activas se lee sin que la mirada salte.
- La etiqueta principal sigue siendo evidente.
- Smoke test con vendedor real (o mock fila con muchas etiquetas):
  ¿se identifica la etiqueta más importante en <1 segundo?

---

## Fase 8 — Critique (modal vs ruta)

**Cubre:** P3.2
**Comando Impeccable:** `/impeccable critique`
**Estimación:** 1 commit DOCUMENTAL (decisión + ADR), posible commit posterior si decidimos refactor
**Riesgo:** Estratégico, no técnico.

### Pregunta a responder

Calc y Planner son flujos densos: SKU + descuento + qty → 4 outputs en
Calc, 5 filtros + tabla scrolleable en Planner. ¿Son realmente "modales"
o son **rutas/pantallas** que vivieron en sheets por simplicidad?

### Opciones

1. **Mantener como sheets (status quo).** Los sheets ya están y
   funcionan. Costo cero, sin riesgo.
2. **Convertir a "vistas" con state machine.** El app pasa por
   `lookup | calc | plan` y la UI cambia accordingly. Las sheets se
   conservan visualmente pero el estado se refleja en URL (`#calc`,
   `#plan`). Beneficios: back button del browser cierra, link compartible
   ("mandame el planificador con filtros XYZ"), navegación predecible.
3. **Full refactor a routing.** Cada vista es una "página" con su URL.
   Más profundo, requiere repensar el shell.

### Recomendación inicial

**Opción 2** — sheets visuales + state machine con hash routing.
Mejora UX sin refactor grande, agrega "back button cierra el sheet"
que es lo que la gente intuye en mobile, y nos prepara para una
eventual conversión a PWA installable más sólida.

### Output de la fase

- ADR (`docs/adr-001-modal-vs-route.md`) que documenta la decisión.
- Si se elige opción 2 o 3, plan de implementación detallado.
- Si se elige opción 1, se documenta el porqué y se cierra el finding.

---

## Fase 9 — Animate + Clarify (refinements)

**Cubre:** P3.1, P3.3
**Comandos Impeccable:** `/impeccable animate`, `/impeccable clarify`
**Estimación:** 1 commit
**Riesgo:** Bajo.

### 9.1 — Respeto de `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```

Excepción: el spinner de loading se queda corriendo (es indicador
funcional, no decoración). Forzar dur larga si reduced motion para
señalar "está pasando algo" sin ser molesto.

### 9.2 — Empty states diferenciados

Hoy "Sin acciones asignadas" cubre 3 casos:
- Cliente no encontrado (PDV no existe en sheet)
- Cliente existe pero no tiene acciones (caso real)
- Falló la consulta a Google Sheets

Cada uno necesita copy + acción diferente:
- **No encontrado:** "No encontramos el PDV `3485`. Verificá el código o buscá por nombre." + sugerir histórico.
- **Sin acciones:** "Este cliente no tiene acciones activas hoy." + mostrar fecha de última carga del distri.
- **Falló red:** "No pudimos conectar al servidor del distri. Reintentar." + botón retry + mostrar última caché si la hay.

### Acceptance

- Reduced motion verificado (system pref o DevTools emulation).
- 3 empty states distinguibles con copy específico.

---

## Fase 10 — Final polish + cutover

**Comando Impeccable:** `/impeccable polish`
**Estimación:** 1 commit + cutover
**Riesgo:** Bajo si las fases anteriores pasaron sus acceptance criteria.

### Final polish

- Re-run del `/impeccable audit` esperado: ≥ 18/20.
- Re-run del antipattern detector: 0 críticos.
- Smoke test cross-device:
  - iPhone SE (375×667) — el más chico
  - iPhone 14 Pro (393×852)
  - Pixel 7 (412×915)
  - iPad Mini (744×1133) — solo verificar que no rompa, no es target
- Verificar locale: precios en `$1.234,56`.
- Verificar offline: cortar wifi en DevTools, app sigue mostrando cache.
- Verificar performance: Lighthouse Performance ≥ 90.

### Cutover

1. Llamado al usuario: revisión visual final lado a lado (preview vs prod).
2. **Plan B disponible:** si el usuario quiere cutover gradual, podemos
   usar Cloudflare Worker traffic splitting (5% → 25% → 100% en 3 días).
   Si el usuario prefiere big-bang, mergeamos directo.
3. Merge de la branch a `main` via PR. PR contiene:
   - Resumen de las 10 fases
   - Diff de audit (baseline 10/20 → final 18+/20)
   - Screenshots before/after de cada pantalla principal
   - Lista de NO-TOCAR confirmando que se preservó
4. Verificar deploy en `cmq.gmcmq.workers.dev` (producción).
5. Monitoreo de 48h:
   - Console errors reportados (cualquier canal de soporte que usen)
   - Usuarios que se queden trabados en alguna pantalla
6. Si en 48h no hay incidentes → cutover exitoso.

### Rollback plan

- Cada commit es revertible (`git revert`).
- Si una fase específica genera regresión: revert de esa fase, push,
  Cloudflare redeploya en <1 min.
- Si el cutover entero genera regresión: revert del merge commit a
  `main`, push, vuelve a la versión anterior.
- Nada destructivo en ninguna fase. Ningún `git reset --hard`, ningún
  force push.

---

## Calendario sugerido (referencia, no es contrato)

Asumiendo que el usuario revisa cada fase en preview antes de aprobar
la siguiente:

| Fase | Tiempo de trabajo | Tiempo de review |
|------|-------------------|------------------|
| 1 — Harden | ~2h | 30min |
| 2 — Extract | ~3h | 1h |
| 3 — Adapt | ~30min | 15min |
| 4 — Typeset | ~1h | 30min |
| 5 — Layout | ~1h | 30min |
| 6 — Polish (íconos + fonts) | ~2h | 30min |
| 7 — Quieter | ~1h | 30min |
| 8 — Critique | ~1h (documental) | 1h (decisión) |
| 9 — Animate + Clarify | ~45min | 15min |
| 10 — Polish final + cutover | ~1h | 1h |

Total: **~13h trabajo + 5h review**, distribuibles en 5-7 sesiones.

---

## Cuándo escalar al usuario antes de actuar

Sigo solo en las fases hasta una decisión que tenga implicancias
estratégicas. Si llego a uno de estos, paro y pregunto:

- Cambios que afecten la copy visible (más allá de empty states)
- Cambio de paleta o tipografía (vs el plan)
- Cambio de la estructura de pantallas (más allá de la fase 8)
- Si encuentro deuda funcional no documentada (bug latente)
- Si una fase rompe acceptance criteria y no veo workaround claro
- Si la decisión de la fase 8 (modal vs ruta) afecta a otras fases
- Cualquier cosa que no esté en este plan

---

## Cómo seguir

Cuando el usuario diga "arrancá":
1. Empiezo Fase 1.
2. Cada vez que termino una fase, push, le aviso, y espero su OK en
   preview antes de la siguiente.
3. Si en algún momento dice "salteá fase X" o "primero hacé Y", lo
   hago — este plan es guía, no contrato.

---

## Apéndice — Mapping finding → fase (verificación cruzada)

| Finding | Fase |
|---|---|
| P0.1 Viewport zoom | 1 |
| P0.2 Semantic HTML | 1 |
| P1.1 ARIA en buttons | 1 |
| P1.2 Dialog role + focus trap | 1 |
| P1.3 Touch targets | 3 |
| P1.4 Inline styles | 2 |
| P1.5 Colores hardcoded | 2 |
| P1.6 Focus rings en buttons | 1 |
| P2.1 Type scale | 4 |
| P2.2 Spacing scale | 5 |
| P2.3 Radii | 2 |
| P2.4 Emojis | 6 |
| P2.5 Font loading | 6 |
| P2.6 Document title | 1 |
| P2.7 Tags saturation | 7 |
| P3.1 Reduced motion | 9 |
| P3.2 Modal vs route | 8 |
| P3.3 Empty states | 9 |
| P3.4 Locale es-AR | 6 |
| P3.5 Shadow consolidation | 2 |

20/20 finding cubiertos.
