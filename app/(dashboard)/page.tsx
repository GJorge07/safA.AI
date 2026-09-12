import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import { contratosMock, fluxoCaixaMock } from "@/lib/mock-data";

// Dados mock por enquanto — trocar por fetch em app/api/ quando o
// backend/IA publicarem as rotas reais (ver lib/mock-data.ts).
export default function InicioPage() {
  return <HomeDashboard contratos={contratosMock} fluxoCaixa={fluxoCaixaMock} />;
}
