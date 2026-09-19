# JMX Interiors — Website & Serverless Backend

Sitio web corporativo y backend serverless para **JMX Interiors Ltd** (especialistas en drywall, desarrollo de sótanos/basements, framing y pintura en Edmonton, AB). 

Alojado y desplegado de forma continua en **Azure Static Web Apps (SWA)** con backend impulsado por **Azure Functions (Node.js v4)** e integrado con **Microsoft Graph API**.

---

## 🌐 Producción

- **Dominio principal**: [https://www.jmxinteriors.ca](https://www.jmxinteriors.ca)
- **Redirección de dominio apex**: `jmxinteriors.ca` redirige automáticamente a `www.jmxinteriors.ca` vía DNS/forwarding en GoDaddy.
- **Infraestructura de Hosting**: Azure Static Web Apps (Free tier, región Central US).
- **CI/CD Automático**: Conectado a GitHub Actions. Cada `push` a la rama `main` ejecuta la build y despliega a producción en Azure en ~1-2 minutos.

---

## 📁 Estructura del Repositorio

```text
├── index.html                 # Frontend principal autónomo (Hero, Servicios, Antes/Después, Galería, Cotizador, Reviews, Contacto)
├── images/                    # Fotografías de proyectos (.webp optimizadas) y logotipo corporativo
├── staticwebapp.config.json   # Configuración de SWA (rutas públicas /api/*, fallback SPA, headers de seguridad CSP)
├── robots.txt, sitemap.xml    # Configuración de indexación y SEO
├── AGENTS.md                  # Contexto y directrices para agentes de IA (Antigravity / Gemini)
├── CLAUDE.md                  # Contexto y directrices para Claude Code
├── README.md                  # Documentación principal del repositorio y operaciones
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml # Pipeline de CI/CD para despliegue automático en Azure
└── api/                       # Backend Serverless en Azure Functions (Node.js v4)
    ├── package.json           # Dependencias (@azure/functions, @azure/msal-node)
    ├── host.json              # Configuración del host de Azure Functions
    ├── src/
    │   ├── functions/
    │   │   ├── quote.js       # POST /api/quote   -> Valida, guarda cotización en Excel OneDrive y envía correo
    │   │   ├── review.js      # POST /api/review  -> Valida y guarda reseña de cliente en Excel (Estatus=pending)
    │   │   └── reviews.js     # GET  /api/reviews -> Retorna las reseñas aprobadas (Estatus=approved)
    │   ├── graph.js           # Cliente Microsoft Graph API (MSAL client-credentials, Excel Workbook & Mail)
    │   └── security.js        # Validación anti-bots (honeypot) y limitador de tasa (rate-limit por IP)
    └── scripts/
        └── create-excel-file.js # Script inicial de bootstrapping para aprovisionar las tablas en OneDrive
```

---

## 🏗️ Arquitectura y Funcionamiento

### 1. Frontend (`index.html`)
- **Zero-Build**: HTML5 y CSS3 nativo puro (estilos contenidos dentro de un bloque `<style>`), sin bundlers ni frameworks pesados para máxima velocidad de carga.
- **Rendimiento y SEO**: Imágenes en formato `.webp` con carga diferida (`loading="lazy"`), metadatos Open Graph, Schema.org `LocalBusiness` en JSON-LD y etiquetas semánticas accesibles.
- **Interacciones**:
  - Menú hamburguesa responsive para móviles vía vanilla JavaScript.
  - Formulario interactivo de cotizaciones y formulario de testimonios con envío asíncrono `fetch()` (POST JSON) y campo trampa anti-spam (*honeypot*).
  - Carga dinámica de reseñas desde la API con estados de carga (`loading spinner`).
  - Botón de WhatsApp flotante con mensaje precargado.

### 2. Backend Serverless (`api/`)
- Utiliza el **modelo de programación v4 de Azure Functions** (`@azure/functions`), donde los endpoints se auto-registran mediante `app.http(...)`.
- **Persistencia en Excel mediante Microsoft Graph**:
  - En lugar de una base de datos SQL o NoSQL tradicional, los datos se almacenan en un libro de Excel en OneDrive/SharePoint (`Quotes` y `Reviews`) mediante la Graph Workbook API (`/workbook/tables/{name}/rows`).
  - Las cotizaciones disparan un correo inmediato de notificación vía `/users/{MAIL_FROM}/sendMail`.
- **Flujo de Moderación de Reseñas**:
  - Las reseñas enviadas por usuarios quedan registradas con `Estatus = "pending"`.
  - Para aprobar una reseña y hacerla visible en el sitio web, el administrador solo debe cambiar el valor de la columna `Estatus` a `approved` directamente en el archivo Excel de OneDrive.

---

## 🔐 Variables de Entorno

Las credenciales de autenticación **nunca se guardan en el repositorio** y están configuradas en los **Application Settings** de Azure Static Web Apps (y localmente en `api/local.settings.json`):

| Variable | Descripción |
| :--- | :--- |
| `TENANT_ID` | Microsoft Entra ID (Tenant ID) de JMX INTERIORS LTD |
| `CLIENT_ID` | Application (Client) ID del App Registration |
| `CLIENT_SECRET` | Secreto de cliente del App Registration |
| `EXCEL_DRIVE_USER` | Correo de la cuenta de OneDrive propietaria del archivo |
| `EXCEL_FILE_PATH` | Ruta del libro Excel en OneDrive (ej. `Documents/JMX_Database.xlsx`) |
| `MAIL_FROM` | Buzón remitente configurado en Microsoft 365 para enviar alertas |
| `MAIL_TO` | Buzón receptor donde llegan las solicitudes de cotización |

---

## 🚀 Ciclo de Despliegue y Publicación

### Despliegue Automático (Recomendado)
El repositorio cuenta con GitHub Actions configurado en [.github/workflows/azure-static-web-apps.yml](.github/workflows/azure-static-web-apps.yml):
1. Se aplican los cambios en el código.
2. Se realiza commit y push a la rama `main`:
   ```bash
   git add .
   git commit -m "feat: descripción de los cambios"
   git push origin main
   ```
3. GitHub Actions toma el commit, valida y despliega en producción en Azure Static Web Apps usando el secreto `AZURE_STATIC_WEB_APPS_API_TOKEN`.

### Despliegue Manual (Fallback CLI)
Si se necesita forzar un despliegue manual sin pasar por GitHub:
```bash
npx --yes @azure/static-web-apps-cli deploy "c:\Users\xcare\Documents\JMX INTERIORS\Antigravity" --api-location "api" --env production
```

---

## 🛠️ Desarrollo Local

1. **Frontend**:
   Abrir `index.html` directamente en el navegador o iniciar un servidor local estático.
2. **Backend**:
   ```bash
   cd api
   npm install
   npm start
   ```
   *Requiere Azure Functions Core Tools v4 y `api/local.settings.json` con las variables de entorno.*

---

## 📋 Registro de Mejoras Implementadas

- [x] Maquetación completa y diseño responsive de alta conversión.
- [x] Integración de API serverless con Microsoft Graph para cotizaciones y reseñas.
- [x] Flujo de moderación directa desde Excel en OneDrive.
- [x] Protección de formularios con honeypot invisible y limitador de peticiones por IP.
- [x] Headers de seguridad HTTP (CSP, X-Content-Type-Options, Referrer-Policy).
- [x] Optimización de activos: galería en WebP con carga diferida.
- [x] Optimización SEO (Open Graph, favicon, robots.txt, sitemap.xml, Schema.org JSON-LD).
- [x] Pipeline de CI/CD automatizado vía GitHub Actions hacia Azure SWA.
- [x] Configuración de directrices para agentes inteligentes ([AGENTS.md](AGENTS.md)).
