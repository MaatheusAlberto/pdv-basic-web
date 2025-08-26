"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Plus,
  RotateCcw,
  Eye,
  ShoppingCart,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  Printer,
} from "lucide-react";
import { VendaForm, DevolucaoForm } from "@/components/forms";
import { getVendas, type Venda } from "@/actions/venda-actions";
import { getClientes, type Cliente } from "@/actions/cliente-actions";
import { getProdutos, type Produto } from "@/actions/produto-actions";
import { toast } from "sonner";

export function VendasPageClient() {
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);
  const [isDevolucaoModalOpen, setIsDevolucaoModalOpen] = useState(false);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | undefined>();
  const [selectedCliente, setSelectedCliente] = useState<string>("all");
  const [selectedProduto, setSelectedProduto] = useState<string>("all");
  const [dataInicial, setDataInicial] = useState<string>(() => {
    // Pega a data atual no formato YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [dataFinal, setDataFinal] = useState<string>(() => {
    // Pega a data atual no formato YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadVendas = async () => {
    try {
      setLoading(true);
      const vendasData = await getVendas();
      setVendas(vendasData);
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
      toast.error("Erro ao carregar vendas");
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const clientesData = await getClientes();
      setClientes(clientesData);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast.error("Erro ao carregar clientes");
    }
  };

  const loadProdutos = async () => {
    try {
      const produtosData = await getProdutos();
      setProdutos(produtosData);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  useEffect(() => {
    loadVendas();
    loadClientes();
    loadProdutos();
  }, []);

  const handleNovaVenda = () => {
    setIsVendaModalOpen(true);
  };

  const handleNovaDevolucao = (venda: Venda) => {
    setVendaSelecionada(venda);
    setIsDevolucaoModalOpen(true);
  };

  const handleImprimirComprovante = (venda: Venda) => {
    // Gerar conteúdo do comprovante em formato HTML para impressão
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comprovante - Venda #${venda.id.toString()}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 0;
            background: white;
          }
          .comprovante {
            width: 70mm;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .separator { border-top: 1px dashed #000; margin: 8px 0; }
          .item-line { 
            display: flex; 
            justify-content: space-between; 
            margin: 2px 0;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin: 4px 0;
          }
          @media print {
            body { background: white; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="comprovante">
          <div class="center bold">COMPROVANTE DE VENDA</div>
          <div class="center bold">Disk Bebida Gas Ouvidor</div>
          <div class="separator"></div>
          
          <div><strong>Venda:</strong> #${venda.id.toString()}</div>
          <div><strong>Data:</strong> ${formatDate(venda.dataVenda)}</div>
          <div><strong>Cliente:</strong> ${venda.cliente.nome}</div>
          
          <div class="separator"></div>
          
          <div class="bold">ITENS:</div>
          ${venda.itens
            .map(
              (item) => `
            <div style="margin: 4px 0;">
              <div>${item.produto.nome}</div>
              <div class="item-line">
                <span>Qtd: ${item.quantidade} x ${formatPrice(
                item.precoUnitario
              )}</span>
                <span>${formatPrice(
                  item.precoUnitario * item.quantidade
                )}</span>
              </div>
            </div>
          `
            )
            .join("")}
          
          <div class="separator"></div>
          
          <div class="total-line">
            <span>TOTAL:</span>
            <span>${formatPrice(venda.total)}</span>
          </div>
          
          ${
            venda.totalDevolvido > 0
              ? `
            <div class="total-line" style="color: red;">
              <span>DEVOLVIDO:</span>
              <span>-${formatPrice(venda.totalDevolvido)}</span>
            </div>
            <div class="total-line" style="color: green;">
              <span>LÍQUIDO:</span>
              <span>${formatPrice(venda.totalLiquido)}</span>
            </div>
          `
              : ""
          }
          
          <div class="separator"></div>
          <div class="center" style="font-size: 10px;">
            Obrigado pela preferência!
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      // Criar uma nova janela para impressão
      const printWindow = window.open("", "_blank", "width=300,height=600");

      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Aguardar o carregamento e abrir diálogo de impressão
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            // Opcional: fechar a janela após a impressão
            printWindow.onafterprint = () => {
              printWindow.close();
            };
          }, 250);
        };

        toast.success("Abrindo diálogo de impressão...");
      } else {
        // Fallback: criar blob para download se popup foi bloqueado
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `comprovante-venda-${venda.id.toString()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.warning(
          "Popup bloqueado. Arquivo baixado para impressão manual."
        );
      }
    } catch (error) {
      console.error("Erro ao gerar comprovante:", error);
      toast.error("Erro ao gerar comprovante para impressão");
    }
  };

  const handleSuccess = (vendaData?: any) => {
    loadVendas();

    if (vendaData) {
      setTimeout(() => {
        handleImprimirComprovante(vendaData);
      }, 500);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const calculateTotalItens = (venda: Venda) => {
    return venda.itens.reduce((total, item) => total + item.quantidade, 0);
  };

  // Filtrar vendas por cliente, produto e intervalo de datas
  const vendasFiltradas = vendas.filter((venda) => {
    // Filtro por cliente
    const clienteMatch =
      selectedCliente === "all" ||
      venda.cliente.id.toString() === selectedCliente;

    // Filtro por produto
    const produtoMatch =
      selectedProduto === "all" ||
      venda.itens.some(
        (item) => item.produto.id.toString() === selectedProduto
      );

    // Filtro por intervalo de datas
    const vendaDate = new Date(venda.dataVenda).toISOString().split("T")[0];
    const dataInicialMatch = vendaDate >= dataInicial;
    const dataFinalMatch = vendaDate <= dataFinal;
    const dateMatch = dataInicialMatch && dataFinalMatch;

    return clienteMatch && produtoMatch && dateMatch;
  });

  const getVendaStats = () => {
    const totalVendas = vendasFiltradas.length;
    const totalFaturamento = vendasFiltradas.reduce(
      (total, venda) => total + venda.totalLiquido,
      0
    );
    const totalDevolvido = vendasFiltradas.reduce(
      (total, venda) => total + venda.totalDevolvido,
      0
    );
    const vendasHoje = vendasFiltradas.filter((venda) => {
      const hoje = new Date();
      const dataVenda = new Date(venda.dataVenda);
      return dataVenda.toDateString() === hoje.toDateString();
    }).length;

    return { totalVendas, totalFaturamento, totalDevolvido, vendasHoje };
  };

  const stats = getVendaStats();

  // Funções de paginação
  const totalPages = Math.ceil(vendasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const vendasPaginadas = vendasFiltradas.slice(startIndex, endIndex);

  // Reset da página quando mudar o filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCliente, dataInicial, dataFinal]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendas</h1>
          <p className="text-gray-600">Registre e acompanhe suas vendas</p>
        </div>
        <Button onClick={handleNovaVenda} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Venda
        </Button>
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
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div>
              <Label htmlFor="cliente-filter" className="text-sm font-medium">
                Cliente
              </Label>
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
            <div>
              <Label htmlFor="produto-filter" className="text-sm font-medium">
                Produto
              </Label>
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
            <div className="min-w-0 w-full sm:w-auto">
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
            <div className="min-w-0 w-full sm:w-auto">
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
            {(selectedCliente !== "all" ||
              selectedProduto !== "all" ||
              dataInicial !== new Date().toISOString().split("T")[0] ||
              dataFinal !== new Date().toISOString().split("T")[0]) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCliente("all");
                  setSelectedProduto("all");
                  const today = new Date().toISOString().split("T")[0];
                  setDataInicial(today);
                  setDataFinal(today);
                }}
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
              Total de Vendas
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVendas}</div>
            <p className="text-xs text-muted-foreground">vendas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Faturamento Líquido
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(stats.totalFaturamento)}
            </div>
            <p className="text-xs text-muted-foreground">após devoluções</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Devolvido
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPrice(stats.totalDevolvido)}
            </div>
            <p className="text-xs text-muted-foreground">em devoluções</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vendasHoje}</div>
            <p className="text-xs text-muted-foreground">
              vendas realizadas hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Vendas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Histórico de Vendas
            {(selectedCliente !== "all" ||
              dataInicial !== new Date().toISOString().split("T")[0] ||
              dataFinal !== new Date().toISOString().split("T")[0]) && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                • Filtrado por:{" "}
                {selectedCliente !== "all" &&
                  clientes.find((c) => c.id.toString() === selectedCliente)
                    ?.nome}
                {selectedCliente !== "all" &&
                  (dataInicial !== new Date().toISOString().split("T")[0] ||
                    dataFinal !== new Date().toISOString().split("T")[0]) &&
                  ", "}
                {(dataInicial !== new Date().toISOString().split("T")[0] ||
                  dataFinal !== new Date().toISOString().split("T")[0]) &&
                  `${new Date(dataInicial).toLocaleDateString(
                    "pt-BR"
                  )} até ${new Date(dataFinal).toLocaleDateString("pt-BR")}`}
              </span>
            )}
          </CardTitle>
          {vendasFiltradas.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              Mostrando {startIndex + 1}-
              {Math.min(endIndex, vendasFiltradas.length)} de{" "}
              {vendasFiltradas.length}
              {selectedCliente !== "all" &&
                vendas.length !== vendasFiltradas.length && (
                  <span className="text-gray-400">
                    (de {vendas.length} total)
                  </span>
                )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Carregando vendas...</p>
          ) : vendas.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhuma venda registrada</p>
              <p className="text-gray-400">
                Clique em "Nova Venda" para começar
              </p>
            </div>
          ) : vendasFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhuma venda encontrada</p>
              <p className="text-gray-400">
                Tente alterar os filtros ou selecionar "Todos os clientes"
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCliente("all");
                  const today = new Date().toISOString().split("T")[0];
                  setDataInicial(today);
                  setDataFinal(today);
                }}
                className="mt-4"
              >
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <>
              <Accordion type="single" collapsible className="w-full">
                {vendasPaginadas.map((venda) => (
                  <AccordionItem
                    key={venda.id.toString()}
                    value={venda.id.toString()}
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 justify-between items-center pr-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            Venda #{venda.id.toString()}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {formatDate(venda.dataVenda)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            {venda.cliente.nome}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Total</div>
                            <div className="font-semibold text-gray-600">
                              {formatPrice(venda.total)}
                            </div>
                          </div>
                          {venda.totalDevolvido > 0 && (
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                Devolvido
                              </div>
                              <div className="font-semibold text-red-600">
                                -{formatPrice(venda.totalDevolvido)}
                              </div>
                            </div>
                          )}
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Líquido</div>
                            <div className="font-semibold text-green-600">
                              {formatPrice(venda.totalLiquido)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <span className="text-sm text-gray-600">
                                  Total Original:
                                </span>
                                <div className="text-lg font-semibold text-gray-600">
                                  {formatPrice(venda.total)}
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">
                                  Total Devolvido:
                                </span>
                                <div className="text-lg font-semibold text-red-600">
                                  -{formatPrice(venda.totalDevolvido)}
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">
                                  Valor Líquido:
                                </span>
                                <div className="text-lg font-semibold text-green-600">
                                  {formatPrice(venda.totalLiquido)}
                                </div>
                              </div>
                            </div>

                            {/* Itens da Venda */}
                            <div className="mb-4">
                              <div className="text-sm text-gray-600 mb-2 font-medium">
                                Produtos Vendidos ({calculateTotalItens(venda)}{" "}
                                itens):
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {venda.itens.map((item) => (
                                  <div
                                    key={item.id.toString()}
                                    className="text-sm bg-gray-100 rounded px-3 py-2"
                                  >
                                    <div className="font-medium">
                                      {item.produto.nome}
                                    </div>
                                    <div className="text-gray-600">
                                      Qtd: {item.quantidade} •{" "}
                                      {formatPrice(item.precoUnitario)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Devoluções */}
                            {venda.devolucoes &&
                              venda.devolucoes.length > 0 && (
                                <div className="mb-4">
                                  <div className="text-sm text-gray-600 mb-2 font-medium">
                                    Devoluções:
                                  </div>
                                  {venda.devolucoes.map((devolucao) => (
                                    <div
                                      key={devolucao.id.toString()}
                                      className="mb-3 p-3 bg-red-50 rounded border border-red-200"
                                    >
                                      <div className="text-sm text-red-600 font-medium mb-2">
                                        Devolução em{" "}
                                        {formatDate(devolucao.dataDevolucao)} -{" "}
                                        {formatPrice(devolucao.total)}
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {devolucao.itens.map((item) => (
                                          <div
                                            key={item.id.toString()}
                                            className="text-sm bg-white rounded px-3 py-2 border border-red-200"
                                          >
                                            <div className="font-medium">
                                              {item.produto.nome}
                                            </div>
                                            <div className="text-gray-600">
                                              Qtd: {item.quantidade} •{" "}
                                              {formatPrice(item.precoUnitario)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>

                          <div className="ml-4 space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleImprimirComprovante(venda)}
                              className="flex items-center gap-1 w-full"
                            >
                              <Printer className="h-4 w-4" />
                              Imprimir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNovaDevolucao(venda)}
                              className="flex items-center gap-1 w-full"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Devolução
                            </Button>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8"
                        >
                          {page}
                        </Button>
                      )
                    )}
                  </div>

                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <VendaForm
        open={isVendaModalOpen}
        onOpenChange={setIsVendaModalOpen}
        onSuccess={handleSuccess}
      />

      <DevolucaoForm
        open={isDevolucaoModalOpen}
        onOpenChange={setIsDevolucaoModalOpen}
        venda={vendaSelecionada}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
