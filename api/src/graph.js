const { ConfidentialClientApplication } = require('@azure/msal-node');
const fetch = require('node-fetch');

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getGraphToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry) return cachedToken;

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
  cachedToken = result.accessToken;
  cachedTokenExpiry = now + result.expiresIn * 1000 - 60000;
  return cachedToken;
}

function workbookBaseUrl() {
  const upn = process.env.EXCEL_DRIVE_USER;
  const filePath = process.env.EXCEL_FILE_PATH;
  return `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive/root:${filePath}:/workbook`;
}

async function graphFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Graph request failed (${res.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function addTableRow(tableName, rowValues) {
  const token = await getGraphToken();
  const url = `${workbookBaseUrl()}/tables/${tableName}/rows/add`;
  return graphFetch(url, token, {
    method: 'POST',
    body: JSON.stringify({ values: [rowValues] }),
  });
}

async function getTableRows(tableName) {
  const token = await getGraphToken();
  const url = `${workbookBaseUrl()}/tables/${tableName}/rows`;
  const data = await graphFetch(url, token, { method: 'GET' });
  return data.value.map((row) => row.values[0]);
}

async function sendMail({ subject, body, to }) {
  const token = await getGraphToken();
  const from = process.env.MAIL_FROM;
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`;
  await graphFetch(url, token, {
    method: 'POST',
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'Text', content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    }),
  });
}

module.exports = { addTableRow, getTableRows, sendMail };
