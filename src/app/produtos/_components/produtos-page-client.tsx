"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ProdutoForm } from "@/components/forms/produto-form";
import {
  getProdutos,
  deleteProduto,
  type Produto,
} from "@/actions/produto-actions";
import { toast } from "sonner";

export function ProdutosPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduto, setEditingProduto] = useState<Produto | undefined>();

  const loadProdutos = async () => {
    try {
      setLoading(true);
      const produtosData = await getProdutos();
      setProdutos(produtosData);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  const handleNovoProduto = () => {
    setEditingProduto(undefined);
    setIsModalOpen(true);
  };

  const handleEditarProduto = (produto: Produto) => {
    setEditingProduto(produto);
    setIsModalOpen(true);
  };

  const handleDeletarProduto = async (produto: Produto) => {
    if (
      confirm(`Tem certeza que deseja deletar o produto "${produto.nome}"?`)
    ) {
      try {
        const result = await deleteProduto(produto.id);

        if (result.success) {
          toast.success(result.message);
          loadProdutos();
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Erro ao deletar produto:", error);
        toast.error("Erro inesperado ao deletar produto");
      }
    }
  };

  const handleSuccess = () => {
    loadProdutos(); // Recarregar a lista após sucesso
  };

  const formatPrice = (price: any) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(price.toString()));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-gray-600">Gerencie seu catálogo de produtos</p>
        </div>
        <Button onClick={handleNovoProduto} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {loading ? (
          <p className="text-gray-500">Carregando produtos...</p>
        ) : produtos.length === 0 ? (
          <p className="text-gray-500">Nenhum produto cadastrado</p>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {produtos.length} produto{produtos.length !== 1 ? "s" : ""}{" "}
              cadastrado{produtos.length !== 1 ? "s" : ""}
            </h3>
            <div className="grid gap-4">
              {produtos.map((produto) => (
                <div
                  key={produto.id.toString()}
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-medium">{produto.nome}</h4>
                    <p className="text-lg font-semibold text-green-600">
                      {formatPrice(produto.preco)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditarProduto(produto)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletarProduto(produto)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ProdutoForm
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        produto={editingProduto}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
