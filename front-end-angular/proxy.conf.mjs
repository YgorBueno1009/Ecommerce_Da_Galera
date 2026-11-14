/**
 * API do Node na porta 3000. Com o dev server Vite (Angular 20+), use `/**` nas
 * rotas — `/catalog` sozinho não encaminha `/catalog/categories`.
 * GET com Accept HTML continua no Angular (vitrine, busca, etc.).
 */
export default {
  '/auth/**': {
    target: 'http://localhost:3000',
    secure: false,
    changeOrigin: true,
    bypass: (req) => {
      if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
        return '/index.html';
      }
      return undefined;
    },
  },
  '/catalog/**': {
    target: 'http://localhost:3000',
    secure: false,
    changeOrigin: true,
    bypass: (req) => {
      if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
        return '/index.html';
      }
      return undefined;
    },
  },
  '/cart/**': {
    target: 'http://localhost:3000',
    secure: false,
    changeOrigin: true,
  },
};
