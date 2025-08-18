import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Se não há filtro de data, pegar últimos 30 dias
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const filterStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const filterEndDate = endDate ? new Date(endDate) : defaultEndDate;

    // Ajustar end date para incluir o dia inteiro
    filterEndDate.setHours(23, 59, 59, 999);

    // Buscar vendas no período
    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: {
          gte: filterStartDate,
          lte: filterEndDate,
        },
        cliente: {
          isNot: null, // Apenas vendas com cliente
        },
      },
      include: {
        devolucoes: true,
      },
    });

    // Buscar devoluções no período
    const devolucoes = await prisma.devolucao.findMany({
      where: {
        dataDevolucao: {
          gte: filterStartDate,
          lte: filterEndDate,
        },
      },
    });

    // Contar clientes únicos que fizeram compras no período
    const clientesComVendas = await prisma.cliente.findMany({
      where: {
        vendas: {
          some: {
            dataVenda: {
              gte: filterStartDate,
              lte: filterEndDate,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    // Total de clientes cadastrados
    const totalClientes = await prisma.cliente.count();

    // Total de produtos cadastrados
    const totalProdutos = await prisma.produto.count();

    // Calcular métricas
    const totalVendas = vendas.length;
    const faturamentoBruto = vendas.reduce(
      (total, venda) => total + Number(venda.total.toString()),
      0
    );
    const totalDevolucoes = devolucoes.reduce(
      (total, devolucao) => total + Number(devolucao.total.toString()),
      0
    );
    const faturamentoLiquido = faturamentoBruto - totalDevolucoes;

    // Vendas de hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const vendasHoje = await prisma.venda.count({
      where: {
        dataVenda: {
          gte: hoje,
          lt: amanha,
        },
        cliente: {
          isNot: null,
        },
      },
    });

    // Dados para gráfico (vendas por dia dos últimos 7 dias)
    const vendasPorDia = [];
    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      data.setHours(0, 0, 0, 0);

      const proximoData = new Date(data);
      proximoData.setDate(proximoData.getDate() + 1);

      const vendasDoDia = await prisma.venda.findMany({
        where: {
          dataVenda: {
            gte: data,
            lt: proximoData,
          },
          cliente: {
            isNot: null,
          },
        },
      });

      const faturamentoDoDia = vendasDoDia.reduce(
        (total, venda) => total + Number(venda.total.toString()),
        0
      );

      vendasPorDia.push({
        data: data.toISOString().split("T")[0],
        vendas: vendasDoDia.length,
        faturamento: faturamentoDoDia,
      });
    }

    const response = {
      periodo: {
        inicio: filterStartDate.toISOString().split("T")[0],
        fim: filterEndDate.toISOString().split("T")[0],
      },
      metricas: {
        totalVendas,
        faturamentoBruto,
        faturamentoLiquido,
        totalDevolucoes,
        vendasHoje,
        totalClientes,
        totalProdutos,
        clientesAtivos: clientesComVendas.length,
      },
      grafico: vendasPorDia,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
