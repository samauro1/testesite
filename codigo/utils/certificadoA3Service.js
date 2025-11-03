const pkcs11js = require('pkcs11js');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

/**
 * Serviço para acesso a certificados digitais A3 via PKCS#11
 * Suporta tokens SafeNet, Gemalto, Watchdata, etc.
 */

// Caminhos possíveis das bibliotecas PKCS#11 em Windows
const POSSIBLE_PKCS11_LIBS = [
  // SafeNet
  'C:\\Windows\\System32\\eTPKCS11.dll',
  'C:\\Program Files\\SafeNet\\Authentication\\SAC\\x64\\eTPKCS11.dll',
  'C:\\Program Files (x86)\\SafeNet\\Authentication\\SAC\\x86\\eTPKCS11.dll',
  
  // Gemalto
  'C:\\Windows\\System32\\gclib.dll',
  'C:\\Program Files\\Gemalto\\Classic Client\\BIN\\gclib.dll',
  
  // Watchdata
  'C:\\Windows\\System32\\watchdata\\Watchdata Brazil CSP v1.0\\WDPKCS.dll',
  
  // Outros
  'C:\\Windows\\System32\\aetpkss1.dll',
  'C:\\Windows\\System32\\ngp11v211.dll'
];

/**
 * Detecta a biblioteca PKCS#11 instalada no sistema
 */
function detectarBibliotecaPKCS11() {
  console.log('🔍 Procurando biblioteca PKCS#11 instalada...');
  
  for (const libPath of POSSIBLE_PKCS11_LIBS) {
    if (fs.existsSync(libPath)) {
      console.log(`✅ Biblioteca encontrada: ${libPath}`);
      return libPath;
    }
  }
  
  console.log('❌ Nenhuma biblioteca PKCS#11 encontrada');
  console.log('⚠️ Certifique-se de que o driver do token A3 está instalado');
  return null;
}

/**
 * Lista certificados disponíveis no token A3
 */
