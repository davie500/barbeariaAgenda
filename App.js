import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';

const ENDERECO_API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333/api';
const ContextoAutenticacao = createContext(null);
const PilhaNavegacao = createNativeStackNavigator();
const cores = { texto: '#18231f', textoSuave: '#64736b', fundo: '#f5f6f2', verde: '#1f6b50', fundoClaro: '#e4efe8', branco: '#fff', linha: '#dce3dd', vermelho: '#a13d36' };

async function salvarToken(token) { if (Platform.OS === 'web') localStorage.setItem('token-barbearia', token); else await SecureStore.setItemAsync('token-barbearia', token); }
async function obterToken() { return Platform.OS === 'web' ? localStorage.getItem('token-barbearia') : SecureStore.getItemAsync('token-barbearia'); }
async function apagarToken() { if (Platform.OS === 'web') localStorage.removeItem('token-barbearia'); else await SecureStore.deleteItemAsync('token-barbearia'); }

function ProvedorAutenticacao({ children }) {
  const [sessao, definirSessao] = useState(null);
  const [carregando, definirCarregando] = useState(true);
  useEffect(() => { (async () => { try { const token = await obterToken(); if (token) { const resposta = await fetch(`${ENDERECO_API}/autenticacao/minha-conta`, { headers: { Authorization: `Bearer ${token}` } }); if (resposta.ok) definirSessao({ ...(await resposta.json()).usuario, token }); else await apagarToken(); } } catch {} finally { definirCarregando(false); } })(); }, []);
  const requisitar = async (caminho, opcoes = {}) => {
    const token = sessao?.token || await obterToken();
    const resposta = await fetch(`${ENDERECO_API}${caminho}`, { ...opcoes, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opcoes.headers } });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir a solicitação.');
    return dados;
  };
  const entrar = async (email, senha) => { const dados = await requisitar('/autenticacao/entrar', { method: 'POST', body: JSON.stringify({ email, senha }) }); await salvarToken(dados.token); definirSessao({ ...dados.usuario, token: dados.token }); };
  const cadastrar = async (nome, email, senha) => { const dados = await requisitar('/autenticacao/cadastrar', { method: 'POST', body: JSON.stringify({ nome, email, senha }) }); await salvarToken(dados.token); definirSessao({ ...dados.usuario, token: dados.token }); };
  const sair = async () => { try { await requisitar('/autenticacao/sair', { method: 'POST' }); } catch {} await apagarToken(); definirSessao(null); };
  return <ContextoAutenticacao.Provider value={{ sessao, carregando, requisitar, entrar, cadastrar, sair }}>{children}</ContextoAutenticacao.Provider>;
}
const usarAutenticacao = () => useContext(ContextoAutenticacao);

function Botao({ titulo, aoPressionar, secundario = false, desabilitado = false }) { return <Pressable disabled={desabilitado} onPress={aoPressionar} style={[estilos.botao, secundario && estilos.botaoSecundario, desabilitado && { opacity: .5 }]}><Text style={[estilos.textoBotao, secundario && estilos.textoBotaoSecundario]}>{titulo}</Text></Pressable>; }
function Campo({ rotulo, valor, aoAlterarTexto, exemplo, textoSeguro, tipoTeclado }) { return <View style={estilos.campo}><Text style={estilos.rotulo}>{rotulo}</Text><TextInput value={valor} onChangeText={aoAlterarTexto} placeholder={exemplo} placeholderTextColor="#89958e" secureTextEntry={textoSeguro} keyboardType={tipoTeclado} autoCapitalize={tipoTeclado === 'email-address' ? 'none' : 'sentences'} style={estilos.entrada} /></View>; }
function Tela({ children }) { return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.tela}>{children}</ScrollView>; }
function Marca({ chamada = 'BARBEARIA DE BAIRRO', titulo, descricao }) { return <View style={estilos.marca}><Text style={estilos.chamada}>{chamada}</Text><Text style={estilos.titulo}>{titulo}</Text>{descricao ? <Text style={estilos.descricao}>{descricao}</Text> : null}</View>; }

function TelaInicial({ navigation }) { return <Tela><Marca titulo="Seu próximo corte começa aqui." descricao="Agende um horário sem precisar ligar. Escolha o serviço e acompanhe tudo pelo celular."/><View style={estilos.destaque}><Text style={estilos.iconeDestaque}>✂</Text><Text style={estilos.tituloDestaque}>Cuidado no seu tempo</Text><Text style={estilos.texto}>Horários organizados para você e para quem cuida do seu estilo.</Text></View><Botao titulo="Entrar na minha conta" aoPressionar={() => navigation.navigate('Entrar')} /><Botao titulo="Criar conta" secundario aoPressionar={() => navigation.navigate('Cadastro')} /><View style={estilos.nota}><Text style={estilos.textoNota}>Uma experiência simples para reservar serviços da barbearia.</Text></View></Tela>; }
function TelaEntrar({ navigation }) { const { entrar } = usarAutenticacao(); const [email, definirEmail] = useState(''); const [senha, definirSenha] = useState(''); const [ocupado, definirOcupado] = useState(false); const enviar = async () => { definirOcupado(true); try { await entrar(email.trim(), senha); } catch (erro) { Alert.alert('Não foi possível entrar', erro.message); } finally { definirOcupado(false); } }; return <Tela><Marca chamada="BEM-VINDO DE VOLTA" titulo="Entrar" descricao="Use seu e-mail e senha para ver seus horários."/><Campo rotulo="E-mail" valor={email} aoAlterarTexto={definirEmail} exemplo="voce@email.com" tipoTeclado="email-address"/><Campo rotulo="Senha" valor={senha} aoAlterarTexto={definirSenha} exemplo="Sua senha" textoSeguro/><Botao titulo={ocupado ? 'Entrando…' : 'Entrar'} desabilitado={ocupado} aoPressionar={enviar}/><Botao titulo="Ainda não tenho conta" secundario aoPressionar={() => navigation.navigate('Cadastro')}/></Tela>; }
function TelaCadastro({ navigation }) { const { cadastrar } = usarAutenticacao(); const [nome, definirNome] = useState(''); const [email, definirEmail] = useState(''); const [senha, definirSenha] = useState(''); const [ocupado, definirOcupado] = useState(false); const enviar = async () => { definirOcupado(true); try { await cadastrar(nome.trim(), email.trim(), senha); } catch (erro) { Alert.alert('Não foi possível criar a conta', erro.message); } finally { definirOcupado(false); } }; return <Tela><Marca chamada="NOVO POR AQUI?" titulo="Criar conta" descricao="Leva só um instante para começar a agendar."/><Campo rotulo="Nome" valor={nome} aoAlterarTexto={definirNome} exemplo="Como podemos chamar você?"/><Campo rotulo="E-mail" valor={email} aoAlterarTexto={definirEmail} exemplo="voce@email.com" tipoTeclado="email-address"/><Campo rotulo="Senha" valor={senha} aoAlterarTexto={definirSenha} exemplo="Pelo menos 8 caracteres" textoSeguro/><Botao titulo={ocupado ? 'Criando…' : 'Criar minha conta'} desabilitado={ocupado} aoPressionar={enviar}/><Botao titulo="Já tenho conta" secundario aoPressionar={() => navigation.navigate('Entrar')}/></Tela>; }

