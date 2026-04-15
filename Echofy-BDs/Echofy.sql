-- 1. Catálogo de tipos de cuenta
CREATE TABLE IF NOT EXISTS tipos_cuenta (
    tipo_cuenta_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT NULL
);

-- 2. Catálogo de Roles
CREATE TABLE IF NOT EXISTS roles (
    rol_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE -- 'Admin', 'User', 'Artist'
);

-- 3. Tabla Principal de Usuarios (Datos de Cuenta)
CREATE TABLE IF NOT EXISTS usuarios (
    usuario_id BINARY(16) PRIMARY KEY,
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) NULL,
    oauth_provider VARCHAR(50) NULL,
    oauth_id VARCHAR(255) NULL UNIQUE,
    tipo_cuenta_id INT NOT NULL DEFAULT 1,
    estado ENUM('pendiente','activo','suspendido','cancelado') NOT NULL DEFAULT 'activo',
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_acceso TIMESTAMP NULL,
    CHECK ((password_hash IS NOT NULL) OR (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL)),
    FOREIGN KEY (tipo_cuenta_id) REFERENCES tipos_cuenta(tipo_cuenta_id)
);

-- 4. Perfiles (Datos Personales y Ubicación)
CREATE TABLE IF NOT EXISTS perfiles (
    usuario_id BINARY(16) PRIMARY KEY,
    nombre VARCHAR(100) NULL,
    apellido VARCHAR(100) NULL,
    pais_iso CHAR(2) NULL,
    biografia TEXT NULL,
    fecha_nacimiento DATE NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id) ON DELETE CASCADE
);

