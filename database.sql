-- Execute este arquivo no MySQL para criar o banco e os dados iniciais.
CREATE DATABASE IF NOT EXISTS barbearia
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE barbearia;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  hash_senha VARCHAR(255) NOT NULL,
  perfil ENUM('cliente', 'administrador') NOT NULL DEFAULT 'cliente',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS servicos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(500) NULL,
  duracao_minutos SMALLINT UNSIGNED NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_servicos_nome (nome),
  CONSTRAINT chk_servico_duracao CHECK (duracao_minutos > 0),
  CONSTRAINT chk_servico_preco CHECK (preco >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agendamentos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  servico_id BIGINT UNSIGNED NOT NULL,
  data_horario DATETIME NOT NULL,
  situacao ENUM('confirmado', 'concluido', 'cancelado') NOT NULL DEFAULT 'confirmado',
  observacoes VARCHAR(500) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agendamentos_data_situacao (data_horario, situacao),
  KEY idx_agendamentos_usuario_data (usuario_id, data_horario),
  CONSTRAINT fk_agendamentos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_agendamentos_servico FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO servicos (nome, descricao, duracao_minutos, preco) VALUES
  ('Corte clássico', 'Corte na tesoura ou máquina, finalizado com cuidado.', 40, 45.00),
  ('Barba', 'Modelagem e acabamento de barba.', 30, 35.00),
  ('Corte + barba', 'Corte completo com acabamento de barba.', 60, 70.00)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);
