"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// Item vendido (agrupado por venda + produto) com o saldo ainda disponível para devolução
export type ItemParaDevolucao = {
  chave: string;
  vendaId: bigint;
  dataVenda: Date;
  clienteId: bigint;
  clienteNome: string;
  produtoId: bigint;
  produtoNome: string;
  precoUnitario: number;
  quantidadeVendida: number;
  quantidadeDevolvida: number;
  quantidadeDisponivel: number;
};

export type FiltrosItensDevolucao = {
  clienteId?: string;
  produtoId?: string;
  dataInicial?: string;
  dataFinal?: string;
};

const ItemDevolucaoInputSchema = z.object({
  vendaId: z.bigint(),
  produtoId: z.bigint(),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .positive("Quantidade deve ser maior que zero"),
});

const DevolucaoItensSchema = z.object({
  itens: z
    .array(ItemDevolucaoInputSchema)
    .min(1, "Selecione pelo menos um item para devolver"),
});

export type CreateDevolucaoItensData = z.infer<typeof DevolucaoItensSchema>;

const inicioDoDia = (data: string) => new Date(`${data}T00:00:00`);
const fimDoDia = (data: string) => new Date(`${data}T23:59:59.999`);

// Buscar todos os itens vendidos com o saldo disponível para devolução
export async function getItensParaDevolucao(
  filtros: FiltrosItensDevolucao = {}
): Promise<ItemParaDevolucao[]> {
  try {
    const where: any = {
      cliente: {
        isNot: null,
      },
    };

    if (filtros.dataInicial || filtros.dataFinal) {
      where.dataVenda = {
        ...(filtros.dataInicial
          ? { gte: inicioDoDia(filtros.dataInicial) }
          : {}),
        ...(filtros.dataFinal ? { lte: fimDoDia(filtros.dataFinal) } : {}),
      };
    }

    if (filtros.clienteId && filtros.clienteId !== "all") {
      where.clienteId = BigInt(filtros.clienteId);
    }

    if (filtros.produtoId && filtros.produtoId !== "all") {
      where.itens = { some: { produtoId: BigInt(filtros.produtoId) } };
    }

    const vendas = await prisma.venda.findMany({
      where,
      include: {
        cliente: true,
        itens: {
          include: {
            produto: true,
          },
        },
        devolucoes: {
          include: {
            itens: true,
          },
        },
      },
      orderBy: {
        dataVenda: "desc",
      },
    });

    const itens: ItemParaDevolucao[] = [];

    for (const venda of vendas) {
      if (!venda.cliente) continue;

      // Quantidades já devolvidas por produto nesta venda
      const devolvidoPorProduto = new Map<string, number>();
      for (const devolucao of venda.devolucoes) {
        for (const item of devolucao.itens) {
          const produtoId = item.produtoId.toString();
          devolvidoPorProduto.set(
            produtoId,
            (devolvidoPorProduto.get(produtoId) || 0) + item.quantidade
          );
        }
      }

      // Agrupar por produto: a mesma venda pode ter mais de uma linha do mesmo produto
      const vendidoPorProduto = new Map<
        string,
        {
          produtoId: bigint;
          produtoNome: string;
          precoUnitario: number;
          quantidade: number;
        }
      >();

      for (const item of venda.itens) {
        const produtoId = item.produtoId.toString();
        const atual = vendidoPorProduto.get(produtoId);

        if (atual) {
          atual.quantidade += item.quantidade;
        } else {
          vendidoPorProduto.set(produtoId, {
            produtoId: item.produtoId,
            produtoNome: item.produto.nome,
            precoUnitario: Number(item.precoUnitario.toString()),
            quantidade: item.quantidade,
          });
        }
      }

      const agrupados = Array.from(vendidoPorProduto.entries()).sort((a, b) =>
        a[1].produtoNome.localeCompare(b[1].produtoNome)
      );

      for (const [produtoId, vendido] of agrupados) {
        if (
          filtros.produtoId &&
          filtros.produtoId !== "all" &&
          produtoId !== filtros.produtoId
        ) {
          continue;
        }

        const quantidadeDevolvida = devolvidoPorProduto.get(produtoId) || 0;

        itens.push({
          chave: `${venda.id.toString()}-${produtoId}`,
          vendaId: venda.id,
          dataVenda: venda.dataVenda,
          clienteId: venda.cliente.id,
          clienteNome: venda.cliente.nome,
          produtoId: vendido.produtoId,
          produtoNome: vendido.produtoNome,
          precoUnitario: vendido.precoUnitario,
          quantidadeVendida: vendido.quantidade,
          quantidadeDevolvida,
          quantidadeDisponivel: Math.max(
            vendido.quantidade - quantidadeDevolvida,
            0
          ),
        });
      }
    }

    return itens;
  } catch (error) {
    console.error("Erro ao buscar itens para devolução:", error);
    throw new Error("Falha ao buscar itens para devolução");
  }
}

