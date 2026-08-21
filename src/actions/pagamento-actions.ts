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

export type Pagamento = {
  id: bigint;
  vendaId: bigint;
  valor: number;
  formaPagamento: string | null;
  observacao: string | null;
  dataPagamento: Date;
};

export type VendaEmAberto = {
  vendaId: bigint;
  dataVenda: Date;
  total: number;
  totalDevolvido: number;
  totalLiquido: number;
  totalPago: number;
  saldo: number;
  statusPagamento: StatusPagamento;
};

export type ResumoPagamentoCliente = {
  clienteId: bigint;
  clienteNome: string;
  totalEmAberto: number;
  totalCreditos: number;
  vendasEmAberto: VendaEmAberto[];
};

const PagamentoSchema = z.object({
  vendaId: z.bigint(),
  valor: z.number().positive("Valor deve ser maior que zero"),
  formaPagamento: z.string().trim().min(1).optional().nullable(),
  observacao: z.string().trim().min(1).optional().nullable(),
});

const PagamentoClienteSchema = z.object({
  clienteId: z.bigint(),
  valor: z.number().positive("Valor deve ser maior que zero"),
  formaPagamento: z.string().trim().min(1).optional().nullable(),
  observacao: z.string().trim().min(1).optional().nullable(),
  dataInicial: z.string().optional(),
  dataFinal: z.string().optional(),
});

const PagamentoLoteSchema = z.object({
  pagamentos: z
    .array(
      z.object({
        clienteId: z.bigint(),
        valor: z.number().positive("Valor deve ser maior que zero"),
      })
    )
    .min(1, "Selecione pelo menos um cliente"),
  formaPagamento: z.string().trim().min(1).optional().nullable(),
  observacao: z.string().trim().min(1).optional().nullable(),
  dataInicial: z.string().optional(),
  dataFinal: z.string().optional(),
});

const QuitarClienteSchema = z.object({
  clienteId: z.bigint(),
  formaPagamento: z.string().trim().min(1).optional().nullable(),
  observacao: z.string().trim().min(1).optional().nullable(),
  dataInicial: z.string().optional(),
  dataFinal: z.string().optional(),
});

export type ContaAReceber = {
  clienteId: bigint;
  clienteNome: string;
  telefone: string | null;
  totalEmAberto: number;
  totalCreditos: number;
  quantidadeVendasEmAberto: number;
  vendaMaisAntiga: Date | null;
  diasEmAberto: number;
  vendasEmAberto: VendaEmAberto[];
};

export type CreatePagamentoData = z.infer<typeof PagamentoSchema>;
export type CreatePagamentoLoteData = z.infer<typeof PagamentoLoteSchema>;
export type CreatePagamentoClienteData = z.infer<typeof PagamentoClienteSchema>;
export type QuitarClienteData = z.infer<typeof QuitarClienteSchema>;

const inicioDoDia = (data: string) => new Date(`${data}T00:00:00`);
const fimDoDia = (data: string) => new Date(`${data}T23:59:59.999`);

const formatPrice = (valor: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);

function revalidarTelas() {
  revalidatePath("/vendas");
  revalidatePath("/caixa");
  revalidatePath("/recebimentos");
  revalidatePath("/devolucoes");
  revalidatePath("/dashboard");
}

// Calcula os totais de uma venda já carregada com devoluções e pagamentos
function resumirVenda(venda: {
  id: bigint;
  dataVenda: Date;
  total: Decimal;
  devolucoes: { total: Decimal }[];
  pagamentos: { valor: Decimal }[];
}): VendaEmAberto {
  const total = Number(venda.total.toString());
  const totalDevolvido = venda.devolucoes.reduce(
    (acc, devolucao) => acc + Number(devolucao.total.toString()),
    0
  );
  const totalPago = venda.pagamentos.reduce(
    (acc, pagamento) => acc + Number(pagamento.valor.toString()),
    0
  );
  const totalLiquido = arredondar(total - totalDevolvido);
  const saldo = arredondar(totalLiquido - totalPago);

  return {
    vendaId: venda.id,
    dataVenda: venda.dataVenda,
    total,
    totalDevolvido: arredondar(totalDevolvido),
    totalLiquido,
    totalPago: arredondar(totalPago),
    saldo,
    statusPagamento: calcularStatusPagamento(totalLiquido, totalPago),
  };
}