function PainelAdministrador({ sessao, clientes, servicos, agendamentos, requisitar, atualizarLista, sair, carregando }) {
  const [modalVisivel, definirModalVisivel] = useState(false);
  const [edicao, definirEdicao] = useState(null);
  const [clienteId, definirClienteId] = useState(null);
  const [servicoId, definirServicoId] = useState(null);
  const [data, definirData] = useState('');
  const [horario, definirHorario] = useState('');
  const [busca, definirBusca] = useState('');
  const [buscaUsuarios, definirBuscaUsuarios] = useState('');
  const [filtro, definirFiltro] = useState('todos');
  const [aba, definirAba] = useState('agenda');
  const [usuarios, definirUsuarios] = useState([]);
  const [servicosAdmin, definirServicosAdmin] = useState([]);
  const [carregandoCadastros, definirCarregandoCadastros] = useState(false);
  const [servicoModal, definirServicoModal] = useState(false);
  const [servicoEdicao, definirServicoEdicao] = useState(null);
  const [servicoNome, definirServicoNome] = useState('');
  const [servicoDescricao, definirServicoDescricao] = useState('');
  const [servicoDuracao, definirServicoDuracao] = useState('');
  const [servicoPreco, definirServicoPreco] = useState('');
  const [servicoSalvando, definirServicoSalvando] = useState(false);
  const [servicoExcluirPendente, definirServicoExcluirPendente] = useState(null);
  const [agendamentoClienteId, definirAgendamentoClienteId] = useState(null);
  const [salvando, definirSalvando] = useState(false);
  const [exclusaoPendente, definirExclusaoPendente] = useState(null);

  const carregarCadastros = async () => {
    definirCarregandoCadastros(true);
    try {
      const [respostaUsuarios, respostaServicos] = await Promise.all([requisitar('/usuarios'), requisitar('/admin/servicos')]);
      definirUsuarios(respostaUsuarios.usuarios); definirServicosAdmin(respostaServicos.servicos);
    } catch (erro) { Alert.alert('Não foi possível carregar usuários e serviços', erro.message); }
    finally { definirCarregandoCadastros(false); }
  };
  useEffect(() => { carregarCadastros(); }, []);

  const abrirNovo = () => { definirEdicao(null); definirClienteId(agendamentoClienteId); definirServicoId(null); definirData(''); definirHorario(''); definirModalVisivel(true); };
  const abrirEdicao = agendamento => {
    const [dia, hora] = String(agendamento.data_horario).replace('T', ' ').split(' ');
    definirEdicao(agendamento); definirClienteId(String(agendamento.usuario_id)); definirServicoId(String(agendamento.servico_id));
    definirData(dia); definirHorario(hora.slice(0, 5)); definirModalVisivel(true);
  };
  const salvar = async () => {
    const [ano, mes, dia] = data.split('-').map(Number);
    const [hora, minuto] = horario.split(':').map(Number);
    const dataInformada = new Date(ano, mes - 1, dia, hora, minuto);
    const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data) && dataInformada.getFullYear() === ano
      && dataInformada.getMonth() === mes - 1 && dataInformada.getDate() === dia;
    const horarioValido = /^\d{2}:\d{2}$/.test(horario) && hora < 24 && minuto < 60;
    if (!clienteId || !servicoId || !dataValida || !horarioValido || dataInformada <= new Date()) {
      Alert.alert('Confira os campos', 'Selecione cliente e serviço e informe data AAAA-MM-DD e horário HH:MM.'); return;
    }
    setSalvando(true);
    try {
      const caminho = edicao ? `/agendamentos/${edicao.id}` : '/agendamentos';
      await requisitar(caminho, { method: edicao ? 'PUT' : 'POST', body: JSON.stringify({ clienteId, servicoId, dataHorario: `${data} ${horario}:00` }) });
      definirAgendamentoClienteId(String(clienteId)); definirModalVisivel(false); await atualizarLista();
    } catch (erro) { Alert.alert('Não foi possível salvar', erro.message); }
    finally { setSalvando(false); }
  };
  const atualizarSituacao = async (agendamento, situacao) => {
    try { await requisitar(`/agendamentos/${agendamento.id}`, { method: 'PATCH', body: JSON.stringify({ situacao }) }); await atualizarLista(); }
    catch (erro) { Alert.alert('Não foi possível atualizar', erro.message); }
  };
  const excluir = async id => {
    try { await requisitar(`/agendamentos/${id}`, { method: 'DELETE' }); definirExclusaoPendente(null); await atualizarLista(); }
    catch (erro) { Alert.alert('Não foi possível excluir', erro.message); }
  };
  const abrirServicoNovo = () => { definirServicoEdicao(null); definirServicoNome(''); definirServicoDescricao(''); definirServicoDuracao(''); definirServicoPreco(''); definirServicoModal(true); };
  const abrirServicoEdicao = servico => { definirServicoEdicao(servico); definirServicoNome(servico.nome); definirServicoDescricao(servico.descricao || ''); definirServicoDuracao(String(servico.duracao_minutos)); definirServicoPreco(String(servico.preco)); definirServicoModal(true); };
  const salvarServico = async () => {
    const duracaoMinutos = Number(servicoDuracao);
    const preco = Number(servicoPreco.replace(',', '.'));
    if (!servicoNome.trim() || !Number.isInteger(duracaoMinutos) || duracaoMinutos < 1 || duracaoMinutos > 600 || !Number.isFinite(preco) || preco < 0) {
      Alert.alert('Confira os dados', 'Informe nome, duração entre 1 e 600 minutos e preço igual ou maior que zero.'); return;
    }
    definirServicoSalvando(true);
    try {
      const corpo = { nome: servicoNome.trim(), descricao: servicoDescricao.trim(), duracaoMinutos, preco, ativo: servicoEdicao ? Boolean(servicoEdicao.ativo) : true };
      await requisitar(servicoEdicao ? `/admin/servicos/${servicoEdicao.id}` : '/admin/servicos', { method: servicoEdicao ? 'PUT' : 'POST', body: JSON.stringify(corpo) });
      definirServicoModal(false); await Promise.all([carregarCadastros(), atualizarLista()]);
    } catch (erro) { Alert.alert('Não foi possível salvar o serviço', erro.message); }
    finally { definirServicoSalvando(false); }
  };
  const alternarServico = async servico => {
    try {
      if (servico.ativo) {
        await requisitar(`/admin/servicos/${servico.id}`, { method: 'DELETE' }); definirServicoExcluirPendente(null);
      } else {
        await requisitar(`/admin/servicos/${servico.id}`, { method: 'PUT', body: JSON.stringify({ nome: servico.nome, descricao: servico.descricao, duracaoMinutos: servico.duracao_minutos, preco: Number(servico.preco), ativo: true }) });
      }
      await Promise.all([carregarCadastros(), atualizarLista()]);
    } catch (erro) { Alert.alert('Não foi possível atualizar o serviço', erro.message); }
  };
  const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const termo = normalizar(busca.trim());
  const lista = agendamentos.filter(item => (filtro === 'todos' || item.situacao === filtro)
    && (!agendamentoClienteId || String(item.usuario_id) === String(agendamentoClienteId))
    && (!termo || normalizar(`${item.nome_cliente} ${item.nome_servico} ${item.data_horario}`).includes(termo)));
  const contagem = situacao => agendamentos.filter(item => situacao === 'todos' || item.situacao === situacao).length;
  const dataBonita = valor => new Date(String(valor).replace(' ', 'T')).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
  const etiqueta = { confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };

  return <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
    <View style={estilos.linhaSuperior}><View><Text style={estilos.chamada}>ADMINISTRAÇÃO</Text><Text style={estilos.tituloMenor}>Olá, {sessao?.nome?.split(' ')[0]}.</Text></View><Pressable onPress={sair}><Text style={estilos.link}>Sair</Text></Pressable></View>
    <View style={estilosAdmin.resumo}><View style={estilosAdmin.resumoItem}><Text style={estilosAdmin.numero}>{contagem('todos')}</Text><Text style={estilosAdmin.rotuloResumo}>Agendamentos</Text></View><View style={estilosAdmin.resumoItem}><Text style={estilosAdmin.numero}>{contagem('confirmado')}</Text><Text style={estilosAdmin.rotuloResumo}>Pendentes</Text></View><View style={estilosAdmin.resumoItem}><Text style={estilosAdmin.numero}>{contagem('concluido')}</Text><Text style={estilosAdmin.rotuloResumo}>Concluídos</Text></View></View>
    <View style={estilosAdmin.abas}>{[['agenda', 'Agenda'], ['usuarios', 'Usuários'], ['servicos', 'Serviços']].map(([valor, rotulo]) => <Pressable key={valor} onPress={() => definirAba(valor)} style={[estilosAdmin.aba, aba === valor && estilosAdmin.abaAtiva]}><Text style={[estilosAdmin.textoAba, aba === valor && estilosAdmin.textoAbaAtivo]}>{rotulo}</Text></Pressable>)}</View>
    {aba === 'agenda' && <>
    <Botao titulo="+ Novo agendamento" aoPressionar={abrirNovo}/>
    <View style={estilosAdmin.cabecalho}><Text style={estilos.tituloSecao}>Agenda</Text><Pressable onPress={atualizarLista}><Text style={estilos.link}>Atualizar</Text></Pressable></View>
    {agendamentoClienteId && <Pressable onPress={() => definirAgendamentoClienteId(null)} style={estilosAdmin.filtroCliente}><Text style={estilos.texto}>Cliente: {usuarios.find(usuario => String(usuario.id) === String(agendamentoClienteId))?.nome || 'selecionado'}</Text><Text style={estilos.link}>Limpar filtro</Text></Pressable>}
    <TextInput value={busca} onChangeText={definirBusca} placeholder="Buscar cliente, serviço ou data" placeholderTextColor="#89958e" style={estilos.entrada}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilosAdmin.filtros}>{[['todos', 'Todos'], ['confirmado', 'Confirmados'], ['concluido', 'Concluídos'], ['cancelado', 'Cancelados']].map(([valor, rotulo]) => <Pressable key={valor} onPress={() => definirFiltro(valor)} style={[estilosAdmin.filtro, filtro === valor && estilosAdmin.filtroAtivo]}><Text style={[estilosAdmin.textoFiltro, filtro === valor && estilosAdmin.textoFiltroAtivo]}>{rotulo} · {contagem(valor)}</Text></Pressable>)}</ScrollView>
    {carregando ? <ActivityIndicator color={cores.verde} style={{ margin: 24 }} /> : lista.length === 0 ? <View style={estilos.vazio}><Text style={estilos.texto}>{agendamentos.length ? 'Nenhum resultado para este filtro.' : 'A agenda está vazia. Crie o primeiro agendamento.'}</Text></View> : lista.map(item => <View key={item.id} style={estilosAdmin.cartao}><View style={estilosAdmin.cartaoTopo}><View style={{ flex: 1 }}><Text style={estilos.tituloCartao}>{item.nome_cliente}</Text><Text style={estilos.texto}>{item.nome_servico} · {Number(item.duracao_minutos)} min</Text></View><Text style={[estilosAdmin.status, item.situacao === 'cancelado' && estilosAdmin.statusCancelado, item.situacao === 'concluido' && estilosAdmin.statusConcluido]}>{etiqueta[item.situacao]}</Text></View><Text style={estilosAdmin.data}>{dataBonita(item.data_horario)}</Text><View style={estilosAdmin.acoes}>{item.situacao === 'confirmado' && <Pressable onPress={() => abrirEdicao(item)} style={estilosAdmin.acao}><Text style={estilos.link}>Editar</Text></Pressable>}{item.situacao === 'confirmado' && <Pressable onPress={() => atualizarSituacao(item, 'concluido')} style={estilosAdmin.acao}><Text style={estilos.link}>Concluir</Text></Pressable>}{exclusaoPendente === item.id ? <><Pressable onPress={() => excluir(item.id)} style={estilosAdmin.acao}><Text style={estilos.linkPerigo}>Confirmar exclusão</Text></Pressable><Pressable onPress={() => definirExclusaoPendente(null)} style={estilosAdmin.acao}><Text style={estilos.texto}>Manter</Text></Pressable></> : <Pressable onPress={() => definirExclusaoPendente(item.id)} style={estilosAdmin.acao}><Text style={estilos.linkPerigo}>Excluir</Text></Pressable>}</View></View>)}
    </>}
    {aba === 'usuarios' && <View style={estilosAdmin.secao}><View style={estilosAdmin.cabecalho}><Text style={estilos.tituloSecao}>Usuários e clientes</Text>{carregandoCadastros && <ActivityIndicator color={cores.verde}/>}</View><Text style={estilos.texto}>Contas de cliente podem agendar. Consulte abaixo quem já tem horários na barbearia.</Text><TextInput value={buscaUsuarios} onChangeText={definirBuscaUsuarios} placeholder="Buscar por nome ou e-mail" placeholderTextColor="#89958e" style={estilos.entrada}/>{carregandoCadastros ? <ActivityIndicator color={cores.verde} style={{ margin: 24 }}/> : usuarios.filter(usuario => normalizar(`${usuario.nome} ${usuario.email} ${usuario.perfil}`).includes(normalizar(buscaUsuarios))).length === 0 ? <View style={estilos.vazio}><Text style={estilos.texto}>Nenhum usuário encontrado.</Text></View> : usuarios.filter(usuario => normalizar(`${usuario.nome} ${usuario.email} ${usuario.perfil}`).includes(normalizar(buscaUsuarios))).map(usuario => <View key={usuario.id} style={estilosAdmin.cartao}><View style={estilosAdmin.cartaoTopo}><View style={{ flex: 1 }}><Text style={estilos.tituloCartao}>{usuario.nome}</Text><Text style={estilos.texto}>{usuario.email}</Text></View><Text style={[estilosAdmin.status, usuario.perfil === 'administrador' && estilosAdmin.statusConcluido]}>{usuario.perfil === 'cliente' ? 'Pode agendar' : 'Administrador'}</Text></View><Text style={estilosAdmin.data}>{Number(usuario.total_agendamentos)} agendamento(s) · {Number(usuario.agendamentos_confirmados)} confirmado(s) · {Number(usuario.agendamentos_concluidos)} concluído(s) · {Number(usuario.agendamentos_cancelados)} cancelado(s)</Text>{Number(usuario.total_agendamentos) === 0 && <Text style={estilos.texto}>Ainda não fez nenhum agendamento.</Text>}{usuario.proximo_agendamento && <Text style={estilos.texto}>Próximo horário: {dataBonita(usuario.proximo_agendamento)}</Text>}{usuario.ultimo_agendamento && <Text style={estilos.texto}>Último horário: {dataBonita(usuario.ultimo_agendamento)}</Text>}{usuario.perfil === 'cliente' && Number(usuario.total_agendamentos) > 0 && <Pressable onPress={() => { definirAgendamentoClienteId(String(usuario.id)); definirBusca(''); definirFiltro('todos'); definirAba('agenda'); }} style={estilosAdmin.botaoInline}><Text style={estilos.link}>Ver agenda deste cliente</Text></Pressable>}</View>)}</View>}
    {aba === 'servicos' && <View style={estilosAdmin.secao}><View style={estilosAdmin.cabecalho}><Text style={estilos.tituloSecao}>Tipos de serviço</Text><Pressable onPress={carregarCadastros}><Text style={estilos.link}>Atualizar</Text></Pressable></View><Text style={estilos.texto}>Cadastre os serviços que os clientes poderão escolher ao agendar.</Text><Botao titulo="+ Criar serviço" aoPressionar={abrirServicoNovo}/>{carregandoCadastros ? <ActivityIndicator color={cores.verde} style={{ margin: 24 }}/> : servicosAdmin.length === 0 ? <View style={estilos.vazio}><Text style={estilos.texto}>Nenhum serviço cadastrado. Crie o primeiro.</Text></View> : servicosAdmin.map(servico => <View key={servico.id} style={estilosAdmin.cartao}><View style={estilosAdmin.cartaoTopo}><View style={{ flex: 1 }}><Text style={estilos.tituloCartao}>{servico.nome}</Text><Text style={estilos.texto}>{Number(servico.duracao_minutos)} min · R$ {Number(servico.preco).toFixed(2).replace('.', ',')}</Text></View><Text style={[estilosAdmin.status, !servico.ativo && estilosAdmin.statusCancelado]}>{servico.ativo ? 'Ativo' : 'Inativo'}</Text></View>{servico.descricao ? <Text style={estilosAdmin.descricaoServico}>{servico.descricao}</Text> : null}<View style={estilosAdmin.acoes}><Pressable onPress={() => abrirServicoEdicao(servico)} style={estilosAdmin.acao}><Text style={estilos.link}>Editar</Text></Pressable>{servicoExcluirPendente === servico.id ? <><Pressable onPress={() => alternarServico(servico)} style={estilosAdmin.acao}><Text style={estilos.linkPerigo}>Confirmar desativação</Text></Pressable><Pressable onPress={() => definirServicoExcluirPendente(null)} style={estilosAdmin.acao}><Text style={estilos.texto}>Manter ativo</Text></Pressable></> : <Pressable onPress={() => servico.ativo ? definirServicoExcluirPendente(servico.id) : alternarServico(servico)} style={estilosAdmin.acao}><Text style={servico.ativo ? estilos.linkPerigo : estilos.link}>{servico.ativo ? 'Desativar' : 'Reativar'}</Text></Pressable>}</View></View>)}</View>}
    <Modal visible={servicoModal} transparent animationType="slide" onRequestClose={() => definirServicoModal(false)}><View style={estilosAdmin.fundoModal}><View style={estilosAdmin.modal}><View style={estilosAdmin.topoModal}><Text style={estilos.tituloSecao}>{servicoEdicao ? 'Editar serviço' : 'Criar serviço'}</Text><Pressable onPress={() => definirServicoModal(false)}><Text style={estilos.link}>Fechar</Text></Pressable></View><ScrollView keyboardShouldPersistTaps="handled"><Campo rotulo="Nome" valor={servicoNome} aoAlterarTexto={definirServicoNome} exemplo="Ex.: Corte infantil"/><Campo rotulo="Descrição" valor={servicoDescricao} aoAlterarTexto={definirServicoDescricao} exemplo="O que está incluído no serviço"/><Campo rotulo="Duração em minutos" valor={servicoDuracao} aoAlterarTexto={definirServicoDuracao} exemplo="Ex.: 40" tipoTeclado="numeric"/><Campo rotulo="Preço em reais" valor={servicoPreco} aoAlterarTexto={definirServicoPreco} exemplo="Ex.: 45,00" tipoTeclado="decimal-pad"/><Botao titulo={servicoSalvando ? 'Salvando…' : servicoEdicao ? 'Salvar serviço' : 'Criar serviço'} desabilitado={servicoSalvando} aoPressionar={salvarServico}/></ScrollView></View></View></Modal>
    <Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={() => definirModalVisivel(false)}><View style={estilosAdmin.fundoModal}><View style={estilosAdmin.modal}><View style={estilosAdmin.topoModal}><Text style={estilos.tituloSecao}>{edicao ? 'Editar agendamento' : 'Novo agendamento'}</Text><Pressable onPress={() => definirModalVisivel(false)}><Text style={estilos.link}>Fechar</Text></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">
      <Text style={estilos.rotulo}>Cliente</Text>{clientes.length === 0 ? <Text style={estilos.texto}>Ainda não há clientes cadastrados. Peça ao cliente para criar uma conta primeiro.</Text> : clientes.map(cliente => <Pressable key={cliente.id} onPress={() => definirClienteId(String(cliente.id))} style={[estilosAdmin.opcao, clienteId === String(cliente.id) && estilosAdmin.opcaoSelecionada]}><View style={{ flex: 1 }}><Text style={estilos.tituloCartao}>{cliente.nome}</Text><Text style={estilos.texto}>{cliente.email}</Text></View><Text style={estilosAdmin.marcador}>{clienteId === String(cliente.id) ? '●' : '○'}</Text></Pressable>)}
      <Text style={estilos.rotulo}>Serviço</Text>{servicos.length === 0 ? <Text style={estilos.texto}>Não há serviços ativos para agendar.</Text> : servicos.map(servico => <Pressable key={servico.id} onPress={() => definirServicoId(String(servico.id))} style={[estilosAdmin.opcao, servicoId === String(servico.id) && estilosAdmin.opcaoSelecionada]}><View style={{ flex: 1 }}><Text style={estilos.tituloCartao}>{servico.nome}</Text><Text style={estilos.texto}>{servico.duracao_minutos} min · R$ {Number(servico.preco).toFixed(2).replace('.', ',')}</Text></View><Text style={estilosAdmin.marcador}>{servicoId === String(servico.id) ? '●' : '○'}</Text></Pressable>)}
      <Campo rotulo="Data" valor={data} aoAlterarTexto={definirData} exemplo="AAAA-MM-DD"/><Campo rotulo="Horário" valor={horario} aoAlterarTexto={definirHorario} exemplo="HH:MM"/><Botao titulo={salvando ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Criar agendamento'} desabilitado={salvando || !clientes.length || !servicos.length} aoPressionar={salvar}/>
    </ScrollView></View></View></Modal>
  </ScrollView>;
}

