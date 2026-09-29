import type { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

describe("AuthController", () => {
  it("delegates login credentials to the auth service", async () => {
    const auth = { login: jest.fn().mockResolvedValue({ accessToken: "token" }) } as unknown as AuthService;
    const controller = new AuthController(auth);
    await expect(controller.login({ username: "demo", password: "secret" })).resolves.toEqual({ accessToken: "token" });
    expect(auth.login).toHaveBeenCalledWith("demo", "secret");
  });
});