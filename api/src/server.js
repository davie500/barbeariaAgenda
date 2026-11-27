import express from 'express';
import cors from 'cors';
import banco from './db.js';
import rotas from './routes.js';

if (!process.env.SEGREDO_JWT || process.env.SEGREDO_JWT.length < 32) {
  throw new Error('Configure SEGREDO_JWT com pelo menos 32 caracteres no arquivo api/.env.');
}

const aplicativo = express();
aplicativo.use(cors());
aplicativo.use(express.json({ limit: '20kb' }));
aplicativo.get('/api/saude', async (_requisicao, resposta) => {
  try {
    await banco.query('SELECT 1');
    return resposta.json({ situacao: 'disponivel', bancoDeDados: 'conectado' });
  } catch {
    return resposta.status(503).json({ situacao: 'indisponivel', bancoDeDados: 'indisponivel' });
  }
});
aplicativo.use('/api', rotas);
aplicativo.use((erro, _requisicao, resposta, _proximo) => {
  console.error(erro);
  return resposta.status(500).json({ erro: 'Erro interno do servidor.' });
});

const porta = Number(process.env.PORTA || 3333);
aplicativo.listen(porta, () => console.log(`API da barbearia disponível na porta ${porta}`));
