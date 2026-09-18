# JMX Interiors — Website

Sitio de JMX Interiors Ltd (drywall, basement development y painting en Edmonton, AB). Sitio estático (`index.html`) + API serverless en Azure Functions, desplegado en Azure Static Web Apps.

## Producción

- **URL pública**: https://www.jmxinteriors.ca (el apex `jmxinteriors.ca` redirige a `www` vía forwarding de GoDaddy)
- Hosting: Azure Static Web Apps, Free tier, región Central US.
- Los identificadores del recurso (suscripción, resource group, nombre del Static Web App) no se documentan aquí — consultarlos directo en el portal de Azure o con quien tenga acceso.

## Estructura

```
index.html                 # Sitio completo (hero, servicios, galería, quote form, reviews, footer)
images/                    # Fotos de galería (.webp) + logo
staticwebapp.config.json   # Rutas, headers de seguridad (CSP, etc.) para Azure Static Web Apps
robots.txt, sitemap.xml
api/                       # Azure Functions (Node.js)
  src/functions/
    quote.js               # POST /api/quote   -> agrega fila a tabla Excel "Quotes" + envía correo
    review.js               # POST /api/review  -> agrega fila a tabla Excel "Reviews" (Estatus=pending)
    reviews.js               # GET  /api/reviews -> devuelve reviews con Estatus=approved
  src/graph.js              # Cliente de Microsoft Graph API (client credentials / MSAL)
  src/security.js           # Rate-limit por IP + honeypot anti-spam
  scripts/create-excel-file.js  # Script one-off: crea el workbook con las tablas Quotes/Reviews vía Graph
```

## Backend: Microsoft Graph, no base de datos separada

El formulario de cotización y el de reviews escriben directo a un Excel en OneDrive/SharePoint vía Microsoft Graph API (tablas `Quotes` y `Reviews`), y el de cotización además dispara un correo de notificación vía Graph (`sendMail`). Autenticación: **App Registration en Entra ID** (tenant JMX INTERIORS LTD) con permisos de aplicación (`Files.ReadWrite.All`, `Mail.Send`), flujo client-credentials (sin usuario logueado).

Las reviews nuevas quedan en estatus `pending` y no se muestran en el sitio; para aprobarlas se edita manualmente la columna `Estatus` a `approved` directo en el Excel — no hay panel de administración.

### Variables de entorno (Application Settings en Azure, nunca en el repo)

`TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `EXCEL_DRIVE_USER`, `EXCEL_FILE_PATH`, `MAIL_FROM`, `MAIL_TO`.

Para desarrollo local, estas mismas variables van en `api/local.settings.json` (gitignored, nunca se commitea).

## Deploy

CI/CD vía GitHub Actions ([.github/workflows/azure-static-web-apps.yml](.github/workflows/azure-static-web-apps.yml)): cada push a `main` despliega automáticamente el sitio + API a Azure Static Web Apps. El token de despliegue vive como secret de GitHub (`AZURE_STATIC_WEB_APPS_API_TOKEN`), nunca en el repo.

Deploy manual (fallback, si hace falta forzar un deploy sin pasar por Actions):

```bash
# desde la carpeta padre del proyecto (swa deploy falla si se corre desde dentro del app_location)
SWA_CLI_DEPLOYMENT_TOKEN=$(az staticwebapp secrets list --name <static-web-app-name> --resource-group <resource-group> --query "properties.apiKey" -o tsv) \
  npx --yes @azure/static-web-apps-cli deploy "JMX WEB" --api-location "JMX WEB/api" --env production
```

## Pendientes

- [ ] Rotar `CLIENT_SECRET` (el original quedó expuesto durante el setup en chat) y actualizarlo solo en Application Settings de Azure — nunca en el repo.
- [ ] Probar un envío real del formulario de quote contra `https://www.jmxinteriors.ca` y confirmar que llega la fila al Excel + el correo.
- [ ] Borrar filas de prueba en las tablas `Quotes`/`Reviews` del Excel antes de considerar el sitio en producción "limpia".
- [ ] Decidir y conectar CI/CD (GitHub Actions) si se quiere deploy automático.
- [ ] (Opcional, a futuro) Mover los datos de la galería de `index.html` a un array/JSON para no editar HTML a mano cada vez que se rotan fotos.

## Mejoras ya aplicadas

Menú mobile funcional, honeypot + rate-limit en `/api/quote` y `/api/review`, headers de seguridad (CSP, `X-Content-Type-Options`, `Referrer-Policy`), SEO básico (meta description, Open Graph, favicon, JSON-LD LocalBusiness), labels accesibles en los formularios y `aria-label` en los botones flotantes, imágenes de galería convertidas a `.webp` con `loading="lazy"`, mensaje precargado en el botón de WhatsApp, estado de carga en la sección de reviews.
