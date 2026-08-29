export default function PrivacidadePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Página em manutenção
        </h1>
        <p className="text-gray-600 mb-6">
          A política de privacidade ainda não está disponível. Esta página será
          publicada após a definição da base legal, aprovação da política,
          definição da retenção de dados e conclusão do Relatório de Impacto à
          Proteção de Dados (RIPD).
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Voltar para a página inicial
        </a>
      </div>
    </div>
  );
}
