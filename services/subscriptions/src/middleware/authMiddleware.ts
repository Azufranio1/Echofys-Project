import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token requerido" });
    return;
  }
  try {
    const decoded = jwt.verify(
      authHeader.split(" ")[1],
      process.env.JWT_SECRET as string
    ) as { id?: string; userId?: string; role?: string };
    req.userId   = decoded.userId || decoded.id;
    req.userRole = decoded.role;
    if (!req.userId) {
      res.status(401).json({ error: "Token inválido: sin usuario" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Solo administradores" });
    return;
  }
  next();
};