// Registrar um pagamento (total ou parcial) em uma venda específica
export async function createPagamento(data: CreatePagamentoData) {
  try {
    const validatedData = PagamentoSchema.parse(data);

    const venda = await prisma.venda.findUnique({
      where: { id: validatedData.vendaId },
      include: { devolucoes: true, pagamentos: true },
    });

    if (!venda) {
      throw new Error("Venda não encontrada");
    }

    const resumo = resumirVenda(venda);

    if (resumo.saldo <= 0) {
      throw new Error(
        resumo.saldo < 0
          ? `Esta venda tem ${formatPrice(
              Math.abs(resumo.saldo)
            )} de crédito a devolver ao cliente`
          : "Esta venda já está quitada"
      );
    }

    const valor = arredondar(validatedData.valor);

    if (valor > resumo.saldo) {
      throw new Error(
        `Valor informado (${formatPrice(
          valor
        )}) é maior que o saldo em aberto da venda (${formatPrice(
          resumo.saldo
        )})`
      );
    }

    await prisma.pagamento.create({
      data: {
        vendaId: validatedData.vendaId,
        valor: new Decimal(valor.toFixed(2)),
        formaPagamento: validatedData.formaPagamento || null,
        observacao: validatedData.observacao || null,
      },
    });

    revalidarTelas();

    const novoSaldo = arredondar(resumo.saldo - valor);

    return {
      success: true,
      data: {
        vendaId: validatedData.vendaId.toString(),
        valor,
        saldoRestante: novoSaldo,
      },
      message:
        novoSaldo > 0
          ? `Pagamento de ${formatPrice(
              valor
            )} registrado. Saldo restante: ${formatPrice(novoSaldo)}`
          : `Venda quitada com o pagamento de ${formatPrice(valor)}`,
    };
  } catch (error) {
    console.error("Erro ao registrar pagamento:", error);

    if (error instanceof z.ZodError) {
      return { success: false, error: "Dados inválidos", details: error.message };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Quitar o saldo restante de uma venda
export async function quitarVenda(data: {
  vendaId: bigint;
  formaPagamento?: string | null;
  observacao?: string | null;
}) {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: data.vendaId },
      include: { devolucoes: true, pagamentos: true },
    });

    if (!venda) {
      throw new Error("Venda não encontrada");
    }

    const resumo = resumirVenda(venda);

    if (resumo.saldo <= 0) {
      throw new Error("Esta venda não tem saldo em aberto");
    }

    return await createPagamento({
      vendaId: data.vendaId,
      valor: resumo.saldo,
      formaPagamento: data.formaPagamento ?? null,
      observacao: data.observacao ?? null,
    });
  } catch (error) {
    console.error("Erro ao quitar venda:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Buscar as vendas em aberto de um cliente (opcionalmente dentro de um período)
export async function getResumoPagamentoCliente(filtros: {
  clienteId: bigint;
  dataInicial?: string;
  dataFinal?: string;
}): Promise<ResumoPagamentoCliente> {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: filtros.clienteId },
    });

    if (!cliente) {
      throw new Error("Cliente não encontrado");
    }

    const where: any = { clienteId: filtros.clienteId };

    if (filtros.dataInicial || filtros.dataFinal) {
      where.dataVenda = {
        ...(filtros.dataInicial
          ? { gte: inicioDoDia(filtros.dataInicial) }
          : {}),
        ...(filtros.dataFinal ? { lte: fimDoDia(filtros.dataFinal) } : {}),
      };
    }

    const vendas = await prisma.venda.findMany({
      where,
      include: { devolucoes: true, pagamentos: true },
      orderBy: { dataVenda: "asc" },
    });

    const resumos = vendas.map(resumirVenda);
    const vendasEmAberto = resumos.filter((resumo) => resumo.saldo > 0);

    return {
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      totalEmAberto: arredondar(
        vendasEmAberto.reduce((acc, resumo) => acc + resumo.saldo, 0)
      ),
      totalCreditos: arredondar(
        resumos
          .filter((resumo) => resumo.saldo < 0)
          .reduce((acc, resumo) => acc + Math.abs(resumo.saldo), 0)
      ),
      vendasEmAberto,
    };
  } catch (error) {
    console.error("Erro ao buscar resumo de pagamento do cliente:", error);
    throw new Error("Falha ao buscar resumo de pagamento do cliente");
  }
}

