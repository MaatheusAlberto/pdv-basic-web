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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  RotateCcw,
  Calendar,
  User,
  Filter,
  Minus,
  Plus,
  Package,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import {
  getItensParaDevolucao,
  createDevolucaoItens,
  type ItemParaDevolucao,
} from "@/actions/devolucao-actions";
import { getClientes, type Cliente } from "@/actions/cliente-actions";
import { getProdutos, type Produto } from "@/actions/produto-actions";
import { toast } from "sonner";

const toInputDate = (date: Date) => {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const hoje = () => toInputDate(new Date());

const diasAtras = (dias: number) => {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return toInputDate(data);
};

const DATA_INICIAL_PADRAO = () => diasAtras(30);

export function DevolucoesPageClient() {
  const [itens, setItens] = useState<ItemParaDevolucao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);

  // Quantidade selecionada para devolução por item (chave = vendaId-produtoId)
  const [selecionados, setSelecionados] = useState<Record<string, number>>({});

  // Filtros
  const [selectedCliente, setSelectedCliente] = useState<string>("all");
  const [selectedProduto, setSelectedProduto] = useState<string>("all");
  const [dataInicial, setDataInicial] = useState<string>(DATA_INICIAL_PADRAO);
  const [dataFinal, setDataFinal] = useState<string>(hoje);
  const [busca, setBusca] = useState("");
  const [somenteDisponiveis, setSomenteDisponiveis] = useState(true);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const loadItens = async () => {
    try {
      setLoading(true);
      const data = await getItensParaDevolucao({
        clienteId: selectedCliente,
        produtoId: selectedProduto,
        dataInicial,
        dataFinal,
      });
      setItens(data);

      // Manter apenas as seleções de itens que continuam na lista
      setSelecionados((atual) => {
        const chavesValidas = new Set(data.map((item) => item.chave));
        const novo: Record<string, number> = {};
        for (const [chave, quantidade] of Object.entries(atual)) {
          if (chavesValidas.has(chave)) novo[chave] = quantidade;
        }
        return novo;
      });
    } catch (error) {
      console.error("Erro ao carregar itens para devolução:", error);
      toast.error("Erro ao carregar itens para devolução");
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      setClientes(await getClientes());
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast.error("Erro ao carregar clientes");
    }
  };

  const loadProdutos = async () => {
    try {
      setProdutos(await getProdutos());
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  useEffect(() => {
    loadClientes();
    loadProdutos();
  }, []);

  useEffect(() => {
    loadItens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCliente, selectedProduto, dataInicial, dataFinal]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCliente, selectedProduto, dataInicial, dataFinal, busca, somenteDisponiveis]);

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
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return itens.filter((item) => {
      if (somenteDisponiveis && item.quantidadeDisponivel <= 0) return false;
      if (!termo) return true;

      return (
        item.produtoNome.toLowerCase().includes(termo) ||
        item.clienteNome.toLowerCase().includes(termo) ||
        item.vendaId.toString().includes(termo)
      );
    });
  }, [itens, busca, somenteDisponiveis]);

  const totalPages = Math.max(
    Math.ceil(itensFiltrados.length / itemsPerPage),
    1
  );
  const paginaAtual = Math.min(currentPage, totalPages);
  const startIndex = (paginaAtual - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const itensPaginados = itensFiltrados.slice(startIndex, endIndex);

  const itensSelecionados = useMemo(
    () =>
      itens
        .filter((item) => (selecionados[item.chave] || 0) > 0)
        .map((item) => ({ item, quantidade: selecionados[item.chave] })),
    [itens, selecionados]
  );

  const totalSelecionado = itensSelecionados.reduce(
    (total, { item, quantidade }) => total + quantidade * item.precoUnitario,
    0
  );

  const quantidadeSelecionada = itensSelecionados.reduce(
    (total, { quantidade }) => total + quantidade,
    0
  );

  const stats = useMemo(() => {
    const disponiveis = itensFiltrados.reduce(
      (total, item) => total + item.quantidadeDisponivel,
      0
    );
    const valorDisponivel = itensFiltrados.reduce(
      (total, item) => total + item.quantidadeDisponivel * item.precoUnitario,
      0
    );
    const jaDevolvidos = itensFiltrados.reduce(
      (total, item) => total + item.quantidadeDevolvida,
      0
    );

    return { disponiveis, valorDisponivel, jaDevolvidos };
  }, [itensFiltrados]);

  const setQuantidade = (item: ItemParaDevolucao, quantidade: number) => {
    const valor = Math.max(
      0,
      Math.min(Math.floor(quantidade) || 0, item.quantidadeDisponivel)
    );

    setSelecionados((atual) => {
      const novo = { ...atual };
      if (valor <= 0) {
        delete novo[item.chave];
      } else {
        novo[item.chave] = valor;
      }
      return novo;
    });
  };

  const limparSelecao = () => setSelecionados({});

  const limparFiltros = () => {
    setSelectedCliente("all");
    setSelectedProduto("all");
    setDataInicial(DATA_INICIAL_PADRAO());
    setDataFinal(hoje());
    setBusca("");
    setSomenteDisponiveis(true);
  };

  const filtrosAtivos =
    selectedCliente !== "all" ||
    selectedProduto !== "all" ||
    busca !== "" ||
    !somenteDisponiveis ||
    dataInicial !== DATA_INICIAL_PADRAO() ||
    dataFinal !== hoje();

  const handleConfirmarDevolucao = async () => {
    if (itensSelecionados.length === 0) return;

    setIsSaving(true);

    try {
      const result = await createDevolucaoItens({
        itens: itensSelecionados.map(({ item, quantidade }) => ({
          vendaId: BigInt(item.vendaId.toString()),
          produtoId: BigInt(item.produtoId.toString()),
          quantidade,
        })),
      });

      if (result.success) {
        toast.success(result.message);
        limparSelecao();
        setShowConfirmacao(false);
        await loadItens();
      } else {
        toast.error(result.error || "Erro ao registrar devolução");
      }
    } catch (error) {
      console.error("Erro ao registrar devolução:", error);
      toast.error("Erro inesperado ao registrar devolução");
    } finally {
      setIsSaving(false);
    }
  };

  // Agrupar os itens selecionados por venda para a confirmação
  const selecionadosPorVenda = useMemo(() => {
    const grupos = new Map<
      string,
      {
        vendaId: string;
        dataVenda: Date;
        clienteNome: string;
        itens: { item: ItemParaDevolucao; quantidade: number }[];
        total: number;
      }
    >();

    for (const selecionado of itensSelecionados) {
      const chave = selecionado.item.vendaId.toString();
      const grupo = grupos.get(chave) || {
        vendaId: chave,
        dataVenda: selecionado.item.dataVenda,
        clienteNome: selecionado.item.clienteNome,
        itens: [],
        total: 0,
      };

      grupo.itens.push(selecionado);
      grupo.total += selecionado.quantidade * selecionado.item.precoUnitario;
      grupos.set(chave, grupo);
    }

    return Array.from(grupos.values());
  }, [itensSelecionados]);

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Devoluções</h1>
          <p className="text-gray-600">
            Selecione os itens vendidos que deseja devolver
          </p>
        </div>
        {quantidadeSelecionada > 0 && (
          <Button
            variant="outline"
            onClick={limparSelecao}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Limpar seleção
          </Button>
        )}
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
            <div className="w-full sm:w-auto">
              <Label className="text-sm font-medium">Cliente</Label>
              <Select
                value={selectedCliente}
                onValueChange={setSelectedCliente}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem
                      key={cliente.id.toString()}
                      value={cliente.id.toString()}
                    >
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-auto">
              <Label className="text-sm font-medium">Produto</Label>
              <Select
                value={selectedProduto}
                onValueChange={setSelectedProduto}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem
                      key={produto.id.toString()}
                      value={produto.id.toString()}
                    >
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-auto">
              <Label htmlFor="data-inicial" className="text-sm font-medium">
                Data Inicial
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
                Data Final
              </Label>
              <Input
                id="data-final"
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="w-full sm:w-64">
              <Label htmlFor="busca" className="text-sm font-medium">
                Buscar
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="busca"
                  placeholder="Produto, cliente ou nº da venda"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Button
              type="button"
              variant={somenteDisponiveis ? "default" : "outline"}
              size="sm"
              onClick={() => setSomenteDisponiveis((atual) => !atual)}
              className="shrink-0"
            >
              {somenteDisponiveis
                ? "Somente disponíveis"
                : "Mostrando todos os itens"}
            </Button>

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
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Itens Encontrados
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itensFiltrados.length}</div>
            <p className="text-xs text-muted-foreground">
              linhas de produtos vendidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Disponível p/ Devolver
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.disponiveis}</div>
            <p className="text-xs text-muted-foreground">
              {formatPrice(stats.valorDisponivel)} em produtos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Já Devolvidos</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.jaDevolvidos}
            </div>
            <p className="text-xs text-muted-foreground">
              itens devolvidos no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selecionados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quantidadeSelecionada}</div>
            <p className="text-xs text-muted-foreground">
              {formatPrice(totalSelecionado)} a devolver
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Itens */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle>Itens Vendidos</CardTitle>
          {itensFiltrados.length > 0 && (
            <div className="text-sm text-gray-600">
              Mostrando {startIndex + 1}-
              {Math.min(endIndex, itensFiltrados.length)} de{" "}
              {itensFiltrados.length}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Carregando itens...</p>
          ) : itensFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhum item encontrado</p>
              <p className="text-gray-400">
                Ajuste o período ou os filtros para localizar a venda
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
            <>
              <div className="space-y-3">
                {itensPaginados.map((item) => {
                  const quantidade = selecionados[item.chave] || 0;
                  const esgotado = item.quantidadeDisponivel <= 0;

                  return (
                    <div
                      key={item.chave}
                      className={`border rounded-lg p-3 md:p-4 flex flex-col lg:flex-row lg:items-center gap-3 ${
                        quantidade > 0
                          ? "border-red-300 bg-red-50"
                          : esgotado
                          ? "bg-gray-50"
                          : ""
                      }`}
                    >
                      {/* Identificação do item */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {item.produtoNome}
                          </span>
                          <Badge variant="outline">
                            Venda #{item.vendaId.toString()}
                          </Badge>
                          {esgotado && (
                            <Badge className="bg-red-100 text-red-700 border border-red-200">
                              Totalmente devolvido
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(item.dataVenda)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {item.clienteNome}
                          </span>
                          <span>{formatPrice(item.precoUnitario)} / un.</span>
                        </div>
                      </div>

                      {/* Quantidades */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-gray-500">Vendido</div>
                          <div className="font-semibold">
                            {item.quantidadeVendida}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">Devolvido</div>
                          <div className="font-semibold text-red-600">
                            {item.quantidadeDevolvida}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">Disponível</div>
                          <div className="font-semibold text-green-600">
                            {item.quantidadeDisponivel}
                          </div>
                        </div>
                      </div>

                      {/* Seleção */}
                      <div className="flex items-center gap-2 lg:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          disabled={esgotado || quantidade <= 0}
                          onClick={() => setQuantidade(item, quantidade - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          max={item.quantidadeDisponivel}
                          value={quantidade}
                          disabled={esgotado}
                          onChange={(e) =>
                            setQuantidade(item, parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          disabled={
                            esgotado || quantidade >= item.quantidadeDisponivel
                          }
                          onClick={() => setQuantidade(item, quantidade + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            esgotado || quantidade === item.quantidadeDisponivel
                          }
                          onClick={() =>
                            setQuantidade(item, item.quantidadeDisponivel)
                          }
                        >
                          Tudo
                        </Button>
                        <div className="w-24 text-right font-semibold text-red-600">
                          {quantidade > 0
                            ? `-${formatPrice(quantidade * item.precoUnitario)}`
                            : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={paginaAtual === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={paginaAtual === totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-sm text-gray-600">
                    Página {paginaAtual} de {totalPages}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Barra de resumo da devolução */}
      {quantidadeSelecionada > 0 && (
        <div className="sticky bottom-0 z-10 rounded-lg border border-red-200 bg-white shadow-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-semibold">
              {quantidadeSelecionada}{" "}
              {quantidadeSelecionada === 1 ? "item" : "itens"} selecionado
              {quantidadeSelecionada === 1 ? "" : "s"} em{" "}
              {selecionadosPorVenda.length}{" "}
              {selecionadosPorVenda.length === 1 ? "venda" : "vendas"}
            </div>
            <div className="text-sm text-gray-600">
              Total a devolver:{" "}
              <span className="font-semibold text-red-600">
                -{formatPrice(totalSelecionado)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={limparSelecao}>
              Limpar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
              onClick={() => setShowConfirmacao(true)}
            >
              <RotateCcw className="h-4 w-4" />
              Registrar Devolução
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmacao} onOpenChange={setShowConfirmacao}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Confirmar Devolução
            </DialogTitle>
            <DialogDescription>
              Confira os itens e quantidades antes de registrar
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {selecionadosPorVenda.map((grupo) => (
              <Card key={grupo.vendaId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Venda #{grupo.vendaId}</Badge>
                    <span className="text-sm font-normal text-gray-600">
                      {formatDate(grupo.dataVenda)} • {grupo.clienteNome}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {grupo.itens.map(({ item, quantidade }) => (
                    <div
                      key={item.chave}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg gap-1"
                    >
                      <div>
                        <div className="font-medium">{item.produtoNome}</div>
                        <div className="text-sm text-gray-600">
                          {formatPrice(item.precoUnitario)} × {quantidade}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="font-semibold text-red-600">
                          -{formatPrice(quantidade * item.precoUnitario)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Qtd: {quantidade} de {item.quantidadeDisponivel}{" "}
                          disponíveis
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t text-sm">
                    <span className="text-gray-600">Subtotal da venda</span>
                    <span className="font-semibold text-red-600">
                      -{formatPrice(grupo.total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex-shrink-0 pt-4 border-t bg-white space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total a Devolver:</span>
              <span className="text-xl font-bold text-red-600">
                -{formatPrice(totalSelecionado)}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmacao(false)}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarDevolucao}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {isSaving ? "Processando..." : "Confirmar Devolução"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
