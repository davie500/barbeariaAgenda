import banco from '../db.js';

async function consultarAgendamentos(requisicao) {
  const consulta = `SELECT a.id, a.usuario_id, a.servico_id, a.data_horario, a.situacao, a.observacoes,
    s.nome AS nome_servico, s.duracao_minutos, s.preco, u.nome AS nome_cliente
    FROM agendamentos a JOIN servicos s ON s.id = a.servico_id JOIN usuarios u ON u.id = a.usuario_id
    ${requisicao.usuario.perfil === 'administrador' ? '' : 'WHERE a.usuario_id = ?'} ORDER BY a.data_horario DESC`;
  const [agendamentos] = requisicao.usuario.perfil === 'administrador'
    ? await banco.execute(consulta)
    : await banco.execute(consulta, [requisicao.usuario.sub]);
  return agendamentos;
}

async function listar(requisicao, resposta, proximo) {
  try {
    return resposta.json({ agendamentos: await consultarAgendamentos(requisicao) });
  } catch (erro) {
    return proximo(erro);
  }
}

async function criar(requisicao, resposta, proximo) {
  try {
    const { servicoId, dataHorario, observacoes, clienteId } = requisicao.body;
    const data = new Date(dataHorario);
    if (!Number.isInteger(Number(servicoId)) || !dataHorario || Number.isNaN(data.getTime()) || data <= new Date()) {
      return resposta.status(400).json({ erro: 'Escolha um serviço e uma data futura válida.' });
    }
    const [servicos] = await banco.execute(
      'SELECT id, duracao_minutos FROM servicos WHERE id = ? AND ativo = 1', [servicoId],
    );
    if (!servicos[0]) return resposta.status(404).json({ erro: 'Serviço não encontrado.' });

    const [conflitos] = await banco.execute(`SELECT a.id FROM agendamentos a JOIN servicos s ON s.id = a.servico_id
      WHERE a.situacao = 'confirmado' AND a.data_horario < DATE_ADD(?, INTERVAL ? MINUTE)
      AND DATE_ADD(a.data_horario, INTERVAL s.duracao_minutos MINUTE) > ?`,
    [data, servicos[0].duracao_minutos, data]);
    if (conflitos.length) return resposta.status(409).json({ erro: 'Este horário já está ocupado. Escolha outro.' });

    const usuarioId = requisicao.usuario.perfil === 'administrador' ? clienteId : requisicao.usuario.sub;
    if (requisicao.usuario.perfil === 'administrador') {
      if (!Number.isInteger(Number(clienteId))) return resposta.status(400).json({ erro: 'Selecione um cliente para o agendamento.' });
      const [clientes] = await banco.execute("SELECT id FROM usuarios WHERE id = ? AND perfil = 'cliente'", [clienteId]);
      if (!clientes[0]) return resposta.status(404).json({ erro: 'Cliente não encontrado.' });
    }
    const [resultado] = await banco.execute(
      'INSERT INTO agendamentos (usuario_id, servico_id, data_horario, observacoes) VALUES (?, ?, ?, ?)',
      [usuarioId, servicoId, data, observacoes?.trim() || null],
    );
    return resposta.status(201).json({ id: resultado.insertId, mensagem: 'Agendamento criado.' });
  } catch (erro) {
    return proximo(erro);
  }
}

