import type { FastifyRequest } from "fastify"
import { jwtVerify, SignJWT } from "jose"

import { config } from "./config.js"

export type AuthIdentity = {
  operatorId: string
  operatorName: string
  merchantId: string
  role: "OPERATOR" | "ADMIN" | "OWNER"
}

const secret = new TextEncoder().encode(config.JWT_SECRET)

export async function signAccessToken(identity: AuthIdentity) {
  return new SignJWT({
    merchantId: identity.merchantId,
    operatorName: identity.operatorName,
    role: identity.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.operatorId)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret)
}

export async function requireAuth(
  request: FastifyRequest,
  roles?: AuthIdentity["role"][],
): Promise<AuthIdentity> {
  const header = request.headers.authorization
  if (!header?.startsWith("Bearer "))
    throw Object.assign(new Error("Authentication required"), {
      statusCode: 401,
      code: "AUTH_REQUIRED",
    })
  try {
    const { payload } = await jwtVerify(header.slice(7), secret)
    const identity: AuthIdentity = {
      operatorId: payload.sub ?? "",
      operatorName: String(payload.operatorName ?? ""),
      merchantId: String(payload.merchantId ?? ""),
      role: String(payload.role ?? "") as AuthIdentity["role"],
    }
    if (
      !identity.operatorId ||
      !identity.merchantId ||
      !["OPERATOR", "ADMIN", "OWNER"].includes(identity.role)
    )
      throw new Error("Invalid token payload")
    if (roles && !roles.includes(identity.role))
      throw Object.assign(new Error("Insufficient permission"), {
        statusCode: 403,
        code: "FORBIDDEN",
      })
    return identity
  } catch (error) {
    if (typeof error === "object" && error && "statusCode" in error) throw error
    throw Object.assign(new Error("Invalid or expired session"), {
      statusCode: 401,
      code: "INVALID_SESSION",
    })
  }
}