// Registrar um pagamento no total do cliente, abatendo das vendas mais antigas primeiro
export async function createPagamentoCliente(data: CreatePagamentoClienteData) {
  try {
    const validatedData = PagamentoClienteSchema.parse(data);

    const resumo = await getResumoPagamentoCliente({
      clienteId: validatedData.clienteId,
      dataInicial: validatedData.dataInicial,
      dataFinal: validatedData.dataFinal,
    });

    if (resumo.vendasEmAberto.length === 0) {
      throw new Error("Este cliente não tem vendas em aberto no período");
    }

    const valor = arredondar(validatedData.valor);

    if (valor > resumo.totalEmAberto) {
      throw new Error(
        `Valor informado (${formatPrice(
          valor
        )}) é maior que o total em aberto do cliente (${formatPrice(
          resumo.totalEmAberto
        )})`
      );
    }

    // Abate das vendas mais antigas para as mais novas
    let restante = valor;
    const pagamentos: {
      vendaId: bigint;
      valor: number;
    }[] = [];

    for (const venda of resumo.vendasEmAberto) {
      if (restante <= 0) break;

      const valorPago = arredondar(Math.min(venda.saldo, restante));
      if (valorPago <= 0) continue;

      pagamentos.push({ vendaId: venda.vendaId, valor: valorPago });
      restante = arredondar(restante - valorPago);
    }

    await prisma.$transaction(
      pagamentos.map((pagamento) =>
        prisma.pagamento.create({
          data: {
            vendaId: pagamento.vendaId,
            valor: new Decimal(pagamento.valor.toFixed(2)),
            formaPagamento: validatedData.formaPagamento || null,
            observacao: validatedData.observacao || null,
          },
        })
      )
    );

    revalidarTelas();

    const saldoRestante = arredondar(resumo.totalEmAberto - valor);

    return {
      success: true,
      data: {
        totalPago: valor,
        vendasQuitadas: pagamentos.filter((pagamento) => {
          const venda = resumo.vendasEmAberto.find(
            (item) => item.vendaId === pagamento.vendaId
          );
          return venda ? arredondar(venda.saldo - pagamento.valor) <= 0 : false;
        }).length,
        vendasAfetadas: pagamentos.length,
        saldoRestante,
      },
      message:
        saldoRestante > 0
          ? `Pagamento de ${formatPrice(valor)} registrado em ${
              pagamentos.length
            } venda(s). Ainda em aberto: ${formatPrice(saldoRestante)}`
          : `Pagamento de ${formatPrice(valor)} registrado. Cliente sem saldo em aberto`,
    };
  } catch (error) {
    console.error("Erro ao registrar pagamento do cliente:", error);

    if (error instanceof z.ZodError) {
      return { success: false, error: "Dados inválidos", details: error.message };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Quitar tudo o que o cliente deve (no período informado)
export async function quitarCliente(data: QuitarClienteData) {
  try {
    const validatedData = QuitarClienteSchema.parse(data);

    const resumo = await getResumoPagamentoCliente({
      clienteId: validatedData.clienteId,
      dataInicial: validatedData.dataInicial,
      dataFinal: validatedData.dataFinal,
    });

    if (resumo.totalEmAberto <= 0) {
      throw new Error("Este cliente não tem vendas em aberto no período");
    }

    return await createPagamentoCliente({
      clienteId: validatedData.clienteId,
      valor: resumo.totalEmAberto,
      formaPagamento: validatedData.formaPagamento ?? null,
      observacao: validatedData.observacao ?? null,
      dataInicial: validatedData.dataInicial,
      dataFinal: validatedData.dataFinal,
    });
  } catch (error) {
    console.error("Erro ao quitar cliente:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Estornar um pagamento lançado por engano
export async function estornarPagamento(id: bigint) {
  try {
    const pagamento = await prisma.pagamento.findUnique({ where: { id } });

    if (!pagamento) {
      throw new Error("Pagamento não encontrado");
    }

    await prisma.pagamento.delete({ where: { id } });

    revalidarTelas();

    return {
      success: true,
      message: `Pagamento de ${formatPrice(
        Number(pagamento.valor.toString())
      )} estornado`,
    };
  } catch (error) {
    console.error("Erro ao estornar pagamento:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Listar todos os clientes com saldo em aberto (contas a receber)
export async function getContasAReceber(
  filtros: {
    dataInicial?: string;
    dataFinal?: string;
  } = {}
): Promise<ContaAReceber[]> {
  try {
    const where: any = { cliente: { isNot: null } };

    if (filtros.dataInicial || filtros.dataFinal) {
      where.dataVenda = {
        ...(filtros.dataInicial
          ? { gte: inicioDoDia(filtros.dataInicial) }
          : {}),
        ...(filtros.dataFinal ? { lte: fimDoDia(filtros.dataFinal) } : {}),
      };
    }

    const vendas = await prisma.venda.findMany({
      where,
      include: {
        cliente: true,
        devolucoes: true,
        pagamentos: true,
      },
      orderBy: { dataVenda: "asc" },
    });

    const porCliente = new Map<string, ContaAReceber>();
    const agora = Date.now();

    for (const venda of vendas) {
      if (!venda.cliente) continue;

      const resumo = resumirVenda(venda);
      if (resumo.saldo === 0) continue;

      const chave = venda.cliente.id.toString();
      const conta =
        porCliente.get(chave) ||
        ({
          clienteId: venda.cliente.id,
          clienteNome: venda.cliente.nome,
          telefone: venda.cliente.telefone,
          totalEmAberto: 0,
          totalCreditos: 0,
          quantidadeVendasEmAberto: 0,
          vendaMaisAntiga: null,
          diasEmAberto: 0,
          vendasEmAberto: [],
        } as ContaAReceber);

      if (resumo.saldo > 0) {
        conta.totalEmAberto = arredondar(conta.totalEmAberto + resumo.saldo);
        conta.quantidadeVendasEmAberto += 1;
        conta.vendasEmAberto.push(resumo);

        if (
          !conta.vendaMaisAntiga ||
          new Date(resumo.dataVenda) < new Date(conta.vendaMaisAntiga)
        ) {
          conta.vendaMaisAntiga = resumo.dataVenda;
          conta.diasEmAberto = Math.max(
            0,
            Math.floor(
              (agora - new Date(resumo.dataVenda).getTime()) / 86400000
            )
          );
        }
      } else {
        conta.totalCreditos = arredondar(
          conta.totalCreditos + Math.abs(resumo.saldo)
        );
      }

      porCliente.set(chave, conta);
    }

    return Array.from(porCliente.values())
      .filter(
        (conta) => conta.totalEmAberto > 0 || conta.totalCreditos > 0
      )
      .sort((a, b) => b.totalEmAberto - a.totalEmAberto);
  } catch (error) {
    console.error("Erro ao buscar contas a receber:", error);
    throw new Error("Falha ao buscar contas a receber");
  }
}

// Dar baixa em vários clientes de uma vez (valor total ou parcial por cliente)
export async function createPagamentosLote(data: CreatePagamentoLoteData) {
  try {
    const validatedData = PagamentoLoteSchema.parse(data);

    // Somar valores repetidos do mesmo cliente
    const solicitados = new Map<string, { clienteId: bigint; valor: number }>();
    for (const item of validatedData.pagamentos) {
      const chave = item.clienteId.toString();
      const atual = solicitados.get(chave);
      if (atual) {
        atual.valor = arredondar(atual.valor + item.valor);
      } else {
        solicitados.set(chave, { clienteId: item.clienteId, valor: item.valor });
      }
    }

    // Montar os pagamentos abatendo das vendas mais antigas de cada cliente
    const aCriar: {
      vendaId: bigint;
      valor: number;
    }[] = [];
    let clientesQuitados = 0;

    for (const solicitado of solicitados.values()) {
      const resumo = await getResumoPagamentoCliente({
        clienteId: solicitado.clienteId,
        dataInicial: validatedData.dataInicial,
        dataFinal: validatedData.dataFinal,
      });

      if (resumo.totalEmAberto <= 0) {
        throw new Error(
          `${resumo.clienteNome} não tem vendas em aberto no período`
        );
      }

      const valor = arredondar(solicitado.valor);

      if (valor > resumo.totalEmAberto) {
        throw new Error(
          `Valor informado para ${resumo.clienteNome} (${formatPrice(
            valor
          )}) é maior que o total em aberto (${formatPrice(
            resumo.totalEmAberto
          )})`
        );
      }

      let restante = valor;
      for (const venda of resumo.vendasEmAberto) {
        if (restante <= 0) break;

        const valorPago = arredondar(Math.min(venda.saldo, restante));
        if (valorPago <= 0) continue;

        aCriar.push({ vendaId: venda.vendaId, valor: valorPago });
        restante = arredondar(restante - valorPago);
      }

      if (arredondar(resumo.totalEmAberto - valor) <= 0) {
        clientesQuitados += 1;
      }
    }

    await prisma.$transaction(
      aCriar.map((pagamento) =>
        prisma.pagamento.create({
          data: {
            vendaId: pagamento.vendaId,
            valor: new Decimal(pagamento.valor.toFixed(2)),
            formaPagamento: validatedData.formaPagamento || null,
            observacao: validatedData.observacao || null,
          },
        })
      )
    );

    revalidarTelas();

    const totalRecebido = arredondar(
      aCriar.reduce((acc, pagamento) => acc + pagamento.valor, 0)
    );

    return {
      success: true,
      data: {
        totalRecebido,
        clientesAtendidos: solicitados.size,
        clientesQuitados,
        vendasAfetadas: aCriar.length,
      },
      message: `${formatPrice(totalRecebido)} recebido de ${
        solicitados.size
      } cliente(s) em ${aCriar.length} venda(s)`,
    };
  } catch (error) {
    console.error("Erro ao registrar pagamentos em lote:", error);

    if (error instanceof z.ZodError) {
      return { success: false, error: "Dados inválidos", details: error.message };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
