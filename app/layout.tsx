import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safa — Fluxo de caixa de honorários",
  description:
    "Monitoramento de pagamentos de honorários para advogados iniciantes.",
};

// Aplica o tema salvo (localStorage) antes da primeira pintura, senão a
// página pisca escuro -> claro quando o usuário já tinha escolhido claro.
const SCRIPT_TEMA = `
try {
  if (window.localStorage.getItem("safa:tema") === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
