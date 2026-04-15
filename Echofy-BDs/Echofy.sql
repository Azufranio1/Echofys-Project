-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    rol_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE COMMENT 'Admin, User, Artist'
);

-- 2. Usuarios (SQL para identidad y autenticación segura)
CREATE TABLE IF NOT EXISTS usuarios (
    usuario_id BINARY(16) PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) DEFAULT NULL,
    oauth_provider VARCHAR(50) DEFAULT NULL,
    oauth_id VARCHAR(255) DEFAULT NULL,
    estado ENUM('activo','suspendido','cancelado') NOT NULL DEFAULT 'activo',
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_acceso TIMESTAMP NULL DEFAULT NULL,
    fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    ultimo_login_ip VARCHAR(45) DEFAULT NULL,
    CHECK ((password_hash IS NOT NULL) OR (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uix_usuarios_oauth ON usuarios (oauth_provider, oauth_id);

-- 3. Perfiles de usuario
CREATE TABLE IF NOT EXISTS perfiles (
    usuario_id BINARY(16) PRIMARY KEY,
    nombre VARCHAR(100) DEFAULT NULL,
    apellido VARCHAR(100) DEFAULT NULL,
    pais_iso CHAR(2) DEFAULT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    biografia TEXT DEFAULT NULL,
    fecha_nacimiento DATE DEFAULT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id) ON DELETE CASCADE
);

-- 4. Preferencias del usuario
CREATE TABLE IF NOT EXISTS usuarios_preferencias (
    usuario_id BINARY(16) PRIMARY KEY,
    idioma VARCHAR(10) NOT NULL DEFAULT 'es',
    zona_horaria VARCHAR(50) DEFAULT NULL,
    notificaciones_email BOOLEAN NOT NULL DEFAULT TRUE,
    notificaciones_push BOOLEAN NOT NULL DEFAULT TRUE,
    autoplay BOOLEAN NOT NULL DEFAULT TRUE,
    modo_reproduccion_predeterminado ENUM('normal','aleatorio','repetir') NOT NULL DEFAULT 'normal',
    mostrar_letras BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id) ON DELETE CASCADE
);

-- 5. Asignación de roles
CREATE TABLE IF NOT EXISTS usuarios_roles (
    usuario_id BINARY(16),
    rol_id INT,
    PRIMARY KEY (usuario_id, rol_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    FOREIGN KEY (rol_id) REFERENCES roles(rol_id) ON DELETE CASCADE
);

-- 6. Suscripciones (simuladas)
CREATE TABLE IF NOT EXISTS planes (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_plan VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duracion_meses INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS suscripciones_activas (
    suscripcion_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BINARY(16) NOT NULL,
    plan_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('activa','cancelada','expirada') NOT NULL DEFAULT 'activa',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES planes(plan_id)
);

-- 7. Valores iniciales
INSERT IGNORE INTO roles (nombre_rol) VALUES ('Admin'), ('User'), ('Artist');

INSERT IGNORE INTO planes (nombre_plan, precio, duracion_meses, activo) VALUES
('Gratis', 0.00, 0, TRUE),
('Premium', 4.99, 1, TRUE),
('Premium Anual', 49.99, 12, TRUE);

-- 8. Vista de usuario completo
CREATE OR REPLACE VIEW v_usuario_completo AS
SELECT
    BIN_TO_UUID(u.usuario_id) AS usuario_id,
    u.email,
    u.estado,
    u.fecha_registro,
    u.fecha_ultimo_acceso,
    u.ultimo_login_ip,
    GROUP_CONCAT(r.nombre_rol SEPARATOR ', ') AS roles,
    p.nombre,
    p.apellido,
    p.pais_iso,
    p.avatar_url,
    p.biografia,
    pref.idioma,
    pref.zona_horaria AS pref_zona_horaria,
    pref.notificaciones_email,
    pref.notificaciones_push,
    pref.autoplay,
    pref.modo_reproduccion_predeterminado,
    pref.mostrar_letras
FROM usuarios u
LEFT JOIN perfiles p ON u.usuario_id = p.usuario_id
LEFT JOIN usuarios_preferencias pref ON u.usuario_id = pref.usuario_id
LEFT JOIN usuarios_roles ur ON u.usuario_id = ur.usuario_id
LEFT JOIN roles r ON ur.rol_id = r.rol_id
GROUP BY u.usuario_id;

-- 9. Procedimientos seguros para registro y acceso
DELIMITER //

CREATE PROCEDURE sp_registrar_usuario(
    IN p_email VARCHAR(150),
    IN p_pass_hash VARCHAR(255),
    IN p_nombre VARCHAR(100),
    IN p_apellido VARCHAR(100),
    IN p_rol_nombre VARCHAR(50),
    IN p_oauth_provider VARCHAR(50),
    IN p_oauth_id VARCHAR(255)
)
BEGIN
    DECLARE v_user_id BINARY(16);
    DECLARE v_rol_id INT;
    DECLARE v_exist INT DEFAULT 0;

    IF p_email IS NULL OR TRIM(p_email) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El correo es obligatorio.';
    END IF;

    SELECT COUNT(*) INTO v_exist FROM usuarios WHERE LOWER(email) = LOWER(TRIM(p_email));
    IF v_exist > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El correo ya está registrado.';
    END IF;

    SELECT rol_id INTO v_rol_id FROM roles WHERE nombre_rol = p_rol_nombre LIMIT 1;
    IF v_rol_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol inválido.';
    END IF;

    IF p_pass_hash IS NULL AND (p_oauth_provider IS NULL OR p_oauth_id IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Debe proporcionar contraseña o datos OAuth.';
    END IF;

    SET v_user_id = UUID_TO_BIN(UUID());

    START TRANSACTION;
        INSERT INTO usuarios (usuario_id, email, password_hash, oauth_provider, oauth_id)
        VALUES (v_user_id, LOWER(TRIM(p_email)), p_pass_hash, p_oauth_provider, p_oauth_id);

        INSERT INTO perfiles (usuario_id, nombre, apellido)
        VALUES (v_user_id, p_nombre, p_apellido);

        INSERT INTO usuarios_preferencias (usuario_id)
        VALUES (v_user_id);

        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (v_user_id, v_rol_id);
    COMMIT;

    SELECT BIN_TO_UUID(v_user_id) AS nuevo_id;
END //

CREATE PROCEDURE sp_actualizar_ultimo_acceso(
    IN p_usuario_id CHAR(36),
    IN p_ultimo_login_ip VARCHAR(45)
)
BEGIN
    UPDATE usuarios
    SET fecha_ultimo_acceso = CURRENT_TIMESTAMP,
        ultimo_login_ip = p_ultimo_login_ip
    WHERE usuario_id = UUID_TO_BIN(p_usuario_id);
END //

DELIMITER ;