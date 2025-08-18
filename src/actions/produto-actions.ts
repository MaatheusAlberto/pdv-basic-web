"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// Schema para validação dos dados do produto
const ProdutoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  preco: z.coerce.number().positive("Preço deve ser maior que zero"),
});

const ProdutoUpdateSchema = ProdutoSchema.extend({
  id: z.bigint(),
});

export type Produto = {
  id: bigint;
  nome: string;
  preco: number;
};

export type CreateProdutoData = z.infer<typeof ProdutoSchema>;
export type UpdateProdutoData = z.infer<typeof ProdutoUpdateSchema>;

// Buscar todos os produtos
export async function getProdutos(): Promise<Produto[]> {
  try {
    const produtos = await prisma.produto.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    // Converter Decimal para number para serialização
    return produtos.map((produto) => ({
      ...produto,
      preco: Number(produto.preco.toString()),
    }));
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    throw new Error("Falha ao buscar produtos");
  }
}

// Buscar produto por ID
export async function getProdutoById(id: bigint): Promise<Produto | null> {
  try {
    const produto = await prisma.produto.findUnique({
      where: { id },
    });

    if (!produto) return null;

    // Converter Decimal para number para serialização
    return {
      ...produto,
      preco: Number(produto.preco.toString()),
    };
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    throw new Error("Falha ao buscar produto");
  }
}

// Criar novo produto
export async function createProduto(data: CreateProdutoData) {
  try {
    // Validar dados
    const validatedData = ProdutoSchema.parse(data);

    const produto = await prisma.produto.create({
      data: {
        nome: validatedData.nome,
        preco: new Decimal(validatedData.preco),
      },
    });

    revalidatePath("/produtos");

    return {
      success: true,
      data: {
        ...produto,
        preco: Number(produto.preco.toString()),
      },
      message: "Produto criado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao criar produto:", error);

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

// Atualizar produto
export async function updateProduto(data: UpdateProdutoData) {
  try {
    // Validar dados
    const validatedData = ProdutoUpdateSchema.parse(data);

    // Verificar se produto existe
    const existingProduto = await prisma.produto.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingProduto) {
      throw new Error("Produto não encontrado");
    }

    const produto = await prisma.produto.update({
      where: { id: validatedData.id },
      data: {
        nome: validatedData.nome,
        preco: new Decimal(validatedData.preco),
      },
    });

    revalidatePath("/produtos");

    return {
      success: true,
      data: {
        ...produto,
        preco: Number(produto.preco.toString()),
      },
      message: "Produto atualizado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);

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

// Deletar produto
export async function deleteProduto(id: bigint) {
  try {
    // Verificar se produto existe
    const existingProduto = await prisma.produto.findUnique({
      where: { id },
    });

    if (!existingProduto) {
      throw new Error("Produto não encontrado");
    }

    // Verificar se produto tem itens de venda
    const itensVendaCount = await prisma.itemVenda.count({
      where: { produtoId: id },
    });

    if (itensVendaCount > 0) {
      throw new Error("Não é possível deletar produto que possui vendas");
    }

    // Verificar se produto tem itens de devolução
    const itensDevolucaoCount = await prisma.itemDevolucao.count({
      where: { produtoId: id },
    });

    if (itensDevolucaoCount > 0) {
      throw new Error("Não é possível deletar produto que possui devoluções");
    }

    await prisma.produto.delete({
      where: { id },
    });

    revalidatePath("/produtos");

    return {
      success: true,
      message: "Produto deletado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao deletar produto:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Buscar produtos por termo de pesquisa
export async function searchProdutos(searchTerm: string): Promise<Produto[]> {
  try {
    const produtos = await prisma.produto.findMany({
      where: {
        nome: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      orderBy: {
        nome: "asc",
      },
    });

    // Converter Decimal para number para serialização
    return produtos.map((produto) => ({
      ...produto,
      preco: Number(produto.preco.toString()),
    }));
  } catch (error) {
    console.error("Erro ao pesquisar produtos:", error);
    throw new Error("Falha ao pesquisar produtos");
  }
}
