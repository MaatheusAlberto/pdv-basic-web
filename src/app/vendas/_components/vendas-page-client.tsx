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
  Plus,
  RotateCcw,
  Eye,
  ShoppingCart,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { VendaForm, DevolucaoForm } from "@/components/forms";
import { getVendas, type Venda } from "@/actions/venda-actions";
import { toast } from "sonner";

export function VendasPageClient() {
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);
  const [isDevolucaoModalOpen, setIsDevolucaoModalOpen] = useState(false);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | undefined>();

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

  useEffect(() => {
    loadVendas();
  }, []);

  const handleNovaVenda = () => {
    setIsVendaModalOpen(true);
  };

  const handleNovaDevolucao = (venda: Venda) => {
    setVendaSelecionada(venda);
    setIsDevolucaoModalOpen(true);
  };

  const handleSuccess = () => {
    loadVendas(); // Recarregar a lista após sucesso
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

  const getVendaStats = () => {
    const totalVendas = vendas.length;
    const totalFaturamento = vendas.reduce(
      (total, venda) => total + venda.totalLiquido,
      0
    );
    const totalDevolvido = vendas.reduce(
      (total, venda) => total + venda.totalDevolvido,
      0
    );
    const vendasHoje = vendas.filter((venda) => {
      const hoje = new Date();
      const dataVenda = new Date(venda.dataVenda);
      return dataVenda.toDateString() === hoje.toDateString();
    }).length;

    return { totalVendas, totalFaturamento, totalDevolvido, vendasHoje };
  };

  const stats = getVendaStats();

  // Funções de paginação
  const totalPages = Math.ceil(vendas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const vendasPaginadas = vendas.slice(startIndex, endIndex);

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
          <CardTitle>Histórico de Vendas</CardTitle>
          {vendas.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              Mostrando {startIndex + 1}-{Math.min(endIndex, vendas.length)} de{" "}
              {vendas.length}
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

                          <div className="ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNovaDevolucao(venda)}
                              className="flex items-center gap-1"
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
