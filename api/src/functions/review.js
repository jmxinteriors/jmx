const { app } = require('@azure/functions');
const { addTableRow, sendMail } = require('../graph');
const { isRateLimited, isHoneypotFilled } = require('../security');

app.http('review', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'review',
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

    const { name, rating, comment } = body;
    const ratingNum = Number(rating);
    if (!name || !comment || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return { status: 400, jsonBody: { error: 'Missing or invalid fields' } };
    }

    const fecha = new Date().toISOString();
    try {
      await addTableRow('Reviews', [fecha, name, ratingNum, comment, 'pending']);
      await sendMail({
        to: process.env.MAIL_TO,
        subject: `New review received — ${name} (${ratingNum}/5)`,
        body: `Name: ${name}\nRating: ${ratingNum}/5\n\nComment:\n${comment}\n\nReview it and approve it in the Excel file for it to be published on the site.`,
      });
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: 'Could not save the review' } };
    }

    return { status: 200, jsonBody: { ok: true } };
  },
});
