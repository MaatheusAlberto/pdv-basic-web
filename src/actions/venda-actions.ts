"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import {
  arredondar,
  calcularStatusPagamento,
  type StatusPagamento,
} from "@/lib/pagamento";

// Schema para validação dos dados da venda
const ItemVendaSchema = z.object({
  produtoId: z.bigint(),
  quantidade: z.number().positive("Quantidade deve ser maior que zero"),
  precoUnitario: z.number().positive("Preço unitário deve ser maior que zero"),
});

const VendaSchema = z.object({
  clienteId: z.bigint(),
  itens: z
    .array(ItemVendaSchema)
    .min(1, "Pelo menos um item deve ser adicionado"),
});

const DevolucaoSchema = z.object({
  vendaId: z.bigint(),
  itens: z
    .array(ItemVendaSchema)
    .min(1, "Pelo menos um item deve ser devolvido"),
});

export type Venda = {
  id: bigint;
  clienteId: bigint;
  dataVenda: Date;
  total: number;
  totalDevolvido: number;
  totalLiquido: number;
  cliente: {
    id: bigint;
    nome: string;
    email: string | null;
    telefone: string | null;
  };
  itens: {
    id: bigint;
    produtoId: bigint;
    quantidade: number;
    precoUnitario: number;
    produto: {
      id: bigint;
      nome: string;
      preco: number;
    };
  }[];
  devolucoes: {
    id: bigint;
    dataDevolucao: Date;
    total: number;
    itens: {
      id: bigint;
      produtoId: bigint;
      quantidade: number;
      precoUnitario: number;
      produto: {
        id: bigint;
        nome: string;
        preco: number;
      };
    }[];
  }[];
  pagamentos: {
    id: bigint;
    valor: number;
    formaPagamento: string | null;
    observacao: string | null;
    dataPagamento: Date;
  }[];
  totalPago: number;
  saldo: number;
  statusPagamento: StatusPagamento;
};

export type ItemVenda = {
  produtoId: bigint;
  quantidade: number;
  precoUnitario: number;
};

export type CreateVendaData = z.infer<typeof VendaSchema>;
export type CreateDevolucaoData = z.infer<typeof DevolucaoSchema>;

// Buscar todas as vendas
export async function getVendas(): Promise<Venda[]> {
  try {
    const vendas = await prisma.venda.findMany({
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
        pagamentos: {
          orderBy: {
            dataPagamento: "asc",
          },
        },
      },
      orderBy: {
        dataVenda: "desc",
      },
    });

    // Filtrar apenas vendas com cliente e converter Decimal para number para serialização
    return vendas
      .filter((venda) => venda.cliente !== null)
      .map((venda) => {
        const totalDevolvido = venda.devolucoes.reduce(
          (acc, devolucao) => acc + Number(devolucao.total.toString()),
          0
        );
        const totalOriginal = Number(venda.total.toString());
        const totalPago = arredondar(
          venda.pagamentos.reduce(
            (acc, pagamento) => acc + Number(pagamento.valor.toString()),
            0
          )
        );
        const totalLiquido = arredondar(totalOriginal - totalDevolvido);

        return {
          ...venda,
          clienteId: venda.clienteId!,
          cliente: venda.cliente!,
          total: totalOriginal,
          totalDevolvido,
          totalLiquido,
          pagamentos: venda.pagamentos.map((pagamento) => ({
            ...pagamento,
            valor: Number(pagamento.valor.toString()),
          })),
          totalPago,
          saldo: arredondar(totalLiquido - totalPago),
          statusPagamento: calcularStatusPagamento(totalLiquido, totalPago),
          itens: venda.itens.map((item) => ({
            ...item,
            precoUnitario: Number(item.precoUnitario.toString()),
            produto: {
              ...item.produto,
              preco: Number(item.produto.preco.toString()),
            },
          })),
          devolucoes: venda.devolucoes.map((devolucao) => ({
            ...devolucao,
            total: Number(devolucao.total.toString()),
            itens: devolucao.itens.map((item) => ({
              ...item,
              precoUnitario: Number(item.precoUnitario.toString()),
              produto: {
                ...item.produto,
                preco: Number(item.produto.preco.toString()),
              },
            })),
          })),
        };
      });
  } catch (error) {
    console.error("Erro ao buscar vendas:", error);
    throw new Error("Falha ao buscar vendas");
  }
}

