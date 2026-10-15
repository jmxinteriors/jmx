const { app } = require('@azure/functions');
const { getTableRows } = require('../graph');

app.http('reviews', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reviews',
  handler: async (request, context) => {
    try {
      const rows = await getTableRows('Reviews');
      const approved = rows
        .filter((row) => String(row[4]).toLowerCase() === 'approved')
        .map((row) => ({
          fecha: row[0],
          nombre: row[1],
          calificacion: row[2],
          comentario: row[3],
          imagen: row[5] || null,
        }));
      return { status: 200, jsonBody: approved };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: 'No se pudieron cargar las reviews' } };
    }
  },
});
