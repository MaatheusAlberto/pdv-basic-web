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
  onSuccess?: () => void;
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
          onSuccess();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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
            className="space-y-6"
          >
            {/* Seleção do Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
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
              </CardContent>
            </Card>

            {/* Itens da Venda */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Itens da Venda</CardTitle>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
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
                                {produtos.map((produto) => (
                                  <SelectItem
                                    key={produto.id.toString()}
                                    value={produto.id.toString()}
                                  >
                                    {produto.nome} -{" "}
                                    {formatPrice(produto.preco)}
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
                            <FormLabel>Qtd *</FormLabel>
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
                    </div>

                    <div className="w-32">
                      <FormField
                        control={form.control}
                        name={`itens.${index}.precoUnitario`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço Unit. *</FormLabel>
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
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="w-32">
                      <FormLabel>Subtotal</FormLabel>
                      <div className="h-10 flex items-center font-medium text-green-600">
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
                    <div className="text-lg font-semibold">
                      Total: {formatPrice(calculateTotal())}
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
                {isLoading ? "Registrando..." : "Registrar Venda"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