// Buscar venda por ID
export async function getVendaById(id: bigint): Promise<Venda | null> {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id },
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
        pagamentos: {
          orderBy: {
            dataPagamento: "asc",
          },
        },
      },
    });

    if (!venda || !venda.cliente) return null;

    // Converter Decimal para number para serialização
    const totalDevolvido = venda.devolucoes.reduce(
      (acc, devolucao) => acc + Number(devolucao.total.toString()),
      0
    );
    const totalOriginal = Number(venda.total.toString());
    const totalPago = arredondar(
      venda.pagamentos.reduce(
        (acc, pagamento) => acc + Number(pagamento.valor.toString()),
        0
      )
    );
    const totalLiquido = arredondar(totalOriginal - totalDevolvido);

    return {
      ...venda,
      clienteId: venda.clienteId!,
      cliente: venda.cliente,
      total: totalOriginal,
      totalDevolvido,
      totalLiquido,
      pagamentos: venda.pagamentos.map((pagamento) => ({
        ...pagamento,
        valor: Number(pagamento.valor.toString()),
      })),
      totalPago,
      saldo: arredondar(totalLiquido - totalPago),
      statusPagamento: calcularStatusPagamento(totalLiquido, totalPago),
      itens: venda.itens.map((item) => ({
        ...item,
        precoUnitario: Number(item.precoUnitario.toString()),
        produto: {
          ...item.produto,
          preco: Number(item.produto.preco.toString()),
        },
      })),
      devolucoes: venda.devolucoes.map((devolucao) => ({
        ...devolucao,
        total: Number(devolucao.total.toString()),
        itens: devolucao.itens.map((item) => ({
          ...item,
          precoUnitario: Number(item.precoUnitario.toString()),
          produto: {
            ...item.produto,
            preco: Number(item.produto.preco.toString()),
          },
        })),
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar venda:", error);
    throw new Error("Falha ao buscar venda");
  }
}

// Criar nova venda
export async function createVenda(data: CreateVendaData) {
  try {
    // Validar dados
    const validatedData = VendaSchema.parse(data);

    // Calcular total
    const total = validatedData.itens.reduce(
      (acc, item) => acc + item.quantidade * item.precoUnitario,
      0
    );

    // Verificar se cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: validatedData.clienteId },
    });

    if (!cliente) {
      throw new Error("Cliente não encontrado");
    }

    // Verificar se todos os produtos existem
    const produtoIds = validatedData.itens.map((item) => item.produtoId);
    const produtos = await prisma.produto.findMany({
      where: { id: { in: produtoIds } },
    });

    if (produtos.length !== produtoIds.length) {
      throw new Error("Um ou mais produtos não foram encontrados");
    }

    // Criar venda com itens
    const venda = await prisma.venda.create({
      data: {
        clienteId: validatedData.clienteId,
        total: new Decimal(total),
        itens: {
          create: validatedData.itens.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: new Decimal(item.precoUnitario),
          })),
        },
      },
      include: {
        cliente: true,
        itens: {
          include: {
            produto: true,
          },
        },
      },
    });

    revalidatePath("/vendas");

    // Formatando dados para retorno com estrutura completa para impressão
    const vendaFormatada = {
      ...venda,
      clienteId: venda.clienteId!,
      cliente: venda.cliente!,
      total: Number(venda.total.toString()),
      totalDevolvido: 0,
      totalLiquido: Number(venda.total.toString()),
      pagamentos: [],
      totalPago: 0,
      saldo: Number(venda.total.toString()),
      statusPagamento: "PENDENTE" as const,
      itens: venda.itens.map((item) => ({
        ...item,
        precoUnitario: Number(item.precoUnitario.toString()),
        produto: {
          ...item.produto,
          preco: Number(item.produto.preco.toString()),
        },
      })),
      devolucoes: [],
    };

    return {
      success: true,
      data: vendaFormatada,
      message: "Venda registrada com sucesso",
    };
  } catch (error) {
    console.error("Erro ao criar venda:", error);

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

// Criar devolução
export async function createDevolucao(data: CreateDevolucaoData) {
  try {
    // Validar dados
    const validatedData = DevolucaoSchema.parse(data);

    // Verificar se venda existe
    const venda = await prisma.venda.findUnique({
      where: { id: validatedData.vendaId },
      include: {
        itens: {
          include: {
            produto: true,
          },
        },
      },
    });

    if (!venda) {
      throw new Error("Venda não encontrada");
    }

    // Calcular total da devolução
    const total = validatedData.itens.reduce(
      (acc, item) => acc + item.quantidade * item.precoUnitario,
      0
    );

    // Verificar se os itens sendo devolvidos fazem parte da venda original
    for (const itemDevolucao of validatedData.itens) {
      const itemOriginal = venda.itens.find(
        (item) => item.produtoId === itemDevolucao.produtoId
      );

      if (!itemOriginal) {
        throw new Error("Produto não faz parte da venda original");
      }

      // Verificar quantidade devolvida não excede quantidade vendida
      const totalDevolvido = await prisma.itemDevolucao.aggregate({
        where: {
          devolucao: {
            vendaId: validatedData.vendaId,
          },
          produtoId: itemDevolucao.produtoId,
        },
        _sum: {
          quantidade: true,
        },
      });

      const quantidadeJaDevolvida = totalDevolvido._sum.quantidade || 0;
      const novaQuantidadeDevolvida =
        quantidadeJaDevolvida + itemDevolucao.quantidade;

      if (novaQuantidadeDevolvida > itemOriginal.quantidade) {
        throw new Error(
          `Quantidade a devolver (${novaQuantidadeDevolvida}) excede quantidade vendida (${itemOriginal.quantidade}) para o produto ${itemOriginal.produto.nome}`
        );
      }
    }

    // Criar devolução
    const devolucao = await prisma.devolucao.create({
      data: {
        vendaId: validatedData.vendaId,
        total: new Decimal(total),
        itens: {
          create: validatedData.itens.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: new Decimal(item.precoUnitario),
          })),
        },
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
    });

    revalidatePath("/vendas");

    return {
      success: true,
      data: {
        ...devolucao,
        total: Number(devolucao.total.toString()),
        venda: devolucao.venda
          ? {
              ...devolucao.venda,
              total: Number(devolucao.venda.total.toString()),
              clienteId: devolucao.venda.clienteId!,
              cliente: devolucao.venda.cliente!,
            }
          : null,
        itens: devolucao.itens.map((item) => ({
          ...item,
          precoUnitario: Number(item.precoUnitario.toString()),
          produto: {
            ...item.produto,
            preco: Number(item.produto.preco.toString()),
          },
        })),
      },
      message: "Devolução registrada com sucesso",
    };
  } catch (error) {
    console.error("Erro ao criar devolução:", error);

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

// Excluir uma venda inteira (para quando a venda foi lancada errada).
// Remove junto os itens, as devolucoes e os pagamentos ligados a ela.
export async function deleteVenda(id: bigint) {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id },
      include: {
        cliente: true,
        itens: true,
        pagamentos: true,
        devolucoes: { include: { itens: true } },
      },
    });

    if (!venda) {
      throw new Error("Venda não encontrada");
    }

    const totalPago = venda.pagamentos.reduce(
      (acc, pagamento) => acc + Number(pagamento.valor.toString()),
      0
    );

    await prisma.$transaction([
      prisma.itemDevolucao.deleteMany({
        where: { devolucao: { vendaId: id } },
      }),
      prisma.devolucao.deleteMany({ where: { vendaId: id } }),
      prisma.pagamento.deleteMany({ where: { vendaId: id } }),
      prisma.itemVenda.deleteMany({ where: { vendaId: id } }),
      prisma.venda.delete({ where: { id } }),
    ]);

    revalidatePath("/vendas");
    revalidatePath("/caixa");
    revalidatePath("/recebimentos");
    revalidatePath("/devolucoes");
    revalidatePath("/produtos");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        vendaId: id.toString(),
        itens: venda.itens.length,
        devolucoes: venda.devolucoes.length,
        pagamentos: venda.pagamentos.length,
        totalPago,
      },
      message: `Venda #${id.toString()} excluída`,
    };
  } catch (error) {
    console.error("Erro ao excluir venda:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