function TelaPainel() {
  const { sessao, requisitar, sair } = usarAutenticacao();
  const [servicos, definirServicos] = useState([]); const [agendamentos, definirAgendamentos] = useState([]); const [clientes, definirClientes] = useState([]); const [clienteSelecionado, definirClienteSelecionado] = useState(null); const [selecionado, definirSelecionado] = useState(null); const [idEmEdicao, definirIdEmEdicao] = useState(null); const [edicaoAdmin, definirEdicaoAdmin] = useState(null); const [data, definirData] = useState(''); const [horario, definirHorario] = useState(''); const [carregando, definirCarregando] = useState(true); const [ocupado, definirOcupado] = useState(false);
  const ehAdministrador = sessao?.perfil === 'administrador';
  const atualizarLista = async () => { definirCarregando(true); try { const [respostaServicos, respostaAgendamentos, respostaClientes] = await Promise.all([requisitar('/servicos'), requisitar('/agendamentos'), ...(ehAdministrador ? [requisitar('/clientes')] : [])]); definirServicos(respostaServicos.servicos); definirAgendamentos(respostaAgendamentos.agendamentos); if (respostaClientes) definirClientes(respostaClientes.clientes); } catch (erro) { Alert.alert('Erro ao carregar dados', erro.message); } finally { definirCarregando(false); } };
  useEffect(() => { atualizarLista(); }, []);
  const agendar = async () => {
    if (!selecionado || !data || !horario || (ehAdministrador && !clienteSelecionado)) { Alert.alert('Complete o agendamento', ehAdministrador ? 'Escolha cliente, servi?o, data e hor?rio.' : 'Escolha servi?o, data e hor?rio.'); return; }
    definirOcupado(true);
    try {
      const editando = ehAdministrador ? edicaoAdmin : idEmEdicao;
      await requisitar(editando ? `/agendamentos/${editando}` : '/agendamentos', { method: editando ? 'PUT' : 'POST', body: JSON.stringify({ servicoId: selecionado.id, dataHorario: `${data} ${horario}:00`, ...(ehAdministrador ? { clienteId: clienteSelecionado } : {}) }) });
      definirData(''); definirHorario(''); definirIdEmEdicao(null); definirEdicaoAdmin(null);
      if (ehAdministrador) definirClienteSelecionado(null);
      await atualizarLista(); Alert.alert(editando ? 'Agendamento atualizado' : 'Agendamento criado', 'As altera??es foram salvas.');
    } catch (erro) { Alert.alert('N?o foi poss?vel salvar', erro.message); } finally { definirOcupado(false); }
  };
  const removerAgendamento = async id => { try { await requisitar(`/agendamentos/${id}`, { method: 'DELETE' }); await atualizarLista(); } catch (erro) { Alert.alert('Erro', erro.message); } };
  const alterarSituacao = async (agendamento, situacao) => { try { await requisitar(`/agendamentos/${agendamento.id}`, { method: 'PATCH', body: JSON.stringify({ situacao }) }); await atualizarLista(); } catch (erro) { Alert.alert('Erro', erro.message); } };
  const editarAgendamentoAdmin = agendamento => { definirEdicaoAdmin(agendamento.id); definirClienteSelecionado(agendamento.usuario_id); definirSelecionado(servicos.find(servico => servico.id === agendamento.servico_id)); const [dia, relogio] = agendamento.data_horario.replace('T', ' ').split(' '); definirData(dia); definirHorario(relogio.slice(0, 5)); };
  if (ehAdministrador) return <PainelAdministrador sessao={sessao} clientes={clientes} servicos={servicos} agendamentos={agendamentos} requisitar={requisitar} atualizarLista={atualizarLista} sair={sair} carregando={carregando}/>;
  return <Tela><View style={estilos.linhaSuperior}><View><Text style={estilos.chamada}>{ehAdministrador ? 'PAINEL DA BARBEARIA' : 'ÁREA DO CLIENTE'}</Text><Text style={estilos.tituloMenor}>Olá, {sessao?.nome?.split(' ')[0]}.</Text></View><Pressable onPress={sair}><Text style={estilos.link}>Sair</Text></Pressable></View>
    {!ehAdministrador && <><Text style={estilos.tituloSecao}>Escolha seu serviço</Text>{servicos.map(servico => <Pressable key={servico.id} onPress={() => definirSelecionado(servico)} style={[estilos.cartaoServico, selecionado?.id === servico.id && estilos.cartaoSelecionado]}><View style={estilos.iconeServico}><Text>✂</Text></View><View style={{ flex: 1 }}><Text style={estilos.tituloCartao}>{servico.nome}</Text><Text style={estilos.texto}>{servico.duracao_minutos} min · R$ {Number(servico.preco).toFixed(2).replace('.', ',')}</Text></View><Text style={estilos.seletor}>{selecionado?.id === servico.id ? '●' : '○'}</Text></Pressable>)}{selecionado && <View style={estilos.cartaoFormulario}><Text style={estilos.tituloSecao}>{idEmEdicao ? 'Escolha o novo horário' : 'Quando fica melhor?'}</Text><Campo rotulo="Data" valor={data} aoAlterarTexto={definirData} exemplo="AAAA-MM-DD"/><Campo rotulo="Horário" valor={horario} aoAlterarTexto={definirHorario} exemplo="HH:MM"/><Botao titulo={ocupado ? 'Salvando…' : idEmEdicao ? 'Atualizar horário' : 'Confirmar horário'} desabilitado={ocupado} aoPressionar={agendar}/>{idEmEdicao && <Botao titulo="Desistir da alteração" secundario aoPressionar={() => { definirIdEmEdicao(null); definirSelecionado(null); definirData(''); definirHorario(''); }}/>}</View>}</>}
    {ehAdministrador && <View style={estilos.cartaoFormulario}><Text style={estilos.tituloSecao}>{edicaoAdmin ? 'Editar agendamento' : 'Criar agendamento para cliente'}</Text><Text style={estilos.rotulo}>Cliente</Text>{clientes.map(cliente => <Pressable key={cliente.id} onPress={() => definirClienteSelecionado(cliente.id)} style={[estilos.cartaoServico, clienteSelecionado === cliente.id && estilos.cartaoSelecionado]}><View style={{ flex: 1 }}><Text style={estilos.tituloCartao}>{cliente.nome}</Text><Text style={estilos.texto}>{cliente.email}</Text></View><Text style={estilos.seletor}>{clienteSelecionado === cliente.id ? '●' : '○'}</Text></Pressable>)}<Text style={estilos.rotulo}>Serviço</Text>{servicos.map(servico => <Pressable key={servico.id} onPress={() => definirSelecionado(servico)} style={[estilos.cartaoServico, selecionado?.id === servico.id && estilos.cartaoSelecionado]}><Text style={[estilos.tituloCartao, { flex: 1 }]}>{servico.nome}</Text><Text style={estilos.seletor}>{selecionado?.id === servico.id ? '●' : '○'}</Text></Pressable>)}<Campo rotulo="Data" valor={data} aoAlterarTexto={definirData} exemplo="AAAA-MM-DD"/><Campo rotulo="Horário" valor={horario} aoAlterarTexto={definirHorario} exemplo="HH:MM"/><Botao titulo={ocupado ? 'Salvando…' : edicaoAdmin ? 'Salvar alterações' : 'Criar agendamento'} desabilitado={ocupado} aoPressionar={agendar}/>{edicaoAdmin && <Botao titulo="Cancelar edição" secundario aoPressionar={() => { definirEdicaoAdmin(null); definirClienteSelecionado(null); definirSelecionado(null); definirData(''); definirHorario(''); }}/>}</View>}
    <View style={estilos.cabecalhoLista}><Text style={estilos.tituloSecao}>{ehAdministrador ? 'Todos os agendamentos' : 'Meus agendamentos'}</Text><Pressable onPress={atualizarLista}><Text style={estilos.link}>Atualizar</Text></Pressable></View>
    {carregando ? <ActivityIndicator color={cores.verde} style={{ margin: 20 }} /> : agendamentos.length === 0 ? <View style={estilos.vazio}><Text style={estilos.texto}>Nenhum horário por aqui ainda.</Text></View> : agendamentos.map(agendamento => <View key={agendamento.id} style={estilos.cartaoAgendamento}><View style={estilos.linhaAgendamento}><Text style={estilos.tituloCartao}>{agendamento.nome_servico}</Text><Text style={[estilos.situacao, agendamento.situacao === 'cancelado' && { color: cores.vermelho }]}>{agendamento.situacao === 'confirmado' ? 'Confirmado' : agendamento.situacao === 'concluido' ? 'Concluído' : 'Cancelado'}</Text></View><Text style={estilos.texto}>{new Date(agendamento.data_horario.replace(' ', 'T')).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}</Text>{ehAdministrador && <Text style={estilos.texto}>Cliente: {agendamento.nome_cliente}</Text>}<View style={estilos.acoes}>{ehAdministrador && agendamento.situacao === 'confirmado' && <Pressable onPress={() => editarAgendamentoAdmin(agendamento)}><Text style={estilos.link}>Editar</Text></Pressable>}{ehAdministrador && agendamento.situacao === 'confirmado' && <Pressable onPress={() => alterarSituacao(agendamento, 'concluido')}><Text style={estilos.link}>Concluir</Text></Pressable>}{!ehAdministrador && agendamento.situacao === 'confirmado' && <Pressable onPress={() => { const [dia, relogio] = agendamento.data_horario.replace('T', ' ').split(' '); definirData(dia); definirHorario(relogio.slice(0, 5)); definirSelecionado(servicos.find(servico => servico.id === agendamento.servico_id)); definirIdEmEdicao(agendamento.id); }}><Text style={estilos.link}>Reagendar</Text></Pressable>}<Pressable onPress={() => removerAgendamento(agendamento.id)}><Text style={estilos.linkPerigo}>{ehAdministrador ? 'Excluir' : 'Cancelar'}</Text></Pressable></View></View>)}
    {ehAdministrador && <Text style={estilos.notaAdministrador}>Administre agendamentos: crie, consulte, edite, conclua ou exclua registros.</Text>}
  </Tela>;
}

