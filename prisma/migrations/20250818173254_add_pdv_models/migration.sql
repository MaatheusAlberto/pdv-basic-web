-- CreateTable
CREATE TABLE "public"."clientes" (
    "id" BIGSERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."produtos" (
    "id" BIGSERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendas" (
    "id" BIGSERIAL NOT NULL,
    "cliente_id" BIGINT,
    "data_venda" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."itens_venda" (
    "id" BIGSERIAL NOT NULL,
    "venda_id" BIGINT NOT NULL,
    "produto_id" BIGINT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devolucoes" (
    "id" BIGSERIAL NOT NULL,
    "venda_id" BIGINT NOT NULL,
    "data_devolucao" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "devolucoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."itens_devolucao" (
    "id" BIGSERIAL NOT NULL,
    "devolucao_id" BIGINT NOT NULL,
    "produto_id" BIGINT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_devolucao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "public"."clientes"("email");

-- AddForeignKey
ALTER TABLE "public"."vendas" ADD CONSTRAINT "vendas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."itens_venda" ADD CONSTRAINT "itens_venda_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."itens_venda" ADD CONSTRAINT "itens_venda_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devolucoes" ADD CONSTRAINT "devolucoes_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."itens_devolucao" ADD CONSTRAINT "itens_devolucao_devolucao_id_fkey" FOREIGN KEY ("devolucao_id") REFERENCES "public"."devolucoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."itens_devolucao" ADD CONSTRAINT "itens_devolucao_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
