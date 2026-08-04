CREATE TABLE IF NOT EXISTS resguardo_detalles (
  id_resguardo_detalle INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_resguardo INT UNSIGNED NOT NULL,
  id_detalle INT UNSIGNED NOT NULL,
  PRIMARY KEY (id_resguardo_detalle),
  UNIQUE KEY uq_resguardo_detalles_resguardo_detalle (id_resguardo, id_detalle),
  KEY idx_resguardo_detalles_id_detalle (id_detalle),
  CONSTRAINT fk_resguardo_detalles_resguardo
    FOREIGN KEY (id_resguardo) REFERENCES resguardos (id_resguardo),
  CONSTRAINT fk_resguardo_detalles_detalle
    FOREIGN KEY (id_detalle) REFERENCES asignacion_detalles (id_detalle)
) ENGINE=InnoDB;
