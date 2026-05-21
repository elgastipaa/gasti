# Acciones Comerciales — Producto

## Qué es

App mobile-first (PWA monolítica de un solo `index.html`) que un equipo de
vendedores de distribuidores Quilmes usa **en la calle, todos los días**,
para consultar qué acciones comerciales, precios y datos aplican a cada
cliente (PDV — punto de venta) que están por visitar o atender.

No es un dashboard, no es un CRM, no es una herramienta de marketing. Es
una **consulta operativa rápida**: el vendedor entra el código del PDV
o lo busca por nombre / cercanía GPS, y la app le devuelve en menos de
3 segundos toda la info que necesita para esa visita.

## Usuarios

### Primario: Vendedor / preventista en territorio
- Está caminando, manejando o adentro del local del cliente.
- Usa el celular con **una sola mano**, muchas veces apurado.
- Conectividad variable — puede estar en zona con mala señal o sin datos.
- No quiere aprender. Lo que ya funciona, no se toca.
- Habla y lee en español rioplatense, no en español neutro.

### Secundario: Supervisor de zona
- Usa el planificador para ver qué PDVs visitar y filtrar por
  vendedor / día / canal / etiqueta.
- Necesita exportar la lista por WhatsApp para coordinar la jornada.

### Terciario: Administrador del distribuidor
- Configura los Google Sheets que alimentan la app (hasta 4 distribuidores).
- Cambia el PIN, los nombres de pestañas, la URL del Muro.
- Toca esto **una sola vez** y se olvida.

## Marca

**Distribuidor Quilmes.** Quilmes es la cerveza más vendida de Argentina,
parte del grupo CCU. La identidad gráfica del distribuidor hereda la paleta
institucional: **azul marino profundo + dorado**. Es una marca seria,
masiva, de trabajo. No es premium-aspiracional ni juvenil-divertida — es
**fierro y oficio**.

La app vive bajo esa identidad pero **no es marketing de Quilmes**: es
una herramienta de trabajo del distribuidor. El logo no es protagonista,
los colores sí.

## Tono y voz

- **Directo, sin adornos.** "Sin acciones asignadas", no "¡Ups! Parece que
  este cliente todavía no tiene acciones 😊".
- **Imperativo cuando corresponde.** "Ingresá tu PIN", "Buscá el cliente".
- **Voseo argentino** — nunca "tú" o "ingresa". Siempre "vos", "ingresá",
  "guardá".
- **Cero emojis decorativos en copy.** (Hoy hay algunos como íconos —
  📍 🔍 ⚙ 💬 — eso es un compromiso por simplicidad técnica, no estética).
- **Números siempre en formato argentino**: `$1.234,56` (punto miles,
  coma decimal).
- Nunca jerga corporativa tipo "experiencia", "journey", "engagement". El
  vendedor habla de "cliente", "PDV", "razón social", "canal", "etiqueta".

## Principios estratégicos

1. **Velocidad sobre pulido.** Cada toque es tiempo de trabajo. Si una
   pantalla tarda en cargar o necesita scroll, perdimos. Objetivo:
   código ingresado → datos en pantalla en menos de 3 segundos.
2. **Una sola mano, pulgar.** Botones grandes, targets de 44px+, acciones
   primarias al alcance del pulgar. Nada crítico arriba del todo.
3. **Offline-resilient.** La app cachea las últimas 30 búsquedas y los
   datos estáticos (precios, LDP, config) en localStorage. Si no hay
   señal, sigue funcionando con lo último que vio.
4. **El código del PDV es sagrado.** Es el identificador único, lo que el
   vendedor memoriza. Siempre prominente, siempre en monospace, siempre
   copiable visualmente.
5. **Los números son la entrega.** Precios, descuentos, totales — son la
   razón por la que el vendedor abre la app. Hay que poder escanearlos
   sin esfuerzo: monospace, alineados a la derecha, jerarquía clara entre
   "por bulto", "por unidad", "total".
6. **Configuración es un mal necesario.** Existe pero está escondida
   detrás del botón de engranaje. El 99% de las sesiones nunca la abre.

## Anti-referencias (lo que NO queremos parecer)

- **No somos Stripe, Linear, Vercel.** No estamos vendiendo una herramienta
  SaaS a un developer. Sobrios sí, minimalistas-de-startup no.
- **No somos una app de delivery o e-commerce.** Nada de hero banners,
  carruseles, promociones llamativas, gradientes flashy.
- **No somos un dashboard de BI.** No hay charts, no hay KPIs, no hay
  "insights". Hay datos crudos bien ordenados.
- **No somos una app de consumidor.** Sin onboarding, sin tooltips de
  bienvenida, sin "delightful micro-interactions" gratuitas, sin modo
  oscuro como feature. Si lo agregamos algún día, será porque hay un
  motivo operativo, no estético.
- **No somos material de marketing de Quilmes.** Sin claims, sin slogans,
  sin tipografías brand-heavy. La marca está presente en color y nombre,
  punto.

## Restricciones técnicas que afectan el diseño

- Es **un solo `index.html`** (ahora ya con CSS y JS extraídos a archivos
  aparte). Sin build system. Sin framework. JS vanilla.
- Datos vienen de **Google Sheets** vía la API pública de gviz. Latencia
  de red es real, los estados de carga importan.
- **PWA, mobile-only.** Viewport bloqueado: `maximum-scale=1.0,
  user-scalable=no`. No hay versión desktop (no la necesitamos).
- Soporta **hasta 4 distribuidores** en simultáneo (Quilmes tiene
  cientos en el país; cada usuario configura los que le tocan).
- Persistencia local: `localStorage` (no IndexedDB, no SW por ahora).

## Métricas implícitas de éxito

- Tiempo desde PIN ingresado hasta primer dato útil en pantalla.
- % de sesiones que requieren abrir configuración (debería ser cercano a 0).
- % de búsquedas que terminan en "Sin acciones" (señal de datos faltantes,
  no de UX rota).
- Que el vendedor **no piense en la app**. Si la nota, algo le molestó.
