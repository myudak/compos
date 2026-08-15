import { describe, expect, it } from "vitest"

import { HttpError } from "../../http/errors.js"
import { assertOperatorUpdateAllowed } from "./policy.js"

const admin = { id: "admin-1", role: "ADMIN" as const, active: true }

describe("operator administration policy", () => {
  it("prevents an admin from demoting itself", () => {
    expect(() =>
      assertOperatorUpdateAllowed({
        actorId: admin.id,
        target: admin,
        nextRole: "OPERATOR",
        nextActive: true,
        activeAdminCount: 2,
      }),
    ).toThrowError(expect.objectContaining<HttpError>({ code: "CONFLICT" }))
  })

  it("preserves the final active admin", () => {
    expect(() =>
      assertOperatorUpdateAllowed({
        actorId: "another-admin",
        target: admin,
        nextRole: "ADMIN",
        nextActive: false,
        activeAdminCount: 1,
      }),
    ).toThrowError(expect.objectContaining<HttpError>({ code: "FINAL_ADMIN_REQUIRED" }))
  })

  it("allows another admin to deactivate an admin when one remains", () => {
    expect(() =>
      assertOperatorUpdateAllowed({
        actorId: "another-admin",
        target: admin,
        nextRole: "ADMIN",
        nextActive: false,
        activeAdminCount: 2,
      }),
    ).not.toThrow()
  })

  it("never exposes OWNER administration through the Operator app", () => {
    expect(() =>
      assertOperatorUpdateAllowed({
        actorId: "admin-1",
        target: { id: "owner-1", role: "OWNER", active: true },
        nextRole: "ADMIN",
        nextActive: true,
        activeAdminCount: 2,
      }),
    ).toThrowError(expect.objectContaining<HttpError>({ code: "FORBIDDEN" }))
  })
})
