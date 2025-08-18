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
import { createCliente, updateCliente } from "@/actions/cliente-actions";
import { toast } from "sonner";

const clienteSchema = z.object({
  nome: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres",
  }),
  email: z
    .string()
    .email({
      message: "Email inválido",
    })
    .optional()
    .or(z.literal("")),
  telefone: z.string().optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

interface ClienteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: {
    id: bigint;
    nome: string;
    email: string | null;
    telefone: string | null;
  };
  onSuccess?: () => void;
}

export function ClienteForm({
  open,
  onOpenChange,
  cliente,
  onSuccess,
}: ClienteFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: cliente?.nome || "",
      email: cliente?.email || "",
      telefone: cliente?.telefone || "",
    },
  });

  // Reset form when cliente changes
  React.useEffect(() => {
    if (cliente) {
      form.reset({
        nome: cliente.nome,
        email: cliente.email || "",
        telefone: cliente.telefone || "",
      });
    } else {
      form.reset({
        nome: "",
        email: "",
        telefone: "",
      });
    }
  }, [cliente, form]);

  const handleSubmit = async (data: ClienteFormData) => {
    setIsLoading(true);

    try {
      let result;

      if (cliente) {
        // Atualizar cliente existente
        result = await updateCliente({
          id: cliente.id,
          ...data,
        });
      } else {
        // Criar novo cliente
        result = await createCliente(data);
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
      console.error("Erro ao salvar cliente:", error);
      toast.error("Erro inesperado ao salvar cliente");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {cliente ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
          <DialogDescription>
            {cliente
              ? "Edite as informações do cliente"
              : "Cadastre um novo cliente no sistema"}
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
                    <Input placeholder="Digite o nome do cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Digite o email do cliente"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o telefone do cliente"
                      {...field}
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
                  ? cliente
                    ? "Atualizando..."
                    : "Cadastrando..."
                  : cliente
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
