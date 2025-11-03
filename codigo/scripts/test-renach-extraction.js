// Script para testar a extração do RENACH
const RenachProcessor = require('../utils/renachProcessorUniversal');

// Simular texto do RENACH baseado na imagem fornecida
const textoTeste = `
Dados Pessoais
Nome: JHORDAN CANDIDO DOS SANTOS SIMEAO
Pai: ADALBERTO DA SILVA SIMEAO
Mãe: ELISANGELA DOS SANTOS
Tipo de Documento: RG
Sexo: Masculino
Data do Nascimento: 24/08/1993

Categoria Pretendida: B
Situação Atual: B
Primeira Habilitação: 27/06/2013
Tipo de Processo: Renovação

Endereço Residencial
Logradouro (Rua, Avenida, Praça, Etc.): R HOMERO BATISTA
Número: 36
Complemento: AP 33
Bairro: VL FORMOSA
CEP: 03367-030
Cód. Município: 07107
Município: SAO PAULO

Exame Psicotécnico
Data do Exame: 28/10/2025
N° do Laudo: 1563
Resultado: Apto
N° do Credenciado: 1876
`;

async function testar() {
  console.log('🧪 TESTANDO EXTRAÇÃO DO RENACH\n');
  
  const processor = new RenachProcessor();
  const data = {};
  
  // Testar extração de cada campo
  console.log('1. Testando extração de dados pessoais...');
  processor.extractPersonalData(textoTeste, data);
  console.log('   Nome:', data.nome || '❌ NÃO ENCONTRADO');
  console.log('   Nome do Pai:', data.nome_pai || '❌ NÃO ENCONTRADO');
  console.log('   Nome da Mãe:', data.nome_mae || '❌ NÃO ENCONTRADO');
  
  console.log('\n2. Testando extração de categoria CNH...');
  processor.extractPersonalData(textoTeste, data); // Re-executar para categoria
  console.log('   Categoria CNH:', data.categoria_cnh || '❌ NÃO ENCONTRADO');
  
  console.log('\n3. Testando extração de tipo de processo...');
  const tipoProcessoPatterns = [
    /Tipo\s+de\s+Processo[:\s]*([A-ZÁÊÇÕ\s]+?)(?=\s*$|\n|Preenchimento)/i,
    /Tipo\s+Processo[:\s]*([A-ZÁÊÇÕ\s]+?)(?=\s*$|\n)/i
  ];
  
  for (const pattern of tipoProcessoPatterns) {
    const match = textoTeste.match(pattern);
    if (match && match[1]) {
      console.log('   Tipo de Processo:', match[1].trim());
      break;
    }
  }
  
  console.log('\n4. Testando extração de data primeira habilitação...');
  processor.extractExamData(textoTeste, data);
  console.log('   Data Primeira Habilitação:', data.data_primeira_habilitacao || '❌ NÃO ENCONTRADO');
  
  console.log('\n5. Testando extração de número do laudo...');
  console.log('   Número do Laudo:', data.numero_laudo_renach || '❌ NÃO ENCONTRADO');
  
  console.log('\n6. Testando extração de número do endereço...');
  processor.extractAddressData(textoTeste, data);
  console.log('   Número do Endereço:', data.numero_endereco || '❌ NÃO ENCONTRADO');
  
  console.log('\n📊 RESULTADO FINAL:');
  console.log(JSON.stringify(data, null, 2));
  
  process.exit(0);
}

testar().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});

