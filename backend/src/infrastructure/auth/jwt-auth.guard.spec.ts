import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let request: { headers: Record<string, string>; user?: unknown };
  const jwt = { verifyAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
  let guard: JwtAuthGuard;
  let context: ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    request = { headers: {} };
    context = {
      switchToHttp: () => ({ getRequest: () => request as unknown as Request }),
    } as unknown as ExecutionContext;
    guard = new JwtAuthGuard(jwt);
  });

  it("rejects a missing or malformed bearer header", async () => {
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    request.headers.authorization = "Basic token";
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it("attaches the verified principal to the request", async () => {
    const principal = { sub: "owner-1", username: "demo" };
    request.headers.authorization = "Bearer valid-token";
    jwt.verifyAsync.mockResolvedValue(principal);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(principal);
  });

  it("rejects malformed claims and invalid tokens", async () => {
    request.headers.authorization = "Bearer invalid-token";
    jwt.verifyAsync.mockResolvedValueOnce({ sub: "", username: "demo" });
    await expect(guard.canActivate(context)).rejects.toThrow("Token inválido o expirado");
    jwt.verifyAsync.mockRejectedValueOnce(new Error("bad signature"));
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});