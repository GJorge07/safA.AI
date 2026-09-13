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
  // 24 meses de série: o card desenha os 6 do meio e a visão expandida recorta
  // 3/6/12/18/24 a partir daqui — sem uma segunda ida ao banco.
  const hoje = new Date();
  const [resumo, fluxoCaixa, porTipo, porCliente, acoes] = await Promise.all([
    resumoDoInicio(hoje),
    carregarFluxoComDespesas(hoje, 24),
    carteiraPorTipo(),
    receitaPorCliente(hoje, 24),
    acoesPendentes(hoje),
  ]);

  return (
    <HomeDashboard
      resumo={resumo}
      fluxoCaixa={fluxoCaixa}
      porTipo={porTipo}
      porCliente={porCliente}
      acoes={acoes}
      mesAtual={hoje.toISOString().slice(0, 7)}
    />
  );
}