async function listarCertificados() {
  console.log('🚨 === VERSÃO CORRIGIDA DO CÓDIGO CARREGADA === 🚨');
  console.log('📅 Última modificação: 20/10/2025 14:32');
  
  const libPath = detectarBibliotecaPKCS11();
  
  if (!libPath) {
    throw new Error('Driver do token A3 não encontrado. Instale o driver do fabricante.');
  }
  
  const pkcs11 = new pkcs11js.PKCS11();
  
  try {
    console.log('📂 Carregando biblioteca PKCS#11...');
    pkcs11.load(libPath);
    
    console.log('🔌 Inicializando...');
    pkcs11.C_Initialize();
    
    console.log('🔍 Listando slots (leitores)...');
    const slots = pkcs11.C_GetSlotList(true);
    
    if (slots.length === 0) {
      throw new Error('Nenhum leitor de cartão detectado. Conecte o token A3.');
    }
    
    console.log(`✅ ${slots.length} leitor(es) encontrado(s)`);
    
    const certificados = [];
    
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      console.log(`\n🔍 Verificando slot ${i}...`);
      
      try {
        // Obter informações do slot
        const slotInfo = pkcs11.C_GetSlotInfo(slot);
        console.log(`   Descrição: ${slotInfo.slotDescription.toString('utf8').trim()}`);
        
        // Obter informações do token
        const tokenInfo = pkcs11.C_GetTokenInfo(slot);
        console.log(`   Token: ${tokenInfo.label.toString('utf8').trim()}`);
        
        // Abrir sessão (sem login ainda)
        const session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_SERIAL_SESSION);
        
        // Buscar certificados X.509
        const template = [
          { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_CERTIFICATE },
          { type: pkcs11js.CKA_CERTIFICATE_TYPE, value: pkcs11js.CKC_X_509 }
        ];
        
        pkcs11.C_FindObjectsInit(session, template);
        let certHandles = pkcs11.C_FindObjects(session);
        pkcs11.C_FindObjectsFinal(session);
        
        console.log(`   ${certHandles.length} certificado(s) encontrado(s)`);
        
        for (const certHandle of certHandles) {
          try {
            console.log(`   🔍 Processando certificado handle: ${certHandle}`);
            
            // Tentar obter certificado diretamente (método simples)
            console.log(`   📥 Tentando método direto...`);
            
            try {
              // Método 1: Tentar sem especificar buffer (pkcs11js pode alocar automaticamente)
              const certAttrs = pkcs11.C_GetAttributeValue(session, certHandle, [
                { type: pkcs11js.CKA_VALUE },
                { type: pkcs11js.CKA_LABEL }
              ]);
              
              console.log(`   ✅ Atributos obtidos (método direto)!`);
              console.log(`   📊 Tipo do retorno:`, typeof certAttrs);
              console.log(`   📊 certAttrs:`, certAttrs);
              
              // Se certAttrs é um array
              if (Array.isArray(certAttrs) && certAttrs.length > 0) {
                console.log(`   📊 certAttrs[0]:`, certAttrs[0]);
                console.log(`   📊 certAttrs[0].value tipo:`, typeof certAttrs[0].value);
                
                // Se value é um número (tamanho), precisamos alocar buffer
                if (typeof certAttrs[0].value === 'number') {
                  console.log(`   📏 value é tamanho, alocando buffer de ${certAttrs[0].value} bytes...`);
                  
                  const certDERBuffer = Buffer.alloc(certAttrs[0].value);
                  const labelBuffer = Buffer.alloc(certAttrs[1].value);
                  
                  const certAttrs2 = pkcs11.C_GetAttributeValue(session, certHandle, [
                    { type: pkcs11js.CKA_VALUE, value: certDERBuffer },
                    { type: pkcs11js.CKA_LABEL, value: labelBuffer }
                  ]);
                  
                  var certDER = certAttrs2[0].value;
                  var certLabel = certAttrs2[1].value.toString('utf8').trim();
                  
                } else {
                  // Value já é o buffer
                  var certDER = certAttrs[0].value;
                  var certLabel = certAttrs[1].value ? certAttrs[1].value.toString('utf8').trim() : 'Sem nome';
                }
              } else {
                throw new Error('Formato de retorno inesperado');
              }
              
            } catch (directError) {
              console.log(`   ⚠️ Método direto falhou:`, directError.message);
              throw directError;
            }
            
            console.log(`   ✅ Certificado DER obtido, tamanho:`, certDER.length);
            console.log(`   📊 É Buffer?:`, Buffer.isBuffer(certDER));
            
            // Verificar se certDER é um Buffer válido
            if (!Buffer.isBuffer(certDER) || certDER.length === 0) {
              console.log(`   ⚠️ Certificado vazio ou inválido, pulando...`);
              continue;
            }
            
            // Parsear certificado com node-forge
            console.log(`   🔄 Parseando com node-forge...`);
            const certBinaryString = certDER.toString('binary');
            const certAsn1 = forge.asn1.fromDer(certBinaryString);
            const cert = forge.pki.certificateFromAsn1(certAsn1);
            console.log(`   ✅ Certificado X.509 criado com sucesso`);
            
            // Extrair informações
            const subject = cert.subject.attributes;
            const issuer = cert.issuer.attributes;
            
            const cn = subject.find(attr => attr.shortName === 'CN')?.value || 'Nome não disponível';
            const serialNumber = subject.find(attr => attr.name === 'serialNumber')?.value || '';
            
            // Extrair CPF do serialNumber (formato: "CPF:12345678900" ou similar)
            let cpf = '';
            if (serialNumber) {
              const cpfMatch = serialNumber.match(/(\d{11})/);
              if (cpfMatch) {
                const cpfNumeros = cpfMatch[1];
                cpf = `${cpfNumeros.slice(0,3)}.${cpfNumeros.slice(3,6)}.${cpfNumeros.slice(6,9)}-${cpfNumeros.slice(9,11)}`;
              }
            }
            
            // Data de validade
            const validade = cert.validity.notAfter.toISOString().split('T')[0];
            
            // Emissor
            const issuerCN = issuer.find(attr => attr.shortName === 'CN')?.value || 'Emissor desconhecido';
            
            certificados.push({
              id: `cert-${i}-${certHandles.indexOf(certHandle)}`,
              nome: cn,
              cpf: cpf || 'CPF não encontrado',
              validade: validade,
              tipo: 'e-CPF',
              emissor: issuerCN,
              slot: i,
              certHandle: certHandle,
              session: session,
              status: 'ativo'
            });
            
            console.log(`   ✅ Certificado: ${cn}`);
            console.log(`      CPF: ${cpf}`);
            console.log(`      Validade: ${validade}`);
            
          } catch (err) {
            console.error(`   ❌ Erro ao processar certificado:`, err.message);
          }
        }
        
        // Não fechar a sessão ainda (será usada para assinar)
        // pkcs11.C_CloseSession(session);
        
      } catch (err) {
        console.error(`❌ Erro ao acessar slot ${i}:`, err.message);
      }
    }
    
    // Não finalizar ainda (manter conexão aberta)
    // pkcs11.C_Finalize();
    
    return {
      success: true,
      certificados,
      pkcs11Instance: pkcs11 // Retornar instância para uso posterior
    };
    
  } catch (error) {
    console.error('❌ Erro ao listar certificados:', error);
    
    try {
      pkcs11.C_Finalize();
    } catch (e) {
      // Ignorar erro ao finalizar
    }
    
    throw error;
  }
}

