# Imagen opcional en comentarios (reseñas)

Estado: EN EJECUCIÓN por Angel junto con Claude (no por otro agente ni persona). COMPLETADO y publicado el 2026-10-14 (commit 95cc0cb). No volver a ejecutar este plan.

---

# PARTE 1 — Guía de ejecución (para la persona que lo ejecuta)

## Resumen ejecutivo

Hoy los clientes pueden dejar un comentario en el sitio con nombre, calificación y texto. Vamos a permitir que, de forma **opcional**, también adjunten **una foto**.

- La foto se guarda en OneDrive, en una carpeta nueva llamada `comentarios`, junto al archivo Excel.
- Cada foto recibe un nombre único generado automáticamente.
- En el Excel habrá una columna nueva, `Image`, que indica qué foto corresponde a cada comentario.
- La foto **solo se muestra en el sitio cuando el comentario es aprobado** (igual que hoy con el texto). Los comentarios sin foto siguen funcionando igual.
- El correo de aviso de nuevos comentarios no cambia.

El trabajo se hace en **7 pasos** (más una preparación). **Después de cada paso, el agente se detiene, explica qué hizo y espera a que la persona valide y diga explícitamente que puede continuar. El agente no avanza al siguiente paso sin esa autorización.**

| Paso | Qué se hace | Qué valida la persona |
|---|---|---|
| 0 | Preparación: el agente revisa que la computadora tenga los accesos necesarios | Que el agente confirme que todo está listo |
| 1 | Actualización del acceso a OneDrive | Que una foto de prueba aparezca en la carpeta `comentarios` |
| 2 | Agregar la columna nueva al Excel | Que el Excel tenga la columna `Image` y los comentarios anteriores sigan intactos |
| 3 | Pruebas internas: enviar comentarios de prueba (con y sin foto) | Que en el Excel aparezcan las filas de prueba y en OneDrive las fotos |
| 4 | Pruebas internas: confirmar que solo se muestran las fotos de comentarios aprobados | Que el agente reporte que las pruebas pasaron (se aprueba y se desaprueba un comentario de prueba en el Excel) |
| 5 | Modificar el sitio para que se puedan subir fotos | Solo un aviso de que se completó (no se ve nada en línea todavía) |
| 6 | Documentar la nueva función | Que la documentación se lea clara |
| 7 | Cierre: guardar el cambio y publicarlo en línea | Que la persona vea el sitio publicado y haga una prueba real |

## Reglas para el agente (obligatorias)

1. Hablar en lenguaje sencillo, sin tecnicismos. Si hay que usar un término técnico, explicarlo en una frase.
2. Al terminar cada paso: resumir qué se hizo, indicar exactamente qué debe revisar la persona y dónde, y **preguntar si puede continuar**. No avanzar sin un "sí" claro.
3. Marcar en la sección "Tareas" (Parte 2) lo que se va completando.
4. **Nunca borrar nada.** Si hay que limpiar filas o fotos de prueba, pedir a la persona que lo haga ella misma y explicarle cómo.
5. Las pruebas usan el Excel, OneDrive y correo reales. Todo dato de prueba debe llevar el nombre `PRUEBA` y avisar a la persona de que llegarán correos de aviso de prueba.
6. Si algo falla, detenerse, explicar el problema en palabras simples y proponer opciones. No insistir con lo mismo.
7. No guardar cambios (commit) ni publicar en línea (push/deploy) sin autorización explícita en el paso 7.
8. Nunca escribir contraseñas ni credenciales en archivos del repositorio.
9. **Canal de comunicación:** si hay una duda técnica o de proceso que no puedes resolver, o un error que persiste, detente y documéntala en [canal-comentarios/](../canal-comentarios/README.md) siguiendo las instrucciones de ese README (un archivo por duda, solo ese archivo se sube a `main`, nunca secretos). Esta es la única excepción a la regla 7: subir archivos de esa carpeta no publica el sitio, pero cualquier otro archivo subido a `main` SÍ lo publica. Con la persona avisando a desarrollo, espera la respuesta antes de seguir con el paso.

## Detalle de cada paso

### Paso 0 — Preparación
El agente verifica, sin modificar nada: que existan las credenciales para conectarse a OneDrive (`api/local.settings.json`), que estén instaladas las herramientas para correr la API, y que el repositorio esté al día y sin cambios pendientes. Si algo falta, lo explica y se detiene.

### Paso 1 — Actualización del acceso a OneDrive
El agente agrega a la aplicación la capacidad de subir y leer archivos en OneDrive. Como prueba, sube una foto de la carpeta `images/` del proyecto a la carpeta `comentarios` (se crea sola).
- **La persona valida:** abre OneDrive, entra a la carpeta `comentarios` (junto al Excel) y confirma que la foto está y se abre bien.
- Esa foto de prueba la borra la persona manualmente cuando termine las pruebas.

