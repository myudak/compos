import type { PaymentMethod, PaymentVerificationType } from "@/infrastructure/persistence/models"

export function verificationTypeFor(method: PaymentMethod): PaymentVerificationType {
  void method
  return "OPERATOR_VERIFIED"
}

export function validatePayment(
  method: PaymentMethod,
  total: number,
  amountReceived?: number,
  operatorVerified = false,
) {
  if (method === "CASH") return (amountReceived ?? 0) >= total
  return operatorVerified
}
