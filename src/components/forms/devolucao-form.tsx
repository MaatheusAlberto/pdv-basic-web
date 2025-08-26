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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDevolucao } from "@/actions/venda-actions";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import type { Venda } from "@/actions/venda-actions";

const createItemDevolucaoSchema = (venda?: Venda) =>
  z
    .object({
      produtoId: z.string().min(1, "Produto é obrigatório"),
      quantidade: z.number().positive("Quantidade deve ser maior que zero"),
      precoUnitario: z.number().positive("Preço deve ser maior que zero"),
    })
    .refine(
      (data) => {
        if (!venda || !data.produtoId) return true;

        const itemVenda = venda.itens.find(
          (item) => item.produtoId.toString() === data.produtoId
        );

        if (!itemVenda) return false;

        return data.quantidade <= itemVenda.quantidade;
      },
      {
        message: "Quantidade não pode ser maior que a quantidade vendida",
        path: ["quantidade"],
      }
    );

const createDevolucaoSchema = (venda?: Venda) =>
  z.object({
    itens: z
      .array(createItemDevolucaoSchema(venda))
      .min(1, "Pelo menos um item deve ser devolvido")
      .refine((itens) => {
        // Validar que não há produtos duplicados
        const produtoIds = itens.map((item) => item.produtoId).filter(Boolean);
        const uniqueIds = new Set(produtoIds);
        return uniqueIds.size === produtoIds.length;
      }, "Não é possível adicionar o mesmo produto mais de uma vez"),
  });

type DevolucaoFormData = {
  itens: Array<{
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
  }>;
};

interface DevolucaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venda?: Venda;
  onSuccess?: () => void;
}