async function atualizar(requisicao, resposta, proximo) {
  try {
    const { servicoId, dataHorario, observacoes, clienteId } = requisicao.body;
    const [linhas] = await banco.execute('SELECT * FROM agendamentos WHERE id = ?', [requisicao.params.id]);
    const agendamento = linhas[0];
    if (!agendamento) return resposta.status(404).json({ erro: 'Agendamento não encontrado.' });
    if (requisicao.usuario.perfil !== 'administrador' && agendamento.usuario_id !== Number(requisicao.usuario.sub)) {
      return resposta.status(403).json({ erro: 'Você só pode alterar seus próprios agendamentos.' });
    }
    if (agendamento.situacao !== 'confirmado') {
      return resposta.status(409).json({ erro: 'Somente agendamentos confirmados podem ser alterados.' });
    }

    let usuarioId = agendamento.usuario_id;
    if (requisicao.usuario.perfil === 'administrador' && clienteId !== undefined) {
      if (!Number.isInteger(Number(clienteId))) return resposta.status(400).json({ erro: 'Selecione um cliente válido.' });
      const [clientes] = await banco.execute("SELECT id FROM usuarios WHERE id = ? AND perfil = 'cliente'", [clienteId]);
      if (!clientes[0]) return resposta.status(404).json({ erro: 'Cliente não encontrado.' });
      usuarioId = clienteId;
    }

    const novoServicoId = servicoId ?? agendamento.servico_id;
    const novaData = dataHorario ? new Date(dataHorario) : new Date(agendamento.data_horario);
    if (Number.isNaN(novaData.getTime()) || novaData <= new Date()) {
      return resposta.status(400).json({ erro: 'Escolha uma data futura válida.' });
    }
    const [servicos] = await banco.execute(
      'SELECT id, duracao_minutos FROM servicos WHERE id = ? AND ativo = 1', [novoServicoId],
    );
    if (!servicos[0]) return resposta.status(404).json({ erro: 'Serviço não encontrado.' });

    const [conflitos] = await banco.execute(`SELECT a.id FROM agendamentos a JOIN servicos s ON s.id = a.servico_id
      WHERE a.situacao = 'confirmado' AND a.id <> ? AND a.data_horario < DATE_ADD(?, INTERVAL ? MINUTE)
      AND DATE_ADD(a.data_horario, INTERVAL s.duracao_minutos MINUTE) > ?`,
    [agendamento.id, novaData, servicos[0].duracao_minutos, novaData]);
    if (conflitos.length) return resposta.status(409).json({ erro: 'Este horário já está ocupado. Escolha outro.' });

    await banco.execute(
      'UPDATE agendamentos SET usuario_id = ?, servico_id = ?, data_horario = ?, observacoes = ? WHERE id = ?',
      [usuarioId, novoServicoId, novaData, observacoes?.trim() ?? agendamento.observacoes, agendamento.id],
    );
    return resposta.json({ mensagem: 'Agendamento atualizado.' });
  } catch (erro) {
    return proximo(erro);
  }
}

async function atualizarSituacao(requisicao, resposta, proximo) {
  try {
    const { situacao } = requisicao.body;
    if (!['confirmado', 'concluido', 'cancelado'].includes(situacao)) {
      return resposta.status(400).json({ erro: 'Situação inválida.' });
    }
    const [resultado] = await banco.execute(
      'UPDATE agendamentos SET situacao = ? WHERE id = ?', [situacao, requisicao.params.id],
    );
    if (!resultado.affectedRows) return resposta.status(404).json({ erro: 'Agendamento não encontrado.' });
    return resposta.json({ mensagem: 'Situação atualizada.' });
  } catch (erro) {
    return proximo(erro);
  }
}

async function remover(requisicao, resposta, proximo) {
  try {
    const [linhas] = await banco.execute(
      'SELECT usuario_id, situacao FROM agendamentos WHERE id = ?', [requisicao.params.id],
    );
    const agendamento = linhas[0];
    if (!agendamento) return resposta.status(404).json({ erro: 'Agendamento não encontrado.' });
    if (requisicao.usuario.perfil !== 'administrador' && agendamento.usuario_id !== Number(requisicao.usuario.sub)) {
      return resposta.status(403).json({ erro: 'Você só pode cancelar seus próprios agendamentos.' });
    }
    if (requisicao.usuario.perfil !== 'administrador' && agendamento.situacao !== 'confirmado') {
      return resposta.status(409).json({ erro: 'Este agendamento não pode mais ser cancelado.' });
    }

    if (requisicao.usuario.perfil === 'administrador') {
      await banco.execute('DELETE FROM agendamentos WHERE id = ?', [requisicao.params.id]);
    } else {
      await banco.execute("UPDATE agendamentos SET situacao = 'cancelado' WHERE id = ?", [requisicao.params.id]);
    }
    return resposta.json({ mensagem: requisicao.usuario.perfil === 'administrador' ? 'Agendamento removido.' : 'Agendamento cancelado.' });
  } catch (erro) {
    return proximo(erro);
  }
}

export default { listar, criar, atualizar, atualizarSituacao, remover };
