// supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// CORRIGIDO: Remova o /rest/v1/ da URL
const SUPABASE_URL = 'https://pgxkklnskkrnajhbazib.supabase.co'; // SEM /rest/v1/
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneGtrbG5za2tybmFqaGJhemliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwODM5NTksImV4cCI6MjEwMDY1OTk1OX0.rVNJ9XQSAXd80HFfZ_93AvZ889aT2-polSUDPI65qP0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Funções utilitárias
export const formatarPreco = (valor) => {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
};

export const formatarLinkImagem = (url) => {
  if (!url) return 'assets/placeholder.png';
  if (url.includes('drive.google.com')) {
    let id = url.includes('/d/') ? url.split('/d/')[1].split('/')[0] : url.split('id=')[1].split('&')[0];
    return `https://lh3.googleusercontent.com/u/0/d/${id}`;
  }
  if (url.includes('supabase.co')) {
    return url;
  }
  return url;
};