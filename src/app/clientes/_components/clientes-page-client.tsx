"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Search,
  Users,
  Mail,
  Phone,
  Wallet,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { ClienteForm, PagamentoForm } from "@/components/forms";
import { getClientes, type Cliente } from "@/actions/cliente-actions";
import {
  getContasAReceber,
  type ContaAReceber,
} from "@/actions/pagamento-actions";
import { toast } from "sonner";

const CORES_AVATAR = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

const iniciais = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("") || "?";

const corAvatar = (nome: string) => {
  let soma = 0;
  for (let i = 0; i < nome.length; i++) soma += nome.charCodeAt(i);
  return CORES_AVATAR[soma % CORES_AVATAR.length];
};

export function ClientesPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contas, setContas] = useState<ContaAReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [clienteEdicao, setClienteEdicao] = useState<Cliente | null>(null);
  const [clientePagamento, setClientePagamento] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<"nome" | "devendo">("nome");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);

  const loadDados = async () => {
    try {
      setLoading(true);
      const [clientesData, contasData] = await Promise.all([
        getClientes(),
        getContasAReceber(),
      ]);
      setClientes(clientesData);
      setContas(contasData);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDados();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [busca, ordenacao]);

  // Saldo em aberto por cliente
  const saldoPorCliente = useMemo(() => {
    const mapa = new Map<string, { emAberto: number; creditos: number }>();
    for (const conta of contas) {
      mapa.set(conta.clienteId.toString(), {
        emAberto: conta.totalEmAberto,
        creditos: conta.totalCreditos,
      });
    }
    return mapa;
  }, [contas]);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const lista = clientes.filter((cliente) => {
      if (!termo) return true;
      return (
        cliente.nome.toLowerCase().includes(termo) ||
        (cliente.email || "").toLowerCase().includes(termo) ||
        (cliente.telefone || "").toLowerCase().includes(termo)
      );
    });

    return [...lista].sort((a, b) => {
      if (ordenacao === "devendo") {
        const saldoA = saldoPorCliente.get(a.id.toString())?.emAberto || 0;
        const saldoB = saldoPorCliente.get(b.id.toString())?.emAberto || 0;
        if (saldoA !== saldoB) return saldoB - saldoA;
      }
      return a.nome.localeCompare(b.nome);
    });
  }, [clientes, busca, ordenacao, saldoPorCliente]);

  const stats = useMemo(() => {
    const devendo = clientes.filter(
      (cliente) => (saldoPorCliente.get(cliente.id.toString())?.emAberto || 0) > 0
    ).length;
    const totalEmAberto = contas.reduce(
      (total, conta) => total + conta.totalEmAberto,
      0
    );
    const comContato = clientes.filter(
      (cliente) => cliente.telefone || cliente.email
    ).length;

    return { devendo, totalEmAberto, comContato };
  }, [clientes, contas, saldoPorCliente]);

  const totalPages = Math.max(
    Math.ceil(clientesFiltrados.length / itemsPerPage),
    1
  );
  const paginaAtual = Math.min(currentPage, totalPages);
  const startIndex = (paginaAtual - 1) * itemsPerPage;
  const clientesPaginados = clientesFiltrados.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleNovoCliente = () => {
    setClienteEdicao(null);
    setIsModalOpen(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteEdicao(cliente);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    loadDados();
    setClienteEdicao(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-gray-600">Gerencie seus clientes</p>
        </div>
        <Button onClick={handleNovoCliente} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.comContato} com contato cadastrado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devendo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.devendo}</div>
            <p className="text-xs text-muted-foreground">
              clientes com saldo em aberto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatPrice(stats.totalEmAberto)}
            </div>
            <p className="text-xs text-muted-foreground">
              somando todos os clientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <Label htmlFor="busca" className="text-sm font-medium">
                Buscar
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="busca"
                  placeholder="Nome, e-mail ou telefone"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-56">
              <Label className="text-sm font-medium">Ordenar por</Label>
              <Select
                value={ordenacao}
                onValueChange={(value) =>
                  setOrdenacao(value as "nome" | "devendo")
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                  <SelectItem value="devendo">Quem está devendo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {busca && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBusca("")}
                className="shrink-0"
              >
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de clientes */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle>
            {clientesFiltrados.length}{" "}
            {clientesFiltrados.length === 1 ? "cliente" : "clientes"}
            {busca && " encontrado(s)"}
          </CardTitle>
          {clientesFiltrados.length > itemsPerPage && (
            <div className="text-sm text-gray-600">
              Mostrando {startIndex + 1}-
              {Math.min(startIndex + itemsPerPage, clientesFiltrados.length)} de{" "}
              {clientesFiltrados.length}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Carregando clientes...</p>
          ) : clientes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhum cliente cadastrado</p>
              <p className="text-gray-400">
                Clique em &quot;Novo Cliente&quot; para começar
              </p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Nenhum cliente encontrado para &quot;{busca}&quot;
              </p>
              <Button
                variant="outline"
                onClick={() => setBusca("")}
                className="mt-4"
              >
                Limpar busca
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {clientesPaginados.map((cliente) => {
                  const saldo = saldoPorCliente.get(cliente.id.toString());
                  const emAberto = saldo?.emAberto || 0;
                  const creditos = saldo?.creditos || 0;

                  return (
                    <div
                      key={cliente.id.toString()}
                      className={`flex flex-col justify-between rounded-lg border p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 ${
                        emAberto > 0 ? "border-orange-200 bg-orange-50/40" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${corAvatar(
                            cliente.nome
                          )}`}
                        >
                          {iniciais(cliente.nome)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-medium">
                            {cliente.nome.trim()}
                          </h4>
                          <div className="mt-1 space-y-0.5 text-sm text-gray-600">
                            {cliente.telefone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                  {cliente.telefone}
                                </span>
                              </div>
                            )}
                            {cliente.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                  {cliente.email}
                                </span>
                              </div>
                            )}
                            {!cliente.telefone && !cliente.email && (
                              <span className="text-gray-400">
                                Sem contato cadastrado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <div className="flex flex-wrap gap-1">
                          {emAberto > 0 ? (
                            <Badge className="bg-orange-100 text-orange-700 border border-orange-200">
                              Deve {formatPrice(emAberto)}
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Em dia
                            </Badge>
                          )}
                          {creditos > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                              Crédito {formatPrice(creditos)}
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {emAberto > 0 && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                              onClick={() =>
                                setClientePagamento({
                                  id: cliente.id.toString(),
                                  nome: cliente.nome,
                                })
                              }
                            >
                              <Wallet className="h-4 w-4" />
                              Receber
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditarCliente(cliente)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={paginaAtual === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={paginaAtual === totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Página {paginaAtual} de {totalPages}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ClienteForm
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        cliente={clienteEdicao || undefined}
        onSuccess={handleSuccess}
      />

      <PagamentoForm
        open={!!clientePagamento}
        onOpenChange={(open) => !open && setClientePagamento(null)}
        cliente={clientePagamento || undefined}
        onSuccess={loadDados}
      />
    </div>
  );
}
