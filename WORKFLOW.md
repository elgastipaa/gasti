# Workflow Autónomo — Rework Visual

Este archivo permite a cualquier agente (yo en otra sesión, o un humano)
ejecutar las 10 fases de `REWORK_PLAN.md` sin interacción del usuario.

**Contrato:** ejecutar fases 1 → 9 + final-polish de fase 10. **NO mergear
a `main` sin OK explícito del usuario** (la cutover en sí es escalada).

---

## Status (actualizar después de cada fase)

| Fase | Status | Commit SHA | Notas |
|------|--------|------------|-------|
| 1 — Harden (a11y) | done | 9af7227 | inline-style extraction landed alongside semantic HTML |
| 2 — Extract (tokens) | done | 5bd949b | full :root tokens + radii consolidation + shadows |
| 3 — Adapt (touch 44px) | done | 0582e31 | 16 selectors use --tap-min |
| 4 — Typeset | done | 9c66d8e | 107 declarations, 7 sizes |
| 5 — Layout | done | f9ee359 | 237 declarations snap to 8-step scale |
| 6 — Polish (íconos + fonts) | done | 18b1b03 | Lucide SVGs, font swap, 3+2 weights |
| 7 — Quieter (etiquetas) | done | 5a0c9f1 | first-tag-wins via nth-child rule |
| 8 — Critique (modal vs ruta) | done | 6636576 | ADR-001 documents, implementation deferred |
| 9 — Animate + Clarify | done | 24c3953 | reduced-motion + empty state copy |
| 10a — Final polish (sin cutover) | done | — | DESIGN.md refreshed + this status table |
| 10b — Cutover a main | **BLOCKED — requiere OK humano** | — | merge to main always escalated |

Status válidos: `pending`, `in_progress`, `done`, `blocked`, `skipped`.

---

## Reglas de ejecución autónoma

1. **Ejecutar las fases en orden estricto** salvo que una dependencia
   inversa exija reordenar (ej: si en fase 4 detecto que fase 2 dejó un
   token mal definido, vuelvo a fase 2 antes de seguir).
2. **Después de cada fase**: ejecutar la sección "Verify" correspondiente.
   Si falla → revertir el commit de la fase, marcar `blocked` y escalar.
3. **Después de cada fase**: actualizar la tabla de Status arriba +
   commit + push.
4. **Branch única**: `claude/app-visual-rework-strategy-35l6q`. Jamás push
   a `main`.
5. **Cero force push**, cero `--no-verify`, cero `reset --hard`.
6. **Commits atómicos**: una fase = uno o varios commits, todos
   revertibles independientemente.
7. **Si Cloudflare build falla** después de un push: diagnosticar, fixear
   en commit nuevo (no amend), continuar.
8. **Mantener producción intocada**: `main` no se mira ni se toca durante
   las fases 1-9.

---

## Escalation triggers — PARAR y reportar al usuario

Reproducido de `REWORK_PLAN.md`:

- Cambios que afecten copy visible (más allá de empty states de fase 9)
- Cambio de paleta o tipografía (vs el plan)
- Cambio de estructura de pantallas (más allá de fase 8)
- Deuda funcional no documentada descubierta durante el rework
- Una fase rompe acceptance criteria y no veo workaround claro
- La decisión de fase 8 (modal vs ruta) afecta a otras fases ya hechas
- Cualquier cosa que no esté en `REWORK_PLAN.md`
- **Fase 10b (merge a main)** — siempre escalada, jamás autónoma

---

## Cómo retomar este workflow (para agente futuro)

```bash
# 1. Ver dónde estamos
cd /home/user/gasti
cat WORKFLOW.md  # busca tabla "Status", encontrá la primera fila != "done"

# 2. Leer el plan de fondo
cat REWORK_PLAN.md  # secciones "Fase X" tienen el detalle del qué

# 3. Leer este archivo, sección "Fase X" abajo, tiene el cómo

# 4. Verificar estado git limpio antes de empezar
git status  # debe estar clean
git branch --show-current  # debe ser claude/app-visual-rework-strategy-35l6q

# 5. Ejecutar la fase
# 6. Verify
# 7. Update Status, commit, push
```

---

