-- Migra uma base criada pela versão anterior do projeto para o esquema de database.sql.
-- Execute somente em uma base antiga que ainda tenha password_hash/status e
-- data_agendamento/status/notas nas tabelas usuarios e agendamentos.

USE barbearia;

-- Mantém os perfis existentes enquanto inclui o novo valor em português.
ALTER TABLE usuarios
  CHANGE COLUMN password_hash hash_senha VARCHAR(255) NOT NULL,
  MODIFY COLUMN status ENUM('cliente', 'admin', 'administrador') NOT NULL DEFAULT 'cliente';

UPDATE usuarios SET status = 'administrador' WHERE status = 'admin';

ALTER TABLE usuarios
  CHANGE COLUMN status perfil ENUM('cliente', 'administrador') NOT NULL DEFAULT 'cliente';

-- Mantém os agendamentos concluídos e atualiza os nomes para o esquema atual.
ALTER TABLE agendamentos
  MODIFY COLUMN status ENUM('confirmado', 'completado', 'concluido', 'cancelado') NOT NULL DEFAULT 'confirmado';

UPDATE agendamentos SET status = 'concluido' WHERE status = 'completado';

ALTER TABLE agendamentos
  CHANGE COLUMN data_agendamento data_horario DATETIME NOT NULL,
  CHANGE COLUMN status situacao ENUM('confirmado', 'concluido', 'cancelado') NOT NULL DEFAULT 'confirmado',
  CHANGE COLUMN notas observacoes VARCHAR(500) NULL;