export function DevolucaoForm({
  open,
  onOpenChange,
  venda,
  onSuccess,
}: DevolucaoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] =
    useState<DevolucaoFormData | null>(null);

  const form = useForm<DevolucaoFormData>({
    resolver: zodResolver(createDevolucaoSchema(venda)),
    defaultValues: {
      itens: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "itens",
  });

  // Reset form quando modal abrir/fechar ou venda mudar
  React.useEffect(() => {
    if (!open || !venda) {
      form.reset({
        itens: [],
      });
    } else {
      // Inicializar com os itens da venda
      const itensIniciais = venda.itens.map((item) => ({
        produtoId: item.produtoId.toString(),
        quantidade: 1,
        precoUnitario: item.precoUnitario,
      }));
      form.reset({
        itens: itensIniciais.length > 0 ? itensIniciais : [],
      });
    }
  }, [open, venda, form]);

  // Recriar resolver quando venda mudar
  React.useEffect(() => {
    if (venda) {
      form.clearErrors();
      // Força a revalidação com o novo schema
      form.trigger();
    }
  }, [venda, form]);

  const addItem = () => {
    if (venda && venda.itens.length > 0) {
      const primeiroItem = venda.itens[0];
      append({
        produtoId: primeiroItem.produtoId.toString(),
        quantidade: 1,
        precoUnitario: primeiroItem.precoUnitario,
      });
    }
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleProdutoChange = (index: number, produtoId: string) => {
    if (venda) {
      const itemVenda = venda.itens.find(
        (item) => item.produtoId.toString() === produtoId
      );
      if (itemVenda) {
        form.setValue(`itens.${index}.precoUnitario`, itemVenda.precoUnitario);
      }
    }
  };

  const getMaxQuantidade = (produtoId: string) => {
    if (!venda) return 0;
    const itemVenda = venda.itens.find(
      (item) => item.produtoId.toString() === produtoId
    );
    return itemVenda ? itemVenda.quantidade : 0;
  };

  const calculateTotal = () => {
    const itens = form.watch("itens");
    if (!itens || itens.length === 0) return 0;

    return itens.reduce((total, item) => {
      if (!item.produtoId || !item.quantidade || !item.precoUnitario)
        return total;
      return total + item.quantidade * item.precoUnitario;
    }, 0);
  };

  const handleSubmit = async (data: DevolucaoFormData) => {
    if (!venda) return;

    // Verificar se há itens para devolver
    if (!data.itens || data.itens.length === 0) {
      toast.error("Adicione pelo menos um item para devolução");
      return;
    }

    // Validar quantidades
    for (const item of data.itens) {
      if (!item.produtoId) {
        toast.error("Selecione um produto para todos os itens");
        return;
      }

      const maxQuantidade = getMaxQuantidade(item.produtoId);
      if (item.quantidade > maxQuantidade) {
        toast.error(
          `Quantidade a devolver não pode ser maior que ${maxQuantidade} para este produto`
        );
        return;
      }

      if (item.quantidade <= 0) {
        toast.error("Quantidade deve ser maior que zero");
        return;
      }
    }

    // Se passou nas validações, armazenar dados e abrir modal de confirmação
    setConfirmationData(data);
    setShowConfirmation(true);
  };

  const handleConfirmDevolucao = async () => {
    if (!venda || !confirmationData) return;

    setIsLoading(true);

    try {
      // Converter dados para o formato esperado pelas actions
      const devolucaoData = {
        vendaId: BigInt(venda.id.toString()),
        itens: confirmationData.itens.map((item) => ({
          produtoId: BigInt(item.produtoId),
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
        })),
      };

      const result = await createDevolucao(devolucaoData);

      if (result.success) {
        toast.success(result.message);
        form.reset();
        setShowConfirmation(false);
        setConfirmationData(null);
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.error || "Erro ao processar devolução");
      }
    } catch (error) {
      console.error("Erro ao registrar devolução:", error);
      toast.error("Erro inesperado ao registrar devolução");
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (!venda) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Nova Devolução
            </DialogTitle>
            <DialogDescription>
              Registre uma devolução para a venda selecionada
            </DialogDescription>
          </DialogHeader>

          {/* Informações da Venda */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Venda Original</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>ID da Venda:</strong> #{venda.id.toString()}
                </div>
                <div>
                  <strong>Data:</strong> {formatDate(venda.dataVenda)}
                </div>
                <div>
                  <strong>Cliente:</strong> {venda.cliente.nome}
                </div>
                <div>
                  <strong>Total:</strong> {formatPrice(venda.total)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Itens da Devolução */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Itens para Devolução</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex gap-4 items-end p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`itens.${index}.produtoId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Produto *</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleProdutoChange(index, value);
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um produto" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {venda.itens.map((item) => (
                                    <SelectItem
                                      key={item.produtoId.toString()}
                                      value={item.produtoId.toString()}
                                    >
                                      {item.produto.nome} - Qtd:{" "}
                                      {item.quantidade} -{" "}
                                      {formatPrice(item.precoUnitario)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="w-24">
                        <FormField
                          control={form.control}
                          name={`itens.${index}.quantidade`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Qtd *{" "}
                                {form.watch(`itens.${index}.produtoId`) && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Máx:{" "}
                                    {getMaxQuantidade(
                                      form.watch(`itens.${index}.produtoId`)
                                    )}
                                  </div>
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max={getMaxQuantidade(
                                    form.watch(`itens.${index}.produtoId`)
                                  )}
                                  {...field}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    const maxQtd = getMaxQuantidade(
                                      form.watch(`itens.${index}.produtoId`)
                                    );

                                    // Limitar o valor ao máximo permitido
                                    const finalValue =
                                      value > maxQtd
                                        ? maxQtd
                                        : value < 1
                                        ? 1
                                        : value;
                                    field.onChange(finalValue);

                                    // Disparar validação imediatamente
                                    setTimeout(() => {
                                      form.trigger(`itens.${index}.quantidade`);
                                    }, 0);
                                  }}
                                  onBlur={() => {
                                    // Validar quando sair do campo
                                    form.trigger(`itens.${index}.quantidade`);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="w-32">
                        <FormField
                          control={form.control}
                          name={`itens.${index}.precoUnitario`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preço Unit.</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  readOnly
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="w-32">
                        <FormLabel>Subtotal</FormLabel>
                        <div className="h-10 flex items-center font-medium text-red-600">
                          -
                          {formatPrice(
                            form.watch(`itens.${index}.quantidade`) *
                              form.watch(`itens.${index}.precoUnitario`)
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="flex justify-end pt-4 border-t">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-red-600">
                        Total a devolver: -{formatPrice(calculateTotal())}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Botões */}
              <div className="flex justify-end space-x-2">
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
                  {isLoading ? "Registrando..." : "Registrar Devolução"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Confirmar Devolução
            </DialogTitle>
            <DialogDescription>
              Confirme os itens e quantidades a serem devolvidos
            </DialogDescription>
          </DialogHeader>

          {confirmationData && venda && (
            <div className="space-y-4">
              {/* Resumo da Venda */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Dados da Venda</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Venda:</strong> #{venda.id.toString()}
                    </div>
                    <div>
                      <strong>Cliente:</strong> {venda.cliente.nome}
                    </div>
                    <div>
                      <strong>Data:</strong> {formatDate(venda.dataVenda)}
                    </div>
                    <div>
                      <strong>Total Original:</strong>{" "}
                      {formatPrice(venda.total)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Itens a Devolver */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Itens a Devolver</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {confirmationData.itens.map((item, index) => {
                      const produtoVenda = venda.itens.find(
                        (vendaItem) =>
                          vendaItem.produtoId.toString() === item.produtoId
                      );
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {produtoVenda?.produto.nome}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatPrice(item.precoUnitario)} ×{" "}
                              {item.quantidade}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-red-600">
                              -
                              {formatPrice(
                                item.quantidade * item.precoUnitario
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Qtd: {item.quantidade} de{" "}
                              {produtoVenda?.quantidade}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total da Devolução */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">
                        Total a Devolver:
                      </span>
                      <span className="text-xl font-bold text-red-600">
                        -
                        {formatPrice(
                          confirmationData.itens.reduce(
                            (total, item) =>
                              total + item.quantidade * item.precoUnitario,
                            0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Botões de Confirmação */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmationData(null);
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmDevolucao}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isLoading ? "Processando..." : "Confirmar Devolução"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