# Procedimientos por fase

Para cada fase: **Files**, **Procedure**, **Verify**, **Commit msg**.

---

## Fase 1 — Harden (a11y crítica)

### Files
- `index.html` (estructura semántica, ARIA, viewport)
- `styles.css` (focus-visible, skip-link)
- `app.js` (dialog helper, focus trap, Escape, document.title)

### Procedure

**1.1** `index.html:5` — restaurar zoom:
```diff
- <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
+ <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

**1.2** Semantic HTML:
- `<div class="lcard">` queda, pero el `<div class="ltitle">` → `<h1 class="ltitle">`
- `<div id="app">` → wrap interno con `<header class="topbar">` (la `.topbar` actual) y `<main id="main">` envolviendo desde `.swrap` hasta antes de `.cfgwrap`
- `<div class="cfgwrap">` → `<nav class="cfgwrap" aria-label="Acciones">`
- Skip link al inicio del `<body>`:
  ```html
  <a href="#main" class="skip-link">Saltar al contenido</a>
  ```
- Sheet titles → `<h2>`: `.calc-title`, `.nearby-title`, `.muro-title`,
  el div del title del planner
- `.estado .etitle` → `<h2>` semánticamente (visualmente igual)
- `.eloading` → agregar `role="status" aria-live="polite"`

**1.3** ARIA labels en buttons emoji-only. Para cada uno, agregar
`aria-label="..."` o eliminar el emoji y usar SVG con `<title>`
(se hace en fase 6, acá sólo aria-label):

| ID/clase | aria-label |
|---|---|
| `#btn-buscar` | `Buscar` |
| `#btn-gps` | `Ver PDVs cercanos` |
| `#btn-nearby-cerrar` | `Cerrar` |
| `#btn-muro` | `Abrir Muro` |
| `#btn-muro-cerrar` | `Cerrar Muro` |
| `#btn-tog` | `Colapsar todos los segmentos` (+ `aria-expanded` togglea) |
| `#btn-cfg` | `Configuración` |
| `#btn-refresh` | `Actualizar precios` |
| `#btn-unitario` | `Cambiar precio por bulto o unidad` |
| `#btn-modo` | `Cambiar modo PTR / PTC` |
| `#btn-markup` | `Cambiar markup` |
| `#btn-calc` | `Calculadora` |
| `#btn-plan` | `Planificador` |
| `#btn-plan-cerrar` | `Cerrar planificador` |
| `#btn-plan-wa` | `Enviar plan por WhatsApp` |
| `#calc-qty-minus` | `Disminuir bultos` |
| `#calc-qty-plus` | `Aumentar bultos` |
| `#btn-muro-enviar` | (ya tiene texto, dejar) |
| `#btn-entrar` | (ya tiene texto, dejar) |
| `#btn-salir` | (ya tiene texto, dejar) |
| `#calc-btn-markup` | `Cambiar markup PTC` |
| `#btn-save`, `#btn-save-top` | (ya tienen texto) |
| `#tname-wrap` | wrap del distri switcher: `role="button" tabindex="0" aria-label="Cambiar distribuidor" aria-haspopup="listbox" aria-expanded` |

**1.4** Sheets como dialogs. Helper en `app.js`:

```js
function installDialog(sheet, opener, closeBtn, titleId) {
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  if (titleId) sheet.setAttribute('aria-labelledby', titleId);

  var lastFocused = null;
  var FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function open() {
    lastFocused = document.activeElement;
    sheet.classList.add('on');
    requestAnimationFrame(function(){
      sheet.classList.add('open');
      var first = sheet.querySelector(FOCUSABLE);
      if (first) first.focus();
    });
  }

  function close() {
    sheet.classList.remove('open');
    setTimeout(function(){
      sheet.classList.remove('on');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }, 320);
  }

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    var focusables = sheet.querySelectorAll(FOCUSABLE);
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }

  function onKey(e) {
    if (!sheet.classList.contains('open')) return;
    if (e.key === 'Escape') { close(); }
    else { trapTab(e); }
  }

  document.addEventListener('keydown', onKey);
  if (closeBtn) closeBtn.addEventListener('click', close);

  return { open: open, close: close };
}
```

