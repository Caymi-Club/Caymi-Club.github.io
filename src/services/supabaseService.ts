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

// Registra o agendamento no Supabase só para disparar o aviso no Telegram (Database Webhook).
// Nunca lança erro: se falhar, o agendamento do cliente continua valendo.
export async function enviarAvisoAgendamento(
  config: ConfiguracoesBarbearia,
  ag: Pick<Agendamento, 'cliente_nome' | 'cliente_telefone' | 'inicio' | 'fim' | 'servicos' | 'preco_total'>
): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;

  try {
    const { error } = await client.from('avisos_agendamento').insert({
      cliente_nome: ag.cliente_nome,
      cliente_telefone: ag.cliente_telefone,
      inicio: ag.inicio,
      fim: ag.fim,
      servicos: ag.servicos,
      preco_total: ag.preco_total,
    });
    if (error) console.warn('Não foi possível enviar o aviso do agendamento:', error.message);
  } catch (err) {
    console.warn('Falha ao enviar o aviso do agendamento:', err);
  }
}

export interface IntervaloOcupado {
  inicio: string;
  fim: string;
}

function linhaParaAgendamento(r: any): Agendamento {
  return {
    id: r.id,
    cliente_nome: r.cliente_nome,
    cliente_telefone: r.cliente_telefone,
    inicio: new Date(r.inicio).toISOString(),
    fim: new Date(r.fim).toISOString(),
    servicos: r.servicos || [],
    preco_total: Number(r.preco_total) || 0,
    duracao_total_minutos: Number(r.duracao_total_minutos) || 30,
    status: r.status,
    criado_em: r.criado_em,
    pago: !!r.pago,
    forma_pagamento: r.forma_pagamento,
    observacoes: r.observacoes ?? undefined,
  };
}

function agendamentoParaLinha(ag: Agendamento) {
  return {
    id: ag.id,
    cliente_nome: ag.cliente_nome,
    cliente_telefone: ag.cliente_telefone,
    servicos: ag.servicos,
    inicio: ag.inicio,
    fim: ag.fim,
    preco_total: ag.preco_total,
    duracao_total_minutos: ag.duracao_total_minutos,
    status: ag.status,
    pago: !!ag.pago,
    forma_pagamento: ag.forma_pagamento || 'Pendente',
    observacoes: ag.observacoes ?? null,
  };
}

// Cliente: grava o agendamento no Supabase para o horário ficar ocupado em todos os aparelhos.
export async function registrarAgendamentoRemoto(
  config: ConfiguracoesBarbearia,
  ag: Agendamento
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient(config);
  if (!client) return { success: false, message: 'Supabase não configurado.' };

  try {
    const { error } = await client.from('agendamentos_site').insert(agendamentoParaLinha(ag));
    if (error) return { success: false, message: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || String(err) };
  }
}

// Cliente: intervalos ocupados (sem dados pessoais) do dia informado (YYYY-MM-DD).
// Retorna null se não conseguiu consultar.
export async function buscarHorariosOcupados(
  config: ConfiguracoesBarbearia,
  dataYYYYMMDD: string
): Promise<IntervaloOcupado[] | null> {
  const client = getSupabaseClient(config);
  if (!client) return null;

  try {
    const inicioDia = new Date(`${dataYYYYMMDD}T00:00:00`);
    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
    const { data, error } = await client.rpc('horarios_ocupados', {
      p_inicio: inicioDia.toISOString(),
      p_fim: fimDia.toISOString(),
    });
    if (error) {
      console.warn('Não foi possível consultar horários ocupados:', error.message);
      return null;
    }
    return (data || []).map((r: any) => ({
      inicio: new Date(r.inicio).toISOString(),
      fim: new Date(r.fim).toISOString(),
    }));
  } catch (err) {
    console.warn('Falha ao consultar horários ocupados:', err);
    return null;
  }
}

// Barbeiro: cria/atualiza um agendamento ou bloqueio no Supabase (exige login).
export async function salvarAgendamentoRemoto(config: ConfiguracoesBarbearia, ag: Agendamento): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client) return false;

  try {
    const { error } = await client.from('agendamentos_site').upsert(agendamentoParaLinha(ag));
    if (error) {
      console.warn('Não foi possível salvar o agendamento no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha ao salvar o agendamento no Supabase:', err);
    return false;
  }
}

// Barbeiro: traz para este aparelho os agendamentos feitos pelos clientes (e por outros aparelhos)
// e envia ao Supabase o que só existe aqui. Retorna true se a lista local mudou.
export async function sincronizarAgendamentosAdmin(config: ConfiguracoesBarbearia): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client) return false;

  try {
    const { data, error } = await client.from('agendamentos_site').select('*');
    if (error || !data) {
      if (error) console.warn('Não foi possível carregar agendamentos do Supabase:', error.message);
      return false;
    }

    const remotos = data.map(linhaParaAgendamento);
    const idsRemotos = new Set(remotos.map((r) => r.id));
    const locais = storageService.getAgendamentos();

    // Dados de demonstração do primeiro acesso não devem bloquear horários reais
    const soLocais = locais.filter((l) => !idsRemotos.has(l.id) && !/^ag-0[1-4]$/.test(l.id));
    if (soLocais.length > 0) {
      const { error: erroEnvio } = await client.from('agendamentos_site').upsert(soLocais.map(agendamentoParaLinha));
      if (erroEnvio) console.warn('Não foi possível enviar agendamentos locais:', erroEnvio.message);
    }

    // O Supabase vale para o que existe nos dois lados; o que só existe aqui continua na lista local
    const final = [...remotos, ...locais.filter((l) => !idsRemotos.has(l.id))];

    const assinatura = (lista: Agendamento[]) =>
      JSON.stringify(lista.map((a) => [a.id, a.status, a.inicio, a.pago, a.forma_pagamento]).sort());
    const mudou = assinatura(final) !== assinatura(locais);
    if (mudou) storageService.saveAgendamentos(final);
    return mudou;
  } catch (err) {
    console.warn('Falha ao sincronizar agendamentos:', err);
    return false;
  }
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

    // O Supabase não guarda ícone nem descrição: reaproveita os do serviço local de mesmo nome.
    const locais = storageService.getServicos();
    const formatados: Servico[] = data.map((s, idx) => {
      const local = locais.find((l) => l.nome === s.nome);
      return {
        id: `supa-${idx}`,
        nome: s.nome,
        preco: Number(s.preco),
        duracao_minutos: Number(s.duracao_minutos) || 30,
        ativo: s.ativo !== false,
        icone: local?.icone || (s.nome.toLowerCase().includes('barba') ? '🪒' : '✂️'),
        descricao: local?.descricao,
      };
    });

    storageService.saveServicos(formatados);
    return formatados;
  } catch (err) {
    console.warn('Falha na sincronização com Supabase:', err);
    return storageService.getServicos();
  }
}
