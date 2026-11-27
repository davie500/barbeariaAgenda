import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import banco from '../db.js';

function emitirToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    process.env.SEGREDO_JWT,
    { expiresIn: process.env.EXPIRACAO_JWT || '8h' },
  );
}

function usuarioPublico(usuario) {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
}

async function cadastrar(requisicao, resposta, proximo) {
  try {
    const { nome, email, senha } = requisicao.body;
    if (!nome?.trim() || !email?.trim() || typeof senha !== 'string' || senha.length < 8) {
      return resposta.status(400).json({ erro: 'Informe nome, e-mail e senha com pelo menos 8 caracteres.' });
    }
    const emailNormalizado = email.trim().toLowerCase();
    const [existentes] = await banco.execute('SELECT id FROM usuarios WHERE email = ?', [emailNormalizado]);
    if (existentes.length) return resposta.status(409).json({ erro: 'Este e-mail já está cadastrado.' });

    const hashSenha = await bcrypt.hash(senha, 12);
    const [resultado] = await banco.execute(
      'INSERT INTO usuarios (nome, email, hash_senha, perfil) VALUES (?, ?, ?, ?)',
      [nome.trim(), emailNormalizado, hashSenha, 'cliente'],
    );
    const usuario = { id: resultado.insertId, nome: nome.trim(), email: emailNormalizado, perfil: 'cliente' };
    return resposta.status(201).json({ usuario, token: emitirToken(usuario) });
  } catch (erro) {
    return proximo(erro);
  }
}

async function entrar(requisicao, resposta, proximo) {
  try {
    const { email, senha } = requisicao.body;
    if (!email || !senha) return resposta.status(400).json({ erro: 'Informe e-mail e senha.' });
    const [usuarios] = await banco.execute(
      'SELECT id, nome, email, hash_senha, perfil FROM usuarios WHERE email = ?',
      [email.trim().toLowerCase()],
    );
    const usuario = usuarios[0];
    if (!usuario || !(await bcrypt.compare(senha, usuario.hash_senha))) {
      return resposta.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }
    return resposta.json({ usuario: usuarioPublico(usuario), token: emitirToken(usuario) });
  } catch (erro) {
    return proximo(erro);
  }
}

async function minhaConta(requisicao, resposta, proximo) {
  try {
    const [usuarios] = await banco.execute(
      'SELECT id, nome, email, perfil FROM usuarios WHERE id = ?',
      [requisicao.usuario.sub],
    );
    if (!usuarios[0]) return resposta.status(401).json({ erro: 'Usuário não encontrado.' });
    return resposta.json({ usuario: usuarioPublico(usuarios[0]) });
  } catch (erro) {
    return proximo(erro);
  }
}

function sair(_requisicao, resposta) {
  // O cliente apaga o JWT; por ser stateless, o token também tem prazo de expiração.
  return resposta.json({ mensagem: 'Sessão encerrada no cliente.' });
}

export default { cadastrar, entrar, minhaConta, sair };
