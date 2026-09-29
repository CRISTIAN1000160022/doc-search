import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

interface AuthenticatedRequest extends Request {
  user?: { sub: string; username: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) throw new UnauthorizedException("Se requiere un token Bearer");

    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; username: string }>(token);
      if (!claims.sub || !claims.username) throw new UnauthorizedException();
      request.user = claims;
      return true;
    } catch {
      throw new UnauthorizedException("Token inválido o expirado");
    }
  }
}