/**
 * One-off setup script: uploads a blank workbook to OneDrive, then builds the
 * Quotes and Reviews sheets/tables entirely through the Graph Workbook API
 * (building tables locally with exceljs and uploading them produced files
 * Excel Online's calc engine rejected as "unsupportedWorkbook").
 * Run once: `node scripts/create-excel-file.js` from the /api folder.
 * Reads credentials from local.settings.json — fill that file in before running.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const fetch = require('node-fetch');

function loadLocalSettings() {
  const settingsPath = path.join(__dirname, '..', 'local.settings.json');
  const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  for (const [key, value] of Object.entries(raw.Values)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

async function getGraphToken() {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
      clientSecret: process.env.CLIENT_SECRET,
    },
  });
  const result = await cca.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });
  return result.accessToken;
}

function workbookBaseUrl() {
  const upn = process.env.EXCEL_DRIVE_USER;
  const filePath = process.env.EXCEL_FILE_PATH;
  return `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive/root:${filePath}:/workbook`;
}

async function uploadBlankWorkbook(token) {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Sheet1');
  const tmpFile = path.join(__dirname, 'blank.xlsx');
  await workbook.xlsx.writeFile(tmpFile);

  const upn = process.env.EXCEL_DRIVE_USER;
  const remotePath = process.env.EXCEL_FILE_PATH;
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive/root:${remotePath}:/content`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
    body: fs.readFileSync(tmpFile),
  });
  fs.unlinkSync(tmpFile);
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function wb(token, method, pathSuffix, body) {
  const url = `${workbookBaseUrl()}${pathSuffix}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Workbook API failed (${method} ${pathSuffix}): ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

async function createSheetWithTable(token, sheetName, columns) {
  console.log(`Creando hoja ${sheetName}...`);
  await wb(token, 'POST', '/worksheets/add', { name: sheetName });

  const lastCol = String.fromCharCode('A'.charCodeAt(0) + columns.length - 1);
  const headerRange = `A1:${lastCol}1`;
  await wb(token, 'PATCH', `/worksheets/${sheetName}/range(address='${headerRange}')`, { values: [columns] });

  const table = await wb(token, 'POST', `/worksheets/${sheetName}/tables/add`, {
    address: `${sheetName}!${headerRange}`,
    hasHeaders: true,
  });
  await wb(token, 'PATCH', `/tables/${table.id}`, { name: sheetName });
}

async function main() {
  loadLocalSettings();

  const required = ['TENANT_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'EXCEL_DRIVE_USER', 'EXCEL_FILE_PATH'];
  const missing = required.filter((k) => !process.env[k] || process.env[k].startsWith('REPLACE_WITH'));
  if (missing.length) {
    console.error(`Faltan valores en local.settings.json: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('Autenticando contra Microsoft Graph...');
  const token = await getGraphToken();

  console.log('Subiendo workbook en blanco...');
  await uploadBlankWorkbook(token);

  await createSheetWithTable(token, 'Quotes', ['Date', 'Name', 'Phone', 'Email', 'Message']);
  await createSheetWithTable(token, 'Reviews', ['Date', 'Name', 'Rating', 'Comment', 'Status']);

  console.log('Eliminando hoja por defecto (Sheet1)...');
  await wb(token, 'DELETE', '/worksheets/Sheet1');

  console.log('Listo. Quotes y Reviews creadas vía Graph API.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
