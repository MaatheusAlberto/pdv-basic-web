"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { ClienteForm } from "@/components/forms/cliente-form";
import { getClientes, type Cliente } from "@/actions/cliente-actions";

export function ClientesPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [clienteEdicao, setClienteEdicao] = useState<Cliente | null>(null);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const clientesData = await getClientes();
      setClientes(clientesData);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const handleNovoCliente = () => {
    setClienteEdicao(null);
    setIsModalOpen(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteEdicao(cliente);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    loadClientes(); // Recarregar a lista após sucesso
    setClienteEdicao(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-gray-600">Gerencie seus clientes</p>
        </div>
        <Button onClick={handleNovoCliente} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {loading ? (
          <p className="text-gray-500">Carregando clientes...</p>
        ) : clientes.length === 0 ? (
          <p className="text-gray-500">Nenhum cliente cadastrado</p>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}{" "}
              cadastrado{clientes.length !== 1 ? "s" : ""}
            </h3>
            <div className="grid gap-4">
              {clientes.map((cliente) => (
                <div
                  key={cliente.id.toString()}
                  className="border rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{cliente.nome}</h4>
                    {cliente.email && (
                      <p className="text-sm text-gray-600">{cliente.email}</p>
                    )}
                    {cliente.telefone && (
                      <p className="text-sm text-gray-600">
                        {cliente.telefone}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditarCliente(cliente)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ClienteForm
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        cliente={clienteEdicao || undefined}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
