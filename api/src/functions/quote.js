const { app } = require('@azure/functions');
const { addTableRow, sendMail } = require('../graph');
const { isRateLimited, isHoneypotFilled } = require('../security');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

app.http('quote', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'quote',
  handler: async (request, context) => {
    if (isRateLimited(request)) {
      return { status: 429, jsonBody: { error: 'Too many requests' } };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } };
    }

    if (isHoneypotFilled(body)) {
      return { status: 200, jsonBody: { ok: true } };
    }

    const { name, phone, email, message } = body;
    if (!name || !phone || !email || !message) {
      return { status: 400, jsonBody: { error: 'Missing required fields' } };
    }
    if (!EMAIL_RE.test(email)) {
      return { status: 400, jsonBody: { error: 'Invalid email format' } };
    }
    if (!PHONE_RE.test(phone)) {
      return { status: 400, jsonBody: { error: 'Invalid phone format' } };
    }

    const fecha = new Date().toISOString();
    try {
      await addTableRow('Quotes', [fecha, name, phone, email, message]);
      await sendMail({
        to: process.env.MAIL_TO,
        subject: `New quote request — ${name}`,
        body: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\n\nMessage:\n${message}`,
      });
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: 'Could not process the request' } };
    }

    return { status: 200, jsonBody: { ok: true } };
  },
});
