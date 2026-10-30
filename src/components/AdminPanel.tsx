import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Lock,
  Unlock,
  MessageCircle,
  TrendingUp,
  Send,
  Save,
  RotateCcw,
  Copy,
  CheckCheck,
  Bot,
  Database,
  Sliders,
  ExternalLink,
  Wallet,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Banknote,
  QrCode,
  AlertTriangle,
  UserCheck,
  BellRing,
  LogOut,
} from 'lucide-react';
import { Servico, Agendamento, ConfiguracoesBarbearia, FormaPagamento, HorarioDia } from '../types';
import { storageService } from '../services/storage';
import {
  testSupabaseConnection,
  salvarAgendamentoRemoto,
  sincronizarAgendamentosAdmin,
  salvarConfigSite,
  publicarConfigSiteSeAusente,
  sincronizarServicos,
  salvarServicosRemoto,
  excluirServicoRemoto,
} from '../services/supabaseService';
import { PerformanceChart } from './PerformanceChart';
import { PlanoMensal } from './PlanoMensal';
import { linkWhatsapp } from '../utils/whatsapp';
import { dataLocalISO, dataLocalDeISO, mesLocalISO } from '../utils/datas';
import { semanaDaConfig } from '../utils/horarios';

interface AdminPanelProps {
  config: ConfiguracoesBarbearia;
  onConfigChange: (novaConfig: ConfiguracoesBarbearia) => void;
  servicos: Servico[];
  onServicosChange: (novosServicos: Servico[]) => void;
  onVoltarAgendamento: () => void;
  onDeslogarAdmin?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  config,
  onConfigChange,
  servicos,
  onServicosChange,
  onVoltarAgendamento,
  onDeslogarAdmin,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'agenda' | 'caixa' | 'planos' | 'servicos' | 'dados' | 'telegram' | 'exportar'>('agenda');
  const [subAbaCaixa, setSubAbaCaixa] = useState<'diario' | 'semanal' | 'mensal' | 'desempenho'>('diario');

  // Form states for general settings
  const [formData, setFormData] = useState<ConfiguracoesBarbearia>(config);
  const [mensagemSalvo, setMensagemSalvo] = useState(false);

  // New service modal
  const [novoServicoModal, setNovoServicoModal] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('35');
  const [novaDuracao, setNovaDuracao] = useState('30');
  const [novoIcone, setNovoIcone] = useState('✂️');
  const [novaDescricao, setNovaDescricao] = useState('');

  // Editing service state
  const [servicoEditando, setServicoEditando] = useState<string | null>(null);
  const [precoEditado, setPrecoEditado] = useState<number>(0);
  const [duracaoEditada, setDuracaoEditada] = useState<number>(30);

  // Agenda states
  const [dataAgenda, setDataAgenda] = useState<string>(dataLocalISO());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(() => storageService.getAgendamentos());

  // Block time modal
  const [modalBloqueio, setModalBloqueio] = useState(false);
  const [bloqueioData, setBloqueioData] = useState<string>(dataLocalISO());
  const [bloqueioInicio, setBloqueioInicio] = useState('12:00');
  const [bloqueioFim, setBloqueioFim] = useState('13:00');
  const [bloqueioMotivo, setBloqueioMotivo] = useState('Almoço / Intervalo');

  // Reschedule modal
  // Editar serviços de um agendamento
  const [modalServicos, setModalServicos] = useState<Agendamento | null>(null);
  const [servicosEdit, setServicosEdit] = useState<string[]>([]);
  const [precoEdit, setPrecoEdit] = useState('0');
  const [duracaoEdit, setDuracaoEdit] = useState(30);
  const [avulsoNome, setAvulsoNome] = useState('');
  const [avulsoPreco, setAvulsoPreco] = useState('');
  const [avulsoMinutos, setAvulsoMinutos] = useState('0');

  const [modalRemarcar, setModalRemarcar] = useState<Agendamento | null>(null);
  const [remarcarData, setRemarcarData] = useState(dataLocalISO());
  const [remarcarHora, setRemarcarHora] = useState('');
  const [horariosRemarcar, setHorariosRemarcar] = useState<string[]>([]);

  // Payment confirmation modal
  const [modalPagamento, setModalPagamento] = useState<Agendamento | null>(null);
  const [formaEscolhida, setFormaEscolhida] = useState<FormaPagamento>('Pix');

  // Notification / Cancel feedback
  const [erroSincronizacao, setErroSincronizacao] = useState<string | null>(null);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string | null>(null);
  const [avisoAcao, setAvisoAcao] = useState<{ texto: string; linkWhats?: string } | null>(null);

  // Caixa dates
  const [dataCaixaDiario, setDataCaixaDiario] = useState<string>(dataLocalISO());
  const [mesCaixa, setMesCaixa] = useState<string>(mesLocalISO());

  // Telegram simulation
  const [simulacaoNotif, setSimulacaoNotif] = useState<string | null>(null);
  const [statusSupabase, setStatusSupabase] = useState<{ loading: boolean; message: string | null; success: boolean | null }>({
    loading: false,
    message: null,
    success: null,
  });

