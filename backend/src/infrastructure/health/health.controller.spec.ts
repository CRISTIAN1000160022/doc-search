import { HealthController } from "./health.controller";

it("returns a healthy status", () => {
  expect(new HealthController().getHealth()).toEqual({ status: "ok" });
});