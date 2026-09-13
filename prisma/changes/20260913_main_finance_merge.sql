BEGIN;

DO $$ BEGIN CREATE TYPE "CategoriaServico" AS ENUM ('CONSULTA', 'PARECER', 'PETICAO', 'AUDIENCIA', 'ELABORACAO_CONTRATO', 'OUTROS_SERVICO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MotivoBaixa" AS ENUM ('SEM_EXITO', 'ACORDO_MENOR', 'DESISTENCIA', 'OUTRO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoDespesa" AS ENUM ('PROCESSO', 'ESCRITORIO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "QuemPaga" AS ENUM ('CLIENTE', 'ADVOGADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CategoriaDespesa" AS ENUM ('DESLOCAMENTO', 'CUSTAS', 'DILIGENCIA', 'CARTORIO', 'PERICIA', 'CORRESPONDENTE', 'OUTROS_PROCESSO', 'ESTRUTURA', 'SOFTWARE', 'TRIBUTOS', 'PESSOAL', 'OUTROS_ESCRITORIO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrigemRegistro" AS ENUM ('MANUAL', 'UPLOAD', 'DRIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Cliente"
  ADD COLUMN IF NOT EXISTS "documento" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "telefone" TEXT;

ALTER TABLE "Contrato"
  ADD COLUMN IF NOT EXISTS "arquivoNome" TEXT,
  ADD COLUMN IF NOT EXISTS "numero" SERIAL,
  ADD COLUMN IF NOT EXISTS "origem" "OrigemRegistro" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "processo" TEXT,
  ADD COLUMN IF NOT EXISTS "titulo" TEXT;

ALTER TABLE "Contrato" ALTER COLUMN "numero" SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Contrato" GROUP BY "numero" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Contrato.numero contém duplicidades; atualização cancelada';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Contrato_numero_key" ON "Contrato"("numero");

ALTER TABLE "Parcela"
  ADD COLUMN IF NOT EXISTS "baixadaEm" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "motivoBaixa" "MotivoBaixa",
  ADD COLUMN IF NOT EXISTS "notaBaixa" TEXT;

CREATE TABLE IF NOT EXISTS "Servico" (
  "id" TEXT NOT NULL,
  "numero" SERIAL NOT NULL,
  "descricao" TEXT NOT NULL,
  "categoria" "CategoriaServico" NOT NULL,
  "valor" DECIMAL(14,2) NOT NULL,
  "realizadoEm" TIMESTAMP(3) NOT NULL,
  "vencimento" TIMESTAMP(3) NOT NULL,
  "recebidoEm" TIMESTAMP(3),
  "clienteId" TEXT,
  "contratoId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Despesa" (
  "id" TEXT NOT NULL,
  "numero" SERIAL NOT NULL,
  "descricao" TEXT NOT NULL,
  "categoria" "CategoriaDespesa" NOT NULL,
  "valor" DECIMAL(14,2) NOT NULL,
  "vencimento" TIMESTAMP(3) NOT NULL,
  "pagoEm" TIMESTAMP(3),
  "tipo" "TipoDespesa" NOT NULL DEFAULT 'PROCESSO',
  "fornecedor" TEXT,
  "contratoId" TEXT,
  "quemPaga" "QuemPaga" NOT NULL DEFAULT 'ADVOGADO',
  "cobradoEm" TIMESTAMP(3),
  "origem" "OrigemRegistro" NOT NULL DEFAULT 'MANUAL',
  "textoOriginal" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Servico_numero_key" ON "Servico"("numero");
CREATE INDEX IF NOT EXISTS "Servico_vencimento_idx" ON "Servico"("vencimento");
CREATE INDEX IF NOT EXISTS "Servico_clienteId_idx" ON "Servico"("clienteId");
CREATE INDEX IF NOT EXISTS "Servico_contratoId_idx" ON "Servico"("contratoId");
CREATE UNIQUE INDEX IF NOT EXISTS "Despesa_numero_key" ON "Despesa"("numero");
CREATE INDEX IF NOT EXISTS "Despesa_vencimento_idx" ON "Despesa"("vencimento");
CREATE INDEX IF NOT EXISTS "Despesa_contratoId_idx" ON "Despesa"("contratoId");

DO $$ BEGIN
  ALTER TABLE "Servico" ADD CONSTRAINT "Servico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Servico" ADD CONSTRAINT "Servico_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "PerfilAdvogado" ALTER COLUMN "updatedAt" DROP DEFAULT;

COMMIT;
