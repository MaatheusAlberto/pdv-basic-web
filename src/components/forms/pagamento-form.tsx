"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import {
  createPagamento,
  createPagamentoCliente,
  getResumoPagamentoCliente,
  type ResumoPagamentoCliente,
} from "@/actions/pagamento-actions";
import { FORMAS_PAGAMENTO, arredondar } from "@/lib/pagamento";
import type { Venda } from "@/actions/venda-actions";
import { toast } from "sonner";

const SEM_FORMA = "nao-informado";

interface PagamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Modo venda: recebe pagamento de uma venda específica */
  venda?: Venda;
  /** Modo cliente: recebe pagamento no total em aberto do cliente */
  cliente?: { id: string; nome: string };
  /** Período considerado no modo cliente (mesmo filtro da tela) */
  periodo?: { dataInicial?: string; dataFinal?: string };
}

export function PagamentoForm({
  open,
  onOpenChange,
  onSuccess,
  venda,
  cliente,
  periodo,
}: PagamentoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState(SEM_FORMA);
  const [observacao, setObservacao] = useState("");
  const [resumoCliente, setResumoCliente] =
    useState<ResumoPagamentoCliente | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(false);

  const modoCliente = !venda && !!cliente;

  const saldoEmAberto = modoCliente
    ? resumoCliente?.totalEmAberto ?? 0
    : venda?.saldo ?? 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));

  // Carregar o que o cliente deve quando o modal abre no modo cliente
  useEffect(() => {
    const carregar = async () => {
      if (!open || !modoCliente || !cliente) return;

      try {
        setCarregandoResumo(true);
        const resumo = await getResumoPagamentoCliente({
          clienteId: BigInt(cliente.id),
          dataInicial: periodo?.dataInicial,
          dataFinal: periodo?.dataFinal,
        });
        setResumoCliente(resumo);
        setValor(resumo.totalEmAberto > 0 ? resumo.totalEmAberto.toFixed(2) : "");
      } catch (error) {
        console.error("Erro ao carregar saldo do cliente:", error);
        toast.error("Erro ao carregar saldo do cliente");
      } finally {
        setCarregandoResumo(false);
      }
    };

    carregar();
  }, [open, modoCliente, cliente, periodo?.dataInicial, periodo?.dataFinal]);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setValor("");
      setFormaPagamento(SEM_FORMA);
      setObservacao("");
      setResumoCliente(null);
      return;
    }

    if (venda) {
      setValor(venda.saldo > 0 ? venda.saldo.toFixed(2) : "");
    }
  }, [open, venda]);

  const handleSubmit = async () => {
    const valorNumerico = arredondar(parseFloat(valor.replace(",", ".")) || 0);

    if (valorNumerico <= 0) {
      toast.error("Informe um valor maior que zero");
      return;
    }

    if (valorNumerico > saldoEmAberto) {
      toast.error(
        `Valor maior que o saldo em aberto (${formatPrice(saldoEmAberto)})`
      );
      return;
    }

    setIsLoading(true);

    try {
      const forma =
        formaPagamento === SEM_FORMA ? null : formaPagamento;
      const obs = observacao.trim() || null;

      const result =
        modoCliente && cliente
          ? await createPagamentoCliente({
              clienteId: BigInt(cliente.id),
              valor: valorNumerico,
              formaPagamento: forma,
              observacao: obs,
              dataInicial: periodo?.dataInicial,
              dataFinal: periodo?.dataFinal,
            })
          : await createPagamento({
              vendaId: BigInt(venda!.id.toString()),
              valor: valorNumerico,
              formaPagamento: forma,
              observacao: obs,
            });

      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || "Erro ao registrar pagamento");
      }
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      toast.error("Erro inesperado ao registrar pagamento");
    } finally {
      setIsLoading(false);
    }
  };

  if (!venda && !cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] flex-col gap-4 overflow-hidden p-4 sm:max-w-lg sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>
            {modoCliente
              ? `Pagamento no total em aberto de ${cliente?.nome}`
              : `Pagamento da venda #${venda?.id.toString()} — ${
                  venda?.cliente.nome
                }`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {/* Resumo do que está em aberto */}
          <div className="rounded-lg border p-3 text-sm">
            {modoCliente ? (
              carregandoResumo ? (
                <p className="text-gray-500">Carregando saldo do cliente...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total em aberto</span>
                    <span className="text-lg font-bold text-orange-600">
                      {formatPrice(resumoCliente?.totalEmAberto ?? 0)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {resumoCliente?.vendasEmAberto.length ?? 0} venda(s) em
                    aberto — o pagamento abate primeiro as mais antigas
                  </div>

                  {(resumoCliente?.vendasEmAberto.length ?? 0) > 0 && (
                    <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                      {resumoCliente!.vendasEmAberto.map((item) => (
                        <div
                          key={item.vendaId.toString()}
                          className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs"
                        >
                          <span className="flex items-center gap-2">
                            <Badge variant="outline">
                              #{item.vendaId.toString()}
                            </Badge>
                            {formatDate(item.dataVenda)}
                          </span>
                          <span className="font-medium text-orange-600">
                            {formatPrice(item.saldo)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(resumoCliente?.totalCreditos ?? 0) > 0 && (
                    <div className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                      Este cliente tem{" "}
                      {formatPrice(resumoCliente!.totalCreditos)} de crédito
                      (devoluções depois do pagamento)
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Valor da venda</span>
                  <span className="font-medium">
                    {formatPrice(venda?.totalLiquido ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Já pago</span>
                  <span className="font-medium text-green-600">
                    {formatPrice(venda?.totalPago ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-1">
                  <span className="text-gray-600">Em aberto</span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatPrice(venda?.saldo ?? 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Valor */}
          <div>
            <Label htmlFor="valor-pagamento">Valor recebido *</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="valor-pagamento"
                type="number"
                step="0.01"
                min="0"
                max={saldoEmAberto}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setValor(saldoEmAberto.toFixed(2))}
                disabled={saldoEmAberto <= 0}
              >
                Tudo
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Pode ser um valor parcial — o saldo continua em aberto.
            </p>
          </div>

          {/* Forma de pagamento (opcional) */}
          <div>
            <Label htmlFor="forma-pagamento">Forma de pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger id="forma-pagamento" className="mt-1 w-full">
                <SelectValue placeholder="Não informar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_FORMA}>Não informar</SelectItem>
                {FORMAS_PAGAMENTO.map((forma) => (
                  <SelectItem key={forma} value={forma}>
                    {forma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observação */}
          <div>
            <Label htmlFor="observacao-pagamento">Observação</Label>
            <Input
              id="observacao-pagamento"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Opcional"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col justify-end gap-2 border-t pt-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || saldoEmAberto <= 0}
            className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
          >
            {isLoading ? "Registrando..." : "Registrar Pagamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
