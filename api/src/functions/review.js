const { randomUUID } = require('crypto');
const { app } = require('@azure/functions');
const { addTableRow, uploadComentarioFile, sendMail } = require('../graph');
const { isRateLimited, isHoneypotFilled } = require('../security');

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  return null;
}

function parseImage(image) {
  if (typeof image !== 'string' || image.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4) return null;
  if (!BASE64_PATTERN.test(image)) return null;
  const buffer = Buffer.from(image, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
  const type = detectImageType(buffer);
  return type ? { buffer, ...type } : null;
}

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

    const { name, rating, comment, image } = body;
    const ratingNum = Number(rating);
    if (!name || !comment || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return { status: 400, jsonBody: { error: 'Missing or invalid fields' } };
    }

    let imageData = null;
    if (image !== undefined && image !== null && image !== '') {
      imageData = parseImage(image);
      if (!imageData) {
        return { status: 400, jsonBody: { error: 'Invalid image' } };
      }
    }

    const fecha = new Date().toISOString();
    try {
      let imageFileName = '';
      if (imageData) {
        imageFileName = `${randomUUID()}.${imageData.ext}`;
        await uploadComentarioFile(imageFileName, imageData.buffer, imageData.contentType);
      }
      await addTableRow('Reviews', [fecha, name, ratingNum, comment, 'pending', imageFileName]);
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
