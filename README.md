# Barbearia — agendamentos pelo celular

Aplicativo para organizar os horários de uma barbearia de bairro. Clientes consultam serviços, reservam um horário e acompanham os próprios agendamentos. Administradores veem toda a agenda e podem concluir atendimentos ou remover registros.

## Problema e solução

Agendamentos por telefone ou mensagem podem se perder, exigir confirmações manuais e causar conflitos de horário. O aplicativo reúne serviços e horários em um só lugar, para que clientes reservem pelo celular e a equipe acompanhe uma agenda compartilhada.

**Público:** clientes da barbearia e equipe responsável pela agenda.  
**Perfis:** `cliente` pode criar, consultar, alterar e cancelar os próprios horários. `administrador` pode consultar todos os horários, concluí-los e removê-los. Novas contas sempre recebem o perfil de cliente.

## Entregas 1 a 3

- Aplicativo Expo com React Navigation: início, cadastro, acesso e painel.
- Senhas protegidas com hash bcrypt e acesso autenticado por JWT.
- Token enviado como `Bearer` e guardado no SecureStore do dispositivo.
- Rotas protegidas e autorização por perfil na API.
- Cadastro, consulta, alteração e cancelamento de agendamentos integrados ao MySQL.
- Verificação de conflito entre horários.
- Script SQL com usuários, serviços, agendamentos e dados iniciais.

## Organização dos arquivos

```text
App.js                         Telas e navegação do aplicativo
index.js                              Inicialização do Expo
database.sql                   Estrutura MySQL e serviços iniciais
api/src/server.js                  Inicialização do servidor Express
api/src/routes.js                     Todas as rotas da API em um arquivo
api/src/controllers/               Lógica de acesso, serviços e agendamentos
api/src/middleware/auth.js Validação do token e do perfil
api/src/db.js              Conexão com MySQL
```

## Preparar o banco e a API

1. Execute `database.sql` no MySQL 8 (pelo MySQL Workbench ou com `mysql -u root -p < database.sql`).
2. Se o banco já existia de uma versão anterior, execute `database_migration.sql` uma única vez para renomear as colunas antigas sem apagar registros.
3. Copie `api/.env.example` para `api/.env`. Informe os dados do MySQL e crie um valor aleatório longo para `SEGREDO_JWT`. O arquivo `.env` fica fora do Git.
4. Instale as dependências da API e inicie o servidor. Você pode executar o comando na raiz do projeto ou dentro de `api`:

   ```bash
   cd api
   npm install
   node server.js
   ```

   Alternativamente, na raiz do projeto: `node server.js`.

   O comando `npm run dev` também inicia o servidor em modo de desenvolvimento. O servidor usa a porta 3333 por padrão. Consulte `GET /api/saude` para verificar a conexão com o banco.

5. Para promover uma conta a administradora, cadastre-a no aplicativo e execute no MySQL:

   ```sql
   USE barbearia;
   UPDATE usuarios SET perfil = 'administrador' WHERE email = 'administrador@seudominio.com';
   ```

   A conta deve sair e entrar novamente para receber um token com o perfil atualizado. O banco não cria uma conta administrativa nem uma senha padrão.

## Preparar o aplicativo

Copie `.env.example` para `.env` na raiz e configure `EXPO_PUBLIC_API_URL` com o endereço que o dispositivo consegue acessar. Use `http://localhost:3333/api` no simulador iOS, `http://10.0.2.2:3333/api` no emulador Android ou o IP local do computador em um celular físico, como `http://192.168.1.20:3333/api`.

Na pasta principal do projeto, inicie o Expo:

```bash
npm install
npx expo start
```

## Rotas da API

| Método | Caminho | Acesso | Função |
|---|---|---|---|
| POST | `/api/autenticacao/cadastrar` | Público | Cria uma conta de cliente e retorna o token |
| POST | `/api/autenticacao/entrar` | Público | Confere os dados de acesso e retorna o token |
| GET | `/api/autenticacao/minha-conta` | Token | Consulta a conta autenticada |
| POST | `/api/autenticacao/sair` | Token | Encerra a sessão no aplicativo |
| GET | `/api/servicos` | Público | Lista serviços disponíveis |
| GET | `/api/clientes` | Administrador | Lista clientes e resumo dos agendamentos |
| GET | `/api/usuarios` | Administrador | Lista todas as contas e seus agendamentos |
| GET | `/api/admin/servicos` | Administrador | Lista serviços ativos e inativos |
| POST | `/api/admin/servicos` | Administrador | Cadastra um serviço |
| PUT | `/api/admin/servicos/:id` | Administrador | Altera ou reativa um serviço |
| DELETE | `/api/admin/servicos/:id` | Administrador | Desativa um serviço sem apagar histórico |
| GET | `/api/agendamentos` | Token | Lista todos os horários para administradores e os próprios para clientes |
| POST | `/api/agendamentos` | Token | Cria um agendamento |
| PUT | `/api/agendamentos/:id` | Token | Altera horário ou serviço |
| PATCH | `/api/agendamentos/:id` | Administrador | Atualiza a situação do agendamento |
| DELETE | `/api/agendamentos/:id` | Token | Cancela o próprio agendamento ou remove um como administrador |

## Estrutura do banco

- `usuarios`: nome, e-mail, hash da senha e perfil.
- `servicos`: nome, descrição, duração, preço e disponibilidade.
- `agendamentos`: cliente, serviço, data e horário, situação e observações.

## Escopo

Este projeto contempla as entregas 1, 2 e 3 do enunciado. Build APK, testes formais e apresentação pertencem à entrega 4 e não estão incluídos nesta etapa.