Conectar a los 4 sheets reemplazando la apertura/cierre actual de cada
uno (calc, plan, muro, nearby). La animación visual existente se preserva
porque seguimos usando las clases `.on` y `.open`.

**1.5** Focus rings genéricos en `styles.css`. Agregar al inicio (después
del `:root`, antes del bloque del login):

```css
:focus { outline: none; } /* reset */
button:focus-visible,
a:focus-visible,
[role="button"]:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--azul-m);
  outline-offset: 2px;
  border-radius: inherit;
}
/* Sobre fondo azul: ring dorado para contraste */
.topbar button:focus-visible,
.reshdr button:focus-visible,
.reshdr a:focus-visible {
  outline-color: var(--dorado);
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 0;
  background: var(--azul);
  color: #fff;
  padding: 12px 18px;
  z-index: 1000;
  text-decoration: none;
  border-radius: 0 0 12px 0;
  font-weight: 700;
}
.skip-link:focus { top: 0; }
```

**1.6** Document title dinámico. En `app.js`, cuando se renderiza el
resultado de un PDV:
```js
function setDocTitle(codigo, rs) {
  if (codigo && rs) {
    var rsShort = rs.length > 30 ? rs.slice(0, 30) + '…' : rs;
    document.title = codigo + ' — ' + rsShort + ' · Acciones Comerciales';
  } else {
    document.title = 'Acciones Comerciales';
  }
}
```
Llamar después de cargar resultado y al cerrar/limpiar.

### Verify

```bash
# Sanity: archivo parsea, no se rompió nada estructural
grep -c "role=\"dialog\"" index.html  # debería ser 4
grep -c "aria-label" index.html        # debería ser >=15
grep -c "<h1\|<h2\|<main\|<header\|<nav" index.html  # >=8
grep "user-scalable" index.html         # debería NO devolver match
grep ":focus-visible" styles.css        # debería existir
grep "skip-link" styles.css            # debería existir
grep "installDialog" app.js            # debería existir
```

Smoke en preview Cloudflare (manual / siguiente sesión humana):
- Tab navega login → entra → topbar → search → buscar → GPS → ...
- Escape cierra cualquier sheet abierto
- Pinch zoom funciona
- Lighthouse a11y ≥ 90

### Commit msg

```
Harden accessibility (Phase 1)

Restores user-scalable zoom, adds semantic HTML structure (h1 in login,
h2 in sheets, main/header/nav landmarks, skip link), aria-labels on all
icon-only buttons, role="dialog"+aria-modal+focus-trap+Escape handling
on the four sheets (calc, plan, muro, nearby) via a shared installDialog
helper, focus-visible outlines on every interactive element (gold on
the navy topbar/result-header for contrast), and a dynamic document
title that includes the PDV code and razón social while a client is
loaded.

Addresses audit P0.1, P0.2, P1.1, P1.2, P1.6, P2.6.
```

---

## Fase 2 — Extract (tokens completos + inline styles → clases)

### Files
- `styles.css` (expand :root, replace hardcoded values)
- `index.html` (move inline styles to classes)

### Procedure

**2.1** Reemplazar `:root` actual con bloque completo de tokens (ver
`REWORK_PLAN.md` § Fase 2.1 — tokens explícitos: sp-, fs-, fw-, r-, sh-,
tag-, filter-, offline-, ease-/dur-, tap-min).

**2.2** Pass mecánico sobre `styles.css`: cada hex/px/cubic-bezier que
matchee un token se reemplaza por `var(--*)`. Mantener lo no-tokenizable
(ej. `max-width: 360px` del login card, `width: 90px` de columnas).

Mapping de valores comunes:
- `4px` → `var(--sp-1)`
- `8px` → `var(--sp-2)`
- `12px` → `var(--sp-3)`
- `16px` → `var(--sp-4)`
- `24px` → `var(--sp-5)`
- `32px` → `var(--sp-6)`
- Sombras: matchear contra `--sh-sm/md/lg/xl/fixed` por valor exacto
- Cubic bezier `.4,0,.2,1` → `var(--ease-out)`
- Duraciones: `.32s` → `var(--dur-sheet)`, `.15s` → `var(--dur-fast)`, `.25s` → `var(--dur-med)`, `.65s` → `var(--dur-spin)`
- Border-radius valores → `--r-sm/md/lg/pill/sheet` por proximidad

