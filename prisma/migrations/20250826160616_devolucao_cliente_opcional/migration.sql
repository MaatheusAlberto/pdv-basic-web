-- DropForeignKey
ALTER TABLE "public"."devolucoes" DROP CONSTRAINT "devolucoes_venda_id_fkey";

-- AlterTable
ALTER TABLE "public"."devolucoes" ADD COLUMN     "cliente_id" BIGINT,
ALTER COLUMN "venda_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."devolucoes" ADD CONSTRAINT "devolucoes_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devolucoes" ADD CONSTRAINT "devolucoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
