"use client";

import { useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
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
import { createProduto, updateProduto } from "@/actions/produto-actions";
import { toast } from "sonner";

const produtoSchema = z.object({
  nome: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres",
  }),
  preco: z.number().positive({
    message: "Preço deve ser maior que zero",
  }),
});

type ProdutoFormData = z.infer<typeof produtoSchema>;

interface ProdutoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: {
    id: bigint;
    nome: string;
    preco: number;
  };
  onSuccess?: () => void;
}

export function ProdutoForm({
  open,
  onOpenChange,
  produto,
  onSuccess,
}: ProdutoFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      nome: produto?.nome || "",
      preco: produto?.preco || 0,
    },
  });

  // Reset form when produto changes
  React.useEffect(() => {
    if (produto) {
      form.reset({
        nome: produto.nome,
        preco: produto.preco,
      });
    } else {
      form.reset({
        nome: "",
        preco: 0,
      });
    }
  }, [produto, form]);

  const handleSubmit = async (data: ProdutoFormData) => {
    setIsLoading(true);

    try {
      let result;

      if (produto) {
        // Atualizar produto existente
        result = await updateProduto({
          id: produto.id,
          ...data,
        });
      } else {
        // Criar novo produto
        result = await createProduto(data);
      }

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
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro inesperado ao salvar produto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {produto ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
          <DialogDescription>
            {produto
              ? "Edite as informações do produto"
              : "Cadastre um novo produto no sistema"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do produto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Digite o preço do produto"
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? produto
                    ? "Atualizando..."
                    : "Cadastrando..."
                  : produto
                  ? "Atualizar"
                  : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
