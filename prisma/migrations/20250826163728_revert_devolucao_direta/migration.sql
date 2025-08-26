/*
  Warnings:

  - You are about to drop the column `cliente_id` on the `devolucoes` table. All the data in the column will be lost.
  - Made the column `venda_id` on table `devolucoes` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."devolucoes" DROP CONSTRAINT "devolucoes_cliente_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."devolucoes" DROP CONSTRAINT "devolucoes_venda_id_fkey";

-- AlterTable
ALTER TABLE "public"."devolucoes" DROP COLUMN "cliente_id",
ALTER COLUMN "venda_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."devolucoes" ADD CONSTRAINT "devolucoes_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
