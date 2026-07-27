// supabase-services.js
import { supabase, formatarPreco, formatarLinkImagem } from './supabase-config.js';

// ====================== PRODUTOS ======================

export async function buscarProdutos() {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('destaque', { ascending: false })
      .order('nome', { ascending: true });

    if (error) throw error;
    return data.map(p => ({
      ...p,
      image: formatarLinkImagem(p.imagem),
      price: p.preco,
      name: p.nome,
      ml: p.ml || '',
      category: p.categoria || 'Geral',
      disponivel: p.disponivel !== false,
      destaque: p.destaque === true,
      saldo: p.saldo || 0,
    }));
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw error;
  }
}

export async function criarProduto(produto) {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .insert([{
        nome: produto.nome,
        ml: produto.ml,
        preco: produto.preco,
        categoria: produto.categoria,
        imagem: produto.imagem,
        disponivel: produto.disponivel !== false,
        destaque: produto.destaque === true,
        saldo: produto.saldo || 0,
        estoque_minimo: produto.estoque_minimo || 5,
        sku: produto.sku,
        codigo_barras: produto.codigo_barras,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    throw error;
  }
}

export async function atualizarProduto(id, produto) {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .update({
        nome: produto.nome,
        ml: produto.ml,
        preco: produto.preco,
        categoria: produto.categoria,
        imagem: produto.imagem,
        disponivel: produto.disponivel,
        destaque: produto.destaque,
        saldo: produto.saldo,
        estoque_minimo: produto.estoque_minimo,
        sku: produto.sku,
        codigo_barras: produto.codigo_barras,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    throw error;
  }
}

export async function excluirProduto(id) {
  try {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    throw error;
  }
}

export async function atualizarEstoque(id, quantidade) {
  try {
    const { data: produto, error: buscaError } = await supabase
      .from('produtos')
      .select('saldo')
      .eq('id', id)
      .single();

    if (buscaError) throw buscaError;

    const novoSaldo = (produto.saldo || 0) + quantidade;
    if (novoSaldo < 0) {
      throw new Error('Estoque insuficiente');
    }

    const { data, error } = await supabase
      .from('produtos')
      .update({ saldo: novoSaldo, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    throw error;
  }
}

// ====================== CATEGORIAS ======================

export async function buscarCategorias() {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('ordem', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    throw error;
  }
}

export async function criarCategoria(categoria) {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .insert([{
        nome: categoria.nome,
        icone: categoria.icone,
        cor: categoria.cor,
        ordem: categoria.ordem || 0,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    throw error;
  }
}

export async function atualizarCategoria(id, categoria) {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .update({
        nome: categoria.nome,
        icone: categoria.icone,
        cor: categoria.cor,
        ordem: categoria.ordem,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    throw error;
  }
}

export async function excluirCategoria(id) {
  try {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    throw error;
  }
}

// ====================== PEDIDOS ======================

export async function buscarPedidos(filtros = {}) {
  try {
    let query = supabase
      .from('pedidos')
      .select('*, itens_pedido(produto_id, quantidade, preco_unitario, subtotal)')
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

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    throw error;
  }
}

export async function criarPedido(pedido) {
  try {
    // Gerar número automático
    const { data: ultimoPedido } = await supabase
      .from('pedidos')
      .select('numero_pedido')
      .order('id', { ascending: false })
      .limit(1);

    const numero = ultimoPedido && ultimoPedido.length > 0 
      ? String(Number(ultimoPedido[0].numero_pedido) + 1).padStart(6, '0')
      : '000001';

    const { data, error } = await supabase
      .from('pedidos')
      .insert([{
        numero_pedido: numero,
        cliente_nome: pedido.cliente_nome,
        cliente_telefone: pedido.cliente_telefone,
        cliente_email: pedido.cliente_email,
        cliente_endereco: pedido.cliente_endereco,
        status: 'Aguardando',
        forma_pagamento: pedido.forma_pagamento,
        valor_total: pedido.valor_total,
        valor_produtos: pedido.valor_produtos,
        valor_entrega: pedido.valor_entrega,
        endereco_entrega: pedido.endereco_entrega,
      }])
      .select()
      .single();

    if (error) throw error;

    // Inserir itens do pedido
    if (pedido.itens && pedido.itens.length > 0) {
      const itens = pedido.itens.map(item => ({
        pedido_id: data.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
      }));

      const { error: itensError } = await supabase
        .from('itens_pedido')
        .insert(itens);

      if (itensError) throw itensError;

      // Atualizar estoque
      for (const item of pedido.itens) {
        await atualizarEstoque(item.produto_id, -item.quantidade);
      }
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    throw error;
  }
}

export async function atualizarStatusPedido(id, status) {
  try {
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
    return data;
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    throw error;
  }
}

// ====================== CLIENTES ======================

export async function buscarClientes() {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }
}

export async function criarCliente(cliente) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert([{
        nome: cliente.nome,
        cpf_cnpj: cliente.cpf_cnpj,
        telefone: cliente.telefone,
        whatsapp: cliente.whatsapp,
        email: cliente.email,
        endereco: cliente.endereco,
        cidade: cliente.cidade,
        cep: cliente.cep,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    throw error;
  }
}

export async function buscarClientePorTelefone(telefone) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefone', telefone)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    throw error;
  }
}

// ====================== CONFIGURAÇÕES ======================

export async function buscarConfiguracoes() {
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*');

    if (error) throw error;
    
    const configs = {};
    data.forEach(item => {
      configs[item.chave] = item.valor;
    });
    return configs;
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    throw error;
  }
}

export async function atualizarConfiguracao(chave, valor) {
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .update({ valor, updated_at: new Date().toISOString() })
      .eq('chave', chave)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    throw error;
  }
}

// ====================== ESTATÍSTICAS / DASHBOARD ======================

export async function buscarEstatisticas() {
  try {
    // Total de vendas
    const { data: totalVendas } = await supabase
      .from('pedidos')
      .select('valor_total')
      .eq('status', 'Entregue');

    const totalVendasValor = totalVendas ? totalVendas.reduce((acc, item) => acc + (item.valor_total || 0), 0) : 0;

    // Pedidos do dia
    const hoje = new Date().toISOString().split('T')[0];
    const { data: pedidosHoje } = await supabase
      .from('pedidos')
      .select('id')
      .gte('criado_em', hoje)
      .lt('criado_em', hoje + 'T23:59:59');

    // Total de produtos
    const { data: totalProdutos } = await supabase
      .from('produtos')
      .select('id', { count: 'exact', head: true });

    // Produtos sem estoque
    const { data: semEstoque } = await supabase
      .from('produtos')
      .select('id', { count: 'exact', head: true })
      .lte('saldo', 0);

    // Total de clientes
    const { data: totalClientes } = await supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true });

    // Produtos mais vendidos
    const { data: produtosVendidos } = await supabase
      .from('itens_pedido')
      .select('produto_id, quantidade')
      .limit(100);

    const vendasPorProduto = {};
    produtosVendidos?.forEach(item => {
      vendasPorProduto[item.produto_id] = (vendasPorProduto[item.produto_id] || 0) + item.quantidade;
    });

    const produtosMaisVendidos = Object.entries(vendasPorProduto)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([produtoId, total]) => ({ produtoId, total }));

    return {
      totalVendas: totalVendasValor,
      pedidosHoje: pedidosHoje?.length || 0,
      totalProdutos: totalProdutos?.count || 0,
      semEstoque: semEstoque?.count || 0,
      totalClientes: totalClientes?.count || 0,
      produtosMaisVendidos,
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
}

// ====================== UPLOAD DE IMAGENS ======================

export async function uploadImagem(file, pasta = 'produtos') {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${pasta}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('imagens')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('imagens')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }
}

// ====================== EXPORTAR RELATÓRIOS ======================

export async function exportarRelatorioVendas(dataInicio, dataFim) {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, itens_pedido(produto_id, quantidade, preco_unitario, subtotal)')
      .gte('criado_em', dataInicio)
      .lte('criado_em', dataFim)
      .order('criado_em', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    throw error;
  }
}