// Registrar devolução a partir de itens avulsos (podendo ser de vendas diferentes)
export async function createDevolucaoItens(data: CreateDevolucaoItensData) {
  try {
    const validatedData = DevolucaoItensSchema.parse(data);

    // Somar quantidades repetidas do mesmo produto na mesma venda
    const solicitados = new Map<
      string,
      { vendaId: bigint; produtoId: bigint; quantidade: number }
    >();

    for (const item of validatedData.itens) {
      const chave = `${item.vendaId.toString()}-${item.produtoId.toString()}`;
      const atual = solicitados.get(chave);

      if (atual) {
        atual.quantidade += item.quantidade;
      } else {
        solicitados.set(chave, {
          vendaId: item.vendaId,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
        });
      }
    }

    const vendaIds = Array.from(
      new Set(
        Array.from(solicitados.values()).map((item) => item.vendaId.toString())
      )
    ).map((id) => BigInt(id));

    const vendas = await prisma.venda.findMany({
      where: { id: { in: vendaIds } },
      include: {
        itens: {
          include: {
            produto: true,
          },
        },
        devolucoes: {
          include: {
            itens: true,
          },
        },
      },
    });

    // Montar uma devolução por venda, validando o saldo disponível de cada item
    const devolucoesPorVenda = new Map<
      string,
      {
        vendaId: bigint;
        total: number;
        itens: {
          produtoId: bigint;
          quantidade: number;
          precoUnitario: number;
        }[];
      }
    >();

    for (const solicitado of solicitados.values()) {
      const venda = vendas.find((item) => item.id === solicitado.vendaId);

      if (!venda) {
        throw new Error(
          `Venda #${solicitado.vendaId.toString()} não encontrada`
        );
      }

      const linhas = venda.itens.filter(
        (item) => item.produtoId === solicitado.produtoId
      );

      if (linhas.length === 0) {
        throw new Error(
          `Produto não faz parte da venda #${venda.id.toString()}`
        );
      }

      const quantidadeVendida = linhas.reduce(
        (acc, item) => acc + item.quantidade,
        0
      );

      const quantidadeDevolvida = venda.devolucoes.reduce(
        (acc, devolucao) =>
          acc +
          devolucao.itens
            .filter((item) => item.produtoId === solicitado.produtoId)
            .reduce((subtotal, item) => subtotal + item.quantidade, 0),
        0
      );

      const disponivel = quantidadeVendida - quantidadeDevolvida;

      if (solicitado.quantidade > disponivel) {
        throw new Error(
          `Quantidade a devolver (${solicitado.quantidade}) excede o disponível (${disponivel}) para o produto ${
            linhas[0].produto.nome
          } na venda #${venda.id.toString()}`
        );
      }

      // O preço vem sempre da venda original, nunca do que o cliente enviou
      const precoUnitario = Number(linhas[0].precoUnitario.toString());
      const chaveVenda = venda.id.toString();
      const devolucao = devolucoesPorVenda.get(chaveVenda) || {
        vendaId: venda.id,
        total: 0,
        itens: [],
      };

      devolucao.itens.push({
        produtoId: solicitado.produtoId,
        quantidade: solicitado.quantidade,
        precoUnitario,
      });
      devolucao.total += solicitado.quantidade * precoUnitario;

      devolucoesPorVenda.set(chaveVenda, devolucao);
    }

    const devolucoes = Array.from(devolucoesPorVenda.values());

    await prisma.$transaction(
      devolucoes.map((devolucao) =>
        prisma.devolucao.create({
          data: {
            vendaId: devolucao.vendaId,
            total: new Decimal(devolucao.total.toFixed(2)),
            itens: {
              create: devolucao.itens.map((item) => ({
                produtoId: item.produtoId,
                quantidade: item.quantidade,
                precoUnitario: new Decimal(item.precoUnitario),
              })),
            },
          },
        })
      )
    );

    revalidatePath("/devolucoes");
    revalidatePath("/vendas");
    revalidatePath("/caixa");
    revalidatePath("/dashboard");

    const totalDevolvido = devolucoes.reduce(
      (acc, devolucao) => acc + devolucao.total,
      0
    );
    const totalItens = devolucoes.reduce(
      (acc, devolucao) =>
        acc + devolucao.itens.reduce((sub, item) => sub + item.quantidade, 0),
      0
    );

    return {
      success: true,
      data: {
        totalDevolucoes: devolucoes.length,
        totalItens,
        total: totalDevolvido,
        vendas: devolucoes.map((devolucao) => devolucao.vendaId.toString()),
      },
      message:
        devolucoes.length === 1
          ? "Devolução registrada com sucesso"
          : `${devolucoes.length} devoluções registradas com sucesso`,
    };
  } catch (error) {
    console.error("Erro ao registrar devolução:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Dados inválidos",
        details: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
