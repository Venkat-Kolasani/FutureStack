const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   FutureTracker API                        ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                   ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(42, " ")}║
║  CORS Origin: ${(process.env.CORS_ORIGIN || 'http://localhost:3000').substring(0, 42).padEnd(42, " ")}║
╚═══════════════════════════════════════════════════════════╝
  `);
});
