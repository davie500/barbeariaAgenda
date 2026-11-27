import express from 'express';
import { autenticar, permitirPerfis } from './middleware/auth.js';
import autenticacao from './controllers/authController.js';
import servicos from './controllers/servicesController.js';
import agendamentos from './controllers/appointmentsController.js';
import administracao from './controllers/adminController.js';

const roteador = express.Router();

roteador.post('/autenticacao/cadastrar', autenticacao.cadastrar);
roteador.post('/autenticacao/entrar', autenticacao.entrar);
roteador.get('/autenticacao/minha-conta', autenticar, autenticacao.minhaConta);
roteador.post('/autenticacao/sair', autenticar, autenticacao.sair);

roteador.get('/servicos', servicos.listar);
roteador.get('/clientes', autenticar, permitirPerfis('administrador'), administracao.listarClientes);
roteador.get('/usuarios', autenticar, permitirPerfis('administrador'), administracao.listarUsuarios);
roteador.get('/admin/servicos', autenticar, permitirPerfis('administrador'), administracao.listarServicos);
roteador.post('/admin/servicos', autenticar, permitirPerfis('administrador'), administracao.criarServico);
roteador.put('/admin/servicos/:id', autenticar, permitirPerfis('administrador'), administracao.atualizarServico);
roteador.delete('/admin/servicos/:id', autenticar, permitirPerfis('administrador'), administracao.removerServico);

roteador.get('/agendamentos', autenticar, agendamentos.listar);
roteador.post('/agendamentos', autenticar, agendamentos.criar);
roteador.put('/agendamentos/:id', autenticar, agendamentos.atualizar);
roteador.patch('/agendamentos/:id', autenticar, permitirPerfis('administrador'), agendamentos.atualizarSituacao);
roteador.delete('/agendamentos/:id', autenticar, agendamentos.remover);

export default roteador;