/**
 * Valida certificado e faz login com PIN
 */
async function validarCertificadoComPIN(certificadoInfo, pin) {
  const libPath = detectarBibliotecaPKCS11();
  
  if (!libPath) {
    throw new Error('Driver do token A3 não encontrado');
  }
  
  const pkcs11 = new pkcs11js.PKCS11();
  
  try {
    pkcs11.load(libPath);
    pkcs11.C_Initialize();
    
    const slots = pkcs11.C_GetSlotList(true);
    const slot = slots[certificadoInfo.slot];
    
    // Abrir sessão
    const session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_SERIAL_SESSION | pkcs11js.CKF_RW_SESSION);
    
    // Fazer login com PIN
    console.log('🔐 Validando PIN...');
    pkcs11.C_Login(session, pkcs11js.CKU_USER, pin);
    
    console.log('✅ PIN válido!');
    
    // Logout e fechar sessão
    pkcs11.C_Logout(session);
    pkcs11.C_CloseSession(session);
    pkcs11.C_Finalize();
    
    return {
      success: true,
      message: 'PIN validado com sucesso'
    };
    
  } catch (error) {
    console.error('❌ Erro ao validar PIN:', error);
    
    try {
      pkcs11.C_Finalize();
    } catch (e) {
      // Ignorar
    }
    
    // Verificar se é erro de PIN incorreto
    if (error.message.includes('CKR_PIN_INCORRECT') || error.message.includes('0xa0')) {
      throw new Error('PIN incorreto');
    }
    
    throw error;
  }
}

/**
 * Assina um documento (hash) com o certificado do token
 */
async function assinarDocumento(certificadoInfo, pin, hashDocumento) {
  const libPath = detectarBibliotecaPKCS11();
  
  if (!libPath) {
    throw new Error('Driver do token A3 não encontrado');
  }
  
  const pkcs11 = new pkcs11js.PKCS11();
  
  try {
    pkcs11.load(libPath);
    pkcs11.C_Initialize();
    
    const slots = pkcs11.C_GetSlotList(true);
    const slot = slots[certificadoInfo.slot];
    
    // Abrir sessão
    const session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_SERIAL_SESSION | pkcs11js.CKF_RW_SESSION);
    
    // Fazer login com PIN
    console.log('🔐 Fazendo login com PIN...');
    pkcs11.C_Login(session, pkcs11js.CKU_USER, pin);
    
    // Buscar chave privada
    const privateKeyTemplate = [
      { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_PRIVATE_KEY },
      { type: pkcs11js.CKA_SIGN, value: true }
    ];
    
    pkcs11.C_FindObjectsInit(session, privateKeyTemplate);
    const privateKeys = pkcs11.C_FindObjects(session);
    pkcs11.C_FindObjectsFinal(session);
    
    if (privateKeys.length === 0) {
      throw new Error('Chave privada não encontrada no token');
    }
    
    const privateKey = privateKeys[0];
    console.log('🔑 Chave privada encontrada');
    
    // Preparar hash para assinatura
    const hashBuffer = Buffer.from(hashDocumento, 'hex');
    
    // Iniciar operação de assinatura (RSA com SHA-256)
    const mechanism = { mechanism: pkcs11js.CKM_SHA256_RSA_PKCS };
    pkcs11.C_SignInit(session, mechanism, privateKey);
    
    // Assinar
    console.log('✍️ Assinando documento...');
    const signature = pkcs11.C_Sign(session, hashBuffer, Buffer.alloc(256));
    
    console.log('✅ Documento assinado com sucesso!');
    
    // Logout e limpar
    pkcs11.C_Logout(session);
    pkcs11.C_CloseSession(session);
    pkcs11.C_Finalize();
    
    return {
      success: true,
      assinatura: signature.toString('base64'),
      algoritmo: 'SHA256withRSA',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Erro ao assinar documento:', error);
    
    try {
      pkcs11.C_Finalize();
    } catch (e) {
      // Ignorar
    }
    
    if (error.message.includes('CKR_PIN_INCORRECT') || error.message.includes('0xa0')) {
      throw new Error('PIN incorreto');
    }
    
    throw error;
  }
}

