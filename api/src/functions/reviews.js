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
        .map(([fecha, nombre, calificacion, comentario]) => ({
          fecha,
          nombre,
          calificacion,
          comentario,
        }));
      return { status: 200, jsonBody: approved };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: 'No se pudieron cargar las reviews' } };
    }
  },
});
