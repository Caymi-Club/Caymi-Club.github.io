import { Servico, Agendamento, ConfiguracoesBarbearia, UltimoAgendamentoCliente, FormaPagamento } from '../types';
import { DEFAULT_CONFIG, DEFAULT_SERVICOS } from '../constants/defaultData';
import { dataLocalISO, dataLocalDeISO, mesLocalISO } from '../utils/datas';
import { horarioDoDia } from '../utils/horarios';

const STORAGE_KEYS = {
  CONFIG: 'caymi_configuracoes',
  SERVICOS: 'caymi_servicos',
  AGENDAMENTOS: 'caymi_agendamentos',
  CLIENTE_SALVO: 'caymi_cliente',
  ULTIMO_AGENDAMENTO: 'caymi_ultimo_agendamento',
};

export const storageService = {
  // Configurações
  getConfig(): ConfiguracoesBarbearia {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações do localStorage:', e);
    }
    return DEFAULT_CONFIG;
  },

  saveConfig(config: ConfiguracoesBarbearia): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Erro ao salvar configurações:', e);
    }
  },

  // Serviços
  getServicos(): Servico[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SERVICOS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Erro ao carregar serviços do localStorage:', e);
    }
    return DEFAULT_SERVICOS;
  },

  saveServicos(servicos: Servico[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(servicos));
    } catch (e) {
      console.error('Erro ao salvar serviços:', e);
    }
  },

  // Agendamentos
  getAgendamentos(): Agendamento[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AGENDAMENTOS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Erro ao carregar agendamentos do localStorage:', e);
    }
    return [];
  },

  saveAgendamentos(agendamentos: Agendamento[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AGENDAMENTOS, JSON.stringify(agendamentos));
    } catch (e) {
      console.error('Erro ao salvar agendamentos:', e);
    }
  },

  criarAgendamento(novo: Omit<Agendamento, 'id' | 'criado_em'>): Agendamento {
    const agendamentos = this.getAgendamentos();
    const id = 'ag-' + Math.random().toString(36).substring(2, 9);
    const item: Agendamento = {
      ...novo,
      id,
      pago: novo.pago ?? false,
      forma_pagamento: novo.forma_pagamento ?? 'Pendente',
      criado_em: new Date().toISOString(),
    };
    agendamentos.push(item);
    this.saveAgendamentos(agendamentos);
    return item;
  },

  atualizarAgendamento(id: string, updates: Partial<Agendamento>): boolean {
    const agendamentos = this.getAgendamentos();
    const index = agendamentos.findIndex((a) => a.id === id || a.id.startsWith(id));
    if (index === -1) return false;
    agendamentos[index] = { ...agendamentos[index], ...updates };
    this.saveAgendamentos(agendamentos);
    return true;
  },

  marcarConcluido(id: string, formaPagamento: FormaPagamento = 'Pix'): boolean {
    return this.atualizarAgendamento(id, {
      status: 'concluido',
      pago: true,
      forma_pagamento: formaPagamento,
    });
  },

  bloquearHorario(dataYYYYMMDD: string, horaInicio: string, horaFim: string, motivo: string = 'Bloqueado'): Agendamento {
    const inicio = `${dataYYYYMMDD}T${horaInicio}:00`;
    const fim = `${dataYYYYMMDD}T${horaFim}:00`;
    const duracao = Math.max(15, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000));

    return this.criarAgendamento({
      cliente_nome: motivo,
      cliente_telefone: '-',
      inicio: new Date(inicio).toISOString(),
      fim: new Date(fim).toISOString(),
      servicos: [],
      preco_total: 0,
      duracao_total_minutos: duracao,
      status: 'bloqueado',
    });
  },

  // Dados do Cliente (Lembrança)
  getClienteSalvo(): { nome: string; telefone: string } | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTE_SALVO);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  salvarCliente(nome: string, telefone: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTE_SALVO, JSON.stringify({ nome, telefone }));
    } catch {
      // ignore
    }
  },

  // Último Agendamento do Cliente (para exibição de lembrete ativo no topo)
  getUltimoAgendamentoCliente(): UltimoAgendamentoCliente | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ULTIMO_AGENDAMENTO);
      if (!data) return null;
      const parsed: UltimoAgendamentoCliente = JSON.parse(data);

      // Checa se o horário ainda não passou há mais de 1 dia
      const dataHoraAgendamento = new Date(`${parsed.data}T${parsed.hora}:00`);
      const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (dataHoraAgendamento < umDiaAtras) {
        // Antigo demais para ser considerado lembrete pendente
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  salvarUltimoAgendamentoCliente(agendamento: UltimoAgendamentoCliente): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ULTIMO_AGENDAMENTO, JSON.stringify(agendamento));
    } catch {
      // ignore
    }
  },

  limparUltimoAgendamentoCliente(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ULTIMO_AGENDAMENTO);
    } catch {
      // ignore
    }
  },

  // Horários disponíveis
  getHorariosDisponiveis(
    dataYYYYMMDD: string,
    duracaoMinutos: number,
    ocupadosRemotos: Array<{ inicio: string; fim: string }> | null = null
  ): string[] {
    return this.getGradeHorarios(dataYYYYMMDD, duracaoMinutos, ocupadosRemotos)
      .filter((s) => s.livre)
      .map((s) => s.hora);
  },

  // O barbeiro abre neste dia da semana?
  diaAberto(dataYYYYMMDD: string): boolean {
    return horarioDoDia(this.getConfig(), new Date(`${dataYYYYMMDD}T00:00:00`).getDay()).aberto;
  },

  // Todos os horários do dia dentro do expediente, marcando quais estão livres.
  // `ocupadosRemotos` são os horários ocupados vindos do Supabase (todos os aparelhos). Quando vierem,
  // valem sozinhos: a cópia local pode estar desatualizada (ex.: o barbeiro cancelou pelo celular dele).
  // Com null (sem conexão), usa só o que há neste aparelho.
  getGradeHorarios(
    dataYYYYMMDD: string,
    duracaoMinutos: number,
    ocupadosRemotos: Array<{ inicio: string; fim: string }> | null = null
  ): Array<{ hora: string; livre: boolean }> {
    const config = this.getConfig();
    const agendamentos: Array<{ inicio: string; fim: string }> =
      ocupadosRemotos ??
      this.getAgendamentos().filter(
        (a) => a.status !== 'cancelado' && dataLocalDeISO(a.inicio) === dataYYYYMMDD
      );

    // Horário do dia da semana desta data; dia fechado não tem horários
    const diaSemana = new Date(`${dataYYYYMMDD}T00:00:00`).getDay();
    const dia = horarioDoDia(config, diaSemana);
    if (!dia.aberto) return [];

    const [horaAbre, minAbre] = dia.abertura.split(':').map(Number);
    const [horaFecha, minFecha] = dia.fechamento.split(':').map(Number);

    const inicioMinutosDia = horaAbre * 60 + minAbre;
    const fimMinutosDia = horaFecha * 60 + minFecha;
    const intervalo = config.intervalo_minutos || 30;

    // Horário de almoço
    const almocoAtivo = dia.pausa_almoco;
    let almocoInicioMin = -1;
    let almocoFimMin = -1;

    if (almocoAtivo && dia.almoco_inicio && dia.almoco_fim) {
      const [hAlmocoAbre, mAlmocoAbre] = dia.almoco_inicio.split(':').map(Number);
      const [hAlmocoFecha, mAlmocoFecha] = dia.almoco_fim.split(':').map(Number);
      almocoInicioMin = hAlmocoAbre * 60 + mAlmocoAbre;
      almocoFimMin = hAlmocoFecha * 60 + mAlmocoFecha;
    }

    const grade: Array<{ hora: string; livre: boolean }> = [];

    // Se for o dia de hoje, não permitir horários do passado
    const hojeYYYYMMDD = dataLocalISO();
    const isHoje = dataYYYYMMDD === hojeYYYYMMDD;
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes() + 10;

    for (let slot = inicioMinutosDia; slot + duracaoMinutos <= fimMinutosDia; slot += intervalo) {
      if (isHoje && slot < minutosAgora) {
        continue;
      }

      // Bloqueia se o atendimento interceptar o horário de almoço
      if (almocoInicioMin !== -1 && almocoFimMin !== -1) {
        const slotFimMin = slot + duracaoMinutos;
        if (slot < almocoFimMin && slotFimMin > almocoInicioMin) {
          continue;
        }
      }

      const slotInicioDate = new Date(`${dataYYYYMMDD}T${String(Math.floor(slot / 60)).padStart(2, '0')}:${String(slot % 60).padStart(2, '0')}:00`);
      const slotFimDate = new Date(slotInicioDate.getTime() + duracaoMinutos * 60000);

      // Checa colisão com agendamentos existentes
      const temConflito = agendamentos.some((ag) => {
        const agInicio = new Date(ag.inicio);
        const agFim = new Date(ag.fim);
        return slotInicioDate < agFim && slotFimDate > agInicio;
      });

      const hh = String(Math.floor(slot / 60)).padStart(2, '0');
      const mm = String(slot % 60).padStart(2, '0');
      grade.push({ hora: `${hh}:${mm}`, livre: !temConflito });
    }

    return grade;
  },

  // ==========================================
  // CAIXA DIÁRIO, SEMANAL E MENSAL
  // ==========================================
  getCaixaDiario(dataYYYYMMDD: string) {
    const todos = this.getAgendamentos();
    const diaAgendamentos = todos.filter(
      (a) => dataLocalDeISO(a.inicio) === dataYYYYMMDD && a.status !== 'cancelado' && a.status !== 'bloqueado'
    );

    let totalEntradas = 0;
    let totalPendente = 0;
    let concluidos = 0;
    let porForma: Record<string, number> = {
      Pix: 0,
      Dinheiro: 0,
      'Cartão de Débito': 0,
      'Cartão de Crédito': 0,
      Pendente: 0,
    };

    diaAgendamentos.forEach((ag) => {
      const preco = Number(ag.preco_total) || 0;
      if (ag.pago || ag.status === 'concluido') {
        totalEntradas += preco;
        concluidos++;
        const forma = ag.forma_pagamento || 'Pix';
        porForma[forma] = (porForma[forma] || 0) + preco;
      } else {
        totalPendente += preco;
        porForma['Pendente'] = (porForma['Pendente'] || 0) + preco;
      }
    });

    return {
      data: dataYYYYMMDD,
      totalEntradas,
      totalPendente,
      totalGeral: totalEntradas + totalPendente,
      concluidos,
      totalAgendamentos: diaAgendamentos.length,
      porForma,
      itens: diaAgendamentos,
    };
  },

  getCaixaSemanal(dataReferenciaYYYYMMDD?: string) {
    const todos = this.getAgendamentos();
    const ref = dataReferenciaYYYYMMDD ? new Date(`${dataReferenciaYYYYMMDD}T00:00:00`) : new Date();

    const dias: Array<{
      data: string;
      diaSemana: string;
      total: number;
      quantidade: number;
    }> = [];

    let totalSemanal = 0;
    let qtdSemanal = 0;

    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Últimos 7 dias a partir da referência
    for (let i = 6; i >= 0; i--) {
      const d = new Date(ref);
      d.setDate(d.getDate() - i);
      const dataISO = dataLocalISO(d);
      const diaSemana = nomesDias[d.getDay()];

      const doDia = todos.filter(
        (a) => dataLocalDeISO(a.inicio) === dataISO && a.status !== 'cancelado' && a.status !== 'bloqueado'
      );

      const totalDia = doDia.reduce((acc, a) => acc + (a.pago || a.status === 'concluido' ? Number(a.preco_total) || 0 : 0), 0);
      const qtdDia = doDia.filter((a) => a.pago || a.status === 'concluido').length;

      totalSemanal += totalDia;
      qtdSemanal += qtdDia;

      dias.push({
        data: dataISO,
        diaSemana,
        total: totalDia,
        quantidade: qtdDia,
      });
    }

    return {
      totalSemanal,
      qtdSemanal,
      ticketMedio: qtdSemanal > 0 ? totalSemanal / qtdSemanal : 0,
      dias,
    };
  },

  getCaixaMensal(anoMes?: string) {
    const todos = this.getAgendamentos();
    const prefix = anoMes || mesLocalISO(); // 'YYYY-MM'

    const mesAgendamentos = todos.filter(
      (a) => dataLocalDeISO(a.inicio).slice(0, 7) === prefix && a.status !== 'cancelado' && a.status !== 'bloqueado'
    );

    let totalMensal = 0;
    let concluidos = 0;
    let totalPendente = 0;
    const servicosQtd: Record<string, { quantidade: number; valor: number }> = {};
    const formasPagamento: Record<string, number> = {
      Pix: 0,
      Dinheiro: 0,
      'Cartão de Débito': 0,
      'Cartão de Crédito': 0,
    };

    mesAgendamentos.forEach((ag) => {
      const preco = Number(ag.preco_total) || 0;
      if (ag.pago || ag.status === 'concluido') {
        totalMensal += preco;
        concluidos++;
        const f = ag.forma_pagamento || 'Pix';
        if (f !== 'Pendente') {
          formasPagamento[f] = (formasPagamento[f] || 0) + preco;
        }
      } else {
        totalPendente += preco;
      }

      ag.servicos.forEach((s) => {
        if (!servicosQtd[s]) servicosQtd[s] = { quantidade: 0, valor: 0 };
        servicosQtd[s].quantidade++;
        servicosQtd[s].valor += preco / (ag.servicos.length || 1);
      });
    });

    const ranking = Object.entries(servicosQtd)
      .map(([nome, d]) => ({ nome, quantidade: d.quantidade, valor: d.valor }))
      .sort((a, b) => b.quantidade - a.quantidade);

    return {
      anoMes: prefix,
      totalMensal,
      totalPendente,
      concluidos,
      totalAgendamentos: mesAgendamentos.length,
      ticketMedio: concluidos > 0 ? totalMensal / concluidos : 0,
      formasPagamento,
      ranking,
    };
  },

  // Série diária de desempenho (faturamento recebido, a receber, atendimentos) dos últimos N dias
  // e do período imediatamente anterior, para comparação.
  getDesempenho(dias: number) {
    const todos = this.getAgendamentos().filter((a) => a.status !== 'cancelado' && a.status !== 'bloqueado');
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const porDia: Record<string, { recebido: number; pendente: number; quantidade: number }> = {};
    todos.forEach((a) => {
      const chave = dataLocalDeISO(a.inicio);
      if (!porDia[chave]) porDia[chave] = { recebido: 0, pendente: 0, quantidade: 0 };
      const preco = Number(a.preco_total) || 0;
      if (a.pago || a.status === 'concluido') {
        porDia[chave].recebido += preco;
        porDia[chave].quantidade++;
      } else {
        porDia[chave].pendente += preco;
      }
    });

    const hoje = new Date();
    const montarSerie = (deslocamento: number) => {
      const serie: Array<{ data: string; diaSemana: string; recebido: number; pendente: number; quantidade: number }> = [];
      for (let i = dias - 1; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(d.getDate() - i - deslocamento);
        const data = dataLocalISO(d);
        serie.push({ data, diaSemana: nomesDias[d.getDay()], ...(porDia[data] || { recebido: 0, pendente: 0, quantidade: 0 }) });
      }
      return serie;
    };

    const somar = (serie: ReturnType<typeof montarSerie>) => ({
      recebido: serie.reduce((acc, d) => acc + d.recebido, 0),
      pendente: serie.reduce((acc, d) => acc + d.pendente, 0),
      quantidade: serie.reduce((acc, d) => acc + d.quantidade, 0),
    });

    const atual = montarSerie(0);
    const anterior = montarSerie(dias);
    const totaisAtual = somar(atual);
    const totaisAnterior = somar(anterior);

    return {
      serie: atual,
      totais: { ...totaisAtual, ticketMedio: totaisAtual.quantidade > 0 ? totaisAtual.recebido / totaisAtual.quantidade : 0 },
      totaisAnterior,
      variacao: totaisAnterior.recebido > 0 ? ((totaisAtual.recebido - totaisAnterior.recebido) / totaisAnterior.recebido) * 100 : null,
    };
  },

  // Helper para criar link do Google Agenda
  criarLinkGoogleAgenda(titulo: string, inicioDate: Date, duracaoMinutos: number, local: string, descricao: string): string {
    const fimDate = new Date(inicioDate.getTime() + duracaoMinutos * 60000);

    const formatarCal = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: titulo,
      dates: `${formatarCal(inicioDate)}/${formatarCal(fimDate)}`,
      details: descricao,
      location: local,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  },
};
