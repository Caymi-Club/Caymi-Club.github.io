import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfiguracoesBarbearia, Servico, Agendamento } from '../types';
import { storageService } from './storage';

let supabaseInstance: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function getSupabaseClient(config: ConfiguracoesBarbearia): SupabaseClient | null {
  if (!config.supabase_url || !config.supabase_anon_key) {
    return null;
  }

  if (
    supabaseInstance &&
    currentUrl === config.supabase_url &&
    currentKey === config.supabase_anon_key
  ) {
    return supabaseInstance;
  }

  try {
    currentUrl = config.supabase_url;
    currentKey = config.supabase_anon_key;
    supabaseInstance = createClient(config.supabase_url, config.supabase_anon_key);
    return supabaseInstance;
  } catch (err) {
    console.warn('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

export async function loginAdmin(
  config: ConfiguracoesBarbearia,
  email: string,
  senha: string
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, message: 'Supabase não configurado (URL e chave anon).' };
  }

  try {
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      const invalido = error.message === 'Invalid login credentials';
      return { success: false, message: invalido ? 'E-mail ou senha incorretos.' : error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: `Falha na requisição: ${err.message || String(err)}` };
  }
}

export async function logoutAdmin(config: ConfiguracoesBarbearia): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch (err) {
    console.warn('Erro ao encerrar sessão:', err);
  }
}

export async function adminTemSessao(config: ConfiguracoesBarbearia): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client) return false;
  try {
    const { data } = await client.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

// Avisa quando o admin entra, sai ou a sessão expira. Retorna a função para cancelar.
export function observarSessaoAdmin(
  config: ConfiguracoesBarbearia,
  callback: (logado: boolean) => void
): () => void {
  const client = getSupabaseClient(config);
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((_evento, session) => callback(!!session));
  return () => data.subscription.unsubscribe();
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await client.from('servicos').select('nome').limit(1);
    if (error) {
      return { success: false, message: `Erro do Supabase: ${error.message}` };
    }
    return { success: true, message: `Conexão bem sucedida! Encontrados registros de serviços.` };
  } catch (err: any) {
    return { success: false, message: `Falha na requisição: ${err.message || String(err)}` };
  }
}

export async function sincronizarServicos(config: ConfiguracoesBarbearia): Promise<Servico[]> {
  const client = getSupabaseClient(config);
  if (!client) {
    return storageService.getServicos();
  }

  try {
    const { data, error } = await client
      .from('servicos')
      .select('nome, preco, duracao_minutos, ativo')
      .order('nome', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Usando serviços locais devido a erro no Supabase:', error);
      return storageService.getServicos();
    }

    const formatados: Servico[] = data.map((s, idx) => ({
      id: `supa-${idx}`,
      nome: s.nome,
      preco: Number(s.preco),
      duracao_minutos: Number(s.duracao_minutos) || 30,
      ativo: s.ativo !== false,
      icone: s.nome.toLowerCase().includes('barba') ? '🪒' : '✂️',
    }));

    storageService.saveServicos(formatados);
    return formatados;
  } catch (err) {
    console.warn('Falha na sincronização com Supabase:', err);
    return storageService.getServicos();
  }
}
