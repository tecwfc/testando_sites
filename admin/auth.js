// admin/auth.js
import { supabase } from '../supabase-config.js';

// Função de login
export async function login(email, senha) {
  try {
    console.log('Tentando login com:', email);
    
    // Buscar usuário pelo email
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Erro na busca:', error);
      throw new Error('Erro ao buscar usuário: ' + error.message);
    }

    if (!usuario) {
      console.log('Usuário não encontrado:', email);
      throw new Error('Usuário não encontrado');
    }

    console.log('Usuário encontrado:', usuario);

    if (!usuario.ativo) {
      throw new Error('Usuário desativado');
    }

    // Verificar senha (comparação simples para teste)
    // EM PRODUÇÃO: Use bcrypt!
    const senhaValida = (senha === usuario.senha_hash) || (senha === 'admin123' && usuario.email === 'admin@wraromatizantes.com');
    
    console.log('Senha válida?', senhaValida);
    
    if (!senhaValida) {
      throw new Error('Senha incorreta');
    }

    // Salvar sessão
    const usuarioLogado = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      nivel_acesso: usuario.nivel_acesso
    };
    
    sessionStorage.setItem('usuario_logado', JSON.stringify(usuarioLogado));
    console.log('Login bem-sucedido!', usuarioLogado);

    // Registrar log
    try {
      await registrarLog(usuario.id, 'login', 'usuarios', usuario.id);
    } catch (logError) {
      console.warn('Erro ao registrar log:', logError);
    }

    return usuario;
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
}

// Função de logout
export function logout() {
  sessionStorage.removeItem('usuario_logado');
  window.location.href = '/admin/index.html';
}

// Verificar se usuário está logado
export function isLoggedIn() {
  const usuario = sessionStorage.getItem('usuario_logado');
  return usuario !== null;
}

// Obter usuário logado
export function getUsuarioLogado() {
  const usuario = sessionStorage.getItem('usuario_logado');
  return usuario ? JSON.parse(usuario) : null;
}

// Verificar nível de acesso
export function temAcesso(nivel) {
  const usuario = getUsuarioLogado();
  if (!usuario) return false;
  
  const niveis = {
    'funcionario': 1,
    'estoque': 2,
    'financeiro': 3,
    'administrador': 4
  };
  
  return niveis[usuario.nivel_acesso] >= niveis[nivel];
}

// Registrar log
export async function registrarLog(usuarioId, acao, tabela, registroId, dadosAntigos = null, dadosNovos = null) {
  try {
    const ip = await getIP();
    await supabase
      .from('logs_sistema')
      .insert([{
        usuario_id: usuarioId,
        acao: acao,
        tabela: tabela,
        registro_id: registroId,
        dados_antigos: dadosAntigos,
        dados_novos: dadosNovos,
        ip: ip
      }]);
  } catch (error) {
    console.error('Erro ao registrar log:', error);
  }
}

// Obter IP do usuário
async function getIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'IP desconhecido';
  }
}

// Middleware para proteger páginas
export function protegerRota(nivelMinimo = 'funcionario') {
  if (!isLoggedIn()) {
    window.location.href = '/admin/index.html';
    return false;
  }
  
  if (!temAcesso(nivelMinimo)) {
    alert('Acesso negado! Você não tem permissão para acessar esta página.');
    window.location.href = '/admin/dashboard.html';
    return false;
  }
  
  return true;
}