**2.3** Inline styles → clases. Pasa por las 32 ocurrencias de
`style="..."` en `index.html`. Para cada una:
- Si es un patrón repetible: nueva clase semántica
- Si es one-off: utility class en sección `/* UTILITIES */` al final
  del CSS

Utilities mínimas a crear:
- `.row-center` (display flex, align center, gap variable)
- `.row-truncate` (overflow hidden, text-ellipsis, white-space nowrap, min-width 0)
- `.flex-1` / `.flex-shrink-0`
- `.text-meta` (font-size xs, color txt-s)
- `.cta-wa` (estilo del botón "Enviar" verde WhatsApp #25D366)
- `.badge-canal-inverse` (el badge canal en el result header sobre azul)

**2.4** Update `DESIGN.md` con la tabla nueva de tokens (sección "Paleta
y sistema actual" se rescribe).

### Verify

```bash
# 0 hex codes fuera de :root
grep -nE "#[0-9A-Fa-f]{3,6}" styles.css | grep -v "^[0-9]*:[[:space:]]*--" | head
# debería estar vacío o sólo en :root

# 0 inline styles en HTML
grep -oE 'style="[^"]*"' index.html | wc -l
# debería ser 0

# Visual: preview Cloudflare se ve idéntico al baseline (manual smoke test)
```

### Commit msg (uno o dos commits)

```
Extract design tokens for spacing, type, radius, shadow, motion (Phase 2.1)

Expands :root from 10 brand color tokens to a full system: 8-step spacing
scale (--sp-1..8 on a 4px base), modular type scale (--fs-xs..2xl with
1.25 ratio, plus --fw-* weight tokens), 5-step radius (--r-sm..sheet),
5-tier shadow (--sh-sm..xl + --sh-fixed), motion (--ease-out + --dur-*),
tag color triplets (--tag-pdv/seg/ccc-{bg,fg,bd}), filter neutrals
(--filter-*), offline-badge tokens, and --tap-min for touch targets.
Replaces every hardcoded hex/px in styles.css with the matching token;
no visual change.
```

```
Move inline styles from index.html to CSS classes (Phase 2.2)

Pulls all 32 style="..." attributes from index.html into named classes
or utilities in styles.css (.row-center, .row-truncate, .flex-1,
.text-meta, .cta-wa, .badge-canal-inverse). Reduces HTML noise, makes
the rework diffable, and consolidates the visual surface in one file.
No visual change.
```

---

## Fase 3 — Adapt (touch 44px)

### Files
- `styles.css`
- `index.html` (envolver dia checkboxes en label visible si hace falta)

### Procedure

Cambios puntuales:

| Selector | Cambio |
|---|---|
| `.calc-qty-btn` | `width: var(--tap-min); height: var(--tap-min);` (era 34) |
| `.sbtn, .sbtn-gps` | agregar `height: var(--tap-min);` (era width:46 sin height) |
| `.plan-dia` | `min-height: var(--tap-min); padding: var(--sp-2) var(--sp-3);` |
| `.cfgtoggle` | `width: var(--tap-min); height: var(--tap-min);` (era 40×36) |
| `.crefresh` | `min-height: var(--tap-min);` (era 36) |
| `.muro-close, .nearby-close, #btn-plan-cerrar` | `padding: 12px;` (sube de 4×8 a hit area 44+) |
| `.btn-ok, .csave, .muro-send` | `min-height: var(--tap-min);` |
| `.lbtn (PIN ocultos), .pin-box` | (PIN ya es 56×64, ok) |
| `.tbadge` (clickeable como toggle? no, sólo badge — skip) | — |
| `.muro-handle` | (no es target, es estético — skip) |

Nota: `.negocio-tab` queda en altura ~36px si no rompe el cluster
horizontal. Si pasa a 44px se cubre toda la fila — verificar
visualmente. Default: dejar 36 si es secundario.

### Verify

```bash
# Listar todos los height/min-height < 44 en styles.css
grep -nE "(height|min-height): *(3[0-9]px|4[0-3]px)" styles.css
# revisar manualmente, decidir caso por caso
```

### Commit msg

```
Increase touch targets to 44px minimum (Phase 3)

Brings every primary interactive element to WCAG 2.5.8 AA compliant
44×44px: calc qty buttons (34→44), search and GPS buttons (height
unset→44), config toggle (40×36→44×44), refresh button (36→44),
sheet close buttons (extended padding for 44 hit area), primary CTAs
(min-height 44). Plan-dia checkboxes wrapped in labels with 44px
min-height so the tap area exceeds the 11px native checkbox. Negocio
tabs left at 36px as secondary chips within a horizontal cluster.

Addresses audit P1.3.
```

---

## Fase 4 — Typeset (escala tipográfica)

### Files
- `styles.css`

### Procedure

Mapping (ya definido en REWORK_PLAN § Fase 4):

| Actual | Token | Valor |
|---|---|---|
| 9px, 10px, 11px | `--fs-xs` | 11 |
| 12px | `--fs-sm` | 12 |
| 13px, 14px | `--fs-base` | 14 |
| 15px | `--fs-md` | 16 |
| 18px, 20px | `--fs-lg` | 20 |
| 23px, 26px | `--fs-xl` | 26 |
| 28px | `--fs-2xl` | 32 |

Excepciones puntuales (mantener tamaño original):
- `.calc-result-lbl` (9px): subir a 11. Mejora legibilidad.
- `.pin-box` font-size 28: subir a 32 (`--fs-2xl`). Más impacto en
  pantalla de login.

Reemplazos en `styles.css`: cambiar `font-size: NNpx` → `font-size: var(--fs-X)`.

Update también weight tokens si no se hizo en fase 2.

### Verify

```bash
# Conteo de font-size únicos en CSS
grep -oE "font-size: *[^;]*" styles.css | sort -u | wc -l
# debería ser ≤ 7 (los tokens)

# Visual smoke en preview: ningún texto desaparece o se hace ilegible
```

### Commit msg

```
Consolidate type scale to 7 modular sizes (Phase 4)

Reduces font-size diversity from 12 ad-hoc values to a 7-step modular
scale (11/12/14/16/20/26/32, ~1.25 ratio) via --fs-xs through --fs-2xl
tokens introduced in Phase 2. Bumps the 9-10px floor to 11 for in-the-
field legibility under direct sunlight, lifts the PIN digit from 28 to
32 for stronger login presence, and keeps .rcod (the PDV code hero) at
the visual peak of the scale.

Addresses audit P2.1.
```

---

## Fase 5 — Layout (escala de espaciado)

### Files
- `styles.css`

### Procedure

Pass de remap (ya tokenizado en fase 2; acá es _re-asignación_ a la
escala de 8 valores estrictos):

| Actual px | Token | Valor |
|---|---|---|
| 2, 3, 4 | `--sp-1` | 4 |
| 5, 6, 7, 8 | `--sp-2` | 8 |
| 9, 10, 11, 12, 13 | `--sp-3` | 12 |
| 14, 15, 16, 17, 18 | `--sp-4` | 16 |
| 19, 20, 22, 24, 26, 28 | `--sp-5` | 24 |
| 30, 32 | `--sp-6` | 32 |
| 40 | `--sp-7` | 48 |
| 64, 80 | `--sp-8` | 64 |

Excepciones:
- `body { padding-bottom: 80px }` → `var(--sp-8)` 64. La barra de config
  inferior mide ~60px de altura, 64 es padding suficiente.
- Posiciones absolutas / fixed con valores específicos (`top:0; left:0;`):
  dejar como están.
- Widths fijos de columnas de tabla: dejar.

### Verify

```bash
# Conteo de padding/margin/gap valores únicos
grep -oE "(padding|margin|gap): *[^;]*" styles.css | grep -oE "[0-9]+px" | sort -u | wc -l
# debería ser ≤ 8 (los tokens) — algunas excepciones permitidas
```

### Commit msg

```
Consolidate spacing scale to 8 values on 4px base (Phase 5)

Snaps every padding/margin/gap value to the --sp-1..8 scale (4/8/12/16/
24/32/48/64) defined in Phase 2. Improves vertical rhythm predictability
and removes 12+ arbitrary intermediate values (5, 6, 7, 9, 10, 11, 13,
17, 22, 26, 30, 40). Body bottom padding adjusts from 80 to 64 since
the sticky config bar measures ~60px.

Addresses audit P2.2.
```

---

## Fase 6 — Polish (íconos SVG + font loading + locale)

### Files
- `index.html` (font links, replace emoji literals)
- `app.js` (icons.js inline o módulo nuevo, replace emoji literals,
  Intl locale)
- `styles.css` (estilos de íconos, currentColor)

### Procedure

**6.1** Crear set SVG. Inline en `app.js` (no archivo separado para no
romper el deploy simple). Función `icon(name, size)`:

```js
var ICONS = {
  search: '<svg ... viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  crosshair: '<svg ...><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/>...',
  mapPin: '<svg ...><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  inbox: '<svg ...>...',
  messageSquare: '<svg ...>...',
  settings: '<svg ...>...',
  refresh: '<svg ...>...',
  send: '<svg ...>...',
  x: '<svg ...>...',
  chevronDown: '<svg ...>...',
  chevronUp: '<svg ...>...',
  minus: '<svg ...>...',
  plus: '<svg ...>...'
};
function icon(name, size) {
  var s = size || 20;
  return ICONS[name].replace('<svg', '<svg width="' + s + '" height="' + s + '"');
}
```

Paths SVG sacados de [lucide.dev](https://lucide.dev) (ISC license,
compatible con repo Apache/MIT).

Reemplazar cada literal `&#NNN;` HTML/JS por `icon('name')`. En HTML
estático, hardcodear el SVG inline (no podemos llamar JS en HTML
template). En JS dinámico, usar `icon()`.

**6.2** Fonts:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;600&display=swap" rel="stylesheet">
```

Pesos cargados: 400, 600, 700 (eliminar 500 y 800). Reemplazar usos de
`font-weight: 500` por 400 o 600 según el caso (revisar `.lerr`,
`.cfg-status` — los pocos lugares con 500). El 800 de `.lbadge` y
`.tbadge` baja a 700 con letter-spacing aumentado.

**6.3** Locale Intl. En `app.js`, buscar todas las llamadas a
`new Intl.NumberFormat(...)` y `new Intl.DateTimeFormat(...)`,
asegurar el primer arg = `'es-AR'`.

### Verify

```bash
# 0 entidades HTML de emojis en index.html
grep -cE "&#[0-9]+;|&#x[0-9A-Fa-f]+;" index.html
# pueden quedar algunas en aria-labels o copy — revisar manualmente

# Lucide loaded
grep -c "ICONS\[" app.js
# debería ser >=1

# Fonts swap
grep "display=swap" index.html

# Locale
grep -oE "Intl\.(NumberFormat|DateTimeFormat)\([^,)]*" app.js | sort -u
# todos deberían empezar con 'es-AR'
```

### Commit msg (dos commits, uno por íconos y otro por fonts/locale)

```
Replace emoji icons with inline Lucide SVG set (Phase 6.1)

Swaps 11 Unicode emoji glyphs (search, crosshair, map-pin, inbox,
message, settings, refresh, send, x, chevrons, +/-) for an inline SVG
icon set sourced from lucide.dev (ISC). Glyphs now render identically
across iOS, Android, and Windows, inherit currentColor for theming,
and free us from the cross-platform Apple/Google emoji style drift.

Addresses audit P2.4.
```

```
Add font-display swap, preconnect, locale es-AR (Phase 6.2)

Adds preconnect to Google Fonts hosts and font-display=swap to the
font URL to eliminate FOIT on field cellular. Drops DM Sans weight
500 and 800 from the load (500 was unused-ish and 800 collapses to 700
with letter-spacing where needed), so we go from 5 weights × 2
families to 3+2. All Intl.NumberFormat and Intl.DateTimeFormat calls
now pass 'es-AR' explicitly so prices read $1.234,56 regardless of
browser locale.

Addresses audit P2.5, P3.4.
```

---

## Fase 7 — Quieter (etiquetas)

### Files
- `styles.css` (etiqueta variants)
- Posiblemente `app.js` si el orden de render se cambia

### Procedure

**7.1** Definir jerarquía visual primaria/secundaria:
- Tag primario (primera etiqueta en el row): full color, tal cual está.
- Tags secundarios (2do, 3ro, etc.): variante muted.

Variantes muted en CSS:
```css
.etiq-pdv.muted { background: var(--gris-f); color: var(--tag-pdv-bg); border-color: var(--gris-b); }
.etiq-seg.muted { ...similar... }
.etiq-ccc.muted { ...similar... }
```

**7.2** En `app.js`, después de renderizar las etiquetas, marcar
todas menos la primera con `.muted`. Orden de prioridad: PDV > segmento > CCC.

**7.3** Reducir el box-shadow del estado active de los filtros del
planner. Hoy es `box-shadow: 0 0 0 2px rgba(...)`. Cambiar a un
background más sólido sin ring extra:
```css
.plan-canal-btn.active { background: var(--filter-active-bg); color: #fff; border-color: var(--filter-active-bd); /* eliminar box-shadow */ }
```

**7.4** Eliminar bordes dobles. Ej `.plan-etiq-btn.pdv` tiene `border: 1.5px solid` + cuando `.active` agrega `box-shadow: 0 0 0 2px`. Sólo dejar el border, hacer el active con peso de color + fill.

### Verify

Visual subjetivo: una fila con 4 etiquetas activas se lee sin que
la mirada salte; la primera sigue siendo evidente.

### Commit msg

```
Reduce etiqueta visual saturation when multiple are visible (Phase 7)

Introduces a .muted variant for tag chips (PDV / segmento / CCC) so the
first tag in a row keeps full brand saturation while subsequent ones
drop to neutral fills with the original color reduced to border + label.
Removes the double-ring box-shadow on active planner filters in favor of
a single solid fill, eliminating the “neon outline” feel when multiple
filters are on at once. Tag-priority order (PDV > segmento > CCC) sets
which one keeps the spotlight.

Addresses audit P2.7.
```

---

## Fase 8 — Critique (modal vs ruta para Calc / Planner)

### Files
- `docs/adr-001-modal-vs-route.md` (nuevo)

### Procedure

Esta fase es **documental**, no de código. Decisión y ADR.

Crear `docs/adr-001-modal-vs-route.md` con:
- Context (qué problema, audit P3.2)
- Decision drivers (5 principios del REWORK_PLAN)
- Options evaluated (mantener sheets, sheets + hash routing, full routing)
- Decision + rationale
- Consequences (qué se gana, qué cuesta)
- Status (proposed / accepted / superseded)

**Decisión autónoma a tomar (siguiendo el plan §Fase 8):** opción 2
(sheets visuales + state machine con hash routing) — el plan ya lo
recomienda. ADR documenta el porqué.

Implementación queda **diferida** — no la metemos en este rework
porque toca app.js de manera profunda y no es un cambio visual.
Se trackea como "follow-up after rework".

### Verify

```bash
test -f docs/adr-001-modal-vs-route.md && echo "ADR exists"
```

### Commit msg

```
ADR-001: keep sheets visually, add hash routing as follow-up (Phase 8)

Documents the modal-vs-route critique surfaced in audit P3.2. After
weighing the cost of a full screen-routing refactor against the gains
(browser back closes the sheet, shareable URLs with planner filters,
PWA-friendlier history), recommends a hybrid: keep the visual sheet
treatment for calc/plan/muro/nearby, but back it with a state machine
+ hash routing so the URL reflects the current view.

Implementation is deferred — it touches app.js too deeply to fit inside
a visual rework, and the rework's no-regression constraint argues for
shipping the visual changes first and the routing change as a
follow-up PR. This ADR pins the decision so the next iteration starts
from it instead of re-litigating.
```

---

## Fase 9 — Animate + Clarify

### Files
- `styles.css` (prefers-reduced-motion)
- `app.js` (empty state copy variations)
- `index.html` (3 empty state containers, no más uno solo)

### Procedure

**9.1** Reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
  .spinner { animation-duration: 1.2s !important; }
  /* spinner sigue corriendo pero más lento, indicador funcional */
}
```

**9.2** Empty states diferenciados. Hoy hay un solo `#st-vacio`. Lo
expandimos a:
- `#st-vacio-no-encontrado` — "No encontramos el PDV `<código>`."
  Sugerir histórico + buscar por nombre.
- `#st-vacio-sin-acciones` — "Este cliente no tiene acciones activas hoy."
  Mostrar fecha de última carga del distri.
- `#st-vacio-red` — "No pudimos conectar al servidor del distri."
  Botón Reintentar + caché si existe.

En HTML, 3 containers en lugar del `#st-vacio` actual. En JS, función
que decide cuál mostrar según el caso (los lugares que hoy llaman
`mostrarVacio()` o equivalentes deciden con qué argumento).

### Verify

- Reduced motion: emular en DevTools → Rendering panel → "Emulate CSS
  media: prefers-reduced-motion". Las sheets aparecen instantáneas, el
  spinner sigue girando.
- Empty states: forzar cada caso desde DevTools console
  (`mostrarVacio('no-encontrado', '3485')`, etc.) y verificar copy.

### Commit msg

```
Respect reduced-motion and split empty states by reason (Phase 9)

Adds a @media (prefers-reduced-motion: reduce) block that flattens all
non-essential transitions and animations to ~0ms while keeping the
loading spinner running (slower, but visible) as a functional indicator
that work is in progress.

Splits the single "Sin acciones" empty state into three distinct
states so the copy and call-to-action match the cause: PDV not found
(suggests history and name search), client found with no active
actions (shows distri's last-load date), or network failure (offers
retry + cached data if available).

Addresses audit P3.1, P3.3.
```

---

## Fase 10a — Final polish + re-audit

### Files
- Cualquier cosa puntual que aparezca en el re-audit
- `WORKFLOW.md` (status final, todas las fases done)
- `DESIGN.md` (refresh de baseline → estado actual)

### Procedure

**10a.1** Re-correr el audit completo (sección "Diagnostic Scan" de
`.claude/skills/impeccable/reference/audit.md`). Score esperado: ≥18/20.

**10a.2** Smoke test cross-device (manual desde el preview URL):
- iPhone SE 375×667
- iPhone 14 Pro 393×852
- Pixel 7 412×915

**10a.3** Si quedan issues P0/P1 que se pueden cerrar con cambios
chicos: commit final de polish. Si son issues que requieren decisión
mayor: documentar y escalar.

**10a.4** Update `DESIGN.md` reemplazando la sección "Deuda visual
identificada" con un estado actualizado, y actualizar la sección
"Tokens" con la versión final.

**10a.5** Update `WORKFLOW.md` con status `done` para todas las fases
1-9 + 10a.

### Verify

Re-audit score ≥ 18/20.

### Commit msg

```
Final polish + DESIGN.md refresh + audit re-run (Phase 10a)

Closes out any straggler findings surfaced by the re-audit pass after
phases 1-9. Refreshes DESIGN.md so it documents the post-rework token
system and component inventory (it shipped as a baseline audit in
Phase 0 and is stale now). Updates WORKFLOW.md status table to mark
1-9 done. The audit score moved from 10/20 (baseline) to <FINAL>/20.

Phase 10b (cutover to main) remains blocked on user approval per the
workflow contract.
```

---

## Fase 10b — Cutover (BLOCKED, requiere humano)

**No ejecutar autónomamente.** Cuando el usuario apruebe:

1. PR de la rama → `main`
2. PR body: resumen de 10 fases + audit diff + screenshots before/after + lista NO-TOCAR confirmada
3. Merge
4. Verificar deploy en `cmq.gmcmq.workers.dev`
5. Monitoreo 48h

---

## Reporte final al humano

Cuando se complete fase 10a, generar un summary message:

```
Rework visual completo en branch `claude/app-visual-rework-strategy-35l6q`.

Audit: 10/20 → <FINAL>/20

Commits agregados:
- <listar SHAs de las 9 fases>

Cambios visibles principales:
- <bullet list de lo más perceptible>

Preview deploy: <URL si disponible>

Listo para tu review. Cutover a main pendiente de tu OK.
```
