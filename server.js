// Permite iniciar a API com `node server.js` na raiz do projeto.
import('./api/src/server.js').catch((erro) => {
  console.error('Não foi possível iniciar a API:', erro);
  process.exitCode = 1;
});
