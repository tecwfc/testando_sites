// supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://pgxkklnskkrnajhbazib.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneGtrbG5za2tybmFqaGJhemliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwODM5NTksImV4cCI6MjEwMDY1OTk1OX0.rVNJ9XQSAXd80HFfZ_93AvZ889aT2-polSUDPI65qP0';

// Criar cliente com opções de Realtime
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Placeholder SVG
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%236d28d9'/%3E%3Ctext x='150' y='145' font-family='Arial' font-size='48' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central'%3EWR%3C/text%3E%3Ctext x='150' y='190' font-family='Arial' font-size='14' fill='%23c4b5fd' text-anchor='middle' dominant-baseline='central'%3EAromatizantes%3C/text%3E%3C/svg%3E`;

// Funções utilitárias
export const formatarPreco = (valor) => {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
};

export const formatarLinkImagem = (url) => {
  if (!url) return PLACEHOLDER_SVG;
  if (url.includes('drive.google.com')) {
    let id = url.includes('/d/') ? url.split('/d/')[1].split('/')[0] : url.split('id=')[1].split('&')[0];
    if (id) return `https://lh3.googleusercontent.com/u/0/d/${id}`;
    return PLACEHOLDER_SVG;
  }
  if (url.includes('supabase.co')) return url;
  if (url.includes('via.placeholder.com') || url.includes('placehold.co')) return PLACEHOLDER_SVG;
  if (url.startsWith('http')) {
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i)) return url;
    return PLACEHOLDER_SVG;
  }
  return PLACEHOLDER_SVG;
};

export async function testarConexao() {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Erro de conexão:', error);
      return false;
    }
    console.log('✅ Conexão com Supabase OK!');
    return true;
  } catch (err) {
    console.error('❌ Falha na conexão:', err);
    return false;
  }
}

// 🆕 NOVO: Função para se inscrever em mudanças em tempo real
export function subscribeToTable(tabela, callback, evento = '*') {
  console.log(`📡 Inscrevendo em ${tabela}...`);
  
  const channel = supabase
    .channel(`realtime:${tabela}`)
    .on(
      'postgres_changes',
      {
        event: evento, // '*' = todos, ou 'INSERT', 'UPDATE', 'DELETE'
        schema: 'public',
        table: tabela,
      },
      (payload) => {
        console.log(`🔄 Mudança em ${tabela}:`, payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log(`📡 Status ${tabela}:`, status);
    });

  return channel;
}

// 🆕 NOVO: Função para cancelar inscrição
export function unsubscribeFromTable(channel) {
  if (channel) {
    supabase.removeChannel(channel);
    console.log('📡 Inscrição removida');
  }
}