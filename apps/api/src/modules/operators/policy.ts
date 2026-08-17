import type { OperatorAppRole } from "@operator/contracts"

import { HttpError } from "../../http/errors.js"

export type OperatorPolicyTarget = {
  id: string
  role: OperatorAppRole
  active: boolean
}

export function assertOperatorUpdateAllowed(input: {
  actorId: string
  target: OperatorPolicyTarget
  nextRole: OperatorAppRole
  nextActive: boolean
  activeAdminCount: number
}) {
  const removesAdmin =
    input.target.active &&
    input.target.role === "ADMIN" &&
    (!input.nextActive || input.nextRole !== "ADMIN")
  if (input.actorId === input.target.id && removesAdmin) {
    throw new HttpError(409, "CONFLICT", "Admin cannot demote or deactivate itself")
  }
  if (removesAdmin && input.activeAdminCount <= 1) {
    throw new HttpError(409, "FINAL_ADMIN_REQUIRED", "The final active Admin must remain")
  }
}