### Paso 2 — Columna nueva en el Excel
El agente agrega la columna `Image` a la tabla de comentarios (hoja `Reviews`) y actualiza el script que crea el Excel desde cero. **Antes de tocar el Excel real, pide confirmación.**
- **La persona valida:** abre el Excel y confirma que existe la columna `Image` al final, vacía, y que los comentarios anteriores están intactos.
- Este paso debe hacerse antes de los siguientes: el sistema falla si el código intenta guardar en una columna que no existe.

### Paso 3 — Pruebas internas: guardar comentarios con foto
El agente modifica la parte de la aplicación que recibe los comentarios y la prueba por su cuenta (no desde el sitio web): un comentario sin foto, otro con foto válida, y varios intentos inválidos (foto muy pesada, archivo que no es una foto) que deben ser rechazados.
- **La persona valida:** en el Excel aparecen las filas de prueba (nombre `PRUEBA`); la de la foto trae el nombre del archivo en `Image`; en `comentarios` está esa foto. Llegan correos de aviso de prueba, normales y sin foto.

### Paso 4 — Pruebas internas: mostrar fotos solo si el comentario está aprobado
El agente agrega la parte que entrega la foto al sitio y la prueba por su cuenta. La foto de un comentario pendiente no debe poder verse. Para probar el caso aprobado, el agente le pide a la persona que cambie `Status` de la fila de prueba a `approved` en el Excel, hace la prueba y le pide **cambiarlo de vuelta a `pending` de inmediato** (mientras está aprobado, el comentario de prueba podría verse en el sitio actual).
- **La persona valida:** que hizo ese cambio en el Excel y el agente reporta que las pruebas pasaron. Después, la persona borra las filas `PRUEBA` y las fotos de prueba (el agente le indica cómo).

### Paso 5 — Modificar el sitio para subir imágenes
El agente agrega al formulario de comentarios el campo opcional para adjuntar una foto (con vista previa y botón para quitarla) y hace que las fotos de comentarios aprobados se muestren en sus tarjetas. Como ya se validó que la parte de atrás funciona, aquí **no hay validación visual**: el agente solo avisa que el cambio quedó completo y que lo revisarán publicado en el paso 7.
- **La persona valida:** solo recibe el aviso de que se completó y autoriza continuar.

### Paso 6 — Documentar la nueva función
El agente actualiza README.md, CLAUDE.md y AGENTS.md únicamente donde se mencionan las columnas de comentarios, los endpoints y el proceso de aprobación.
- **La persona valida:** lee el resumen de cambios en la documentación.

### Paso 7 — Cierre: guardar y publicar
1. El agente hace un resumen final de todo lo realizado y pregunta si se **guardan los cambios** (commit, con la identidad indicada en AGENTS.md).
2. Con autorización, los guarda y pregunta aparte si se **publican en línea**.
3. Con autorización, publica (siguiendo el comando de README.md) y pide a la persona que abra el sitio publicado y haga una prueba real: dejar un comentario `PRUEBA` con foto, aprobarlo en el Excel, ver que aparece con su foto en el sitio y luego volverlo a `pending` y borrar la fila y la foto de prueba.
4. Si algo se ve mal, el agente puede deshacer el cambio publicado (volver a la versión anterior) previa autorización. El Excel con la columna nueva no estorba a la versión anterior.
5. El agente llena la sección "Revisión" al final de este archivo.

---

# PARTE 2 — Detalle técnico (para el agente)

## Decisiones tomadas

- Las imágenes se guardan en la misma OneDrive del Excel (credenciales Graph existentes), no en un servicio nuevo.
- Se sirven mediante un proxy `GET /api/review-image/{name}` que solo entrega imágenes de reseñas `approved`.
- Una sola imagen por reseña, máximo 2 MB (ya reducida en el navegador).
- La imagen viaja como base64 dentro del mismo JSON de `POST /api/review` (sin multipart).
- El correo de aviso no cambia (sin adjunto ni mención de imagen).

## Diseño

### Datos
- Tabla `Reviews`: nueva columna F `Image` (nombre de archivo, p. ej. `3f2a...c1.jpg`; vacía si no hay imagen).
- Archivos en OneDrive: carpeta `comentarios/` en el mismo directorio donde está el Excel (se deriva del directorio de `EXCEL_FILE_PATH`; no hay variable de entorno nueva). Graph crea la carpeta automáticamente al hacer el PUT.
- Nombre del archivo: `crypto.randomUUID()` generado en el servidor + extensión según el tipo detectado (p. ej. `3f2a9c1e-7b4d-4e8a-9d11-5c6f0a2b8e34.jpg`). Único, no adivinable y nunca incluye datos del cliente. Se guarda en la columna `Image`, que enlaza la fila con el archivo.
- Para revisar la imagen antes de aprobar se abre en `comentarios/` el archivo cuyo nombre aparece en la columna `Image` de la fila.

