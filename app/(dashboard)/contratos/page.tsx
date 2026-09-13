import { permanentRedirect } from "next/navigation";

// A aba virou "Pagamentos". O redirect fica para não quebrar links já salvos
// pelo advogado nem os que o chat gerou antes da mudança.
export default function ContratosPage() {
  permanentRedirect("/pagamentos");
}
