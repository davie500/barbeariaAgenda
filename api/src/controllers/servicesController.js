import banco from '../db.js';

async function listar(_requisicao, resposta, proximo) {
  try {
    const [servicos] = await banco.execute(
      'SELECT id, nome, descricao, duracao_minutos, preco FROM servicos WHERE ativo = 1 ORDER BY nome',
    );
    return resposta.json({ servicos });
  } catch (erro) {
    return proximo(erro);
  }
}

export default { listar };