-- 5. Asignación de Roles
CREATE TABLE IF NOT EXISTS usuarios_roles (
    usuario_id BINARY(16),
    rol_id INT,
    PRIMARY KEY (usuario_id, rol_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    FOREIGN KEY (rol_id) REFERENCES roles(rol_id) ON DELETE CASCADE
);

-- 6. Planes y suscripciones
CREATE TABLE IF NOT EXISTS planes (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_plan VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duracion_meses INT NOT NULL DEFAULT 1,
    descripcion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS suscripciones_activas (
    suscripcion_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BINARY(16) NOT NULL,
    plan_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('activa','cancelada','expirada') NOT NULL DEFAULT 'activa',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES planes(plan_id)
);

-- 7. Auditoría básica de acciones importantes
CREATE TABLE IF NOT EXISTS auditoria_usuarios (
    evento_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BINARY(16) NULL,
    accion VARCHAR(100) NOT NULL,
    detalles TEXT NULL,
    fecha_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id) ON DELETE SET NULL
);

-- 8. Vistas
CREATE OR REPLACE VIEW v_usuario_completo AS
SELECT
    BIN_TO_UUID(u.usuario_id) AS usuario_id,
    u.email,
    u.oauth_provider,
    u.oauth_id,
    u.estado,
    u.fecha_registro,
    u.fecha_ultimo_acceso,
    tc.nombre_tipo AS tipo_cuenta,
    GROUP_CONCAT(r.nombre_rol ORDER BY r.nombre_rol SEPARATOR ', ') AS roles,
    p.nombre,
    p.apellido,
    p.pais_iso,
    p.region,
    p.ciudad,
    p.zona_horaria,
    p.biografia,
    p.avatar_url,
    p.fecha_nacimiento
FROM usuarios u
LEFT JOIN perfiles p ON u.usuario_id = p.usuario_id
LEFT JOIN tipos_cuenta tc ON u.tipo_cuenta_id = tc.tipo_cuenta_id
LEFT JOIN usuarios_roles ur ON u.usuario_id = ur.usuario_id
LEFT JOIN roles r ON ur.rol_id = r.rol_id
GROUP BY u.usuario_id;

CREATE OR REPLACE VIEW v_artistas_activos AS
SELECT
    BIN_TO_UUID(u.usuario_id) AS artista_id,
    u.email,
    p.nombre,
    p.apellido,
    p.pais_iso,
    p.ciudad,
    p.biografia,
    GROUP_CONCAT(r.nombre_rol ORDER BY r.nombre_rol SEPARATOR ', ') AS roles,
    COALESCE(sa.estado, 'sin_suscripcion') AS estado_suscripcion,
    pl.nombre_plan
FROM usuarios u
JOIN usuarios_roles ur ON u.usuario_id = ur.usuario_id
JOIN roles r ON ur.rol_id = r.rol_id
LEFT JOIN perfiles p ON u.usuario_id = p.usuario_id
LEFT JOIN suscripciones_activas sa ON u.usuario_id = sa.usuario_id AND sa.estado = 'activa'
LEFT JOIN planes pl ON sa.plan_id = pl.plan_id
WHERE r.nombre_rol = 'Artist' AND u.estado = 'activo'
GROUP BY u.usuario_id;

CREATE OR REPLACE VIEW v_suscripciones_activas_por_usuario AS
SELECT
    BIN_TO_UUID(u.usuario_id) AS usuario_id,
    u.email,
    sa.suscripcion_id,
    pl.nombre_plan,
    sa.fecha_inicio,
    sa.fecha_fin,
    sa.estado
FROM suscripciones_activas sa
JOIN usuarios u ON sa.usuario_id = u.usuario_id
JOIN planes pl ON sa.plan_id = pl.plan_id
WHERE sa.estado = 'activa';

CREATE OR REPLACE VIEW v_conteo_suscripciones_por_plan AS
SELECT
    pl.plan_id,
    pl.nombre_plan,
    pl.precio,
    COUNT(sa.suscripcion_id) AS total_suscripciones,
    SUM(CASE WHEN sa.estado = 'activa' THEN 1 ELSE 0 END) AS activas
FROM planes pl
LEFT JOIN suscripciones_activas sa ON pl.plan_id = sa.plan_id
GROUP BY pl.plan_id;

-- 9. Rutinas y procedimientos almacenados
DELIMITER //

CREATE PROCEDURE sp_registrar_usuario_local(
    IN p_email VARCHAR(150),
    IN p_pass_hash VARCHAR(255),
    IN p_nombre VARCHAR(100),
    IN p_apellido VARCHAR(100),
    IN p_pais CHAR(2),
    IN p_tipo_cuenta_id INT
)
BEGIN
    DECLARE v_user_id BINARY(16);
    SET v_user_id = UUID_TO_BIN(UUID());

    START TRANSACTION;
        INSERT INTO usuarios (usuario_id, email, password_hash, tipo_cuenta_id)
        VALUES (v_user_id, LOWER(TRIM(p_email)), p_pass_hash, p_tipo_cuenta_id);

        INSERT INTO perfiles (usuario_id, nombre, apellido, pais_iso)
        VALUES (v_user_id, p_nombre, p_apellido, p_pais);

        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (v_user_id, (SELECT rol_id FROM roles WHERE nombre_rol = 'User' LIMIT 1));

        INSERT INTO auditoria_usuarios (usuario_id, accion, detalles)
        VALUES (v_user_id, 'registro_local', CONCAT('Email: ', LOWER(TRIM(p_email))));
    COMMIT;

    SELECT BIN_TO_UUID(v_user_id) AS nuevo_id;
END //

CREATE PROCEDURE sp_registrar_usuario_oauth(
    IN p_email VARCHAR(150),
    IN p_oauth_provider VARCHAR(50),
    IN p_oauth_id VARCHAR(255),
    IN p_nombre VARCHAR(100),
    IN p_apellido VARCHAR(100),
    IN p_pais CHAR(2)
)
BEGIN
    DECLARE v_user_id BINARY(16);
    SET v_user_id = UUID_TO_BIN(UUID());

    START TRANSACTION;
        INSERT INTO usuarios (usuario_id, email, oauth_provider, oauth_id)
        VALUES (v_user_id, LOWER(TRIM(p_email)), p_oauth_provider, p_oauth_id);

        INSERT INTO perfiles (usuario_id, nombre, apellido, pais_iso)
        VALUES (v_user_id, p_nombre, p_apellido, p_pais);

        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (v_user_id, (SELECT rol_id FROM roles WHERE nombre_rol = 'User' LIMIT 1));

        INSERT INTO auditoria_usuarios (usuario_id, accion, detalles)
        VALUES (v_user_id, 'registro_oauth', CONCAT('Proveedor: ', p_oauth_provider));
    COMMIT;

    SELECT BIN_TO_UUID(v_user_id) AS nuevo_id;
END //

CREATE PROCEDURE sp_validar_login(
    IN p_email VARCHAR(150),
    IN p_pass_hash VARCHAR(255)
)
BEGIN
    SELECT
        BIN_TO_UUID(usuario_id) AS usuario_id,
        email,
        estado
    FROM usuarios
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
      AND password_hash = p_pass_hash
      AND estado = 'activo';
END //

CREATE PROCEDURE sp_actualizar_perfil(
    IN p_usuario_id CHAR(36),
    IN p_nombre VARCHAR(100),
    IN p_apellido VARCHAR(100),
    IN p_pais CHAR(2),
    IN p_region VARCHAR(100),
    IN p_ciudad VARCHAR(100),
    IN p_zona_horaria VARCHAR(50),
    IN p_biografia TEXT,
    IN p_avatar_url VARCHAR(255)
)
BEGIN
    UPDATE perfiles
    SET nombre = p_nombre,
        apellido = p_apellido,
        pais_iso = p_pais,
        region = p_region,
        ciudad = p_ciudad,
        zona_horaria = p_zona_horaria,
        biografia = p_biografia,
        avatar_url = p_avatar_url
    WHERE usuario_id = UUID_TO_BIN(p_usuario_id);

    INSERT INTO auditoria_usuarios (usuario_id, accion, detalles)
    VALUES (UUID_TO_BIN(p_usuario_id), 'actualizar_perfil', 'Perfil actualizado');
END //

CREATE PROCEDURE sp_asignar_rol(
    IN p_usuario_id CHAR(36),
    IN p_nombre_rol VARCHAR(50)
)
BEGIN
    INSERT IGNORE INTO usuarios_roles (usuario_id, rol_id)
    VALUES (
        UUID_TO_BIN(p_usuario_id),
        (SELECT rol_id FROM roles WHERE nombre_rol = p_nombre_rol LIMIT 1)
    );
END //

CREATE PROCEDURE sp_crear_suscripcion(
    IN p_usuario_id CHAR(36),
    IN p_plan_id INT,
    IN p_duracion_meses INT
)
BEGIN
    DECLARE v_inicio DATE;
    DECLARE v_fin DATE;
    SET v_inicio = CURDATE();
    SET v_fin = DATE_ADD(v_inicio, INTERVAL p_duracion_meses MONTH);

    INSERT INTO suscripciones_activas (usuario_id, plan_id, fecha_inicio, fecha_fin, estado)
    VALUES (UUID_TO_BIN(p_usuario_id), p_plan_id, v_inicio, v_fin, 'activa');

    INSERT INTO auditoria_usuarios (usuario_id, accion, detalles)
    VALUES (UUID_TO_BIN(p_usuario_id), 'crear_suscripcion', CONCAT('Plan: ', p_plan_id));
END //

CREATE PROCEDURE sp_cancelar_suscripcion(
    IN p_suscripcion_id INT
)
BEGIN
    UPDATE suscripciones_activas
    SET estado = 'cancelada'
    WHERE suscripcion_id = p_suscripcion_id;
END //

CREATE PROCEDURE sp_renovar_suscripcion(
    IN p_suscripcion_id INT,
    IN p_meses_extra INT
)
BEGIN
    UPDATE suscripciones_activas
    SET fecha_fin = DATE_ADD(fecha_fin, INTERVAL p_meses_extra MONTH),
        estado = 'activa'
    WHERE suscripcion_id = p_suscripcion_id;
END //

CREATE PROCEDURE sp_obtener_perfil_usuario(
    IN p_usuario_id CHAR(36)
)
BEGIN
    SELECT *
    FROM v_usuario_completo
    WHERE usuario_id = p_usuario_id;
END //

CREATE PROCEDURE sp_buscar_artistas(
    IN p_termino_busqueda VARCHAR(150)
)
BEGIN
    SELECT *
    FROM v_artistas_activos
    WHERE LOWER(nombre) LIKE LOWER(CONCAT('%', p_termino_busqueda, '%'))
       OR LOWER(apellido) LIKE LOWER(CONCAT('%', p_termino_busqueda, '%'))
       OR LOWER(biografia) LIKE LOWER(CONCAT('%', p_termino_busqueda, '%'));
END //

CREATE PROCEDURE sp_marcar_ultimo_acceso(
    IN p_usuario_id CHAR(36)
)
BEGIN
    UPDATE usuarios
    SET fecha_ultimo_acceso = CURRENT_TIMESTAMP
    WHERE usuario_id = UUID_TO_BIN(p_usuario_id);
END //

DELIMITER ;

-- 10. Índices adicionales
CREATE INDEX IF NOT EXISTS idx_usuario_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuario_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuario_tipo_cuenta ON usuarios(tipo_cuenta_id);
CREATE INDEX IF NOT EXISTS idx_usuario_oauth ON usuarios(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_perfil_pais ON perfiles(pais_iso);
CREATE INDEX IF NOT EXISTS idx_usuarios_roles_rol ON usuarios_roles(rol_id);
CREATE INDEX IF NOT EXISTS idx_plan_nombre ON planes(nombre_plan);
CREATE INDEX IF NOT EXISTS idx_suscripcion_usuario_estado ON suscripciones_activas(usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_suscripcion_fin ON suscripciones_activas(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_usuarios(usuario_id);

-- 11. Datos base iniciales
INSERT IGNORE INTO tipos_cuenta (tipo_cuenta_id, nombre_tipo, descripcion)
VALUES
    (1, 'Free', 'Cuenta gratuita con acceso básico'),
    (2, 'Premium', 'Cuenta de pago con ventajas adicionales'),
    (3, 'Artist', 'Cuenta de artista con opciones de administración de contenido');

INSERT IGNORE INTO roles (rol_id, nombre_rol)
VALUES
    (1, 'Admin'),
    (2, 'User'),
    (3, 'Artist');
