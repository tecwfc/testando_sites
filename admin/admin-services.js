// admin/admin-services.js
import { supabase } from '../supabase-config.js';
import { getUsuarioLogado, registrarLog } from './auth.js';

// ====================== PRODUTOS ======================

export async function listarProdutos(filtros = {}) {
  try {
    let query = supabase
      .from('produtos')
      .select('*')
      .order('nome');

    if (filtros.categoria) {
      query = query.eq('categoria', filtros.categoria);
    }

    if (filtros.disponivel !== undefined) {
      query = query.eq('disponivel', filtros.disponivel);
    }

    if (filtros.destaque !== undefined) {
      query = query.eq('destaque', filtros.destaque);
    }

    if (filtros.busca) {
      query = query.ilike('nome', `%${filtros.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    throw error;
  }
}

export async function salvarProduto(produto) {
  try {
    const usuario = getUsuarioLogado();
    const { data, error } = await supabase
      .from('produtos')
      .upsert([{
        id: produto.id || undefined,
        nome: produto.nome,
        ml: produto.ml,
        preco: parseFloat(produto.preco),
        categoria: produto.categoria,
        imagem: produto.imagem,
        disponivel: produto.disponivel !== false,
        destaque: produto.destaque === true,
        saldo: parseInt(produto.saldo) || 0,
        estoque_minimo: parseInt(produto.estoque_minimo) || 5,
        sku: produto.sku,
        codigo_barras: produto.codigo_barras,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    await registrarLog(
      usuario.id,
      produto.id ? 'update' : 'insert',
      'produtos',
      data.id,
      produto.id ? produto : null,
      data
    );

    return data;
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    throw error;
  }
}

export async function excluirProduto(id) {
  try {
    const usuario = getUsuarioLogado();
    
    const { data: produto, error: buscaError } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (buscaError) throw buscaError;

    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await registrarLog(
      usuario.id,
      'delete',
      'produtos',
      id,
      produto,
      null
    );

    return true;
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    throw error;
  }
}

// ====================== CATEGORIAS ======================

export async function listarCategorias() {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('ordem');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    throw error;
  }
}

export async function salvarCategoria(categoria) {
  try {
    const usuario = getUsuarioLogado();
    
    const { data, error } = await supabase
      .from('categorias')
      .upsert([{
        id: categoria.id || undefined,
        nome: categoria.nome,
        icone: categoria.icone,
        cor: categoria.cor,
        ordem: parseInt(categoria.ordem) || 0
      }])
      .select()
      .single();

    if (error) throw error;

    await registrarLog(
      usuario.id,
      categoria.id ? 'update' : 'insert',
      'categorias',
      data.id
    );

    return data;
  } catch (error) {
    console.error('Erro ao salvar categoria:', error);
    throw error;
  }
}

export async function excluirCategoria(id) {
  try {
    const usuario = getUsuarioLogado();
    
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await registrarLog(
      usuario.id,
      'delete',
      'categorias',
      id
    );

    return true;
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    throw error;
  }
}

// ====================== PEDIDOS ======================

export async function listarPedidos(filtros = {}) {
  try {
    let query = supabase
      .from('pedidos')
      .select('*, itens_pedido(*)')
      .order('criado_em', { ascending: false });

    if (filtros.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros.data_inicio) {
      query = query.gte('criado_em', filtros.data_inicio);
    }

    if (filtros.data_fim) {
      query = query.lte('criado_em', filtros.data_fim);
    }

    if (filtros.busca) {
      query = query.or(`cliente_nome.ilike.%${filtros.busca}%,numero_pedido.ilike.%${filtros.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    throw error;
  }
}

export async function atualizarStatusPedido(id, status) {
  try {
    const usuario = getUsuarioLogado();
    
    const { data, error } = await supabase
      .from('pedidos')
      .update({
        status: status,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await registrarLog(
      usuario.id,
      'update_status',
      'pedidos',
      id,
      { status_anterior: data.status },
      { status_novo: status }
    );

    return data;
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    throw error;
  }
}

export async function cancelarPedido(id) {
  try {
    const usuario = getUsuarioLogado();
    
    // Buscar itens do pedido para restaurar estoque
    const { data: itens, error: itensError } = await supabase
      .from('itens_pedido')
      .select('*')
      .eq('pedido_id', id);

    if (itensError) throw itensError;

    // Restaurar estoque
    for (const item of itens) {
      await supabase
        .from('produtos')
        .update({ saldo: supabase.raw('saldo + ?', [item.quantidade]) })
        .eq('id', item.produto_id);
    }

    // Atualizar status
    const { data, error } = await supabase
      .from('pedidos')
      .update({
        status: 'Cancelado',
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await registrarLog(
      usuario.id,
      'cancelar_pedido',
      'pedidos',
      id
    );

    return data;
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    throw error;
  }
}

// ====================== CLIENTES ======================

export async function listarClientes(filtros = {}) {
  try {
    let query = supabase
      .from('clientes')
      .select('*')
      .order('nome');

    if (filtros.busca) {
      query = query.or(`nome.ilike.%${filtros.busca}%,telefone.ilike.%${filtros.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    throw error;
  }
}

export async function salvarCliente(cliente) {
  try {
    const usuario = getUsuarioLogado();
    
    const { data, error } = await supabase
      .from('clientes')
      .upsert([{
        id: cliente.id || undefined,
        nome: cliente.nome,
        cpf_cnpj: cliente.cpf_cnpj,
        telefone: cliente.telefone,
        whatsapp: cliente.whatsapp,
        email: cliente.email,
        endereco: cliente.endereco,
        cidade: cliente.cidade,
        cep: cliente.cep,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    await registrarLog(
      usuario.id,
      cliente.id ? 'update' : 'insert',
      'clientes',
      data.id
    );

    return data;
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    throw error;
  }
}

export async function excluirCliente(id) {
  try {
    const usuario = getUsuarioLogado();
    
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await registrarLog(
      usuario.id,
      'delete',
      'clientes',
      id
    );

    return true;
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    throw error;
  }
}

// ====================== CONFIGURAÇÕES ======================

export async function listarConfiguracoes() {
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .order('chave');

    if (error) throw error;

    // Converter para objeto chave: valor
    const configs = {};
    data.forEach(item => {
      configs[item.chave] = item.valor;
    });
    return configs;
  } catch (error) {
    console.error('Erro ao listar configurações:', error);
    throw error;
  }
}

export async function salvarConfiguracao(chave, valor) {
  try {
    const usuario = getUsuarioLogado();
    
    const { data, error } = await supabase
      .from('configuracoes')
      .update({ valor, updated_at: new Date().toISOString() })
      .eq('chave', chave)
      .select()
      .single();

    if (error) throw error;

    await registrarLog(
      usuario.id,
      'update',
      'configuracoes',
      data.id
    );

    return data;
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    throw error;
  }
}

// ====================== ESTATÍSTICAS ======================

export async function getEstatisticasDashboard() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = new Date().getFullYear() + '-' + 
      String(new Date().getMonth() + 1).padStart(2, '0') + '-01';

    // Total de vendas (entregues)
    const { data: vendas } = await supabase
      .from('pedidos')
      .select('valor_total')
      .eq('status', 'Entregue');

    const totalVendas = vendas ? vendas.reduce((acc, item) => acc + (item.valor_total || 0), 0) : 0;

    // Pedidos do dia
    const { data: pedidosHoje } = await supabase
      .from('pedidos')
      .select('id')
      .gte('criado_em', hoje);

    // Pedidos por status
    const { data: statusCount } = await supabase
      .from('pedidos')
      .select('status, count()')
      .group('status');

    // Produtos mais vendidos (últimos 30 dias)
    const { data: maisVendidos } = await supabase
      .from('itens_pedido')
      .select('produto_id, quantidade, produtos(nome)')
      .limit(5);

    // Vendas do mês
    const { data: vendasMes } = await supabase
      .from('pedidos')
      .select('valor_total, criado_em')
      .gte('criado_em', inicioMes)
      .eq('status', 'Entregue');

    const totalMes = vendasMes ? vendasMes.reduce((acc, item) => acc + (item.valor_total || 0), 0) : 0;

    return {
      totalVendas,
      pedidosHoje: pedidosHoje?.length || 0,
      totalMes,
      statusCount: statusCount || [],
      produtosMaisVendidos: maisVendidos || []
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
}