/**
 * Obter informações detalhadas de um certificado
 */
async function obterDetalhesCertificado(certificadoInfo, pin) {
  const libPath = detectarBibliotecaPKCS11();
  
  if (!libPath) {
    throw new Error('Driver do token A3 não encontrado');
  }
  
  const pkcs11 = new pkcs11js.PKCS11();
  
  try {
    pkcs11.load(libPath);
    pkcs11.C_Initialize();
    
    const slots = pkcs11.C_GetSlotList(true);
    const slot = slots[certificadoInfo.slot];
    
    const session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_SERIAL_SESSION | pkcs11js.CKF_RW_SESSION);
    
    // Login com PIN
    pkcs11.C_Login(session, pkcs11js.CKU_USER, pin);
    
    // Buscar certificado
    const template = [
      { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_CERTIFICATE },
      { type: pkcs11js.CKA_CERTIFICATE_TYPE, value: pkcs11js.CKC_X_509 }
    ];
    
    pkcs11.C_FindObjectsInit(session, template);
    const certHandles = pkcs11.C_FindObjects(session);
    pkcs11.C_FindObjectsFinal(session);
    
    if (certHandles.length === 0) {
      throw new Error('Certificado não encontrado');
    }
    
    const certHandle = certHandles[0];
    
    // Obter certificado
    const certAttrs = pkcs11.C_GetAttributeValue(session, certHandle, [
      { type: pkcs11js.CKA_VALUE }
    ]);
    
    const certDER = certAttrs[0].value;
    
    // Parsear certificado
    const certAsn1 = forge.asn1.fromDer(certDER.toString('binary'));
    const cert = forge.pki.certificateFromAsn1(certAsn1);
    
    // Extrair todas as informações
    const subject = cert.subject.attributes;
    const issuer = cert.issuer.attributes;
    
    const detalhes = {
      nome: subject.find(attr => attr.shortName === 'CN')?.value || '',
      email: subject.find(attr => attr.shortName === 'E' || attr.name === 'emailAddress')?.value || '',
      organizacao: subject.find(attr => attr.shortName === 'O')?.value || '',
      unidade: subject.find(attr => attr.shortName === 'OU')?.value || '',
      pais: subject.find(attr => attr.shortName === 'C')?.value || '',
      emissor: issuer.find(attr => attr.shortName === 'CN')?.value || '',
      serialNumber: cert.serialNumber,
      validadeInicio: cert.validity.notBefore.toISOString(),
      validadeFim: cert.validity.notAfter.toISOString(),
      algoritmo: cert.signatureAlgorithm,
      certificadoPEM: forge.pki.certificateToPem(cert)
    };
    
    // Logout e limpar
    pkcs11.C_Logout(session);
    pkcs11.C_CloseSession(session);
    pkcs11.C_Finalize();
    
    return {
      success: true,
      detalhes
    };
    
  } catch (error) {
    console.error('❌ Erro ao obter detalhes:', error);
    
    try {
      pkcs11.C_Finalize();
    } catch (e) {
      // Ignorar
    }
    
    throw error;
  }
}

module.exports = {
  listarCertificados,
  validarCertificadoComPIN,
  assinarDocumento,
  obterDetalhesCertificado,
  detectarBibliotecaPKCS11
};

