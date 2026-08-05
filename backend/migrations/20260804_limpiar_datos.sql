/*
-------------------------------------------------------
SCAET
Script de limpieza para entrega

Acción:
- Vacía todas las tablas de datos.
- Conserva únicamente el usuario administrador (ID = 1).
- Reinicia el AUTO_INCREMENT de usuarios a 2.

IMPORTANTE:
Realizar un respaldo de la base de datos antes de ejecutar.
Este script debe ejecutarse manualmente en MySQL Workbench.
-------------------------------------------------------
*/
USE scaet_bd;

SET FOREIGN_KEY_CHECKS = 0;

-- Tablas dependientes primero
TRUNCATE TABLE resguardo_detalles;
TRUNCATE TABLE asignacion_detalles;

-- Documentos y movimientos
TRUNCATE TABLE resguardos;
TRUNCATE TABLE mantenimientos;
TRUNCATE TABLE asignaciones;

-- Catálogos y datos principales
TRUNCATE TABLE equipos;
TRUNCATE TABLE colaboradores;
TRUNCATE TABLE proveedores;

-- Registros y configuración
TRUNCATE TABLE logs_actividad;
TRUNCATE TABLE configuracion_sistema;

-- Conservar únicamente al usuario del inge
DELETE FROM usuarios
WHERE id_usuario <> 1;

-- El siguiente usuario creado tendrá ID 2
ALTER TABLE usuarios AUTO_INCREMENT = 2;

SET FOREIGN_KEY_CHECKS = 1;
---------------------------------------
