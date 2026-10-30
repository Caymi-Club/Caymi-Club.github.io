export interface Servico {
  id?: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  ativo?: boolean;
  icone?: string;
  descricao?: string;
}

export type StatusAgendamento = 'confirmado' | 'cancelado' | 'bloqueado' | 'concluido';
export type FormaPagamento = 'Dinheiro' | 'Pix' | 'Cartão de Débito' | 'Cartão de Crédito' | 'Pendente';

export interface Agendamento {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  inicio: string; // ISO string
  fim: string;    // ISO string
  servicos: string[];
  preco_total: number;
  duracao_total_minutos: number;
  status: StatusAgendamento;
  criado_em?: string;
  forma_pagamento?: FormaPagamento;
  pago?: boolean;
  observacoes?: string;
}

export interface UltimoAgendamentoCliente {
  id: string;
  nome: string;
  telefone: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  servicos: string[];
  precoTotal: number;
  duracaoTotal: number;
  criadoEm: string;
  lembreteAtivado?: boolean;
}

// Horário de um dia da semana (almoço/folga incluídos)
export interface HorarioDia {
  aberto: boolean;
  abertura: string; // '08:00'
  fechamento: string; // '19:00'
  pausa_almoco: boolean;
  almoco_inicio: string; // '12:00'
  almoco_fim: string; // '13:00'
}

export interface ConfiguracoesBarbearia {
  nome: string;
  slogan: string;
  endereco: string;
  telefone_whatsapp: string;
  hora_abertura: string; // '08:00'
  hora_fechamento: string; // '19:00'
  pausa_almoco: boolean; // true
  almoco_inicio: string; // '12:00'
  almoco_fim: string; // '13:00'
  intervalo_minutos: number; // 30
  dias_funcionamento: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  horarios_semana?: HorarioDia[]; // índice 0=Dom ... 6=Sáb; quando existe, vale no lugar dos horários gerais
  exibir_promo_app: boolean;
  promo_app_nome: string;
  promo_app_badge: string;
  promo_app_desc: string;
  promo_app_url: string;
  supabase_url: string;
  supabase_anon_key: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
}

export interface Assinante {
  id: string;
  nome: string;
  telefone: string;
  plano: string;
  valor: number;
  dia_vencimento: number; // 1-31: dia do mês em que a mensalidade vence
  proximo_vencimento: string; // YYYY-MM-DD
  ultimo_pagamento?: string | null; // YYYY-MM-DD
  ativo: boolean;
}
