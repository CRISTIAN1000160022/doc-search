import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { timingSafeEqual } from "node:crypto";

const DEMO_USERS = [
  { id: "00000000-0000-4000-8000-000000000001", usernameKey: "JWT_DEMO_USERNAME", passwordKey: "JWT_DEMO_PASSWORD" },
  { id: "00000000-0000-4000-8000-000000000002", usernameKey: "JWT_DEMO_USERNAME_2", passwordKey: "JWT_DEMO_PASSWORD_2" },
] as const;

function constantTimeEquals(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(username: string, password: string): Promise<{ accessToken: string; tokenType: "Bearer"; expiresIn: 900 }> {
    const user = DEMO_USERS.find(({ usernameKey, passwordKey }) => {
      const expectedUsername = process.env[usernameKey] ?? "";
      const expectedPassword = process.env[passwordKey] ?? "";
      return expectedUsername !== "" && expectedPassword !== ""
        && constantTimeEquals(username, expectedUsername)
        && constantTimeEquals(password, expectedPassword);
    });
    if (!user) throw new UnauthorizedException("Credenciales inválidas");

    const accessToken = await this.jwt.signAsync({ sub: user.id, username });
    return { accessToken, tokenType: "Bearer", expiresIn: 900 };
  }
}