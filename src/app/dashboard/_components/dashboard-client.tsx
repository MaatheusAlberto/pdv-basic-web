"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  RotateCcw,
  Calendar,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface DashboardData {
  periodo: {
    inicio: string;
    fim: string;
  };
  metricas: {
    totalVendas: number;
    faturamentoBruto: number;
    faturamentoLiquido: number;
    totalDevolucoes: number;
    vendasHoje: number;
    totalClientes: number;
    totalProdutos: number;
    clientesAtivos: number;
  };
  grafico: {
    data: string;
    vendas: number;
    faturamento: number;
  }[];
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadDashboardData = async (start?: string, end?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      const response = await fetch(`/api/dashboard?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar dados");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
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

    loadDashboardData();
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

    loadDashboardData(startDate, endDate);
  };

  const handlePresetFilter = (days: number) => {
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - days);

    const startDateStr = inicio.toISOString().split("T")[0];
    const endDateStr = hoje.toISOString().split("T")[0];

    setStartDate(startDateStr);
    setEndDate(endDateStr);
    loadDashboardData(startDateStr, endDateStr);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          Período: {new Date(data.periodo.inicio).toLocaleDateString("pt-BR")}{" "}
          até {new Date(data.periodo.fim).toLocaleDateString("pt-BR")}
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtrar Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-40">
              <Label htmlFor="start-date">Data Início</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-40">
              <Label htmlFor="end-date">Data Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleFilterApply}>Aplicar Filtro</Button>
          </div>

          <div className="flex gap-2 mt-4">
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

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metricas.vendasHoje}</div>
            <p className="text-xs text-muted-foreground">
              vendas realizadas hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.metricas.totalVendas}
            </div>
            <p className="text-xs text-muted-foreground">
              no período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.metricas.totalClientes}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.metricas.clientesAtivos} ativos no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.metricas.totalProdutos}
            </div>
            <p className="text-xs text-muted-foreground">
              produtos cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Faturamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Faturamento Bruto
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatPrice(data.metricas.faturamentoBruto)}
            </div>
            <p className="text-xs text-muted-foreground">vendas no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Devoluções
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPrice(data.metricas.totalDevolucoes)}
            </div>
            <p className="text-xs text-muted-foreground">
              devolvido no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Faturamento Líquido
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(data.metricas.faturamentoLiquido)}
            </div>
            <p className="text-xs text-muted-foreground">após devoluções</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Simples */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas dos Últimos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.grafico.map((item) => (
              <div
                key={item.data}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div>
                  <div className="font-medium">
                    {new Date(item.data).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.vendas} venda{item.vendas !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {formatPrice(item.faturamento)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
