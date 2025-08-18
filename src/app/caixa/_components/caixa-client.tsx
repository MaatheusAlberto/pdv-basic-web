"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calendar,
  Users,
  Download,
  ShoppingCart,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface Cliente {
  id: string;
  nome: string;
}

interface Movimentacao {
  id: string;
  tipo: "venda" | "devolucao";
  data: string;
  cliente: Cliente;
  valor: number;
  valorLiquido: number;
  itens: {
    produto: string;
    quantidade: number;
    precoUnitario: number;
    total: number;
  }[];
  observacoes?: string | null;
}

interface CaixaData {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    totalEntradas: number;
    totalSaidas: number;
    saldoLiquido: number;
    quantidadeVendas: number;
    quantidadeDevolucoes: number;
    movimentacoesHoje: number;
  };
  movimentacoes: Movimentacao[];
  clientes: Cliente[];
}

export function CaixaClient() {
  const [data, setData] = useState<CaixaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCliente, setSelectedCliente] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadCaixaData = async (
    start?: string,
    end?: string,
    clienteId?: string
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);
      if (clienteId && clienteId !== "all")
        params.append("clienteId", clienteId);

      const response = await fetch(`/api/caixa?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar dados");
      }

      const caixaData = await response.json();
      setData(caixaData);
      setCurrentPage(1); // Reset para primeira página
    } catch (error) {
      console.error("Erro ao carregar caixa:", error);
      toast.error("Erro ao carregar dados do caixa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Carregar dados dos últimos 30 dias por padrão
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);

    setStartDate(inicio.toISOString().split("T")[0]);
    setEndDate(hoje.toISOString().split("T")[0]);

    loadCaixaData();
  }, []);

  const handleFilterApply = () => {
    if (!startDate || !endDate) {
      toast.error("Selecione as datas de início e fim");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Data de início não pode ser maior que data de fim");
      return;
    }

    loadCaixaData(startDate, endDate, selectedCliente);
  };

  const handlePresetFilter = (days: number) => {
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - days);

    const startDateStr = inicio.toISOString().split("T")[0];
    const endDateStr = hoje.toISOString().split("T")[0];

    setStartDate(startDateStr);
    setEndDate(endDateStr);
    loadCaixaData(startDateStr, endDateStr, selectedCliente);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const exportToPDF = async () => {
    try {
      if (!data) {
        toast.error("Nenhum dado disponível para exportar");
        return;
      }

      // Criar HTML para o PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Caixa</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .resumo { margin-bottom: 30px; }
            .resumo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
            .resumo-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .resumo-title { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
            .resumo-value { font-size: 18px; font-weight: bold; }
            .positive { color: #16a34a; }
            .negative { color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .tipo-venda { background-color: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 4px; }
            .tipo-devolucao { background-color: #fecaca; color: #dc2626; padding: 2px 8px; border-radius: 4px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Caixa</h1>
            <p>Período: ${new Date(data.periodo.inicio).toLocaleDateString(
              "pt-BR"
            )} até ${new Date(data.periodo.fim).toLocaleDateString("pt-BR")}</p>
            ${
              selectedCliente !== "all"
                ? `<p>Cliente: ${
                    data.clientes.find((c) => c.id === selectedCliente)?.nome ||
                    "Não encontrado"
                  }</p>`
                : ""
            }
          </div>

          <div class="resumo">
            <h2>Resumo</h2>
            <div class="resumo-grid">
              <div class="resumo-card">
                <div class="resumo-title">Total de Entradas</div>
                <div class="resumo-value positive">${formatPrice(
                  data.resumo.totalEntradas
                )}</div>
                <div>${data.resumo.quantidadeVendas} venda(s)</div>
              </div>
              <div class="resumo-card">
                <div class="resumo-title">Total de Saídas</div>
                <div class="resumo-value negative">${formatPrice(
                  data.resumo.totalSaidas
                )}</div>
                <div>${data.resumo.quantidadeDevolucoes} devolução(ões)</div>
              </div>
              <div class="resumo-card">
                <div class="resumo-title">Saldo Líquido</div>
                <div class="resumo-value ${
                  data.resumo.saldoLiquido >= 0 ? "positive" : "negative"
                }">${formatPrice(data.resumo.saldoLiquido)}</div>
              </div>
            </div>
          </div>

                     <h2>Movimentações</h2>
           <table>
             <thead>
               <tr>
                 <th>Data/Hora</th>
                 <th>Tipo</th>
                 <th>Cliente</th>
                 <th>Valor</th>
               </tr>
             </thead>
            <tbody>
                             ${data.movimentacoes
                               .map(
                                 (mov) => `
                 <tr>
                   <td>${formatDate(mov.data)}</td>
                   <td><span class="tipo-${mov.tipo}">${
                                   mov.tipo === "venda" ? "Venda" : "Devolução"
                                 }</span></td>
                   <td>${mov.cliente.nome}</td>
                   <td class="${
                     mov.valor >= 0 ? "positive" : "negative"
                   }">${formatPrice(Math.abs(mov.valor))}</td>
                 </tr>
               `
                               )
                               .join("")}
            </tbody>
          </table>

          <div class="footer">
            <p>Relatório gerado em ${new Date().toLocaleString("pt-BR")}</p>
          </div>
        </body>
        </html>
      `;

      // Criar blob e download
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-caixa-${data.periodo.inicio}-${data.periodo.fim}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Caixa</h1>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Caixa</h1>
          <p className="text-gray-600">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  // Paginação
  const totalPages = Math.ceil(data.movimentacoes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMovimentacoes = data.movimentacoes.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Caixa</h1>
          <p className="text-gray-600">
            Período: {new Date(data.periodo.inicio).toLocaleDateString("pt-BR")}{" "}
            até {new Date(data.periodo.fim).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Button onClick={exportToPDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="start-date">Data Início</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cliente">Cliente</Label>
              <Select
                value={selectedCliente}
                onValueChange={setSelectedCliente}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {data.clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilterApply} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetFilter(7)}
            >
              Últimos 7 dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetFilter(30)}
            >
              Últimos 30 dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetFilter(90)}
            >
              Últimos 90 dias
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Movimentações Hoje
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.resumo.movimentacoesHoje}
            </div>
            <p className="text-xs text-muted-foreground">movimentações hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Entradas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(data.resumo.totalEntradas)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.resumo.quantidadeVendas} venda(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPrice(data.resumo.totalSaidas)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.resumo.quantidadeDevolucoes} devolução(ões)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                data.resumo.saldoLiquido >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatPrice(data.resumo.saldoLiquido)}
            </div>
            <p className="text-xs text-muted-foreground">saldo atual</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações do Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMovimentacoes.map((movimentacao) => (
                <TableRow key={`${movimentacao.tipo}-${movimentacao.id}`}>
                  <TableCell>{formatDate(movimentacao.data)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        movimentacao.tipo === "venda"
                          ? "default"
                          : "destructive"
                      }
                      className="flex items-center gap-1 w-fit"
                    >
                      {movimentacao.tipo === "venda" ? (
                        <>
                          <ShoppingCart className="h-3 w-3" />
                          Venda
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3 w-3" />
                          Devolução
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{movimentacao.cliente.nome}</TableCell>
                  <TableCell>
                    <span
                      className={
                        movimentacao.valor >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatPrice(Math.abs(movimentacao.valor))}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a{" "}
                {Math.min(endIndex, data.movimentacoes.length)} de{" "}
                {data.movimentacoes.length} movimentações
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
