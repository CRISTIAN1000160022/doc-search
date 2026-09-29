import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { timingSafeEqual } from "node:crypto";

const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

function constantTimeEquals(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(username: string, password: string): Promise<{ accessToken: string; tokenType: "Bearer"; expiresIn: 900 }> {
    const validUser = constantTimeEquals(username, process.env.JWT_DEMO_USERNAME ?? "");
    const validPassword = constantTimeEquals(password, process.env.JWT_DEMO_PASSWORD ?? "");
    if (!validUser || !validPassword) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const accessToken = await this.jwt.signAsync({ sub: DEMO_USER_ID, username });
    return { accessToken, tokenType: "Bearer", expiresIn: 900 };
  }
}