function AplicativoNavegacao() { const { sessao, carregando } = usarAutenticacao(); if (carregando) return <View style={estilos.carregamento}><ActivityIndicator size="large" color={cores.verde}/></View>; return <NavigationContainer><PilhaNavegacao.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo }, animation: 'slide_from_right' }}>{sessao ? <PilhaNavegacao.Screen name="Painel" component={TelaPainel}/> : <><PilhaNavegacao.Screen name="Início" component={TelaInicial}/><PilhaNavegacao.Screen name="Entrar" component={TelaEntrar}/><PilhaNavegacao.Screen name="Cadastro" component={TelaCadastro}/></>}</PilhaNavegacao.Navigator></NavigationContainer>; }
export default function Aplicativo() { return <ProvedorAutenticacao><StatusBar style="dark"/><AplicativoNavegacao/></ProvedorAutenticacao>; }

const estilosAdmin = StyleSheet.create({
  resumo: { flexDirection: 'row', backgroundColor: cores.fundoClaro, borderRadius: 18, paddingVertical: 18, marginBottom: 8 },
  resumoItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: cores.linha },
  numero: { color: cores.verde, fontSize: 24, fontWeight: '800' },
  rotuloResumo: { color: cores.textoSuave, fontSize: 11, marginTop: 3, textAlign: 'center' },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 4 },
  filtros: { gap: 8, paddingVertical: 12 },
  abas: { flexDirection: 'row', backgroundColor: cores.branco, borderColor: cores.linha, borderWidth: 1, borderRadius: 14, padding: 4, marginTop: 20, marginBottom: 16 },
  aba: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 11 },
  abaAtiva: { backgroundColor: cores.verde },
  textoAba: { color: cores.textoSuave, fontSize: 12, fontWeight: '800' },
  textoAbaAtivo: { color: cores.branco },
  secao: { marginTop: 2 },
  botaoInline: { alignSelf: 'flex-start', paddingTop: 12 },
  filtroCliente: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: cores.fundoClaro, padding: 12, borderRadius: 12, marginBottom: 8 },
  descricaoServico: { color: cores.textoSuave, fontSize: 13, lineHeight: 19, marginTop: 10 },
  filtro: { borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.branco, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 13 },
  filtroAtivo: { backgroundColor: cores.verde, borderColor: cores.verde },
  textoFiltro: { color: cores.textoSuave, fontSize: 12, fontWeight: '700' },
  textoFiltroAtivo: { color: cores.branco },
  cartao: { backgroundColor: cores.branco, borderWidth: 1, borderColor: cores.linha, borderRadius: 16, padding: 16, marginBottom: 11 },
  cartaoTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  status: { color: cores.verde, backgroundColor: cores.fundoClaro, borderRadius: 14, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statusCancelado: { color: cores.vermelho, backgroundColor: '#f8e9e7' },
  statusConcluido: { color: cores.textoSuave, backgroundColor: cores.fundo },
  data: { color: cores.texto, fontSize: 14, fontWeight: '700', marginTop: 12 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18, borderTopWidth: 1, borderTopColor: cores.linha, marginTop: 14, paddingTop: 12 },
  acao: { paddingVertical: 3 },
  fundoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 20, 15, .45)' },
  modal: { maxHeight: '92%', backgroundColor: cores.fundo, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 32 },
  topoModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  opcao: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.branco, borderColor: cores.linha, borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 8, gap: 10 },
  opcaoSelecionada: { borderColor: cores.verde, borderWidth: 2, backgroundColor: cores.fundoClaro },
  marcador: { color: cores.verde, fontSize: 20, paddingHorizontal: 3 },
});

