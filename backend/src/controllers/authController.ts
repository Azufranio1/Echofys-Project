import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'echofy_secret_key_ultra_safe';

export const register = async (req: Request, res: Response) => {
  const { email, password, username } = req.body; // username lo mapearemos a 'nombre' en el SP

  try {
    // Hasheamos la contraseña antes de mandarla al SP
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // LLAMADA AL PROCEDIMIENTO ALMACENADO
    // El SP se encarga de: Crear UUID, insertar en usuarios, perfiles, preferencias y roles.
    await prisma.$queryRaw`
      CALL sp_registrar_usuario(
        ${email}, 
        ${hashedPassword}, 
        ${username || 'Nuevo Usuario'}, 
        '', 
        'User', 
        NULL, 
        NULL
      )
    `;

    res.status(201).json({ message: "Usuario creado con éxito" });
  } catch (error: any) {
    console.error("Error en registro:", error);
    
    // Si el SP lanza un SIGNAL SQLSTATE '45000' (ej. correo duplicado), cae aquí
    const errorMessage = error.message || "Error al crear el usuario";
    res.status(400).json({ error: errorMessage.includes("registrado") ? "El correo ya existe" : errorMessage });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // 1. Buscamos al usuario
    const users: any[] = await prisma.$queryRaw`
      SELECT 
        usuario_id AS id, 
        email, 
        password_hash AS passwordHash 
      FROM usuarios 
      WHERE email = ${email.toLowerCase().trim()} 
      LIMIT 1
    `;

const user = users[0];

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 2. Verificamos la contraseña
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 3. CONVERSIÓN CRUCIAL: El ID binario a String (UUID) para el Token
    // Usamos una función para convertir el Buffer de MySQL a un String legible
    const userIdString = Buffer.from(user.id).toString('hex');

    const token = jwt.sign(
      { id: userIdString, email: user.email },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );

    // 4. Actualizamos el último acceso usando tu Procedimiento Almacenado
    // Pasamos el ID binario directamente
    await prisma.$executeRaw`
      CALL sp_actualizar_ultimo_acceso(UNHEX(${userIdString}), ${req.ip || '127.0.0.1'})
    `;

    res.json({ token, user: { email: user.email, id: userIdString } });
  } catch (error) {
    console.error("Error en Login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};