"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  Search,
  Filter,
  Users,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Phone,
} from "lucide-react";
import {
  getContasAReceber,
  createPagamentosLote,
  type ContaAReceber,
} from "@/actions/pagamento-actions";
import { FORMAS_PAGAMENTO, arredondar } from "@/lib/pagamento";
import { toast } from "sonner";

const SEM_FORMA = "nao-informado";

export function RecebimentosPageClient() {
  const [contas, setContas] = useState<ContaAReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);

  // Valor a receber por cliente (chave = clienteId)
  const [valores, setValores] = useState<Record<string, number>>({});
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const [busca, setBusca] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [ordenacao, setOrdenacao] = useState<"valor" | "antigo" | "nome">(
    "valor"
  );
  const [formaPagamento, setFormaPagamento] = useState(SEM_FORMA);
  const [observacao, setObservacao] = useState("");

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

  const loadContas = async () => {
    try {
      setLoading(true);
      const data = await getContasAReceber({
        dataInicial: dataInicial || undefined,
        dataFinal: dataFinal || undefined,
      });
      setContas(data);

      // Manter apenas seleções de clientes que continuam na lista
      setValores((atual) => {
        const chavesValidas = new Set(
          data.map((conta) => conta.clienteId.toString())
        );
        const novo: Record<string, number> = {};
        for (const [chave, valor] of Object.entries(atual)) {
          if (chavesValidas.has(chave)) novo[chave] = valor;
        }
        return novo;
      });
    } catch (error) {
      console.error("Erro ao carregar contas a receber:", error);
      toast.error("Erro ao carregar contas a receber");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicial, dataFinal]);

  const contasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const lista = contas.filter((conta) => {
      if (!termo) return true;
      return (
        conta.clienteNome.toLowerCase().includes(termo) ||
        (conta.telefone || "").toLowerCase().includes(termo)
      );
    });

    return [...lista].sort((a, b) => {
      if (ordenacao === "nome") {
        return a.clienteNome.localeCompare(b.clienteNome);
      }
      if (ordenacao === "antigo") {
        return b.diasEmAberto - a.diasEmAberto;
      }
      return b.totalEmAberto - a.totalEmAberto;
    });
  }, [contas, busca, ordenacao]);

  const stats = useMemo(() => {
    const totalAReceber = arredondar(
      contasFiltradas.reduce((total, conta) => total + conta.totalEmAberto, 0)
    );
    const totalCreditos = arredondar(
      contasFiltradas.reduce((total, conta) => total + conta.totalCreditos, 0)
    );
    const clientesEmAberto = contasFiltradas.filter(
      (conta) => conta.totalEmAberto > 0
    ).length;
    const maisAntigo = contasFiltradas.reduce(
      (max, conta) => Math.max(max, conta.diasEmAberto),
      0
    );

    return { totalAReceber, totalCreditos, clientesEmAberto, maisAntigo };
  }, [contasFiltradas]);

  const selecionados = useMemo(
    () =>
      contas
        .filter((conta) => (valores[conta.clienteId.toString()] || 0) > 0)
        .map((conta) => ({
          conta,
          valor: valores[conta.clienteId.toString()],
        })),
    [contas, valores]
  );

  const totalSelecionado = arredondar(
    selecionados.reduce((total, item) => total + item.valor, 0)
  );

  const setValor = (conta: ContaAReceber, valor: number) => {
    const chave = conta.clienteId.toString();
    const final = arredondar(
      Math.max(0, Math.min(valor || 0, conta.totalEmAberto))
    );

    setValores((atual) => {
      const novo = { ...atual };
      if (final <= 0) {
        delete novo[chave];
      } else {
        novo[chave] = final;
      }
      return novo;
    });
  };

  const selecionarTodos = () => {
    const novo: Record<string, number> = {};
    for (const conta of contasFiltradas) {
      if (conta.totalEmAberto > 0) {
        novo[conta.clienteId.toString()] = conta.totalEmAberto;
      }
    }
    setValores(novo);
  };

  const limparSelecao = () => setValores({});

  const limparFiltros = () => {
    setBusca("");
    setDataInicial("");
    setDataFinal("");
    setOrdenacao("valor");
  };

  const filtrosAtivos =
    busca !== "" ||
    dataInicial !== "" ||
    dataFinal !== "" ||
    ordenacao !== "valor";

  const handleConfirmar = async () => {
    if (selecionados.length === 0) return;

    setIsSaving(true);

    try {
      const result = await createPagamentosLote({
        pagamentos: selecionados.map(({ conta, valor }) => ({
          clienteId: BigInt(conta.clienteId.toString()),
          valor,
        })),
        formaPagamento: formaPagamento === SEM_FORMA ? null : formaPagamento,
        observacao: observacao.trim() || null,
        dataInicial: dataInicial || undefined,
        dataFinal: dataFinal || undefined,
      });

      if (result.success) {
        toast.success(result.message);
        limparSelecao();
        setObservacao("");
        setShowConfirmacao(false);
        await loadContas();
      } else {
        toast.error(result.error || "Erro ao registrar os pagamentos");
      }
    } catch (error) {
      console.error("Erro ao registrar pagamentos:", error);
      toast.error("Erro inesperado ao registrar os pagamentos");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Recebimentos</h1>
          <p className="text-gray-600">
            Dê baixa no que os clientes estão devendo — tudo de uma vez ou em
            parte
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={selecionarTodos}
            disabled={stats.clientesEmAberto === 0}
          >
            Selecionar todos
          </Button>
          {selecionados.length > 0 && (
            <Button
              variant="outline"
              onClick={limparSelecao}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-end">
            <div className="w-full sm:w-64">
              <Label htmlFor="busca" className="text-sm font-medium">
                Buscar cliente
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="busca"
                  placeholder="Nome ou telefone"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <Label htmlFor="data-inicial" className="text-sm font-medium">
                Vendas a partir de
              </Label>
              <Input
                id="data-inicial"
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="w-full sm:w-auto">
              <Label htmlFor="data-final" className="text-sm font-medium">
                Vendas até
              </Label>
              <Input
                id="data-final"
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="w-full sm:w-48">
              <Label className="text-sm font-medium">Ordenar por</Label>
              <Select
                value={ordenacao}
                onValueChange={(value) =>
                  setOrdenacao(value as "valor" | "antigo" | "nome")
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">Maior valor</SelectItem>
                  <SelectItem value="antigo">Mais antigo</SelectItem>
                  <SelectItem value="nome">Nome do cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtrosAtivos && (
              <Button
                variant="outline"
                size="sm"
                onClick={limparFiltros}
                className="shrink-0"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
          {(dataInicial || dataFinal) && (
            <p className="mt-2 text-xs text-gray-500">
              Sem datas, a tela mostra tudo o que está em aberto, de qualquer
              período.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatPrice(stats.totalAReceber)}
            </div>
            <p className="text-xs text-muted-foreground">em vendas em aberto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Devendo
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientesEmAberto}</div>
            <p className="text-xs text-muted-foreground">
              clientes com saldo em aberto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Antigo</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.maisAntigo}</div>
            <p className="text-xs text-muted-foreground">
              dias desde a venda mais antiga
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selecionado</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(totalSelecionado)}
            </div>
            <p className="text-xs text-muted-foreground">
              {selecionados.length} cliente(s) para dar baixa
              {stats.totalCreditos > 0 &&
                ` • ${formatPrice(stats.totalCreditos)} de crédito`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de clientes */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle>Clientes em Aberto</CardTitle>
          {contasFiltradas.length > 0 && (
            <div className="text-sm text-gray-600">
              {contasFiltradas.length} cliente(s)
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Carregando contas a receber...</p>
          ) : contasFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Nenhum cliente com saldo em aberto
              </p>
              <p className="text-gray-400">
                {filtrosAtivos
                  ? "Tente ajustar os filtros"
                  : "Está tudo quitado por aqui"}
              </p>
              {filtrosAtivos && (
                <Button
                  variant="outline"
                  onClick={limparFiltros}
                  className="mt-4"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {contasFiltradas.map((conta) => {
                const chave = conta.clienteId.toString();
                const valor = valores[chave] || 0;
                const expandido = !!expandidos[chave];

                return (
                  <div
                    key={chave}
                    className={`border rounded-lg p-3 md:p-4 ${
                      valor > 0 ? "border-green-300 bg-green-50" : ""
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                      {/* Cliente */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {conta.clienteNome}
                          </span>
                          {conta.diasEmAberto >= 30 &&
                            conta.totalEmAberto > 0 && (
                              <Badge className="bg-red-100 text-red-700 border border-red-200">
                                {conta.diasEmAberto} dias
                              </Badge>
                            )}
                          {conta.totalCreditos > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                              Crédito {formatPrice(conta.totalCreditos)}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>
                            {conta.quantidadeVendasEmAberto} venda(s) em aberto
                          </span>
                          {conta.vendaMaisAntiga && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              desde {formatDate(conta.vendaMaisAntiga)}
                            </span>
                          )}
                          {conta.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {conta.telefone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Saldo */}
                      <div className="text-left lg:text-right">
                        <div className="text-sm text-gray-500">Em aberto</div>
                        <div className="text-lg font-bold text-orange-600">
                          {formatPrice(conta.totalEmAberto)}
                        </div>
                      </div>

                      {/* Baixa */}
                      {conta.totalEmAberto > 0 && (
                        <div className="flex items-center gap-2 lg:justify-end">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={conta.totalEmAberto}
                            value={valor || ""}
                            placeholder="0,00"
                            onChange={(e) =>
                              setValor(conta, parseFloat(e.target.value) || 0)
                            }
                            className="w-28 text-right"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={valor === conta.totalEmAberto}
                            onClick={() => setValor(conta, conta.totalEmAberto)}
                          >
                            Tudo
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2"
                            onClick={() =>
                              setExpandidos((atual) => ({
                                ...atual,
                                [chave]: !atual[chave],
                              }))
                            }
                          >
                            {expandido ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Vendas em aberto do cliente */}
                    {expandido && (
                      <div className="mt-3 border-t pt-3">
                        <div className="text-xs text-gray-500 mb-2">
                          O valor recebido abate primeiro as vendas mais
                          antigas:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {conta.vendasEmAberto.map((venda) => (
                            <div
                              key={venda.vendaId.toString()}
                              className="flex items-center justify-between rounded bg-white border px-3 py-2 text-sm"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    #{venda.vendaId.toString()}
                                  </Badge>
                                  <span className="text-gray-600">
                                    {formatDate(venda.dataVenda)}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  Venda {formatPrice(venda.totalLiquido)} • Pago{" "}
                                  {formatPrice(venda.totalPago)}
                                </div>
                              </div>
                              <div className="font-semibold text-orange-600">
                                {formatPrice(venda.saldo)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barra de baixa */}
      {selecionados.length > 0 && (
        <div className="sticky bottom-0 z-10 rounded-lg border border-green-200 bg-white shadow-lg p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-semibold">
              {selecionados.length}{" "}
              {selecionados.length === 1 ? "cliente" : "clientes"} selecionado
              {selecionados.length === 1 ? "" : "s"}
            </div>
            <div className="text-sm text-gray-600">
              Total a receber:{" "}
              <span className="font-semibold text-green-600">
                {formatPrice(totalSelecionado)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="w-full sm:w-48">
              <Label className="text-xs text-gray-500">
                Forma de pagamento
              </Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger className="mt-1 w-full">
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

            <div className="w-full sm:w-56">
              <Label className="text-xs text-gray-500">Observação</Label>
              <Input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Opcional"
                className="mt-1"
              />
            </div>

            <Button
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              onClick={() => setShowConfirmacao(true)}
            >
              <Wallet className="h-4 w-4" />
              Registrar Baixa
            </Button>
          </div>
        </div>
      )}

      {/* Confirmação */}
      <Dialog open={showConfirmacao} onOpenChange={setShowConfirmacao}>
        <DialogContent className="flex max-h-[92vh] w-[95vw] flex-col gap-4 overflow-hidden p-4 sm:max-w-lg sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Confirmar Recebimento
            </DialogTitle>
            <DialogDescription>
              Confira os valores antes de dar baixa
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {selecionados.map(({ conta, valor }) => (
              <div
                key={conta.clienteId.toString()}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">{conta.clienteNome}</div>
                  <div className="text-xs text-gray-500">
                    Em aberto {formatPrice(conta.totalEmAberto)}
                    {valor < conta.totalEmAberto &&
                      ` • sobra ${formatPrice(conta.totalEmAberto - valor)}`}
                  </div>
                </div>
                <div className="font-semibold text-green-600">
                  {formatPrice(valor)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex-shrink-0 space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-xl font-bold text-green-600">
                {formatPrice(totalSelecionado)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Forma:{" "}
              {formaPagamento === SEM_FORMA ? "não informada" : formaPagamento}
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmacao(false)}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmar}
                disabled={isSaving}
                className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
              >
                {isSaving ? "Registrando..." : "Confirmar Baixa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
