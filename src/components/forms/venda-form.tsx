"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createVenda } from "@/actions/venda-actions";
import { getClientes, type Cliente } from "@/actions/cliente-actions";
import { getProdutos, type Produto } from "@/actions/produto-actions";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart } from "lucide-react";

const itemVendaSchema = z.object({
  produtoId: z.string().min(1, "Produto é obrigatório"),
  quantidade: z.number().positive("Quantidade deve ser maior que zero"),
  precoUnitario: z.number().positive("Preço deve ser maior que zero"),
});

const vendaSchema = z.object({
  clienteId: z.string().min(1, "Cliente é obrigatório"),
  itens: z
    .array(itemVendaSchema)
    .min(1, "Pelo menos um item deve ser adicionado"),
});

type VendaFormData = z.infer<typeof vendaSchema>;

interface VendaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (vendaData?: any) => void;
}

export function VendaForm({ open, onOpenChange, onSuccess }: VendaFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const form = useForm<VendaFormData>({
    resolver: zodResolver(vendaSchema),
    defaultValues: {
      clienteId: "",
      itens: [{ produtoId: "", quantidade: 1, precoUnitario: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "itens",
  });

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientesData, produtosData] = await Promise.all([
          getClientes(),
          getProdutos(),
        ]);
        setClientes(clientesData);
        setProdutos(produtosData);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados");
      }
    };

    if (open) {
      loadData();
    }
  }, [open]);

  // Reset form quando modal abrir/fechar
  React.useEffect(() => {
    if (!open) {
      form.reset({
        clienteId: "",
        itens: [{ produtoId: "", quantidade: 1, precoUnitario: 0 }],
      });
    }
  }, [open, form]);

  const handleProdutoChange = (index: number, produtoId: string) => {
    const produto = produtos.find((p) => p.id.toString() === produtoId);
    if (produto) {
      form.setValue(`itens.${index}.precoUnitario`, produto.preco);
    }
  };

  const addItem = () => {
    append({ produtoId: "", quantidade: 1, precoUnitario: 0 });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const calculateTotal = () => {
    const itens = form.watch("itens");
    return itens.reduce((total, item) => {
      return total + item.quantidade * item.precoUnitario;
    }, 0);
  };

  const handleSubmit = async (data: VendaFormData) => {
    setIsLoading(true);

    try {
      // Converter dados para o formato esperado pelas actions
      const vendaData = {
        clienteId: BigInt(data.clienteId),
        itens: data.itens.map((item) => ({
          produtoId: BigInt(item.produtoId),
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
        })),
      };

      const result = await createVenda(vendaData);

      if (result.success) {
        toast.success(result.message);
        form.reset();
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      toast.error("Erro inesperado ao registrar venda");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };


  const itensAtuais = form.watch("itens");
  const totalItens = itensAtuais.reduce(
    (total, item) => total + (item.quantidade || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] flex-col gap-3 overflow-hidden p-4 sm:max-w-4xl sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Nova Venda
          </DialogTitle>
          <DialogDescription>
            Registre uma nova venda no sistema
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-3"
          >
            {/* Cliente + adicionar item */}
            <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
              <FormField
                control={form.control}
                name="clienteId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs font-medium text-gray-500">
                      Cliente *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem
                            key={cliente.id.toString()}
                            value={cliente.id.toString()}
                          >
                            {cliente.nome}
                            {cliente.email && ` (${cliente.email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                onClick={addItem}
                size="sm"
                className="h-9 shrink-0"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </div>

            {/* Cabeçalho das colunas (desktop) */}
            <div className="hidden flex-shrink-0 grid-cols-[minmax(0,1fr)_4.5rem_7rem_7rem_2.25rem] gap-3 px-2 text-xs font-medium text-gray-500 md:grid">
              <span>Produto</span>
              <span>Qtd</span>
              <span>Preço Unit.</span>
              <span className="text-right">Subtotal</span>
              <span className="sr-only">Ações</span>
            </div>

            {/* Itens da venda: única área com rolagem */}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border p-2 md:grid md:grid-cols-[minmax(0,1fr)_4.5rem_7rem_7rem_2.25rem] md:items-center md:gap-3"
                >
                  <div className="mb-2 md:mb-0">
                    <FormField
                      control={form.control}
                      name={`itens.${index}.produtoId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-gray-500 md:hidden">
                            Produto *
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleProdutoChange(index, value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione um produto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {produtos.map((produto) => (
                                <SelectItem
                                  key={produto.id.toString()}
                                  value={produto.id.toString()}
                                >
                                  {produto.nome} - {formatPrice(produto.preco)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* No desktop os campos abaixo entram direto no grid da linha */}
                  <div className="grid grid-cols-[4.5rem_1fr_1fr_2.25rem] items-end gap-2 md:contents">
                    <FormField
                      control={form.control}
                      name={`itens.${index}.quantidade`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-gray-500 md:hidden">
                            Qtd *
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 1)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`itens.${index}.precoUnitario`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-gray-500 md:hidden">
                            Preço Unit. *
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <div className="text-xs text-gray-500 md:hidden">
                        Subtotal
                      </div>
                      <div className="flex h-9 items-center font-medium text-green-600 md:justify-end">
                        {formatPrice(
                          form.watch(`itens.${index}.quantidade`) *
                            form.watch(`itens.${index}.precoUnitario`)
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={fields.length === 1}
                      className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Rodapé fixo: total e ações */}
            <div className="flex flex-shrink-0 flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold">
                  Total:{" "}
                  <span className="text-green-600">
                    {formatPrice(calculateTotal())}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {fields.length} {fields.length === 1 ? "produto" : "produtos"}{" "}
                  • {totalItens} {totalItens === 1 ? "unidade" : "unidades"}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || calculateTotal() === 0}
                >
                  {isLoading ? "Registrando..." : "Registrar Venda"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
