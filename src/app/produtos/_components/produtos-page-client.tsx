"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { ProdutoForm } from "@/components/forms/produto-form";
import {
  getProdutos,
  getResumoVendasProdutos,
  deleteProduto,
  type Produto,
  type ResumoProduto,
} from "@/actions/produto-actions";
import { toast } from "sonner";

export function ProdutosPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [resumos, setResumos] = useState<ResumoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduto, setEditingProduto] = useState<Produto | undefined>();
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(
    null
  );
  const [excluindo, setExcluindo] = useState(false);
  const [busca, setBusca] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [ordenacao, setOrdenacao] = useState<
    "nome" | "maiorPreco" | "menorPreco" | "maisVendidos"
  >("nome");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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

  const loadDados = async () => {
    try {
      setLoading(true);
      const [produtosData, resumosData] = await Promise.all([
        getProdutos(),
        getResumoVendasProdutos({
          dataInicial: dataInicial || undefined,
          dataFinal: dataFinal || undefined,
        }),
      ]);
      setProdutos(produtosData);
      setResumos(resumosData);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicial, dataFinal]);

  const periodoAtivo = dataInicial !== "" || dataFinal !== "";

  const descricaoPeriodo = () => {
    if (!periodoAtivo) return "todo o período";
    if (dataInicial && dataFinal) {
      return `${formatDate(new Date(`${dataInicial}T00:00:00`))} a ${formatDate(
        new Date(`${dataFinal}T00:00:00`)
      )}`;
    }
    if (dataInicial) {
      return `a partir de ${formatDate(new Date(`${dataInicial}T00:00:00`))}`;
    }
    return `até ${formatDate(new Date(`${dataFinal}T00:00:00`))}`;
  };

  const aplicarPreset = (dias: number) => {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - dias);

    const paraInput = (data: Date) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const dia = String(data.getDate()).padStart(2, "0");
      return `${ano}-${mes}-${dia}`;
    };

    setDataInicial(paraInput(inicio));
    setDataFinal(paraInput(fim));
  };

  const limparPeriodo = () => {
    setDataInicial("");
    setDataFinal("");
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [busca, ordenacao, dataInicial, dataFinal]);

  const resumoPorProduto = useMemo(() => {
    const mapa = new Map<string, ResumoProduto>();
    for (const resumo of resumos) {
      mapa.set(resumo.produtoId.toString(), resumo);
    }
    return mapa;
  }, [resumos]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const lista = produtos.filter((produto) =>
      termo ? produto.nome.toLowerCase().includes(termo) : true
    );

    return [...lista].sort((a, b) => {
      if (ordenacao === "maiorPreco") return b.preco - a.preco;
      if (ordenacao === "menorPreco") return a.preco - b.preco;
      if (ordenacao === "maisVendidos") {
        const vendaA =
          resumoPorProduto.get(a.id.toString())?.quantidadeLiquida || 0;
        const vendaB =
          resumoPorProduto.get(b.id.toString())?.quantidadeLiquida || 0;
        if (vendaA !== vendaB) return vendaB - vendaA;
      }
      return a.nome.localeCompare(b.nome);
    });
  }, [produtos, busca, ordenacao, resumoPorProduto]);

  const stats = useMemo(() => {
    const precoMedio =
      produtos.length > 0
        ? produtos.reduce((total, produto) => total + produto.preco, 0) /
          produtos.length
        : 0;
    const itensVendidos = resumos.reduce(
      (total, resumo) => total + resumo.quantidadeLiquida,
      0
    );
    const faturamento = resumos.reduce(
      (total, resumo) => total + resumo.faturamento,
      0
    );

    let maisVendido: { nome: string; quantidade: number } | null = null;
    for (const produto of produtos) {
      const quantidade =
        resumoPorProduto.get(produto.id.toString())?.quantidadeLiquida || 0;
      if (!maisVendido || quantidade > maisVendido.quantidade) {
        maisVendido = { nome: produto.nome, quantidade };
      }
    }

    const semVendas = produtos.filter(
      (produto) =>
        (resumoPorProduto.get(produto.id.toString())?.quantidadeVendida || 0) ===
        0
    ).length;

    return { precoMedio, itensVendidos, faturamento, maisVendido, semVendas };
  }, [produtos, resumos, resumoPorProduto]);

  const totalPages = Math.max(
    Math.ceil(produtosFiltrados.length / itemsPerPage),
    1
  );
  const paginaAtual = Math.min(currentPage, totalPages);
  const startIndex = (paginaAtual - 1) * itemsPerPage;
  const produtosPaginados = produtosFiltrados.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleNovoProduto = () => {
    setEditingProduto(undefined);
    setIsModalOpen(true);
  };

  const handleEditarProduto = (produto: Produto) => {
    setEditingProduto(produto);
    setIsModalOpen(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!produtoParaExcluir) return;

    setExcluindo(true);

    try {
      const result = await deleteProduto(produtoParaExcluir.id);

      if (result.success) {
        toast.success(result.message);
        loadDados();
        setProdutoParaExcluir(null);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      toast.error("Erro inesperado ao deletar produto");
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-gray-600">Gerencie seu catálogo de produtos</p>
        </div>
        <Button onClick={handleNovoProduto} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Filtro de período */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Período dos dados de venda
            <span className="text-sm font-normal text-gray-500">
              • {descricaoPeriodo()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-end">
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

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => aplicarPreset(0)}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aplicarPreset(7)}
              >
                7 dias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aplicarPreset(30)}
              >
                30 dias
              </Button>
              {periodoAtivo && (
                <Button variant="outline" size="sm" onClick={limparPeriodo}>
                  Limpar período
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            O período afeta apenas os números de venda (faturamento, itens
            vendidos, devoluções) — o catálogo continua mostrando todos os
            produtos. As vendas entram pela data da venda e as devoluções pela
            data em que foram feitas, igual ao relatório do Caixa.
          </p>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Produtos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{produtos.length}</div>
            <p className="text-xs text-muted-foreground">
              preço médio de {formatPrice(stats.precoMedio)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Itens Vendidos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.itensVendidos}</div>
            <p className="text-xs text-muted-foreground">
              {descricaoPeriodo()}, já descontadas as devoluções
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Vendido</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-lg font-bold">
              {stats.maisVendido && stats.maisVendido.quantidade > 0
                ? stats.maisVendido.nome
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.maisVendido && stats.maisVendido.quantidade > 0
                ? `${stats.maisVendido.quantidade} unidades • ${descricaoPeriodo()}`
                : `nenhuma venda em ${descricaoPeriodo()}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Faturamento em Produtos
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(stats.faturamento)}
            </div>
            <p className="text-xs text-muted-foreground">
              {periodoAtivo
                ? `${stats.semVendas} produto(s) sem venda no período`
                : `${stats.semVendas} produto(s) nunca vendido(s)`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <Label htmlFor="busca" className="text-sm font-medium">
                Buscar
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="busca"
                  placeholder="Nome do produto"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-56">
              <Label className="text-sm font-medium">Ordenar por</Label>
              <Select
                value={ordenacao}
                onValueChange={(value) =>
                  setOrdenacao(
                    value as "nome" | "maiorPreco" | "menorPreco" | "maisVendidos"
                  )
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                  <SelectItem value="maisVendidos">Mais vendidos</SelectItem>
                  <SelectItem value="maiorPreco">Maior preço</SelectItem>
                  <SelectItem value="menorPreco">Menor preço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {busca && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBusca("")}
                className="shrink-0"
              >
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de produtos */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle>
            {produtosFiltrados.length}{" "}
            {produtosFiltrados.length === 1 ? "produto" : "produtos"}
            {busca && " encontrado(s)"}
          </CardTitle>
          {produtosFiltrados.length > itemsPerPage && (
            <div className="text-sm text-gray-600">
              Mostrando {startIndex + 1}-
              {Math.min(startIndex + itemsPerPage, produtosFiltrados.length)} de{" "}
              {produtosFiltrados.length}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Carregando produtos...</p>
          ) : produtos.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhum produto cadastrado</p>
              <p className="text-gray-400">
                Clique em &quot;Novo Produto&quot; para começar
              </p>
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Nenhum produto encontrado para &quot;{busca}&quot;
              </p>
              <Button
                variant="outline"
                onClick={() => setBusca("")}
                className="mt-4"
              >
                Limpar busca
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {produtosPaginados.map((produto) => {
                  const resumo = resumoPorProduto.get(produto.id.toString());
                  const vendidos = resumo?.quantidadeLiquida || 0;
                  const devolvidos = resumo?.quantidadeDevolvida || 0;
                  // Produto com movimento nao pode ser excluido (regra da action)
                  const temMovimento = !!resumo;

                  return (
                    <div
                      key={produto.id.toString()}
                      className="flex flex-col justify-between rounded-lg border p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                          <Package className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium leading-snug">
                            {produto.nome}
                          </h4>
                          <div className="mt-1 text-xl font-semibold text-green-600">
                            {formatPrice(produto.preco)}
                          </div>
                        </div>
                      </div>

                      {/* Métricas de venda */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        {vendidos > 0 ? (
                          <>
                            <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                              {vendidos} vendidos
                            </Badge>
                            <span>{formatPrice(resumo?.faturamento || 0)}</span>
                            {devolvidos > 0 && (
                              <span className="flex items-center gap-1 text-red-600">
                                <RotateCcw className="h-3 w-3" />
                                {devolvidos} devolvidos
                              </span>
                            )}
                            {resumo?.ultimaVenda && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(resumo.ultimaVenda)}
                              </span>
                            )}
                          </>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 border border-gray-200">
                            {periodoAtivo
                              ? "Sem venda no período"
                              : "Nunca vendido"}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 flex justify-end gap-2 border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarProduto(produto)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={temMovimento}
                          title={
                            temMovimento
                              ? "Produto já usado em vendas ou devoluções não pode ser excluído"
                              : "Excluir produto"
                          }
                          onClick={() => setProdutoParaExcluir(produto)}
                          className="flex items-center gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
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

      <ProdutoForm
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        produto={editingProduto}
        onSuccess={loadDados}
      />

      {/* Confirmação de exclusão */}
      <Dialog
        open={!!produtoParaExcluir}
        onOpenChange={(open) => !open && setProdutoParaExcluir(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir produto</DialogTitle>
            <DialogDescription>
              {produtoParaExcluir &&
                `Tem certeza que deseja excluir "${produtoParaExcluir.nome}"? Produtos que já foram vendidos não podem ser excluídos.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setProdutoParaExcluir(null)}
              disabled={excluindo}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarExclusao}
              disabled={excluindo}
              className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