### Seguridad
- Servidor valida: `image` es base64 válido, tamaño decodificado <= 2 MB, firma real del archivo (magic bytes) JPEG/PNG/WebP. No se confía en el tipo declarado por el cliente.
- Proxy: `name` debe cumplir `^[0-9a-f-]{36}\.(jpg|png|webp)$` (evita path traversal), debe existir en la columna `Image` y su fila debe tener `Status=approved`; si no, 404.
- Respuesta del proxy con `Content-Type` fijo según extensión, `Cache-Control: public, max-age=86400`. `X-Content-Type-Options: nosniff` ya está global.
- Rate limit y honeypot existentes se mantienen (5 req/min por IP aplica también a las subidas).
- El CSP no requiere cambios (`img-src 'self'` cubre `/api/review-image/...`).

## Orden de despliegue

1. Columna `Image` en el Excel de producción ANTES de desplegar el código (paso 2 ya lo garantiza). `addTableRow` con 6 valores falla si la tabla tiene 5 columnas.
2. Desplegar API y frontend juntos (paso 7).
3. Filas antiguas quedan con `Image` vacía: el código debe tolerar `row[5] === undefined`.

## Tareas (marcar al completar, por paso)

### Paso 0 — Preparación
- [x] 0.1. Verificar `api/local.settings.json` con las 7 variables, Azure Functions Core Tools y Node, `git status` limpio y `git pull`.

### Paso 1 — Graph client ([api/src/graph.js](../api/src/graph.js))
- [x] 1.1. `uploadFile(relativePath, buffer, contentType)`: `PUT /users/{upn}/drive/root:{dir}/{relativePath}:/content`. `graphFetch` fuerza `Content-Type: application/json`; pasar el header del archivo (el override ya está permitido). La respuesta de Graph es JSON, así que sirve.
- [x] 1.2. `getFile(relativePath)`: `GET .../content` devolviendo `Buffer` (usar `fetch` directo con redirect; la respuesta no es JSON, no usar `graphFetch`).
- [x] 1.3. Helper interno `comentariosDir()` = directorio de `EXCEL_FILE_PATH` + `/comentarios`.
- [x] 1.4. Prueba con script temporal (en el scratchpad o carpeta temporal, no en el repo): subir una foto de `images/` y leerla de vuelta. Pedir autorización antes de correrlo.

### Paso 2 — Excel
- [x] 2.1. Agregar columna `Image` a la tabla `Reviews` (`POST /tables/Reviews/columns/add` o manual). Confirmar con la persona antes de tocar el archivo de producción.
- [x] 2.2. Actualizar [api/scripts/create-excel-file.js](../api/scripts/create-excel-file.js): columnas `['Date', 'Name', 'Rating', 'Comment', 'Status', 'Image']`.

