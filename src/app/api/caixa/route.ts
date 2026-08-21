import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { arredondar, calcularStatusPagamento } from "@/lib/pagamento";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const clienteId = searchParams.get("clienteId");

    // Se não há filtro de data, pegar últimos 30 dias
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const filterStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const filterEndDate = endDate ? new Date(endDate) : defaultEndDate;

    // Ajustar end date para incluir o dia inteiro
    filterEndDate.setHours(23, 59, 59, 999);

    // Filtros base
    const whereClause: any = {
      dataVenda: {
        gte: filterStartDate,
        lte: filterEndDate,
      },
      cliente: {
        isNot: null,
      },
    };

    // Filtro por cliente se especificado
    if (clienteId && clienteId !== "all") {
      whereClause.clienteId = BigInt(clienteId);
    }

    // Buscar vendas no período
    const vendas = await prisma.venda.findMany({
      where: whereClause,
      include: {
        cliente: true,
        itens: {
          include: {
            produto: true,
          },
        },
        devolucoes: {
          include: {
            itens: {
              include: {
                produto: true,
              },
            },
          },
        },
        pagamentos: true,
      },
      orderBy: {
        dataVenda: "desc",
      },
    });

    // Buscar devoluções no período
    const devolucoes = await prisma.devolucao.findMany({
      where: {
        dataDevolucao: {
          gte: filterStartDate,
          lte: filterEndDate,
        },
        ...(clienteId &&
          clienteId !== "all" && {
            venda: {
              clienteId: BigInt(clienteId),
            },
          }),
      },
      include: {
        venda: {
          include: {
            cliente: true,
          },
        },
        itens: {
          include: {
            produto: true,
          },
        },
      },
      orderBy: {
        dataDevolucao: "desc",
      },
    });

    // Buscar pagamentos recebidos no período
    const pagamentos = await prisma.pagamento.findMany({
      where: {
        dataPagamento: {
          gte: filterStartDate,
          lte: filterEndDate,
        },
        ...(clienteId &&
          clienteId !== "all" && {
            venda: {
              clienteId: BigInt(clienteId),
            },
          }),
      },
      include: {
        venda: {
          include: {
            cliente: true,
          },
        },
      },
      orderBy: {
        dataPagamento: "desc",
      },
    });

    // Buscar todos os clientes para o filtro
    const clientes = await prisma.cliente.findMany({
      select: {
        id: true,
        nome: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    // Processar vendas
    const vendasProcessadas = vendas.map((venda) => {
      const totalDevolvido = venda.devolucoes.reduce(
        (total, devolucao) => total + Number(devolucao.total.toString()),
        0
      );
      const totalPago = arredondar(
        venda.pagamentos.reduce(
          (total, pagamento) => total + Number(pagamento.valor.toString()),
          0
        )
      );
      const totalLiquido = arredondar(
        Number(venda.total.toString()) - totalDevolvido
      );

      return {
        id: venda.id.toString(),
        tipo: "venda" as const,
        data: venda.dataVenda,
        cliente: {
          id: venda.cliente!.id.toString(),
          nome: venda.cliente!.nome,
        },
        valor: Number(venda.total.toString()),
        valorLiquido: Number(venda.total.toString()) - totalDevolvido,
        totalPago,
        saldo: arredondar(totalLiquido - totalPago),
        statusPagamento: calcularStatusPagamento(totalLiquido, totalPago),
        itens: venda.itens.map((item) => ({
          produto: item.produto.nome,
          quantidade: item.quantidade,
          precoUnitario: Number(item.precoUnitario.toString()),
          total: Number(item.precoUnitario.toString()) * item.quantidade,
        })),
        observacoes:
          venda.devolucoes.length > 0
            ? `${venda.devolucoes.length} devolução(ões)`
            : null,
      };
    });

    // Processar devoluções
    const devolucoesProcessadas = devolucoes.map((devolucao) => ({
      id: devolucao.id.toString(),
      tipo: "devolucao" as const,
      data: devolucao.dataDevolucao,
      cliente: {
        id: devolucao.venda.cliente!.id.toString(),
        nome: devolucao.venda.cliente!.nome,
      },
      valor: -Number(devolucao.total.toString()), // Negativo para devolução
      valorLiquido: -Number(devolucao.total.toString()),
      itens: devolucao.itens.map((item) => ({
        produto: item.produto.nome,
        quantidade: item.quantidade,
        precoUnitario: Number(item.precoUnitario.toString()),
        total: Number(item.precoUnitario.toString()) * item.quantidade,
      })),
      observacoes: `Devolução da venda #${devolucao.vendaId.toString()}`,
    }));

    // Processar pagamentos recebidos
    const pagamentosProcessados = pagamentos.map((pagamento) => ({
      id: pagamento.id.toString(),
      tipo: "pagamento" as const,
      data: pagamento.dataPagamento,
      cliente: {
        id: pagamento.venda.cliente!.id.toString(),
        nome: pagamento.venda.cliente!.nome,
      },
      valor: Number(pagamento.valor.toString()),
      valorLiquido: Number(pagamento.valor.toString()),
      itens: [] as {
        produto: string;
        quantidade: number;
        precoUnitario: number;
        total: number;
      }[],
      observacoes: `Pagamento da venda #${pagamento.vendaId.toString()}${
        pagamento.formaPagamento ? ` • ${pagamento.formaPagamento}` : ""
      }${pagamento.observacao ? ` • ${pagamento.observacao}` : ""}`,
    }));

    // Combinar e ordenar por data
    const movimentacoes = [
      ...vendasProcessadas,
      ...devolucoesProcessadas,
      ...pagamentosProcessados,
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // Calcular totais
    const totalEntradas = vendasProcessadas.reduce(
      (total, venda) => total + venda.valor,
      0
    );
    const totalSaidas = Math.abs(
      devolucoesProcessadas.reduce(
        (total, devolucao) => total + devolucao.valor,
        0
      )
    );
    const saldoLiquido = totalEntradas - totalSaidas;

    // Totais de pagamento
    const totalRecebido = arredondar(
      pagamentosProcessados.reduce(
        (total, pagamento) => total + pagamento.valor,
        0
      )
    );
    const totalEmAberto = arredondar(
      vendasProcessadas.reduce(
        (total, venda) => total + (venda.saldo > 0 ? venda.saldo : 0),
        0
      )
    );
    const totalCreditos = arredondar(
      vendasProcessadas.reduce(
        (total, venda) => total + (venda.saldo < 0 ? Math.abs(venda.saldo) : 0),
        0
      )
    );
    const vendasEmAberto = vendasProcessadas.filter(
      (venda) => venda.saldo > 0
    ).length;

    // Movimentações de hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const movimentacoesHoje = movimentacoes.filter((mov) => {
      const dataMovimentacao = new Date(mov.data);
      return dataMovimentacao >= hoje && dataMovimentacao < amanha;
    });

    const response = {
      periodo: {
        inicio: filterStartDate.toISOString().split("T")[0],
        fim: filterEndDate.toISOString().split("T")[0],
      },
      resumo: {
        totalEntradas,
        totalSaidas,
        saldoLiquido,
        quantidadeVendas: vendasProcessadas.length,
        quantidadeDevolucoes: devolucoesProcessadas.length,
        quantidadePagamentos: pagamentosProcessados.length,
        movimentacoesHoje: movimentacoesHoje.length,
        totalRecebido,
        totalEmAberto,
        totalCreditos,
        vendasEmAberto,
      },
      movimentacoes,
      clientes: clientes.map((cliente) => ({
        id: cliente.id.toString(),
        nome: cliente.nome,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar dados do caixa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
