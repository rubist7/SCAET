CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id_configuracion TINYINT UNSIGNED NOT NULL,
  nombre_empresa VARCHAR(150) NOT NULL,
  nombre_responsable VARCHAR(150) NOT NULL,
  puesto_responsable VARCHAR(150) NOT NULL,
  firma_key VARCHAR(255) NULL,
  logo_key VARCHAR(255) NULL,
  correo_cc VARCHAR(254) NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_configuracion)
) ENGINE=InnoDB;
