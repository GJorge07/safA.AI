-- Mudança aditiva: preserva contratos, clientes, parcelas e pagamentos existentes.
ALTER TABLE "Contrato" ADD COLUMN IF NOT EXISTS "contextoAnalise" JSONB;
CREATE TABLE IF NOT EXISTS "PerfilAdvogado" (
  "id" TEXT PRIMARY KEY DEFAULT 'principal',
  "areas" TEXT[] NOT NULL,
  "valorHoraMinimo" DECIMAL(14,2),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