const estilos = StyleSheet.create({ tela: { flexGrow: 1, backgroundColor: cores.fundo, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 }, carregamento: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }, marca: { marginTop: 12, marginBottom: 28 }, chamada: { color: cores.verde, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 10 }, titulo: { color: cores.texto, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1 }, tituloMenor: { color: cores.texto, fontSize: 27, fontWeight: '800', marginTop: 4 }, descricao: { color: cores.textoSuave, fontSize: 15, lineHeight: 22, marginTop: 10 }, texto: { color: cores.textoSuave, fontSize: 14, lineHeight: 21 }, destaque: { backgroundColor: cores.fundoClaro, borderRadius: 22, padding: 22, marginBottom: 24, minHeight: 170, justifyContent: 'center' }, iconeDestaque: { color: cores.verde, fontSize: 30, marginBottom: 12 }, tituloDestaque: { color: cores.texto, fontSize: 18, fontWeight: '800', marginBottom: 6 }, botao: { backgroundColor: cores.verde, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 16 }, textoBotao: { color: cores.branco, fontWeight: '700', fontSize: 15 }, botaoSecundario: { backgroundColor: cores.branco, borderWidth: 1, borderColor: cores.linha }, textoBotaoSecundario: { color: cores.texto }, nota: { alignItems: 'center', marginTop: 24 }, textoNota: { color: cores.textoSuave, textAlign: 'center', fontSize: 12 }, campo: { marginBottom: 14 }, rotulo: { color: cores.texto, fontWeight: '700', fontSize: 13, marginBottom: 7 }, entrada: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.branco, paddingHorizontal: 14, color: cores.texto, fontSize: 15 }, linhaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }, link: { color: cores.verde, fontWeight: '800', fontSize: 13 }, tituloSecao: { color: cores.texto, fontSize: 18, fontWeight: '800', marginBottom: 12 }, cartaoServico: { backgroundColor: cores.branco, borderRadius: 15, borderWidth: 1, borderColor: cores.linha, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }, cartaoSelecionado: { borderColor: cores.verde, borderWidth: 2 }, iconeServico: { width: 42, height: 42, borderRadius: 13, backgroundColor: cores.fundoClaro, alignItems: 'center', justifyContent: 'center' }, tituloCartao: { color: cores.texto, fontSize: 15, fontWeight: '800', marginBottom: 3 }, seletor: { color: cores.verde, fontSize: 20 }, cartaoFormulario: { backgroundColor: cores.branco, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: cores.linha, marginTop: 8, marginBottom: 28 }, cabecalhoLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }, cartaoAgendamento: { backgroundColor: cores.branco, borderWidth: 1, borderColor: cores.linha, borderRadius: 15, padding: 16, marginBottom: 10 }, linhaAgendamento: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }, situacao: { color: cores.verde, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }, acoes: { flexDirection: 'row', gap: 20, marginTop: 14 }, linkPerigo: { color: cores.vermelho, fontWeight: '800', fontSize: 13 }, vazio: { backgroundColor: cores.branco, borderRadius: 15, padding: 20, alignItems: 'center' }, notaAdministrador: { color: cores.textoSuave, fontSize: 12, lineHeight: 18, marginTop: 12 } });
