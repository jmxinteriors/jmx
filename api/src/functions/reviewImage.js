const { app } = require('@azure/functions');
const { getTableRows, getComentarioFile } = require('../graph');

const IMAGE_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const CONTENT_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

app.http('reviewImage', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'review-image/{name}',
  handler: async (request, context) => {
    const { name } = request.params;
    if (!IMAGE_NAME_PATTERN.test(name)) {
      return { status: 404 };
    }

    try {
      const rows = await getTableRows('Reviews');
      const isApproved = rows.some(
        (row) => row[5] === name && String(row[4]).toLowerCase() === 'approved'
      );
      if (!isApproved) {
        return { status: 404 };
      }

      const file = await getComentarioFile(name);
      if (!file) {
        return { status: 404 };
      }

      return {
        status: 200,
        headers: {
          'Content-Type': CONTENT_TYPES[name.split('.')[1]],
          'Cache-Control': 'public, max-age=86400',
        },
        body: file,
      };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: 'No se pudo cargar la imagen' } };
    }
  },
});
