export default function TestCSSPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-8">
          Teste de Formatação CSS
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Teste de Cores e Tipografia
          </h2>
          <p className="text-gray-600 mb-4">
            Este é um teste para verificar se o Tailwind CSS está funcionando corretamente.
          </p>
          <div className="flex space-x-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Botão Azul
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
              Botão Verde
            </button>
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
              Botão Vermelho
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Card 1</h3>
            <p className="text-gray-600">Conteúdo do primeiro card</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Card 2</h3>
            <p className="text-gray-600">Conteúdo do segundo card</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Card 3</h3>
            <p className="text-gray-600">Conteúdo do terceiro card</p>
          </div>
        </div>
      </div>
    </div>
  );
}

