// Regras compartilhadas de pagamento (usadas nas actions, na API do caixa e nas telas)

export const FORMAS_PAGAMENTO = [
  "Dinheiro",
  "PIX",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Transferência",
  "Outro",
] as const;

export type StatusPagamento = "PAGO" | "PARCIAL" | "PENDENTE" | "CREDITO";

// Tolerância para comparação de valores em reais (meio centavo)
const TOLERANCIA = 0.005;

export function arredondar(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularStatusPagamento(
  totalLiquido: number,
  totalPago: number
): StatusPagamento {
  const saldo = arredondar(totalLiquido - totalPago);

  // Pagou mais do que devia (normalmente devolução depois do pagamento)
  if (saldo < -TOLERANCIA) return "CREDITO";
  if (saldo <= TOLERANCIA) return "PAGO";
  if (totalPago > TOLERANCIA) return "PARCIAL";
  return "PENDENTE";
}

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  PAGO: "Pago",
  PARCIAL: "Pago parcial",
  PENDENTE: "Pendente",
  CREDITO: "Crédito ao cliente",
};

export function statusEmAberto(status: StatusPagamento) {
  return status === "PENDENTE" || status === "PARCIAL";
}
