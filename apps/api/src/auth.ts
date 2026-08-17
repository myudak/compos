import type { OperatorAppRole } from "@operator/contracts"
import type { FastifyRequest } from "fastify"
import { errors, jwtVerify, SignJWT } from "jose"

import { config } from "./config.js"
import type { DatabasePool } from "./db.js"
import { HttpError } from "./http/errors.js"
import { AuthRepository } from "./modules/auth/repository.js"

export type AuthIdentity = {
  operatorId: string
  operatorName: string
  merchantId: string
  role: OperatorAppRole
  deviceId: string
  sessionId: string
}

const secret = new TextEncoder().encode(config.JWT_SECRET)

export async function signAccessToken(identity: AuthIdentity, expiresAt: Date) {
  return new SignJWT({
    merchantId: identity.merchantId,
    operatorName: identity.operatorName,
    role: identity.role,
    deviceId: identity.deviceId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.operatorId)
    .setJti(identity.sessionId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1_000))
    .sign(secret)
}

export async function requireAuth(
  request: FastifyRequest,
  roles: OperatorAppRole[] | undefined,
  pool: DatabasePool,
): Promise<AuthIdentity> {
  const header = request.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "AUTH_REQUIRED", "Authentication required")
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), secret)
    if (!payload.jti) throw new Error("Session identifier is missing")
    const identity = await new AuthRepository(pool).validateSession(payload.jti)
    if (!identity) {
      throw new HttpError(401, "SESSION_REVOKED", "Session is no longer active")
    }
    if (roles && !roles.includes(identity.role)) {
      throw new HttpError(403, "FORBIDDEN", "Insufficient permission")
    }
    return { ...identity, role: identity.role }
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (error instanceof errors.JWTExpired) {
      throw new HttpError(401, "AUTH_EXPIRED", "Online session has expired")
    }
    throw new HttpError(401, "AUTH_REQUIRED", "Invalid session")
  }
}
