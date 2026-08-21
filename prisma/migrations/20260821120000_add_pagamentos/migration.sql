-- CreateTable
CREATE TABLE "public"."pagamentos" (
    "id" BIGSERIAL NOT NULL,
    "venda_id" BIGINT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "forma_pagamento" TEXT,
    "observacao" TEXT,
    "data_pagamento" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pagamentos_venda_id_idx" ON "public"."pagamentos"("venda_id");

-- AddForeignKey
ALTER TABLE "public"."pagamentos" ADD CONSTRAINT "pagamentos_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: todas as vendas anteriores ao controle de pagamento entram como pagas
INSERT INTO "public"."pagamentos" ("venda_id", "valor", "observacao", "data_pagamento")
SELECT
    v."id",
    v."total" - COALESCE(
        (SELECT SUM(d."total") FROM "public"."devolucoes" d WHERE d."venda_id" = v."id"),
        0
    ),
    'Baixa automatica (venda anterior ao controle de pagamento)',
    v."data_venda"
FROM "public"."vendas" v
WHERE v."total" - COALESCE(
        (SELECT SUM(d."total") FROM "public"."devolucoes" d WHERE d."venda_id" = v."id"),
        0
    ) > 0;
