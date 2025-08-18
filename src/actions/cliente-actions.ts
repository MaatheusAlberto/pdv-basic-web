"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Schema para validação dos dados do cliente
const ClienteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
});

const ClienteUpdateSchema = ClienteSchema.extend({
  id: z.bigint(),
});

export type Cliente = {
  id: bigint;
  nome: string;
  email: string | null;
  telefone: string | null;
};

export type CreateClienteData = z.infer<typeof ClienteSchema>;
export type UpdateClienteData = z.infer<typeof ClienteUpdateSchema>;

// Buscar todos os clientes
export async function getClientes(): Promise<Cliente[]> {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    return clientes;
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    throw new Error("Falha ao buscar clientes");
  }
}

// Buscar cliente por ID
export async function getClienteById(id: bigint): Promise<Cliente | null> {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
    });

    return cliente;
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    throw new Error("Falha ao buscar cliente");
  }
}

// Criar novo cliente
export async function createCliente(data: CreateClienteData) {
  try {
    // Validar dados
    const validatedData = ClienteSchema.parse(data);

    // Limpar email vazio
    const clienteData = {
      nome: validatedData.nome,
      email: validatedData.email === "" ? null : validatedData.email,
      telefone: validatedData.telefone || null,
    };

    // Verificar se email já existe (se foi fornecido)
    if (clienteData.email) {
      const existingCliente = await prisma.cliente.findUnique({
        where: { email: clienteData.email },
      });

      if (existingCliente) {
        throw new Error("Email já está sendo usado por outro cliente");
      }
    }

    const cliente = await prisma.cliente.create({
      data: clienteData,
    });

    revalidatePath("/clientes");

    return {
      success: true,
      data: cliente,
      message: "Cliente criado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao criar cliente:", error);

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

// Atualizar cliente
export async function updateCliente(data: UpdateClienteData) {
  try {
    // Validar dados
    const validatedData = ClienteUpdateSchema.parse(data);

    // Verificar se cliente existe
    const existingCliente = await prisma.cliente.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingCliente) {
      throw new Error("Cliente não encontrado");
    }

    // Limpar email vazio
    const clienteData = {
      nome: validatedData.nome,
      email: validatedData.email === "" ? null : validatedData.email,
      telefone: validatedData.telefone || null,
    };

    // Verificar se email já existe em outro cliente (se foi fornecido)
    if (clienteData.email) {
      const emailExists = await prisma.cliente.findFirst({
        where: {
          email: clienteData.email,
          id: {
            not: validatedData.id,
          },
        },
      });

      if (emailExists) {
        throw new Error("Email já está sendo usado por outro cliente");
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id: validatedData.id },
      data: clienteData,
    });

    revalidatePath("/clientes");

    return {
      success: true,
      data: cliente,
      message: "Cliente atualizado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);

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

// Deletar cliente
export async function deleteCliente(id: bigint) {
  try {
    // Verificar se cliente existe
    const existingCliente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!existingCliente) {
      throw new Error("Cliente não encontrado");
    }

    // Verificar se cliente tem vendas
    const vendasCount = await prisma.venda.count({
      where: { clienteId: id },
    });

    if (vendasCount > 0) {
      throw new Error("Não é possível deletar cliente que possui vendas");
    }

    await prisma.cliente.delete({
      where: { id },
    });

    revalidatePath("/clientes");

    return {
      success: true,
      message: "Cliente deletado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao deletar cliente:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Buscar clientes por termo de pesquisa
export async function searchClientes(searchTerm: string): Promise<Cliente[]> {
  try {
    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          {
            nome: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            telefone: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: {
        nome: "asc",
      },
    });

    return clientes;
  } catch (error) {
    console.error("Erro ao pesquisar clientes:", error);
    throw new Error("Falha ao pesquisar clientes");
  }
}
