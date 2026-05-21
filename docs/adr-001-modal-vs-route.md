# ADR-001 — Calculadora y Planificador: ¿sheets, rutas, o híbrido?

**Status:** Accepted (decisión documental — implementación diferida)
**Date:** 2026-05-21
**Surfaces audit finding:** P3.2 (modal-first reflex)
**Phase:** 8 del rework visual

---

## Contexto

La app tiene cuatro overlays/sheets que se abren desde la barra de
configuración o desde el result header:

| Sheet | Trigger | Densidad de contenido | Tiempo en pantalla |
|---|---|---|---|
| **Nearby** | botón GPS en la search bar | Lista corta de PDVs cercanos | Segundos — el usuario elige uno y entra |
| **Muro** | botón Muro en result-header (cuando aplica) | Lista de comentarios + textarea | Segundos a minutos |
| **Calculadora** | botón Calc en cfg bar | SKU + descuento + 4 outputs + qty stepper | Minutos — el vendedor calcula mientras habla con el cliente |
| **Planificador** | botón ⓘ en cfg bar | 5 filtros + tabla scrolleable de PDVs + export WhatsApp | Minutos — armar la jornada |

Las cuatro funcionan con la misma mecánica visual: overlay oscuro +
sheet que entra de arriba con `translateY(-100%) → 0` en
`.32s cubic-bezier(.4,0,.2,1)`, cierre por overlay click o botón ✕.

El audit (P3.2) flagéa esto como **modal-first reflex**: Calc y Planner
son flujos *densos* y *largos* metidos en una pantalla que no es
realmente "modal" (no bloquean una decisión inmediata, no son
secundarios respecto al "main"). Worth questioning si el modelo correcto
es sheet vs ruta de pantalla completa.

## Opciones evaluadas

### Opción 1 — Status quo (mantener todo como sheets)

Mantener las 4 sheets sin cambios.

**Pros:**
- Costo cero. Sin riesgo.
- El usuario ya conoce la mecánica.

**Cons:**
- Back button del browser cierra la app, no el sheet → frustración común en mobile.
- No se puede compartir un link al planificador con filtros pre-cargados.
- No hay history dentro de la app: si abrís Calc, mirás Planner, no podés volver a Calc.
- "Mental model" inconsistente: vendedor está en "buscar PDV", pero "calculadora" no es lo mismo que "ver un PDV" — son dos modos distintos. Modal lo trata como subordinado.

### Opción 2 — Sheets visuales + state machine con hash routing (recomendada)

Conservar el tratamiento visual de sheet, pero respaldarlo con state
machine y hash routing:

- App siempre está en un *modo*: `lookup` (default, búsqueda + result), `calc`, `plan`, `muro`, `nearby`.
- URL refleja el modo: `/`, `/#calc`, `/#plan`, `/#muro`, `/#nearby`.
- Cambios de modo via `history.pushState` / `popState`.
- Back button del browser cierra el sheet (es decir, vuelve al modo anterior).
- Compartir link `/#plan?dia=LU,MA&sup=Pedro` posible (en una iteración futura).

**Pros:**
- Mantiene la familiaridad visual (las sheets están bien hechas, no rompemos UX vigente).
- Back button mobile-natural cierra sheets.
- Habilita deep links del planner con filtros.
- Habilita PWA installable más sólida (cada modo es una ruta).
- Sin refactor mayor del shell: el state machine es chico.

**Cons:**
- Requiere refactor del sheet open/close: hoy son funciones imperativas (`calcAbrir`, `planAbrir`, etc.), mañana son `setMode('calc')`.
- Hay que manejar deep-link inicial (si entran con `/#calc` directo, mostrar Calc sin pasar por lookup).
- Pequeño riesgo de regresión funcional.

### Opción 3 — Full refactor a routing tradicional

Cada vista es una "página" con su URL: `/`, `/calc`, `/plan`. Más
profundo. El shell se rediseña como SPA con un mini-router.

**Pros:**
- Lo más limpio en términos de arquitectura.
- Posibilita futuras vistas (historial, reportes) sin más overhead.

**Cons:**
- Refactor grande. Conflictúa con el principio de "cero regresión" del rework.
- Sin un build system / framework, montar un router decente en vanilla
  termina siendo deuda futura (cualquier framework después necesita
  refactor).
- No es lo que pide la app *hoy*. Premature optimization.

## Decisión

**Opción 2 — Sheets visuales + state machine con hash routing.**

La opción 2 captura el 90% del valor estratégico (back button, deep
links, PWA-friendlier) con el 30% del costo de la opción 3. La opción
1 es status quo y no resuelve el finding del audit.

### Implementación: diferida (no entra en este rework visual)

**Razones:**
1. La opción 2 toca `app.js` profundo: hay que reescribir 4 funciones
   `*Abrir/*Cerrar` y agregar el state machine + history listener.
2. El rework visual tiene como contrato "cero regresión funcional". Un
   refactor de routing introduce riesgo que el rework no debería cargar.
3. La opción 2 se beneficia del trabajo de la fase 1 (los sheets ya
   tienen `role="dialog"` y focus management, lo cual es ortogonal al
   routing y reusable).
4. La opción 2 tiene su propio set de acceptance criteria (back button,
   deep links, refresh dentro de un mode) que se merecen un ciclo de
   review propio.

### Plan de seguimiento

- Después del cutover del rework visual a `main`, abrir un PR aparte:
  **"Calc and Planner: state machine + hash routing"**.
- Alcance del PR:
  - Introducir `var APP_MODE = 'lookup' | 'calc' | 'plan' | 'muro' | 'nearby'`
  - Función `setMode(name, options?)` que abre/cierra el sheet correspondiente,
    actualiza `history.pushState({mode: name}, '', '#' + name)` y dispara
    los efectos secundarios (focus, ARIA, scroll).
  - Listener de `popstate` que sincroniza el modo con el hash.
  - Mantener los botones existentes pero que llamen `setMode('calc')` en lugar
    de `calcAbrir()`.
  - Test manual: abrir Calc, pisar back en el browser, sheet cierra. Refresh
    en `/#plan`, abre directo en el planner.

## Consecuencias

- **A corto plazo:** ninguna. Status quo visual.
- **A mediano plazo:** PR de routing en backlog, prioridad media (no
  bloquea nada, suma usabilidad).
- **Riesgos:** ninguno hasta que ejecutemos el follow-up PR. Cuando lo
  ejecutemos, los riesgos son los típicos de un refactor de state
  management: regresión en open/close, race conditions en sheets
  anidados (¿se puede abrir Muro encima de Calc?). Mitigables con tests
  manuales del flujo y con focus restoration ya implementado en Phase 1.

## Notas

El finding también menciona que el `rcod` central del result-header
podría leerse como "hero metric template" (otro anti-pattern de
modal-first reflex). El audit la cataloga como **borderline** porque
es información hierarchy genuina, no decoración. Esta ADR no la toca:
el `rcod` se preserva tal cual (está en la lista NO-TOCAR del REWORK_PLAN).
