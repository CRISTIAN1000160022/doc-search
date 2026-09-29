import { UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let jwt: jest.Mocked<JwtService>;
  let service: AuthService;

  beforeEach(() => {
    process.env.JWT_DEMO_USERNAME = "demo-user";
    process.env.JWT_DEMO_PASSWORD = "long-demo-password";
    jwt = { signAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
    jwt.signAsync.mockResolvedValue("signed-token");
    service = new AuthService(jwt);
  });

  it("issues a short-lived bearer token with a stable demo subject", async () => {
    await expect(service.login("demo-user", "long-demo-password")).resolves.toEqual({
      accessToken: "signed-token",
      tokenType: "Bearer",
      expiresIn: 900,
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: "00000000-0000-4000-8000-000000000001", username: "demo-user" });
  });

  it.each([["other-user", "long-demo-password"], ["demo-user", "wrong"]])(
    "rejects invalid credentials",
    async (username, password) => {
      await expect(service.login(username, password)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    },
  );
});