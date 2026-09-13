import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import {
  acoesPendentes,
  carregarFluxoComDespesas,
  carteiraPorTipo,
  receitaPorCliente,
  resumoDoInicio,
} from "@/lib/db/inicio";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  // Cinco agregados em vez da carteira inteira: o que sobe para o cliente é o
  // que a tela desenha, nada além disso.
  const [resumo, fluxoCaixa, porTipo, porCliente, acoes] = await Promise.all([
    resumoDoInicio(),
    carregarFluxoComDespesas(),
    carteiraPorTipo(),
    receitaPorCliente(),
    acoesPendentes(),
  ]);

  return (
    <HomeDashboard
      resumo={resumo}
      fluxoCaixa={fluxoCaixa}
      porTipo={porTipo}
      porCliente={porCliente}
      acoes={acoes}
    />
  );
}
