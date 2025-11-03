const graphene = require('graphene-pk11');
const forge = require('node-forge');
const fs = require('fs');

/**
 * Serviço para acesso a certificados digitais A3 via Graphene-PK11
 * Biblioteca mais compatível com tokens SafeNet, Gemalto, Watchdata
 */

// Caminhos possíveis das bibliotecas PKCS#11
const POSSIBLE_PKCS11_LIBS = [
  'C:\\Windows\\System32\\eTPKCS11.dll',
  'C:\\Program Files\\SafeNet\\Authentication\\SAC\\x64\\eTPKCS11.dll',
  'C:\\Program Files (x86)\\SafeNet\\Authentication\\SAC\\x86\\eTPKCS11.dll',
  'C:\\Windows\\System32\\gclib.dll',
  'C:\\Program Files\\Gemalto\\Classic Client\\BIN\\gclib.dll',
  'C:\\Windows\\System32\\watchdata\\Watchdata Brazil CSP v1.0\\WDPKCS.dll',
  'C:\\Windows\\System32\\aetpkss1.dll',
  'C:\\Windows\\System32\\ngp11v211.dll'
];

/**
 * Detecta a biblioteca PKCS#11 instalada
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
  return null;
}

/**
 * Lista certificados disponíveis no token A3
 */
async function listarCertificados() {
  const libPath = detectarBibliotecaPKCS11();
  
  if (!libPath) {
    throw new Error('Driver do token A3 não encontrado. Instale o driver do fabricante.');
  }
  
  console.log('📂 Carregando biblioteca PKCS#11 com Graphene...');
  const mod = graphene.Module.load(libPath, 'PKCS11');
  
  try {
    console.log('🔌 Inicializando módulo...');
    mod.initialize();
    
    const slots = mod.getSlots(true); // true = apenas slots com token presente
    console.log(`✅ ${slots.length} slot(s) encontrado(s)`);
    
    if (slots.length === 0) {
      throw new Error('Nenhum token detectado. Conecte o token A3 na porta USB.');
    }
    
    const certificados = [];
    
    for (let i = 0; i < slots.length; i++) {
      const slot = slots.items(i);
      console.log(`\n🔍 Verificando slot ${i}...`);
      
      try {
        const slotInfo = slot.getToken();
        console.log(`   Token: ${slotInfo.label}`);
        console.log(`   Fabricante: ${slotInfo.manufacturerID}`);
        console.log(`   Modelo: ${slotInfo.model}`);
        
        // Abrir sessão READ_ONLY (não precisa de PIN para listar certificados)
        console.log(`   📂 Abrindo sessão...`);
        const session = slot.open(graphene.SessionFlag.SERIAL_SESSION);
        
        try {
          // Buscar todos os certificados X.509
          console.log(`   🔍 Buscando certificados...`);
          const objects = session.find({
            class: graphene.ObjectClass.CERTIFICATE,
            certType: graphene.CertificateType.X_509
          });
          
          console.log(`   📋 ${objects.length} certificado(s) encontrado(s)`);
          
          for (let j = 0; j < objects.length; j++) {
            const cert = objects.items(j).toType();
            
            try {
              console.log(`   📄 Processando certificado ${j + 1}...`);
              
              // Obter atributos do certificado
              const certValue = cert.value;
              const certLabel = cert.label || 'Sem nome';
              
              console.log(`      Tamanho do certificado: ${certValue.length} bytes`);
              console.log(`      Label: ${certLabel}`);
              
              // Converter para Buffer Node.js
              const certBuffer = Buffer.from(certValue);
              
              // Parsear com node-forge
              const certBinaryString = certBuffer.toString('binary');
              const certAsn1 = forge.asn1.fromDer(certBinaryString);
              const certificate = forge.pki.certificateFromAsn1(certAsn1);
              
              // Extrair informações
              const subject = certificate.subject.attributes;
              const issuer = certificate.issuer.attributes;
              
              const cn = subject.find(attr => attr.shortName === 'CN')?.value || 'Nome não disponível';
              const serialNumber = subject.find(attr => attr.name === 'serialNumber')?.value || '';
              
              // Extrair CPF
              let cpf = '';
              if (serialNumber) {
                const cpfMatch = serialNumber.match(/(\d{11})/);
                if (cpfMatch) {
                  const cpfNumeros = cpfMatch[1];
                  cpf = `${cpfNumeros.slice(0,3)}.${cpfNumeros.slice(3,6)}.${cpfNumeros.slice(6,9)}-${cpfNumeros.slice(9,11)}`;
                }
              }
              
              const validade = certificate.validity.notAfter.toISOString().split('T')[0];
              const issuerCN = issuer.find(attr => attr.shortName === 'CN')?.value || 'Emissor desconhecido';
              
              certificados.push({
                id: `cert-${i}-${j}`,
                nome: cn,
                cpf: cpf || 'CPF não encontrado',
                validade: validade,
                tipo: 'e-CPF',
                emissor: issuerCN,
                slot: i,
                certIndex: j,
                status: 'ativo',
                certHandle: cert.handle.toString()
              });
              
              console.log(`   ✅ Certificado: ${cn}`);
              console.log(`      CPF: ${cpf}`);
              console.log(`      Validade: ${validade}`);
              
            } catch (err) {
              console.error(`   ❌ Erro ao processar certificado ${j + 1}:`, err.message);
            }
          }
          
        } finally {
          session.close();
          console.log(`   ✅ Sessão fechada`);
        }
        
      } catch (err) {
        console.error(`❌ Erro ao acessar slot ${i}:`, err.message);
      }
    }
    
    console.log(`\n✅ Total de certificados válidos encontrados: ${certificados.length}`);
    
    return {
      success: true,
      certificados
    };
    
  } catch (error) {
    console.error('❌ Erro ao listar certificados:', error);
    throw error;
  } finally {
    try {
      mod.finalize();
      console.log('✅ Módulo PKCS#11 finalizado');
    } catch (e) {
      console.log('⚠️ Aviso ao finalizar módulo:', e.message);
    }
  }
}