  // Copied code feedback
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  // Formatters
  const formatarPreco = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatarDataBR = (dataISO: string) => {
    if (!dataISO) return '';
    // Instante completo (ex.: início do agendamento) vira a data local; "YYYY-MM-DD" é usada como está
    const somenteData = dataISO.length > 10 ? dataLocalDeISO(dataISO) : dataISO;
    const [ano, mes, dia] = somenteData.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const formatarHora = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Recarregar agendamentos
  const atualizarListaAgendamentos = () => {
    setAgendamentos(storageService.getAgendamentos());
  };

  // Traz do Supabase os agendamentos feitos pelos clientes (celulares deles) ao abrir e a cada 30s
  useEffect(() => {
    let ativo = true;
    const sincronizar = async () => {
      const { mudou, erro, total } = await sincronizarAgendamentosAdmin(config);
      const horario = await publicarConfigSiteSeAusente(storageService.getConfig());
      if (!ativo) return;
      if (mudou) atualizarListaAgendamentos();
      const problema = erro || (horario.success ? null : horario.message || 'erro ao publicar as configurações');
      setErroSincronizacao(problema);
      if (!problema) {
        const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setUltimaSincronizacao(`${hora} · ${total ?? 0} registros no servidor`);
      }
    };
    sincronizar();
    const timer = setInterval(sincronizar, 30000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [config.supabase_url, config.supabase_anon_key]);

  // Envia ao Supabase a versão atual do agendamento para o horário refletir nos celulares dos clientes
  const enviarAgendamentoRemoto = async (id: string) => {
    const ag = storageService.getAgendamentos().find((a) => a.id === id);
    if (!ag) return;
    const res = await salvarAgendamentoRemoto(config, ag);
    setErroSincronizacao(res.success ? null : res.message || 'erro desconhecido');
  };

  // Traz a lista completa de serviços (inclusive os desativados) ao abrir o painel
  useEffect(() => {
    sincronizarServicos(config).then(onServicosChange);
  }, [config.supabase_url, config.supabase_anon_key]);

  // Publica os serviços para os clientes (preço, duração, ativo)
  const publicarServicos = (lista: Servico[]) => {
    void salvarServicosRemoto(config, lista).then((res) => {
      setErroSincronizacao(res.success ? null : `serviços não publicados para os clientes: ${res.message}`);
    });
  };

  // Save General Configuration
  const handleSalvarConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Os dias abertos passam a vir da grade semanal
    const semana = semanaDaConfig(formData);
    const novaConfig: ConfiguracoesBarbearia = {
      ...formData,
      horarios_semana: semana,
      dias_funcionamento: semana.flatMap((d, i) => (d.aberto ? [i] : [])),
    };
    setFormData(novaConfig);
    storageService.saveConfig(novaConfig);
    onConfigChange(novaConfig);
    void salvarConfigSite(novaConfig).then((res) => {
      setErroSincronizacao(res.success ? null : `configurações não publicadas para os clientes: ${res.message}`);
    });
    setMensagemSalvo(true);
    setTimeout(() => setMensagemSalvo(false), 3000);
  };

  // Add New Service
  const handleAdicionarServico = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const novo: Servico = {
      id: 'srv-' + Date.now(),
      nome: novoNome.trim(),
      preco: Number(novoPreco.replace(',', '.')) || 0,
      duracao_minutos: Number(novaDuracao) || 30,
      icone: novoIcone || '✂️',
      descricao: novaDescricao.trim(),
      ativo: true,
    };

    const atualizados = [...servicos, novo];
    onServicosChange(atualizados);
    storageService.saveServicos(atualizados);
    publicarServicos(atualizados);

    setNovoNome('');
    setNovoPreco('35');
    setNovaDuracao('30');
    setNovaDescricao('');
    setNovoServicoModal(false);
  };

  // Save Service Edit
  const handleSalvarEdicaoServico = (nome: string) => {
    const atualizados = servicos.map((s) => {
      if (s.nome === nome) {
        return {
          ...s,
          preco: precoEditado,
          duracao_minutos: duracaoEditada,
        };
      }
      return s;
    });

    onServicosChange(atualizados);
    storageService.saveServicos(atualizados);
    publicarServicos(atualizados);
    setServicoEditando(null);
  };

  // Toggle Service Active
  const handleToggleServico = (nome: string) => {
    const atualizados = servicos.map((s) =>
      s.nome === nome ? { ...s, ativo: !s.ativo } : s
    );
    onServicosChange(atualizados);
    storageService.saveServicos(atualizados);
    publicarServicos(atualizados);
  };

  // Delete Service
  const handleExcluirServico = (nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o serviço "${nome}"?`)) {
      const atualizados = servicos.filter((s) => s.nome !== nome);
      onServicosChange(atualizados);
      storageService.saveServicos(atualizados);
      void excluirServicoRemoto(config, nome).then((res) => {
        setErroSincronizacao(res.success ? null : `serviço não excluído para os clientes: ${res.message}`);
      });
    }
  };

  // Cancel Appointment with client WhatsApp notification option
  const handleCancelarAgendamento = (ag: Agendamento) => {
    if (window.confirm(`Deseja realmente cancelar o agendamento de ${ag.cliente_nome}?`)) {
      storageService.atualizarAgendamento(ag.id, { status: 'cancelado' });
      enviarAgendamentoRemoto(ag.id);
      atualizarListaAgendamentos();

      if (ag.status !== 'bloqueado' && ag.cliente_telefone !== '-') {
        const msg = `Olá, ${ag.cliente_nome}! Seu agendamento na ${config.nome} para ${formatarDataBR(ag.inicio)} às ${formatarHora(ag.inicio)} foi cancelado. Se desejar remarcar, entre em contato ou acesse nosso link!`;
        const linkWhats = linkWhatsapp(ag.cliente_telefone, msg);
        setAvisoAcao({
          texto: `Agendamento de ${ag.cliente_nome} cancelado.`,
          linkWhats,
        });
      }
    }
  };

  // Open Reschedule Modal
  const handleAbrirRemarcar = (ag: Agendamento) => {
    const dataInicial = dataLocalDeISO(ag.inicio);
    setModalRemarcar(ag);
    setRemarcarData(dataInicial);
    setRemarcarHora(formatarHora(ag.inicio));
    const slots = storageService.getHorariosDisponiveis(dataInicial, ag.duracao_total_minutos || 30);
    setHorariosRemarcar(slots);
  };

  // Change date in Reschedule Modal
  const handleMudarDataRemarcar = (novaData: string) => {
    setRemarcarData(novaData);
    if (modalRemarcar) {
      const slots = storageService.getHorariosDisponiveis(novaData, modalRemarcar.duracao_total_minutos || 30);
      setHorariosRemarcar(slots);
      if (slots.length > 0) {
        setRemarcarHora(slots[0]);
      }
    }
  };

  // Confirm Reschedule
  const handleConfirmarRemarcar = () => {
    if (!modalRemarcar || !remarcarData || !remarcarHora) return;
    const duracao = modalRemarcar.duracao_total_minutos || 30;
    const inicio = `${remarcarData}T${remarcarHora}:00`;
    const fim = new Date(new Date(inicio).getTime() + duracao * 60000).toISOString();

    storageService.atualizarAgendamento(modalRemarcar.id, {
      inicio: new Date(inicio).toISOString(),
      fim,
      status: 'confirmado',
    });

    enviarAgendamentoRemoto(modalRemarcar.id);
    atualizarListaAgendamentos();

    if (modalRemarcar.cliente_telefone !== '-') {
      const msg = `Olá, ${modalRemarcar.cliente_nome}! ✅ Seu agendamento na ${config.nome} foi remarcado para ${formatarDataBR(remarcarData)} às ${remarcarHora}. Te esperamos!`;
      const linkWhats = linkWhatsapp(modalRemarcar.cliente_telefone, msg);
      setAvisoAcao({
        texto: `Horário de ${modalRemarcar.cliente_nome} remarcado para ${formatarDataBR(remarcarData)} às ${remarcarHora}.`,
        linkWhats,
      });
    }

    setModalRemarcar(null);
  };

  // Editar os serviços de um agendamento (cliente pediu algo diferente do contratado)
  const paraNumero = (texto: string) => Number(texto.replace(',', '.')) || 0;
  const numeroParaTexto = (valor: number) => Math.max(0, valor).toFixed(2).replace('.', ',');

  const handleAbrirServicos = (ag: Agendamento) => {
    setModalServicos(ag);
    setServicosEdit([...ag.servicos]);
    setPrecoEdit(numeroParaTexto(Number(ag.preco_total) || 0));
    setDuracaoEdit(ag.duracao_total_minutos || 30);
    setAvulsoNome('');
    setAvulsoPreco('');
    setAvulsoMinutos('0');
  };

  // Marcar/desmarcar um serviço ajusta o valor e a duração; os campos continuam editáveis à mão
  const handleAlternarServicoEdit = (nome: string) => {
    const tem = servicosEdit.includes(nome);
    const sinal = tem ? -1 : 1;
    const cadastrado = servicos.find((s) => s.nome === nome);
    setServicosEdit(tem ? servicosEdit.filter((n) => n !== nome) : [...servicosEdit, nome]);
    if (cadastrado) {
      setPrecoEdit(numeroParaTexto(paraNumero(precoEdit) + sinal * Number(cadastrado.preco)));
      setDuracaoEdit((d) => Math.max(15, d + sinal * cadastrado.duracao_minutos));
    }
  };

  const handleAdicionarAvulso = () => {
    const nome = avulsoNome.trim();
    if (!nome || servicosEdit.includes(nome)) return;
    setServicosEdit([...servicosEdit, nome]);
    setPrecoEdit(numeroParaTexto(paraNumero(precoEdit) + paraNumero(avulsoPreco)));
    setDuracaoEdit((d) => Math.max(15, d + (Number(avulsoMinutos) || 0)));
    setAvulsoNome('');
    setAvulsoPreco('');
    setAvulsoMinutos('0');
  };

  // Outro agendamento que passa a ser invadido pelo novo término
  const conflitoServicos = modalServicos
    ? (() => {
        const ini = new Date(modalServicos.inicio).getTime();
        const fim = ini + duracaoEdit * 60000;
        return agendamentos.find(
          (a) =>
            a.id !== modalServicos.id &&
            a.status !== 'cancelado' &&
            new Date(a.inicio).getTime() < fim &&
            new Date(a.fim).getTime() > ini
        );
      })()
    : undefined;

  const handleSalvarServicos = () => {
    if (!modalServicos || servicosEdit.length === 0) return;
    const inicio = new Date(modalServicos.inicio);
    const fim = new Date(inicio.getTime() + duracaoEdit * 60000).toISOString();
    const preco = paraNumero(precoEdit);

    storageService.atualizarAgendamento(modalServicos.id, {
      servicos: servicosEdit,
      preco_total: preco,
      duracao_total_minutos: duracaoEdit,
      fim,
    });
    enviarAgendamentoRemoto(modalServicos.id);
    atualizarListaAgendamentos();
    setAvisoAcao({
      texto: `Serviços de ${modalServicos.cliente_nome} atualizados: ${servicosEdit.join(', ')} (${formatarPreco(preco)}).`,
    });
    setModalServicos(null);
  };

  // Send WhatsApp Reminder
  const handleEnviarLembreteWhats = (ag: Agendamento) => {
    const msg = `Olá, ${ag.cliente_nome}! 💈 Lembramos do seu horário agendado hoje às ${formatarHora(ag.inicio)} na ${config.nome}.\n\n✂️ Serviços: ${ag.servicos.join(', ')}\n📍 Endereço: ${config.endereco}\n\nAguardamos você!`;
    window.open(linkWhatsapp(ag.cliente_telefone, msg), '_blank');
  };

  // Concluir e Dar Baixa no Pagamento
  const handleConfirmarBaixaPagamento = () => {
    if (!modalPagamento) return;
    storageService.marcarConcluido(modalPagamento.id, formaEscolhida);
    enviarAgendamentoRemoto(modalPagamento.id);
    atualizarListaAgendamentos();
    setModalPagamento(null);
  };

  // Create Block Period
  const handleCriarBloqueio = (e: React.FormEvent) => {
    e.preventDefault();
    const bloqueio = storageService.bloquearHorario(bloqueioData, bloqueioInicio, bloqueioFim, bloqueioMotivo);
    enviarAgendamentoRemoto(bloqueio.id);
    atualizarListaAgendamentos();
    setModalBloqueio(false);
  };

  // Test Supabase Connection
  const handleTestarSupabase = async () => {
    setStatusSupabase({ loading: true, message: null, success: null });
    const res = await testSupabaseConnection(formData.supabase_url, formData.supabase_anon_key);
    setStatusSupabase({ loading: false, message: res.message, success: res.success });
  };

  // Simulate Telegram Notification
  const handleSimularTelegram = () => {
    const texto =
      `📅 <b>Novo agendamento! (Simulação do Bot)</b>\n\n` +
      `👤 João Pereira\n` +
      `📞 (35) 99888-7766\n` +
      `✂️ Corte + Barba\n` +
      `🗓️ ${formatarDataBR(new Date().toISOString())} às 15:00\n` +
      `💰 R$ 55,00\n\n` +
      `Comandos disponíveis: /agenda, /faturamento, /precos`;

    setSimulacaoNotif(texto);
  };

  // Generate Cloudflare Worker Code
  const gerarCodigoWorker = () => {
    return `// ========================================================
// CÓDIGO ATUALIZADO DO CLOUDFLARE WORKER
// Barbearia: ${formData.nome}
// Endereço: ${formData.endereco}
// Horário de Funcionamento: ${formData.hora_abertura} às ${formData.hora_fechamento}
// ========================================================

const NOME_BARBEARIA = ${JSON.stringify(formData.nome)};
const ENDERECO_BARBEARIA = ${JSON.stringify(formData.endereco)};
const SUPABASE_URL = ${JSON.stringify(formData.supabase_url)};
const SUPABASE_ANON_KEY = ${JSON.stringify(formData.supabase_anon_key)};

// Serviços:
${servicos.map((s) => `// • ${s.nome}: R$ ${s.preco.toFixed(2)} (${s.duracao_minutos} min)`).join('\n')}

export default {
  async fetch(request, env) {
    return new Response('Allan Caymi Barbearia - Operacional', { status: 200 });
  }
};`;
  };

  // Filtered appointments for agenda view
  const agendamentosFiltrados = agendamentos.filter(
    (a) => dataLocalDeISO(a.inicio) === dataAgenda
  );

  // Caixa calculations
  const caixaDiario = storageService.getCaixaDiario(dataCaixaDiario);
  const caixaSemanal = storageService.getCaixaSemanal();
  const caixaMensal = storageService.getCaixaMensal(mesCaixa);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner Navigation with Logout button */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#3a2f27] bg-[#221c18] p-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-oswald text-xl font-bold uppercase tracking-wider text-[#e3b976]">
              Painel do Barbeiro
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
              Autenticado
            </span>
          </div>
          <p className="text-xs text-[#b9ac9c]">
            Gerencie caixa diário, semanal e mensal, ações da agenda, serviços e preços.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onVoltarAgendamento}
            className="rounded-xl border border-[#cf9b56] bg-[#cf9b56]/15 px-3 py-1.5 text-xs font-semibold text-[#e3b976] transition-all hover:bg-[#cf9b56] hover:text-[#121010]"
          >
            ← Ir para o Site
          </button>
          {onDeslogarAdmin && (
            <button
              type="button"
              onClick={onDeslogarAdmin}
              className="flex items-center gap-1 rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900 hover:text-white"
              title="Bloquear Painel"
            >
              <LogOut className="h-3.5 w-3.5" />
              Bloquear
            </button>
          )}
        </div>
      </div>

      {!erroSincronizacao && ultimaSincronizacao && (
        <p className="text-[11px] text-[#b9ac9c]">Sincronizado com os clientes às {ultimaSincronizacao}</p>
      )}

      {erroSincronizacao && (
        <div className="rounded-xl border border-red-800 bg-red-950/60 p-3 text-xs text-red-200">
          Atenção: nem tudo foi enviado aos clientes. Os horários que você bloqueou ou alterou podem estar só neste
          computador. Tentando de novo a cada 30s. Motivo: {erroSincronizacao}
        </div>
      )}

      {/* Action feedback alert (e.g. after cancel/reschedule with WhatsApp button) */}
      {avisoAcao && (
        <div className="flex items-center justify-between rounded-xl border border-[#cf9b56] bg-[#2a1e15] p-3 text-xs text-[#f3ece3] shadow-md animate-fadeIn">
          <span>{avisoAcao.texto}</span>
          <div className="flex items-center gap-2">
            {avisoAcao.linkWhats && (
              <a
                href={avisoAcao.linkWhats}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg bg-[#25d366] px-2.5 py-1 text-xs font-bold text-[#0b1b12] hover:brightness-105"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Avisar no WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => setAvisoAcao(null)}
              className="p-1 text-[#b9ac9c] hover:text-[#f3ece3]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-1 scrollbar-gold gap-2 border-b border-[#3a2f27]">
        {[
          { id: 'agenda', label: '📅 Agenda & Ações' },
          { id: 'caixa', label: '💰 Caixa (D/S/M)' },
          { id: 'planos', label: '💳 Plano Mensal' },
          { id: 'servicos', label: '✂️ Serviços & Preços' },
          { id: 'dados', label: '⚙️ Barbearia & Horários' },
          { id: 'telegram', label: '🤖 Telegram & Banco' },
          { id: 'exportar', label: '📋 Exportar Código' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAbaAtiva(tab.id as any)}
            className={`font-oswald shrink-0 rounded-t-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              abaAtiva === tab.id
                ? 'border-t-2 border-x border-b-0 border-[#cf9b56] bg-[#221c18] text-[#e3b976] shadow'
                : 'text-[#b9ac9c] hover:bg-[#1c1815] hover:text-[#f3ece3]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* ABA 1: AGENDA & AÇÕES */}
      {/* ======================================================== */}
      {abaAtiva === 'agenda' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#cf9b56]" />
              <input
                type="date"
                value={dataAgenda}
                onChange={(e) => setDataAgenda(e.target.value)}
                className="rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-1.5 text-xs font-semibold text-[#f3ece3] outline-none focus:border-[#cf9b56]"
              />
              <span className="text-xs text-[#b9ac9c]">
                {formatarDataBR(dataAgenda)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setModalBloqueio(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[#cf9b56] bg-[#cf9b56]/15 px-3 py-1.5 text-xs font-semibold text-[#e3b976] hover:bg-[#cf9b56] hover:text-[#121010]"
            >
              <Lock className="h-3.5 w-3.5" />
              Bloquear Horário / Almoço
            </button>
          </div>

          {agendamentosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#3a2f27] bg-[#221c18]/50 p-8 text-center">
              <Calendar className="mx-auto h-8 w-8 text-[#b9ac9c]/50 mb-2" />
              <p className="text-sm text-[#b9ac9c]">
                Nenhum agendamento ou bloqueio para {formatarDataBR(dataAgenda)}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {agendamentosFiltrados.map((ag) => {
                const cancelado = ag.status === 'cancelado';
                const bloqueado = ag.status === 'bloqueado';
                const concluido = ag.status === 'concluido' || ag.pago;

                return (
                  <div
                    key={ag.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 transition-all shadow-md ${
                      cancelado
                        ? 'border-red-950 bg-red-950/20 opacity-50'
                        : bloqueado
                        ? 'border-amber-900/60 bg-amber-950/20'
                        : concluido
                        ? 'border-emerald-900/60 bg-emerald-950/15'
                        : 'border-[#3a2f27] bg-[#221c18]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center justify-center rounded-lg bg-[#1c1815] px-3 py-2 border border-[#3a2f27]">
                        <span className="font-oswald text-sm font-bold text-[#e3b976]">
                          {formatarHora(ag.inicio)}
                        </span>
                        <span className="text-[10px] text-[#b9ac9c]">
                          até {formatarHora(ag.fim)}
                        </span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-oswald text-base font-semibold text-[#f3ece3]">
                            {ag.cliente_nome}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              cancelado
                                ? 'bg-red-900/60 text-red-200'
                                : bloqueado
                                ? 'bg-amber-900/60 text-amber-200'
                                : concluido
                                ? 'bg-emerald-900/60 text-emerald-200'
                                : 'bg-[#cf9b56]/20 text-[#e3b976] border border-[#cf9b56]/40'
                            }`}
                          >
                            {concluido ? `Concluído (${ag.forma_pagamento || 'Pago'})` : ag.status}
                          </span>
                        </div>

                        {!bloqueado && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#b9ac9c]">
                            <span className="font-medium text-[#f3ece3]">{ag.cliente_telefone}</span>
                            <span>•</span>
                            <span>{ag.servicos.join(', ')}</span>
                            <span>•</span>
                            <span className="font-bold text-[#e3b976]">
                              {formatarPreco(ag.preco_total)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações da Agenda */}
                    {!cancelado && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#3a2f27]">
                        {!bloqueado && (
                          <>
                            {/* Botão de WhatsApp / Lembrete */}
                            <button
                              type="button"
                              onClick={() => handleEnviarLembreteWhats(ag)}
                              className="flex items-center gap-1 rounded-lg bg-[#25d366]/20 border border-[#25d366]/50 px-2.5 py-1.5 text-xs font-semibold text-[#6bbf8a] hover:bg-[#25d366] hover:text-[#0b1b12] transition-colors"
                              title="Enviar lembrete do horário no WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Lembrete
                            </button>

                            {/* Botão de Concluir / Baixa no Pagamento */}
                            <button
                              type="button"
                              onClick={() => {
                                setModalPagamento(ag);
                                setFormaEscolhida(ag.forma_pagamento && ag.forma_pagamento !== 'Pendente' ? ag.forma_pagamento : 'Pix');
                              }}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                concluido
                                  ? 'border border-emerald-700 bg-emerald-900/40 text-emerald-200'
                                  : 'bg-[#cf9b56] text-[#121010] hover:brightness-110'
                              }`}
                              title="Marcar como atendido e registrar forma de pagamento"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              {concluido ? 'Editar Pagamento' : 'Concluir & Caixa'}
                            </button>

                            {/* Botão de Alterar Serviços */}
                            <button
                              type="button"
                              onClick={() => handleAbrirServicos(ag)}
                              className="rounded-lg border border-[#3a2f27] px-2.5 py-1.5 text-xs text-[#b9ac9c] hover:border-[#cf9b56] hover:text-[#f3ece3]"
                              title="Mudar os serviços e o valor deste agendamento"
                            >
                              Serviços
                            </button>

                            {/* Botão de Remarcar */}
                            <button
                              type="button"
                              onClick={() => handleAbrirRemarcar(ag)}
                              className="rounded-lg border border-[#3a2f27] px-2.5 py-1.5 text-xs text-[#b9ac9c] hover:border-[#cf9b56] hover:text-[#f3ece3]"
                              title="Trocar data ou horário"
                            >
                              Remarcar
                            </button>
                          </>
                        )}

                        {/* Botão de Cancelar */}
                        <button
                          type="button"
                          onClick={() => handleCancelarAgendamento(ag)}
                          className="rounded-lg border border-red-900/60 bg-red-950/40 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-900 hover:text-white"
                          title="Cancelar agendamento ou desbloquear"
                        >
                          {bloqueado ? 'Desbloquear' : 'Cancelar'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal Dar Baixa / Concluir Pagamento */}
          {modalPagamento && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-sm rounded-2xl border border-[#cf9b56] bg-[#221c18] p-5 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#3a2f27]">
                  <h4 className="font-oswald text-base font-bold uppercase text-[#e3b976]">
                    Registrar Atendimento no Caixa
                  </h4>
                  <button
                    type="button"
                    onClick={() => setModalPagamento(null)}
                    className="text-[#b9ac9c] hover:text-[#f3ece3]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 text-xs text-[#f3ece3] space-y-2">
                  <p>
                    Cliente: <strong className="text-[#e3b976]">{modalPagamento.cliente_nome}</strong>
                  </p>
                  <p>
                    Serviço: <strong>{modalPagamento.servicos.join(', ')}</strong>
                  </p>
                  <p className="font-bold text-sm text-[#e3b976]">
                    Valor Total: {formatarPreco(modalPagamento.preco_total)}
                  </p>

                  <label className="mt-3 block text-xs text-[#b9ac9c]">
                    Forma de Pagamento Recebida:
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(['Pix', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'] as FormaPagamento[]).map((forma) => (
                      <button
                        key={forma}
                        type="button"
                        onClick={() => setFormaEscolhida(forma)}
                        className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition-all ${
                          formaEscolhida === forma
                            ? 'border-[#cf9b56] bg-[#cf9b56] text-[#121010] shadow'
                            : 'border-[#3a2f27] bg-[#1c1815] text-[#b9ac9c] hover:border-[#cf9b56]'
                        }`}
                      >
                        {forma}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-[#3a2f27]">
                    <button
                      type="button"
                      onClick={() => setModalPagamento(null)}
                      className="rounded-xl border border-[#3a2f27] px-3 py-1.5 text-xs text-[#b9ac9c]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmarBaixaPagamento}
                      className="rounded-xl bg-[#cf9b56] px-4 py-1.5 text-xs font-bold text-[#121010] shadow hover:brightness-110"
                    >
                      Salvar no Caixa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Alterar Serviços do Agendamento */}
          {modalServicos && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
              <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-[#cf9b56] bg-[#221c18] p-5 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#3a2f27]">
                  <h4 className="font-oswald text-base font-bold uppercase text-[#e3b976]">
                    Serviços: {modalServicos.cliente_nome}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setModalServicos(null)}
                    className="text-[#b9ac9c] hover:text-[#f3ece3]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-3 text-xs">
                  <div>
                    <label className="text-[#b9ac9c]">Serviços realizados</label>
                    <div className="mt-1 flex flex-col gap-1.5">
                      {[
                        ...servicos.filter((s) => s.ativo !== false).map((s) => s.nome),
                        ...servicosEdit.filter((n) => !servicos.some((s) => s.ativo !== false && s.nome === n)),
                      ].map((nome) => {
                        const marcado = servicosEdit.includes(nome);
                        const cadastrado = servicos.find((s) => s.nome === nome);
                        return (
                          <label
                            key={nome}
                            className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 transition-colors ${
                              marcado
                                ? 'border-[#cf9b56] bg-[#cf9b56]/15 text-[#f3ece3]'
                                : 'border-[#3a2f27] bg-[#1c1815] text-[#b9ac9c]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={marcado}
                                onChange={() => handleAlternarServicoEdit(nome)}
                                className="h-4 w-4 rounded accent-[#cf9b56]"
                              />
                              {nome}
                            </span>
                            {cadastrado && (
                              <span className="text-[#e3b976]">{formatarPreco(Number(cadastrado.preco))}</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#3a2f27] bg-[#1c1815] p-3">
                    <label className="text-[#b9ac9c]">Outro serviço (avulso)</label>
                    <input
                      type="text"
                      value={avulsoNome}
                      onChange={(e) => setAvulsoNome(e.target.value)}
                      placeholder="Ex: Pigmentação"
                      className="mt-1 w-full rounded-lg border border-[#3a2f27] bg-[#221c18] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={avulsoPreco}
                        onChange={(e) => setAvulsoPreco(e.target.value)}
                        placeholder="Valor (R$)"
                        className="rounded-lg border border-[#3a2f27] bg-[#221c18] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                      />
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={avulsoMinutos}
                        onChange={(e) => setAvulsoMinutos(e.target.value)}
                        placeholder="Minutos"
                        className="rounded-lg border border-[#3a2f27] bg-[#221c18] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!avulsoNome.trim()}
                      onClick={handleAdicionarAvulso}
                      className="mt-2 w-full rounded-lg border border-[#cf9b56] py-1.5 font-semibold text-[#e3b976] hover:bg-[#cf9b56]/15 disabled:opacity-40"
                    >
                      Adicionar serviço avulso
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#b9ac9c]">Valor total (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={precoEdit}
                        onChange={(e) => setPrecoEdit(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                      />
                    </div>
                    <div>
                      <label className="text-[#b9ac9c]">Duração (min)</label>
                      <input
                        type="number"
                        min={15}
                        step={5}
                        value={duracaoEdit}
                        onChange={(e) => setDuracaoEdit(Math.max(15, Number(e.target.value) || 15))}
                        className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                      />
                    </div>
                  </div>

                  <p className="text-[#b9ac9c]">
                    Termina às{' '}
                    <strong className="text-[#f3ece3]">
                      {formatarHora(new Date(new Date(modalServicos.inicio).getTime() + duracaoEdit * 60000).toISOString())}
                    </strong>
                  </p>

                  {conflitoServicos && (
                    <p className="rounded-lg border border-amber-700 bg-amber-950/50 p-2 text-amber-200">
                      Atenção: esse término invade o horário de {conflitoServicos.cliente_nome} (
                      {formatarHora(conflitoServicos.inicio)}). Você ainda pode salvar.
                    </p>
                  )}

                  <div className="mt-1 flex justify-end gap-2 pt-2 border-t border-[#3a2f27]">
                    <button
                      type="button"
                      onClick={() => setModalServicos(null)}
                      className="rounded-xl border border-[#3a2f27] px-3 py-1.5 font-semibold text-[#b9ac9c]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={servicosEdit.length === 0}
                      onClick={handleSalvarServicos}
                      className="rounded-xl bg-[#cf9b56] px-3 py-1.5 font-bold text-[#121010] disabled:opacity-50"
                    >
                      Salvar Serviços
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Remarcar */}
          {modalRemarcar && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-sm rounded-2xl border border-[#cf9b56] bg-[#221c18] p-5 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#3a2f27]">
                  <h4 className="font-oswald text-base font-bold uppercase text-[#e3b976]">
                    Remarcar: {modalRemarcar.cliente_nome}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setModalRemarcar(null)}
                    className="text-[#b9ac9c] hover:text-[#f3ece3]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-3 text-xs">
                  <div>
                    <label className="text-[#b9ac9c]">Escolha a Nova Data</label>
                    <input
                      type="date"
                      value={remarcarData}
                      onChange={(e) => handleMudarDataRemarcar(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                    />
                  </div>

                  <div>
                    <label className="text-[#b9ac9c]">Horários Livres para {formatarDataBR(remarcarData)}</label>
                    {horariosRemarcar.length === 0 ? (
                      <p className="mt-1 rounded-lg border border-dashed border-[#6f4426] p-2 text-center text-xs text-[#e3b976]">
                        Sem horários vagos neste dia. Escolha outra data.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5 mt-1 max-h-36 overflow-y-auto pr-1">
                        {horariosRemarcar.map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setRemarcarHora(h)}
                            className={`rounded-lg border py-1.5 text-center font-oswald text-xs font-semibold ${
                              remarcarHora === h
                                ? 'border-[#cf9b56] bg-[#cf9b56] text-[#121010]'
                                : 'border-[#3a2f27] bg-[#1c1815] text-[#f3ece3]'
                            }`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex justify-end gap-2 pt-2 border-t border-[#3a2f27]">
                    <button
                      type="button"
                      onClick={() => setModalRemarcar(null)}
                      className="rounded-xl border border-[#3a2f27] px-3 py-1.5 font-semibold text-[#b9ac9c]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!remarcarHora}
                      onClick={handleConfirmarRemarcar}
                      className="rounded-xl bg-[#cf9b56] px-3 py-1.5 font-bold text-[#121010] disabled:opacity-50"
                    >
                      Salvar Remarcação
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Bloquear Horário */}
          {modalBloqueio && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-sm rounded-2xl border border-[#cf9b56] bg-[#221c18] p-5 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#3a2f27]">
                  <h4 className="font-oswald text-base font-bold uppercase text-[#e3b976]">
                    Bloquear Horário na Agenda
                  </h4>
                  <button
                    type="button"
                    onClick={() => setModalBloqueio(false)}
                    className="text-[#b9ac9c] hover:text-[#f3ece3]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleCriarBloqueio} className="mt-3 flex flex-col gap-3 text-xs">
                  <div>
                    <label className="text-[#b9ac9c]">Motivo do Bloqueio</label>
                    <input
                      type="text"
                      value={bloqueioMotivo}
                      onChange={(e) => setBloqueioMotivo(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                    />
                  </div>

                  <div>
                    <label className="text-[#b9ac9c]">Data</label>
                    <input
                      type="date"
                      value={bloqueioData}
                      onChange={(e) => setBloqueioData(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#b9ac9c]">Hora Inicial</label>
                      <input
                        type="time"
                        value={bloqueioInicio}
                        onChange={(e) => setBloqueioInicio(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                      />
                    </div>
                    <div>
                      <label className="text-[#b9ac9c]">Hora Final</label>
                      <input
                        type="time"
                        value={bloqueioFim}
                        onChange={(e) => setBloqueioFim(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalBloqueio(false)}
                      className="rounded-xl border border-[#3a2f27] px-3 py-1.5 font-semibold text-[#b9ac9c]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-[#cf9b56] px-3 py-1.5 font-bold text-[#121010]"
                    >
                      Salvar Bloqueio
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: CAIXA DIÁRIO, SEMANAL E MENSAL */}
      {/* ======================================================== */}
      {abaAtiva === 'caixa' && (
        <div className="flex flex-col gap-4">
          {/* Sub-Tabs do Caixa */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#1c1815] p-1 border border-[#3a2f27] w-fit max-w-full">
            <button
              type="button"
              onClick={() => setSubAbaCaixa('diario')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                subAbaCaixa === 'diario'
                  ? 'bg-[#cf9b56] text-[#121010] shadow'
                  : 'text-[#b9ac9c] hover:text-[#f3ece3]'
              }`}
            >
              📅 Caixa Diário
            </button>
            <button
              type="button"
              onClick={() => setSubAbaCaixa('semanal')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                subAbaCaixa === 'semanal'
                  ? 'bg-[#cf9b56] text-[#121010] shadow'
                  : 'text-[#b9ac9c] hover:text-[#f3ece3]'
              }`}
            >
              📊 Caixa Semanal
            </button>
            <button
              type="button"
              onClick={() => setSubAbaCaixa('mensal')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                subAbaCaixa === 'mensal'
                  ? 'bg-[#cf9b56] text-[#121010] shadow'
                  : 'text-[#b9ac9c] hover:text-[#f3ece3]'
              }`}
            >
              💼 Caixa Mensal
            </button>
            <button
              type="button"
              onClick={() => setSubAbaCaixa('desempenho')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                subAbaCaixa === 'desempenho'
                  ? 'bg-[#cf9b56] text-[#121010] shadow'
                  : 'text-[#b9ac9c] hover:text-[#f3ece3]'
              }`}
            >
              📈 Desempenho
            </button>
          </div>

          {/* DESEMPENHO */}
          {subAbaCaixa === 'desempenho' && <PerformanceChart />}

          {/* CAIXA DIÁRIO */}
          {subAbaCaixa === 'diario' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#b9ac9c]">Data do Caixa:</span>
                  <input
                    type="date"
                    value={dataCaixaDiario}
                    onChange={(e) => setDataCaixaDiario(e.target.value)}
                    className="rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-1.5 text-xs font-semibold text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                  />
                </div>
              </div>

              {/* Cards de Resumo do Dia */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3.5">
                  <span className="text-[11px] text-emerald-400 font-semibold uppercase">Total Recebido</span>
                  <p className="font-oswald text-2xl font-bold text-emerald-300 mt-1">
                    {formatarPreco(caixaDiario.totalEntradas)}
                  </p>
                  <span className="text-[10px] text-emerald-400/80">
                    {caixaDiario.concluidos} atendimentos pagos
                  </span>
                </div>

                <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3.5">
                  <span className="text-[11px] text-amber-400 font-semibold uppercase">Pendente / A Receber</span>
                  <p className="font-oswald text-2xl font-bold text-amber-300 mt-1">
                    {formatarPreco(caixaDiario.totalPendente)}
                  </p>
                  <span className="text-[10px] text-amber-400/80">
                    {caixaDiario.totalAgendamentos - caixaDiario.concluidos} a concluir
                  </span>
                </div>

                <div className="rounded-xl border border-[#3a2f27] bg-[#221c18] p-3.5">
                  <span className="text-[11px] text-[#b9ac9c] font-semibold uppercase">Previsão Total</span>
                  <p className="font-oswald text-2xl font-bold text-[#e3b976] mt-1">
                    {formatarPreco(caixaDiario.totalGeral)}
                  </p>
                  <span className="text-[10px] text-[#b9ac9c]">
                    {caixaDiario.totalAgendamentos} cortes agendados
                  </span>
                </div>

                <div className="rounded-xl border border-[#3a2f27] bg-[#221c18] p-3.5">
                  <span className="text-[11px] text-[#b9ac9c] font-semibold uppercase">Ticket Médio</span>
                  <p className="font-oswald text-2xl font-bold text-[#f3ece3] mt-1">
                    {formatarPreco(caixaDiario.concluidos > 0 ? caixaDiario.totalEntradas / caixaDiario.concluidos : 0)}
                  </p>
                  <span className="text-[10px] text-[#b9ac9c]">por cliente</span>
                </div>
              </div>

              {/* Detalhamento por Forma de Pagamento */}
              <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-4 shadow-lg">
                <h4 className="font-oswald text-sm font-semibold uppercase text-[#e3b976] mb-3">
                  Entradas por Forma de Pagamento no Dia
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-[#1c1815] p-3 border border-[#3a2f27]">
                    <QrCode className="h-5 w-5 text-teal-400" />
                    <div>
                      <span className="text-[10px] text-[#b9ac9c] block">Pix</span>
                      <strong className="text-xs text-[#f3ece3]">{formatarPreco(caixaDiario.porForma['Pix'] || 0)}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-[#1c1815] p-3 border border-[#3a2f27]">
                    <Banknote className="h-5 w-5 text-emerald-400" />
                    <div>
                      <span className="text-[10px] text-[#b9ac9c] block">Dinheiro</span>
                      <strong className="text-xs text-[#f3ece3]">{formatarPreco(caixaDiario.porForma['Dinheiro'] || 0)}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-[#1c1815] p-3 border border-[#3a2f27]">
                    <CreditCard className="h-5 w-5 text-sky-400" />
                    <div>
                      <span className="text-[10px] text-[#b9ac9c] block">Débito</span>
                      <strong className="text-xs text-[#f3ece3]">{formatarPreco(caixaDiario.porForma['Cartão de Débito'] || 0)}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-[#1c1815] p-3 border border-[#3a2f27]">
                    <CreditCard className="h-5 w-5 text-purple-400" />
                    <div>
                      <span className="text-[10px] text-[#b9ac9c] block">Crédito</span>
                      <strong className="text-xs text-[#f3ece3]">{formatarPreco(caixaDiario.porForma['Cartão de Crédito'] || 0)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Atendimentos do Dia com Baixa */}
              <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-4 shadow-lg space-y-2">
                <h4 className="font-oswald text-sm font-semibold uppercase text-[#f3ece3] mb-2">
                  Atendimentos do Dia ({caixaDiario.itens.length})
                </h4>

                {caixaDiario.itens.length === 0 ? (
                  <p className="text-xs text-[#b9ac9c] text-center py-4">Nenhum atendimento registrado nesta data.</p>
                ) : (
                  caixaDiario.itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-[#1c1815] p-3 border border-[#3a2f27]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-oswald font-bold text-xs text-[#e3b976]">
                          {formatarHora(item.inicio)}
                        </span>
                        <div>
                          <strong className="text-xs text-[#f3ece3] block">{item.cliente_nome}</strong>
                          <span className="text-[10px] text-[#b9ac9c]">
                            {item.servicos.join(', ')} • {item.forma_pagamento || 'Pendente'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-[#e3b976] font-oswald">
                          {formatarPreco(item.preco_total)}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            setModalPagamento(item);
                            setFormaEscolhida(item.forma_pagamento && item.forma_pagamento !== 'Pendente' ? item.forma_pagamento : 'Pix');
                          }}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                            item.pago
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                              : 'bg-[#cf9b56] text-[#121010]'
                          }`}
                        >
                          {item.pago ? 'Pago ✓' : 'Dar Baixa'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* CAIXA SEMANAL */}
          {subAbaCaixa === 'semanal' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#3a2f27] bg-[#221c18] p-4">
                  <span className="text-xs text-[#b9ac9c] uppercase font-semibold">Total da Semana</span>
                  <p className="font-oswald mt-1 text-2xl font-bold text-[#e3b976]">
                    {formatarPreco(caixaSemanal.totalSemanal)}
                  </p>
                  <span className="text-[10px] text-[#b9ac9c]">últimos 7 dias</span>
                </div>

                <div className="rounded-xl border border-[#3a2f27] bg-[#221c18] p-4">
                  <span className="text-xs text-[#b9ac9c] uppercase font-semibold">Atendimentos</span>
                  <p className="font-oswald mt-1 text-2xl font-bold text-[#f3ece3]">
                    {caixaSemanal.qtdSemanal}
                  </p>
                  <span className="text-[10px] text-[#b9ac9c]">cortes realizados</span>
                </div>

                <div className="rounded-xl border border-[#3a2f27] bg-[#221c18] p-4">
                  <span className="text-xs text-[#b9ac9c] uppercase font-semibold">Ticket Médio</span>
                  <p className="font-oswald mt-1 text-2xl font-bold text-emerald-400">
                    {formatarPreco(caixaSemanal.ticketMedio)}
                  </p>
                  <span className="text-[10px] text-[#b9ac9c]">por atendimento</span>
                </div>
              </div>

              {/* Gráfico de Barras dos 7 Dias */}
              <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg">
                <h4 className="font-oswald text-sm font-semibold uppercase text-[#e3b976] mb-4">
                  Faturamento Diário nos Últimos 7 Dias
                </h4>

                <div className="flex items-end justify-between gap-2 h-44 pt-6 pb-2 px-2">
                  {caixaSemanal.dias.map((d) => {
                    const maxVal = Math.max(...caixaSemanal.dias.map((item) => item.total), 100);
                    const percent = Math.min(100, Math.max(8, (d.total / maxVal) * 100));

                    return (
                      <div key={d.data} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="text-[10px] font-bold text-[#e3b976] font-oswald">
                          {d.total > 0 ? `R$${Math.round(d.total)}` : ''}
                        </span>
                        <div
                          className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-[#6f4426] to-[#cf9b56] transition-all"
                          style={{ height: `${percent}%` }}
                        />
                        <span className="text-[10px] font-semibold text-[#b9ac9c] uppercase">
                          {d.diaSemana}
                        </span>
                        <span className="text-[9px] text-[#b9ac9c]/70">
                          {d.data.slice(8, 10)}/{d.data.slice(5, 7)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CAIXA MENSAL */}
          {subAbaCaixa === 'mensal' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#b9ac9c]">Mês de Referência:</span>
                  <input
                    type="month"
                    value={mesCaixa}
                    onChange={(e) => setMesCaixa(e.target.value)}
                    className="rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-1.5 text-xs font-semibold text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4">
                  <span className="text-xs text-emerald-400 font-semibold uppercase">Faturamento Mensal</span>
                  <p className="font-oswald mt-1 text-2xl font-bold text-emerald-300">
                    {formatarPreco(caixaMensal.totalMensal)}
                  </p>
                  <span className="text-[10px] text-emerald-400/80">
                    {caixaMensal.concluidos} atendimentos pagos
                  </span>
                </div>

                <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
                  <span className="text-xs text-amber-400 font-semibold uppercase">Pendente no Mês</span>
                  <p className="font-oswald mt-1 text-2xl font-bold text-amber-300">
                    {formatarPreco(caixaMensal.totalPendente)}
                  </p>
                  <span className="text-[10px] text-amber-400/80">a receber</span>
                </div>

                <div className="rounded-xl border border-[#3a2f27] bg-[#221c18] p-4">
                  <span className="text-xs text-[#b9ac9c] uppercase font-semibold">Total Agendamentos</span>
                  <p className="font-oswald mt-1 text-2xl font-bold text-[#e3b976]">
                    {caixaMensal.totalAgendamentos}
                  </p>
                  <span className="text-[10px] text-[#b9ac9c]">no mês selecionado</span>
                </div>

                <div className="rounded-xl border border-[#3a2f27] bg-[#221c18] p-4">
                  <span className="text-xs text-[#b9ac9c] uppercase font-semibold">Ticket Médio Mensal</span>
                  <p className="font-oswald mt-1 text-2xl font-bold text-[#f3ece3]">
                    {formatarPreco(caixaMensal.ticketMedio)}
                  </p>
                  <span className="text-[10px] text-[#b9ac9c]">por atendimento</span>
                </div>
              </div>

              {/* Formas de Pagamento no Mês */}
              <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-4 shadow-lg">
                <h4 className="font-oswald text-sm font-semibold uppercase text-[#e3b976] mb-3">
                  Distribuição das Formas de Pagamento
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(caixaMensal.formasPagamento).map(([forma, valor]) => (
                    <div key={forma} className="rounded-xl bg-[#1c1815] p-3 border border-[#3a2f27]">
                      <span className="text-[11px] text-[#b9ac9c] block">{forma}</span>
                      <strong className="text-sm font-oswald text-[#e3b976]">{formatarPreco(valor)}</strong>
                      <span className="text-[10px] text-[#b9ac9c]/70 block mt-0.5">
                        {caixaMensal.totalMensal > 0
                          ? `${Math.round((valor / caixaMensal.totalMensal) * 100)}% do faturamento`
                          : '0%'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranking dos Serviços no Mês */}
              <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-4 shadow-lg space-y-3">
                <h4 className="font-oswald text-sm font-semibold uppercase text-[#f3ece3]">
                  Serviços Mais Lucrativos no Mês
                </h4>
                {caixaMensal.ranking.length === 0 ? (
                  <p className="text-xs text-[#b9ac9c]">Nenhum serviço realizado neste mês.</p>
                ) : (
                  caixaMensal.ranking.map((s) => (
                    <div key={s.nome}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-[#f3ece3]">{s.nome}</span>
                        <span className="text-[#e3b976] font-bold">
                          {s.quantidade}x ({formatarPreco(s.valor)})
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#1c1815] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#6f4426] to-[#cf9b56] rounded-full"
                          style={{
                            width: `${Math.min(100, (s.valor / (caixaMensal.totalMensal || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: SERVIÇOS & PREÇOS */}
      {/* ======================================================== */}
      {abaAtiva === 'planos' && <PlanoMensal config={config} />}

      {abaAtiva === 'servicos' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-oswald text-base font-semibold uppercase text-[#f3ece3]">
              Serviços Cadastrados ({servicos.length})
            </h3>
            <button
              type="button"
              onClick={() => setNovoServicoModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#cf9b56] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#121010] shadow transition-all hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Adicionar Serviço
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {servicos.map((servico) => {
              const editando = servicoEditando === servico.nome;
              return (
                <div
                  key={servico.id || servico.nome}
                  className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                    servico.ativo !== false
                      ? 'border-[#3a2f27] bg-[#221c18]'
                      : 'border-[#3a2f27]/50 bg-[#1c1815]/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{servico.icone || '✂️'}</span>
                      <div>
                        <h4 className="font-oswald text-base font-semibold text-[#f3ece3]">
                          {servico.nome}
                        </h4>
                        <span className="text-[11px] text-[#b9ac9c]">
                          {servico.ativo !== false ? '✅ Ativo no cardápio' : '❌ Inativo'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setServicoEditando(servico.nome);
                          setPrecoEditado(servico.preco);
                          setDuracaoEditada(servico.duracao_minutos);
                        }}
                        className="rounded-lg p-1.5 text-[#b9ac9c] transition-colors hover:bg-[#3a2f27] hover:text-[#e3b976]"
                        title="Editar Preço e Duração"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleServico(servico.nome)}
                        className="rounded-lg p-1.5 text-[#b9ac9c] transition-colors hover:bg-[#3a2f27] hover:text-[#e3b976]"
                        title={servico.ativo !== false ? 'Desativar serviço' : 'Ativar serviço'}
                      >
                        {servico.ativo !== false ? (
                          <Unlock className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Lock className="h-4 w-4 text-amber-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluirServico(servico.nome)}
                        className="rounded-lg p-1.5 text-[#b9ac9c] transition-colors hover:bg-red-950 hover:text-red-400"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {servico.descricao && (
                    <p className="mt-2 text-xs text-[#b9ac9c] line-clamp-2">
                      {servico.descricao}
                    </p>
                  )}

                  {/* Preço e Duração ou Formulário de Edição */}
                  <div className="mt-3 border-t border-[#3a2f27] pt-2.5">
                    {editando ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-[#b9ac9c]">Preço (R$)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={precoEditado}
                              onChange={(e) => setPrecoEditado(Number(e.target.value))}
                              className="w-full rounded-lg border border-[#cf9b56] bg-[#1c1815] px-2.5 py-1 text-xs text-[#f3ece3] outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#b9ac9c]">Duração (min)</label>
                            <input
                              type="number"
                              step="5"
                              value={duracaoEditada}
                              onChange={(e) => setDuracaoEditada(Number(e.target.value))}
                              className="w-full rounded-lg border border-[#cf9b56] bg-[#1c1815] px-2.5 py-1 text-xs text-[#f3ece3] outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setServicoEditando(null)}
                            className="rounded-lg border border-[#3a2f27] px-2.5 py-1 text-xs text-[#b9ac9c]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSalvarEdicaoServico(servico.nome)}
                            className="flex items-center gap-1 rounded-lg bg-[#cf9b56] px-2.5 py-1 text-xs font-semibold text-[#121010]"
                          >
                            <Check className="h-3 w-3" />
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-[#b9ac9c]">
                          <Clock className="h-3.5 w-3.5 text-[#cf9b56]" />
                          {servico.duracao_minutos} minutos
                        </span>
                        <span className="font-oswald text-base font-bold text-[#e3b976]">
                          {formatarPreco(servico.preco)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Adicionar Serviço */}
          {novoServicoModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-md rounded-2xl border border-[#cf9b56] bg-[#221c18] p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#3a2f27]">
                  <h3 className="font-oswald text-lg font-bold uppercase text-[#e3b976]">
                    Adicionar Novo Serviço
                  </h3>
                  <button
                    type="button"
                    onClick={() => setNovoServicoModal(false)}
                    className="text-[#b9ac9c] hover:text-[#f3ece3]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleAdicionarServico} className="mt-4 flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-[#b9ac9c]">Nome do Serviço</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Barba Terapia, Pigmentação…"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-[#b9ac9c]">Preço (R$)</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={novoPreco}
                        onChange={(e) => setNovoPreco(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#b9ac9c]">Duração (min)</label>
                      <input
                        type="number"
                        step="5"
                        required
                        value={novaDuracao}
                        onChange={(e) => setNovaDuracao(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#b9ac9c]">Ícone</label>
                      <select
                        value={novoIcone}
                        onChange={(e) => setNovoIcone(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-2 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                      >
                        <option value="✂️">✂️ Tesoura</option>
                        <option value="🪒">🪒 Navalha</option>
                        <option value="💈">💈 Barber Pole</option>
                        <option value="👨🏽‍🦱">👨🏽‍🦱 Sobrancelha</option>
                        <option value="🧴">🧴 Tratamento</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#b9ac9c]">Descrição (opcional)</label>
                    <textarea
                      rows={2}
                      placeholder="Detalhes sobre o que está incluído no serviço…"
                      value={novaDescricao}
                      onChange={(e) => setNovaDescricao(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                    />
                  </div>

                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNovoServicoModal(false)}
                      className="rounded-xl border border-[#3a2f27] px-4 py-2 text-xs font-semibold text-[#b9ac9c]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-[#cf9b56] px-4 py-2 text-xs font-bold text-[#121010] shadow hover:brightness-110"
                    >
                      Cadastrar Serviço
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: DADOS DA BARBEARIA & HORÁRIOS */}
      {/* ======================================================== */}
      {abaAtiva === 'dados' && (
        <form onSubmit={handleSalvarConfig} className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg space-y-4">
            <h3 className="font-oswald text-base font-semibold uppercase text-[#e3b976]">
              Informações Gerais da Barbearia
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-[#b9ac9c]">Nome da Barbearia</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                />
              </div>

              <div>
                <label className="text-xs text-[#b9ac9c]">Slogan / Subtítulo</label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-[#b9ac9c]">Endereço Completo (para Google Maps e Confirmação)</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                />
              </div>

              <div>
                <label className="text-xs text-[#b9ac9c]">WhatsApp de Contato</label>
                <input
                  type="text"
                  value={formData.telefone_whatsapp}
                  onChange={(e) => setFormData({ ...formData, telefone_whatsapp: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg space-y-4">
            <h3 className="font-oswald text-base font-semibold uppercase text-[#e3b976]">
              Horário de Funcionamento, Almoço & Folgas
            </h3>
            <p className="text-[11px] text-[#b9ac9c]">
              Defina cada dia da semana. Dia desmarcado = folga (o cliente não consegue agendar). O almoço bloqueia os
              horários automaticamente.
            </p>

            <div className="max-w-[12rem]">
              <label className="text-xs text-[#b9ac9c]">Intervalo da grade</label>
              <select
                value={formData.intervalo_minutos}
                onChange={(e) => setFormData({ ...formData, intervalo_minutos: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-2 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos</option>
              </select>
            </div>

            <div className="flex flex-col gap-2.5">
              {(() => {
                const semana = semanaDaConfig(formData);
                const nomesDias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                const alterarDia = (dia: number, mudanca: Partial<HorarioDia>) =>
                  setFormData({
                    ...formData,
                    horarios_semana: semana.map((d, i) => (i === dia ? { ...d, ...mudanca } : d)),
                  });
                const copiarParaTodos = (dia: number) =>
                  setFormData({
                    ...formData,
                    horarios_semana: semana.map((d, i) => (i === dia ? d : { ...semana[dia], aberto: d.aberto })),
                  });
                const campo =
                  'w-full rounded-lg border border-[#3a2f27] bg-[#221c18] px-2 py-1.5 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]';

                return semana.map((d, dia) => (
                  <div
                    key={dia}
                    className={`rounded-xl border p-3 ${
                      d.aberto ? 'border-[#3a2f27] bg-[#1c1815]' : 'border-[#3a2f27]/60 bg-[#1c1815]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#f3ece3]">
                        <input
                          type="checkbox"
                          checked={d.aberto}
                          onChange={(e) => alterarDia(dia, { aberto: e.target.checked })}
                          className="h-4 w-4 rounded accent-[#cf9b56]"
                        />
                        {nomesDias[dia]}
                        {!d.aberto && <span className="text-[11px] font-normal text-[#b9ac9c]">Folga</span>}
                      </label>
                      {d.aberto && (
                        <button
                          type="button"
                          onClick={() => copiarParaTodos(dia)}
                          className="text-[11px] text-[#e3b976] underline-offset-2 hover:underline"
                          title="Aplica o horário e o almoço deste dia aos outros dias (os dias de folga continuam de folga)"
                        >
                          Copiar para os outros dias
                        </button>
                      )}
                    </div>

                    {d.aberto && (
                      <div className="mt-2.5 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-[#b9ac9c]">Abertura</label>
                            <input
                              type="time"
                              value={d.abertura}
                              onChange={(e) => alterarDia(dia, { abertura: e.target.value })}
                              className={campo}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-[#b9ac9c]">Fechamento</label>
                            <input
                              type="time"
                              value={d.fechamento}
                              onChange={(e) => alterarDia(dia, { fechamento: e.target.value })}
                              className={campo}
                            />
                          </div>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 text-xs text-[#b9ac9c]">
                          <input
                            type="checkbox"
                            checked={d.pausa_almoco}
                            onChange={(e) => alterarDia(dia, { pausa_almoco: e.target.checked })}
                            className="h-4 w-4 rounded accent-[#cf9b56]"
                          />
                          🍽️ Pausa de almoço / folga no meio do dia
                        </label>

                        {d.pausa_almoco && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-[#b9ac9c]">Início da pausa</label>
                              <input
                                type="time"
                                value={d.almoco_inicio}
                                onChange={(e) => alterarDia(dia, { almoco_inicio: e.target.value })}
                                className={campo}
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-[#b9ac9c]">Fim da pausa</label>
                              <input
                                type="time"
                                value={d.almoco_fim}
                                onChange={(e) => alterarDia(dia, { almoco_fim: e.target.value })}
                                className={campo}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Banner Promocional do App */}
          <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-oswald text-base font-semibold uppercase text-[#e3b976]">
                Banner do App Parceiro (LiveMaker)
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#b9ac9c]">
                <input
                  type="checkbox"
                  checked={formData.exibir_promo_app}
                  onChange={(e) => setFormData({ ...formData, exibir_promo_app: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#cf9b56]"
                />
                Exibir banner no topo
              </label>
            </div>

            {formData.exibir_promo_app && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-[#b9ac9c]">Título do App</label>
                  <input
                    type="text"
                    value={formData.promo_app_nome}
                    onChange={(e) => setFormData({ ...formData, promo_app_nome: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#b9ac9c]">Badge</label>
                  <input
                    type="text"
                    value={formData.promo_app_badge}
                    onChange={(e) => setFormData({ ...formData, promo_app_badge: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#b9ac9c]">Descrição</label>
                  <input
                    type="text"
                    value={formData.promo_app_desc}
                    onChange={(e) => setFormData({ ...formData, promo_app_desc: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#b9ac9c]">Link Google Play / Download</label>
                  <input
                    type="text"
                    value={formData.promo_app_url}
                    onChange={(e) => setFormData({ ...formData, promo_app_url: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            {mensagemSalvo && (
              <span className="text-xs font-semibold text-emerald-400 animate-fadeIn">
                ✅ Alterações salvas com sucesso!
              </span>
            )}
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-[#cf9b56] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#121010] shadow-lg transition-all hover:brightness-110"
            >
              <Save className="h-4 w-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* ABA 5: TELEGRAM & BANCO SUPABASE */}
      {/* ======================================================== */}
      {abaAtiva === 'telegram' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#cf9b56]" />
                <h3 className="font-oswald text-base font-semibold uppercase text-[#e3b976]">
                  Notificações via Telegram
                </h3>
              </div>
              <button
                type="button"
                onClick={handleSimularTelegram}
                className="flex items-center gap-1 rounded-lg border border-[#cf9b56] px-3 py-1 text-xs font-semibold text-[#e3b976] hover:bg-[#cf9b56] hover:text-[#121010]"
              >
                <Send className="h-3 w-3" />
                Testar Notificação
              </button>
            </div>

            <p className="text-xs text-[#b9ac9c]">
              O bot avisa instantaneamente no seu celular a cada novo corte agendado com os comandos <code className="text-[#e3b976]">/agenda</code>, <code className="text-[#e3b976]">/cancelar</code> ou <code className="text-[#e3b976]">/faturamento</code>.
            </p>

            {simulacaoNotif && (
              <div className="mt-3 rounded-xl border border-sky-800 bg-[#15232d] p-3.5 text-xs text-sky-100 font-mono whitespace-pre-wrap">
                <div dangerouslySetInnerHTML={{ __html: simulacaoNotif }} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-[#cf9b56]" />
                <h3 className="font-oswald text-base font-semibold uppercase text-[#e3b976]">
                  Conexão Supabase
                </h3>
              </div>

              <button
                type="button"
                disabled={statusSupabase.loading}
                onClick={handleTestarSupabase}
                className="rounded-lg border border-[#3a2f27] bg-[#1c1815] px-3 py-1.5 text-xs font-semibold text-[#f3ece3] hover:border-[#cf9b56] disabled:opacity-50"
              >
                {statusSupabase.loading ? 'Testando…' : 'Testar Conexão'}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[#b9ac9c]">Supabase Project URL</label>
                <input
                  type="text"
                  value={formData.supabase_url}
                  onChange={(e) => setFormData({ ...formData, supabase_url: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 font-mono text-[11px] text-[#f3ece3] outline-none"
                />
              </div>

              <div>
                <label className="text-[#b9ac9c]">Supabase Anon Key</label>
                <input
                  type="password"
                  value={formData.supabase_anon_key}
                  onChange={(e) => setFormData({ ...formData, supabase_anon_key: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 font-mono text-[11px] text-[#f3ece3] outline-none"
                />
              </div>
            </div>

            {statusSupabase.message && (
              <div
                className={`rounded-xl p-3 text-xs ${
                  statusSupabase.success
                    ? 'border border-emerald-800 bg-emerald-950/40 text-emerald-200'
                    : 'border border-red-800 bg-red-950/40 text-red-200'
                }`}
              >
                {statusSupabase.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 6: EXPORTAR CÓDIGO */}
      {/* ======================================================== */}
      {abaAtiva === 'exportar' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-oswald text-base font-semibold uppercase text-[#e3b976]">
              Código Pronto com suas Alterações
            </h3>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(gerarCodigoWorker());
                setCodigoCopiado(true);
                setTimeout(() => setCodigoCopiado(false), 2500);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-[#cf9b56] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#121010] shadow hover:brightness-110"
            >
              {codigoCopiado ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {codigoCopiado ? 'Copiado!' : 'Copiar Código'}
            </button>
          </div>

          <p className="text-xs text-[#b9ac9c]">
            Código atualizado com novos preços, horários de abertura e fechamento configurados.
          </p>

          <pre className="overflow-x-auto rounded-2xl border border-[#3a2f27] bg-[#121010] p-4 text-[11px] font-mono text-[#e3b976] leading-relaxed shadow-inner">
            {gerarCodigoWorker()}
          </pre>
        </div>
      )}
    </div>
  );
};
