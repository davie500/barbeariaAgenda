import jwt from 'jsonwebtoken';

function autenticar(requisicao, resposta, proximo) {
  const cabecalho = requisicao.headers.authorization || '';
  const [esquema, token] = cabecalho.split(' ');
  if (esquema !== 'Bearer' || !token) return resposta.status(401).json({ erro: 'Envie um token Bearer válido.' });
  try {
    requisicao.usuario = jwt.verify(token, process.env.SEGREDO_JWT);
    return proximo();
  } catch {
    return resposta.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

function permitirPerfis(...perfis) {
  return (requisicao, resposta, proximo) => perfis.includes(requisicao.usuario.perfil)
    ? proximo()
    : resposta.status(403).json({ erro: 'Seu perfil não tem permissão para esta operação.' });
}

export { autenticar, permitirPerfis };
