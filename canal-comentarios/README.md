# Canal de comunicación (agente de ejecución <-> desarrollo)

Esta carpeta sirve para que el agente de quien ejecuta el plan de imágenes en comentarios (`task/todo.md`) deje dudas o problemas que no puede resolver, y para que desarrollo responda. Un push que solo toca esta carpeta NO publica el sitio (el workflow lo ignora).

## Reglas

1. Una duda o problema = un archivo: `NNN-titulo-corto.md` (001, 002, ...). Nunca editar archivos de otras dudas.
2. NUNCA escribir contraseñas, secretos, valores de `local.settings.json` ni datos personales de clientes. Si un mensaje de error los contiene, taparlos con `***`.
3. Esta carpeta no es pública: el sitio devuelve 404 para `/canal-comentarios/*`. Aun así, aplicar la regla 2.

## Flujo

### Quien ejecuta (agente)
1. Si hay una duda o problema que no puede resolver, DETENERSE (no improvisar) y crear el archivo con la plantilla de abajo, estado `abierta`.
2. Pedir autorización a la persona para guardar y subir ese archivo, y avisarle que debe notificar a desarrollo.
3. Guardar y subir SOLO ese archivo a `main`:
   - `git pull --rebase --autostash`
   - `git add canal-comentarios/NNN-titulo.md`
   - Verificar con `git diff --cached --name-only` que la lista contiene únicamente archivos de `canal-comentarios/`. Si aparece cualquier otro archivo, NO continuar (subir otro archivo a `main` publica el sitio) y avisar a la persona.
   - `git commit -m "canal: NNN titulo"` y `git push`
4. Cuando la persona diga "revisa el canal": `git pull --rebase --autostash`, leer la respuesta, aplicarla, y pedir a la persona que confirme que quedó resuelto. Con su confirmación, cambiar el estado a `resuelta` y subirlo igual que en el punto 3.

### Desarrollo
1. `git pull`, leer el archivo, escribir la respuesta en la sección "Respuesta", cambiar el estado a `respondida`.
2. Commit y push solo de ese archivo (mismo procedimiento).

## Plantilla

```markdown
# NNN — Título corto

- Estado: abierta | respondida | resuelta
- Paso del plan: (número y nombre)
- Fecha:

## Qué se intentaba hacer
(en palabras simples)

## Qué pasó
(describir; copiar el mensaje de error tal cual, tapando secretos con ***)

## Qué se intentó para resolverlo
(lista breve)

## Pregunta
(qué necesitamos que nos aclaren o decidan)

## Respuesta
(la llena desarrollo)
```