### Paso 3 — `POST /api/review` ([review.js](../api/src/functions/review.js))
- [x] 3.1. Leer `image` (base64 sin prefijo `data:`) del body; opcional.
- [x] 3.2. Si viene: decodificar, validar tamaño <= 2 MB y magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`). Si es inválida, 400 `Invalid image`.
- [x] 3.3. Subir a OneDrive (`comentarios/<uuid>.<ext>`); guardar el nombre en la columna F (cadena vacía si no hay imagen).
- [x] 3.4. Orden: subir imagen primero, luego `addTableRow`. Si la fila falla, el archivo queda huérfano (aceptable).
- [x] 3.5. El correo de aviso no cambia.
- [x] 3.6. Pruebas con `curl` contra `func start` local: sin imagen; JPEG, PNG y WebP válidos; >2 MB; texto disfrazado de `.jpg`; base64 inválido. Nombres de prueba `PRUEBA`.

### Paso 4 — Lectura y proxy
- [x] 4.1. [reviews.js](../api/src/functions/reviews.js): incluir `imagen: row[5] || null`.
- [x] 4.2. Nuevo `api/src/functions/reviewImage.js`: `app.http`, `route: 'review-image/{name}'`, anónimo, GET.
- [x] 4.3. Validar `name` con regex; leer filas de `Reviews`; verificar coincidencia en columna F y `Status=approved`; si no, 404.
- [x] 4.4. `getFile` y responder con `Content-Type` según extensión y `Cache-Control`.
- [x] 4.5. Pruebas con `curl`: `pending` -> 404; `approved` -> 200 con imagen; `name` con `../` o formato inválido -> 404; filas viejas (5 columnas) siguen funcionando.

### Paso 5 — Frontend ([index.html](../index.html)) — sin validación visual
- [x] 5.1. Markup: `<input type="file" id="review-image" accept="image/jpeg,image/png,image/webp">` con label "Add a photo (optional)", vista previa y botón para quitarla. Estilos acordes a `.review-form input` y paleta existente (dorado/oscuro).
- [x] 5.2. JS: al elegir archivo, cargar en `<img>`, reducir con canvas (lado largo <= 1280 px), exportar JPEG calidad ~0.8 y guardar base64. Si falla la decodificación (p. ej. HEIC en Chrome), mostrar mensaje claro y dejar enviar sin imagen.
- [x] 5.3. Si tras reducir pesa > 2 MB, bajar calidad una vez; si sigue grande, mostrar error.
- [x] 5.4. Enviar `image` en el JSON solo si hay imagen; limpiar vista previa en `form.reset()` y tras éxito.
- [x] 5.5. `loadReviews()`: si `r.imagen`, renderizar `<img src="/api/review-image/${encodeURIComponent(r.imagen)}" loading="lazy" alt="Photo from ${escapeHtml(r.nombre)}">` dentro de la tarjeta. Estilo `.review-card img` (ancho 100%, `object-fit: cover`, altura limitada).
- [x] 5.6. Revisar `API_BASE` para que apunte correcto en producción.
- [x] 5.7. Autorrevisión del código (sintaxis del script, que `escapeHtml` se use en todo dato mostrado, que el payload coincida con lo que espera `review.js`). Reportar a la persona solo "completado".

### Paso 6 — Documentación
- [x] 6.1. Actualizar README.md, CLAUDE.md y AGENTS.md solo donde mencionan columnas de `Reviews`, endpoints y el flujo de aprobación.

### Paso 7 — Cierre
- [x] 7.1. Resumen final y pedir autorización para commit (identidad de AGENTS.md).
- [x] 7.2. Pedir autorización aparte para publicar; desplegar con el comando de README.md, desde el directorio padre.
- [x] 7.3. Prueba real en producción guiada a la persona (comentario `PRUEBA` con foto, aprobar, ver, volver a `pending`, limpiar). Incluye revisión visual en escritorio y móvil.
- [x] 7.4. Llenar la sección "Revisión".

## Riesgos / notas

- Archivos huérfanos en OneDrive si falla `addTableRow` o se rechaza una reseña; limpieza manual.
- HEIC (iPhone) puede no decodificarse en algunos navegadores; iOS Safari normalmente convierte a JPEG al seleccionar.
- El rate limit en memoria no es un tope duro; el límite de 2 MB y la moderación manual acotan el abuso.
- Cold start del proxy + descarga desde Graph añade latencia en la primera carga; mitigado con `Cache-Control`.
- El frontend no se valida visualmente antes de publicar (decisión acordada); la validación visual ocurre en el paso 7 y existe la opción de revertir.

## Revisión (se llena al terminar)

Ejecutado por Angel con Claude el 2026-10-14. Los 8 pasos se completaron con validación en cada uno.

- Publicado en producción (commit `95cc0cb`, deploy verde). Verificado en línea: formulario con campo de foto, `/api/reviews` con campo `imagen`, proxy devolviendo 404 para fotos de reseñas pendientes e inexistentes, y una reseña real de prueba con foto aprobada que se vio bien en el sitio.
- Pruebas por API: 8 casos de subida (sin foto, JPEG, PNG, WebP, >2 MB, texto disfrazado, base64 inválido, tipo no texto) y proxy con reseña pendiente/aprobada/nombres inválidos.
- Antes de modificar el Excel de producción se hizo un respaldo (`quotes-reviews-respaldo-2026-10-14.xlsx`, junto al original). Tras la limpieza, las 10 reseñas originales coinciden con el respaldo (primeras 5 columnas), `Quotes` coincide e `Image` está vacía en las filas anteriores. Las 5 filas y las 4 fotos de prueba se borraron.
- Hallazgos: (1) Excel en línea puede devolver valores anteriores unos segundos tras escribir (afecta pruebas inmediatas, no al uso normal); (2) el CSP bloquea `blob:`, por eso el navegador lee la foto como `data:`; (3) todo push a `main` despliega a producción (CLAUDE.md decía lo contrario; corregido); (4) la documentación decía `Estatus` pero la columna real es `Status` (corregido).
- Pendiente opcional: borrar el archivo de respaldo cuando ya no haga falta.
