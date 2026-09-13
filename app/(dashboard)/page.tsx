import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import { carregarFluxoCaixa, listarContratosComRelacoes } from "@/lib/db/contratos";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const [contratos, fluxoCaixa] = await Promise.all([
    listarContratosComRelacoes(),
    carregarFluxoCaixa(),
  ]);
  return <HomeDashboard contratos={contratos} fluxoCaixa={fluxoCaixa} />;
}