/**
 * Valida certificado com PIN
 */
async function validarCertificadoComPIN(certificadoInfo, pin) {
  const libPath = detectarBibliotecaPKCS11();
  
  if (!libPath) {
    throw new Error('Driver do token A3 não encontrado');
  }
  
  const mod = graphene.Module.load(libPath, 'PKCS11');
  
  try {
    mod.initialize();
    
    const slots = mod.getSlots(true);
    const slot = slots.items(certificadoInfo.slot);
    
    console.log('🔐 Validando PIN...');
    const session = slot.open(graphene.SessionFlag.SERIAL_SESSION | graphene.SessionFlag.RW_SESSION);
    
    try {
      // Fazer login com PIN
      session.login(pin, graphene.UserType.USER);
      console.log('✅ PIN válido!');
      
      session.logout();
      
      return {
        success: true,
        message: 'PIN validado com sucesso'
      };
      
    } catch (err) {
      if (err.message.includes('CKR_PIN_INCORRECT')) {
        throw new Error('PIN incorreto');
      }
      throw err;
    } finally {
      session.close();
    }
    
  } finally {
    mod.finalize();
  }
}

/**
 * Assina um documento (hash) com o certificado
 */
async function assinarDocumento(certificadoInfo, pin, hashDocumento) {
  const libPath = detectarBibliotecaPKCS11();
  
  if (!libPath) {
    throw new Error('Driver do token A3 não encontrado');
  }
  
  const mod = graphene.Module.load(libPath, 'PKCS11');
  
  try {
    mod.initialize();
    
    const slots = mod.getSlots(true);
    const slot = slots.items(certificadoInfo.slot);
    
    console.log('🔐 Fazendo login com PIN...');
    const session = slot.open(graphene.SessionFlag.SERIAL_SESSION | graphene.SessionFlag.RW_SESSION);
    
    try {
      session.login(pin, graphene.UserType.USER);
      console.log('✅ Login realizado');
      
      // Buscar chave privada
      console.log('🔑 Buscando chave privada...');
      const privateKeys = session.find({
        class: graphene.ObjectClass.PRIVATE_KEY,
        sign: true
      });
      
      if (privateKeys.length === 0) {
        throw new Error('Chave privada não encontrada no token');
      }
      
      const privateKey = privateKeys.items(0).toType();
      console.log('✅ Chave privada encontrada');
      
      // Preparar hash para assinatura
      const hashBuffer = Buffer.from(hashDocumento, 'hex');
      
      // Criar operação de assinatura (RSA com SHA-256)
      console.log('✍️ Assinando documento...');
      const signature = session.createSign('SHA256_RSA_PKCS', privateKey)
        .update(hashBuffer)
        .final();
      
      console.log('✅ Documento assinado com sucesso!');
      
      session.logout();
      
      return {
        success: true,
        assinatura: signature.toString('base64'),
        algoritmo: 'SHA256withRSA',
        timestamp: new Date().toISOString()
      };
      
    } finally {
      session.close();
    }
    
  } finally {
    mod.finalize();
  }
}

module.exports = {
  listarCertificados,
  validarCertificadoComPIN,
  assinarDocumento,
  detectarBibliotecaPKCS11
};

