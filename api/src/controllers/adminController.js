import banco from '../db.js';

async function consultarUsuarios(perfil) {
  const filtro = perfil ? 'WHERE u.perfil = ?' : '';
  const parametros = perfil ? [perfil] : [];
  const [usuarios] = await banco.execute(`
    SELECT u.id, u.nome, u.email, u.perfil,
      COUNT(a.id) AS total_agendamentos,
      COALESCE(SUM(a.situacao = 'confirmado'), 0) AS agendamentos_confirmados,
      COALESCE(SUM(a.situacao = 'concluido'), 0) AS agendamentos_concluidos,
      COALESCE(SUM(a.situacao = 'cancelado'), 0) AS agendamentos_cancelados,
      MAX(a.data_horario) AS ultimo_agendamento,
      MIN(CASE WHEN a.situacao = 'confirmado' AND a.data_horario >= NOW() THEN a.data_horario END) AS proximo_agendamento
    FROM usuarios u LEFT JOIN agendamentos a ON a.usuario_id = u.id
    ${filtro} GROUP BY u.id ORDER BY u.nome`, parametros);
  return usuarios;
}

async function listarClientes(_requisicao, resposta, proximo) {
  try {
    return resposta.json({ clientes: await consultarUsuarios('cliente') });
  } catch (erro) {
    return proximo(erro);
  }
}

async function listarUsuarios(_requisicao, resposta, proximo) {
  try {
    return resposta.json({ usuarios: await consultarUsuarios(null) });
  } catch (erro) {
    return proximo(erro);
  }
}

function validarServico(corpo) {
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
  const duracaoMinutos = Number(corpo.duracaoMinutos);
  const preco = Number(corpo.preco);
  if (!nome || nome.length > 100 || !Number.isInteger(duracaoMinutos) || duracaoMinutos < 1 || duracaoMinutos > 600
    || !Number.isFinite(preco) || preco < 0 || preco > 99999999) return null;
  return { nome, descricao: typeof corpo.descricao === 'string' ? corpo.descricao.trim() || null : null, duracaoMinutos, preco };
}

async function listarServicos(_requisicao, resposta, proximo) {
  try {
    const [servicos] = await banco.execute(
      'SELECT id, nome, descricao, duracao_minutos, preco, ativo FROM servicos ORDER BY ativo DESC, nome',
    );
    return resposta.json({ servicos });
  } catch (erro) {
    return proximo(erro);
  }
}

async function criarServico(requisicao, resposta, proximo) {
  try {
    const servico = validarServico(requisicao.body || {});
    if (!servico) return resposta.status(400).json({ erro: 'Informe nome, duração entre 1 e 600 minutos e preço igual ou maior que zero.' });
    const [resultado] = await banco.execute(
      'INSERT INTO servicos (nome, descricao, duracao_minutos, preco) VALUES (?, ?, ?, ?)',
      [servico.nome, servico.descricao, servico.duracaoMinutos, servico.preco],
    );
    return resposta.status(201).json({ id: resultado.insertId, mensagem: 'Serviço criado.' });
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') return resposta.status(409).json({ erro: 'Já existe um serviço com esse nome.' });
    return proximo(erro);
  }
}

async function atualizarServico(requisicao, resposta, proximo) {
  try {
    const corpo = requisicao.body || {};
    const servico = validarServico(corpo);
    if (!servico) return resposta.status(400).json({ erro: 'Informe nome, duração entre 1 e 600 minutos e preço igual ou maior que zero.' });
    if (corpo.ativo !== undefined && typeof corpo.ativo !== 'boolean') {
      return resposta.status(400).json({ erro: 'O campo ativo precisa ser verdadeiro ou falso.' });
    }
    const ativo = corpo.ativo === undefined ? true : corpo.ativo;
    const [resultado] = await banco.execute(
      'UPDATE servicos SET nome = ?, descricao = ?, duracao_minutos = ?, preco = ?, ativo = ? WHERE id = ?',
      [servico.nome, servico.descricao, servico.duracaoMinutos, servico.preco, ativo, requisicao.params.id],
    );
    if (!resultado.affectedRows) {
      const [existentes] = await banco.execute('SELECT id FROM servicos WHERE id = ?', [requisicao.params.id]);
      if (!existentes.length) return resposta.status(404).json({ erro: 'Serviço não encontrado.' });
    }
    return resposta.json({ mensagem: 'Serviço atualizado.' });
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') return resposta.status(409).json({ erro: 'Já existe um serviço com esse nome.' });
    return proximo(erro);
  }
}

async function removerServico(requisicao, resposta, proximo) {
  try {
    const [resultado] = await banco.execute('UPDATE servicos SET ativo = 0 WHERE id = ?', [requisicao.params.id]);
    if (!resultado.affectedRows) {
      const [existentes] = await banco.execute('SELECT id FROM servicos WHERE id = ?', [requisicao.params.id]);
      if (!existentes.length) return resposta.status(404).json({ erro: 'Serviço não encontrado.' });
    }
    return resposta.json({ mensagem: 'Serviço desativado.' });
  } catch (erro) {
    return proximo(erro);
  }
}

export default { listarClientes, listarUsuarios, listarServicos, criarServico, atualizarServico, removerServico };
