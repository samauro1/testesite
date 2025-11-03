/**
 * Serviço para assinatura digital com certificado A3 usando Lacuna Web PKI
 * Similar ao usado pelo Detran-SP (e-CNH)
 */

// Declaração do Web PKI (será carregado via CDN)
declare global {
  interface Window {
    LacunaWebPKI: any;
  }
}

let pki: any = null;

/**
 * Inicializa o Web PKI
 */
export async function inicializarWebPKI(): Promise<boolean> {
  try {
    // Verificar se já foi inicializado
    if (pki) {
      return true;
    }

    // Verificar se o script Web PKI está carregado
    if (!window.LacunaWebPKI) {
      console.error('❌ Web PKI não carregado. Adicione o script no HTML.');
      return false;
    }

    // Criar instância
    pki = new window.LacunaWebPKI();

    console.log('🔍 Inicializando Web PKI...');

    // Inicializar (retorna Promise)
    await new Promise((resolve, reject) => {
      pki.init({
        ready: () => {
          console.log('✅ Web PKI inicializado com sucesso');
          resolve(true);
        },
        notInstalled: () => {
          console.error('❌ Componente Web PKI não instalado');
          reject(new Error('COMPONENTE_NAO_INSTALADO'));
        },
        restPkiUrl: null, // Usar apenas localmente
        ngAuthToken: null
      });
    });

    return true;

  } catch (error: any) {
    console.error('❌ Erro ao inicializar Web PKI:', error);
    
    if (error.message === 'COMPONENTE_NAO_INSTALADO') {
      throw new Error('Componente Web PKI não está instalado. Instale em: https://www.lacunasoftware.com/pt/home/webpki');
    }
    
    throw error;
  }
}

/**
 * Lista certificados disponíveis no token A3
 */
export async function listarCertificados(): Promise<any[]> {
  try {
    await inicializarWebPKI();

    console.log('🔍 Listando certificados do token A3...');

    // Listar certificados (retorna Promise)
    const certificates = await new Promise<any[]>((resolve, reject) => {
      pki.listCertificates({
        filter: pki.filters.isWithinValidity,
        selectId: null
      }).success((certs: any[]) => {
        console.log(`✅ ${certs.length} certificado(s) encontrado(s)`);
        resolve(certs);
      }).error((error: any) => {
        console.error('❌ Erro ao listar certificados:', error);
        reject(error);
      });
    });

    // Processar certificados para extrair informações
    const certificadosProcessados = certificates.map((cert: any, index: number) => {
      // Extrair CPF do subject name
      let cpf = '';
      if (cert.subjectName) {
        const cpfMatch = cert.subjectName.match(/(\d{11})/);
        if (cpfMatch) {
          const cpfNumeros = cpfMatch[1];
          cpf = `${cpfNumeros.slice(0,3)}.${cpfNumeros.slice(3,6)}.${cpfNumeros.slice(6,9)}-${cpfNumeros.slice(9,11)}`;
        }
      }

      return {
        id: cert.thumbprint || `cert-${index}`,
        nome: cert.subjectName || 'Nome não disponível',
        cpf: cpf || 'CPF não encontrado',
        validade: cert.validityEnd ? new Date(cert.validityEnd).toISOString().split('T')[0] : 'Não disponível',
        tipo: 'e-CPF',
        emissor: cert.issuerName || 'Emissor desconhecido',
        thumbprint: cert.thumbprint,
        status: 'ativo'
      };
    });

    return certificadosProcessados;

  } catch (error: any) {
    console.error('❌ Erro ao listar certificados:', error);
    throw error;
  }
}

/**
 * Assina um documento (hash) com o certificado selecionado
 */
export async function assinarDocumento(
  certificadoThumbprint: string,
  hashDocumento: string
): Promise<{ success: boolean; assinatura: string; algoritmo: string; timestamp: string }> {
  try {
    await inicializarWebPKI();

    console.log('✍️ Assinando documento com certificado A3...');

    // Converter hash para bytes
    const hashBytes = hexStringToBytes(hashDocumento);

    // Assinar com o certificado (retorna Promise)
    const signature = await new Promise<string>((resolve, reject) => {
      pki.signHash({
        thumbprint: certificadoThumbprint,
        hash: hashBytes,
        digestAlgorithm: 'SHA-256'
      }).success((result: any) => {
        console.log('✅ Documento assinado com sucesso!');
        resolve(result);
      }).error((error: any) => {
        console.error('❌ Erro ao assinar:', error);
        reject(error);
      });
    });

    return {
      success: true,
      assinatura: signature,
      algoritmo: 'SHA256withRSA',
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('❌ Erro ao assinar documento:', error);
    
    if (error.message && error.message.includes('PIN')) {
      throw new Error('PIN incorreto ou cancelado pelo usuário');
    }
    
    throw error;
  }
}

/**
 * Verifica se o componente Web PKI está instalado
 */
export async function verificarInstalacao(): Promise<boolean> {
  try {
    await inicializarWebPKI();
    return true;
  } catch (error: any) {
    if (error.message && error.message.includes('COMPONENTE_NAO_INSTALADO')) {
      return false;
    }
    throw error;
  }
}

/**
 * Utilitário: Converter string hex para bytes
 */
function hexStringToBytes(hex: string): number[] {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

export const webPkiService = {
  inicializarWebPKI,
  listarCertificados,
  assinarDocumento,
  verificarInstalacao
};

