import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ExternalLink,
  MessageCircle,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Servico, ConfiguracoesBarbearia } from '../types';
import { storageService } from '../services/storage';
import { linkWhatsapp } from '../utils/whatsapp';
import { dataLocalISO } from '../utils/datas';
import { enviarAvisoAgendamento } from '../services/supabaseService';

interface BookingFlowProps {
  config: ConfiguracoesBarbearia;
  servicos: Servico[];
  onAgendamentoCriado?: () => void;
}

export const BookingFlow: React.FC<BookingFlowProps> = ({ config, servicos, onAgendamentoCriado }) => {
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<string>('');
  const [horaSelecionada, setHoraSelecionada] = useState<string>('');
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Success state & popup
  const [sucesso, setSucesso] = useState<{
    nome: string;
    telefone: string;
    servicos: string[];
    data: string;
    hora: string;
    precoTotal: number;
    duracaoTotal: number;
  } | null>(null);

  const [popupAberto, setPopupAberto] = useState(false);

  const carrosselRef = useRef<HTMLDivElement>(null);

  // Define default date range (today up to 30 days ahead)
  const hojeStr = dataLocalISO();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = dataLocalISO(maxDate);

  // Load saved client name and phone from localStorage
  useEffect(() => {
    const salvo = storageService.getClienteSalvo();
    if (salvo) {
      if (salvo.nome) setNome(salvo.nome);
      if (salvo.telefone) setTelefone(salvo.telefone);
    }
  }, []);

  // Update available times whenever selected date or selected services change
  useEffect(() => {
    if (!dataSelecionada || servicosSelecionados.length === 0) {
      setHorariosDisponiveis([]);
      setHoraSelecionada('');
      return;
    }

    setCarregandoHorarios(true);
    const duracaoTotal = duracaoTotalSelecionada();

    // Small delay to simulate smooth loading
    const timer = setTimeout(() => {
      const slots = storageService.getHorariosDisponiveis(dataSelecionada, duracaoTotal);
      setHorariosDisponiveis(slots);
      setCarregandoHorarios(false);

      // If previously selected time is not in the new slots, clear it
      if (horaSelecionada && !slots.includes(horaSelecionada)) {
        setHoraSelecionada('');
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [dataSelecionada, servicosSelecionados]);

  // Helpers
  const toggleServico = (nomeServico: string) => {
    setServicosSelecionados((prev) =>
      prev.includes(nomeServico)
        ? prev.filter((s) => s !== nomeServico)
        : [...prev, nomeServico]
    );
  };

  const duracaoTotalSelecionada = (): number => {
    return servicos
      .filter((s) => servicosSelecionados.includes(s.nome))
      .reduce((acc, s) => acc + s.duracao_minutos, 0);
  };

  const precoTotalSelecionado = (): number => {
    return servicos
      .filter((s) => servicosSelecionados.includes(s.nome))
      .reduce((acc, s) => acc + Number(s.preco), 0);
  };

  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarDuracao = (minutos: number): string => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${String(m).padStart(2, '0')}`;
  };

  const formatarDataBR = (dataISO: string): string => {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const scrollCarrossel = (direcao: 'esq' | 'dir') => {
    if (carrosselRef.current) {
      const scrollAmount = direcao === 'esq' ? -200 : 200;
      carrosselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const contarDigitos = (str: string): number => {
    return str.replace(/\D/g, '').length;
  };

  const formularioValido =
    servicosSelecionados.length > 0 &&
    Boolean(dataSelecionada) &&
    Boolean(horaSelecionada) &&
    nome.trim().length >= 2 &&
    contarDigitos(telefone) >= 8;

  // Confirm appointment
  const handleConfirmar = () => {
    if (!formularioValido || enviando) return;

    setErro(null);
    setEnviando(true);

    try {
      const duracao = duracaoTotalSelecionada();
      const preco = precoTotalSelecionado();

      const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
      const [hora, minuto] = horaSelecionada.split(':').map(Number);

      const inicioDate = new Date(ano, mes - 1, dia, hora, minuto, 0);
      const fimDate = new Date(inicioDate.getTime() + duracao * 60000);

      // Save appointment locally
      const novoAg = storageService.criarAgendamento({
        cliente_nome: nome.trim(),
        cliente_telefone: telefone.trim(),
        inicio: inicioDate.toISOString(),
        fim: fimDate.toISOString(),
        servicos: servicosSelecionados,
        preco_total: preco,
        duracao_total_minutos: duracao,
        status: 'confirmado',
      });

      // Aviso no Telegram do barbeiro (não bloqueia a confirmação)
      void enviarAvisoAgendamento(config, novoAg);

      // Save client details for future bookings
      storageService.salvarCliente(nome.trim(), telefone.trim());

      // Save last appointment details for reminder
      storageService.salvarUltimoAgendamentoCliente({
        id: novoAg.id,
        nome: nome.trim(),
        telefone: telefone.trim(),
        data: dataSelecionada,
        hora: horaSelecionada,
        servicos: servicosSelecionados,
        precoTotal: preco,
        duracaoTotal: duracao,
        criadoEm: new Date().toISOString(),
      });

      setSucesso({
        nome: nome.trim(),
        telefone: telefone.trim(),
        servicos: servicosSelecionados,
        data: dataSelecionada,
        hora: horaSelecionada,
        precoTotal: preco,
        duracaoTotal: duracao,
      });

      setPopupAberto(true);
      if (onAgendamentoCriado) onAgendamentoCriado();
    } catch (err: any) {
      setErro(err.message || 'Erro ao confirmar agendamento. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  // WhatsApp link creation
  const getWhatsappUrl = () => {
    if (!sucesso) return '#';
    const mensagem =
      `Olá, ${sucesso.nome}! ✅ Seu agendamento na ${config.nome} foi confirmado:\n\n` +
      `✂️ ${sucesso.servicos.join(', ')}\n` +
      `🗓️ ${formatarDataBR(sucesso.data)} às ${sucesso.hora}\n` +
      `📍 ${config.endereco}\n\n` +
      `Até lá!`;

    return linkWhatsapp(sucesso.telefone, mensagem);
  };

  const mapaEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(config.endereco)}&output=embed`;
  const mapaLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.endereco)}`;

  return (
    <div className="flex flex-col gap-5">
      {/* SEÇÃO 1: Escolha dos Serviços */}
      <section className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg">
        <h2 className="font-oswald flex items-center gap-2.5 text-lg font-semibold uppercase tracking-wider text-[#f3ece3]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#cf9b56] text-xs font-bold text-[#121010]">
            1
          </span>
          Escolha os serviços
        </h2>
        <p className="mt-1 text-xs text-[#b9ac9c]">
          Toque para selecionar um ou mais serviços desejados:
        </p>

        <div className="relative mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollCarrossel('esq')}
            aria-label="Anterior"
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#3a2f27] bg-[#1c1815] text-[#e3b976] shadow transition-colors hover:border-[#cf9b56]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={carrosselRef}
            className="scrollbar-gold flex flex-1 gap-3.5 overflow-x-auto pb-2 scroll-smooth"
          >
            {servicos
              .filter((s) => s.ativo !== false)
              .map((servico) => {
                const selecionado = servicosSelecionados.includes(servico.nome);
                return (
                  <button
                    key={servico.id || servico.nome}
                    type="button"
                    onClick={() => toggleServico(servico.nome)}
                    className={`relative flex w-36 shrink-0 flex-col items-center rounded-xl border p-4 text-center transition-all ${
                      selecionado
                        ? 'border-[#cf9b56] bg-[#cf9b56]/15 shadow-md ring-1 ring-[#cf9b56]'
                        : 'border-[#3a2f27] bg-[#1c1815] hover:-translate-y-0.5 hover:border-[#6f4426]'
                    }`}
                  >
                    {selecionado && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#cf9b56] text-[#121010] shadow">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                    <span className="text-3xl mb-1.5">{servico.icone || '✂️'}</span>
                    <span className="font-oswald text-sm font-semibold text-[#f3ece3] leading-tight">
                      {servico.nome}
                    </span>
                    <span className="mt-1 text-[11px] text-[#b9ac9c]">
                      {formatarDuracao(servico.duracao_minutos)}
                    </span>
                    <span className="font-oswald mt-2 text-base font-bold text-[#e3b976]">
                      {formatarPreco(servico.preco)}
                    </span>
                  </button>
                );
              })}
          </div>

          <button
            type="button"
            onClick={() => scrollCarrossel('dir')}
            aria-label="Próximo"
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#3a2f27] bg-[#1c1815] text-[#e3b976] shadow transition-colors hover:border-[#cf9b56]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* SEÇÃO 2: Escolha do Dia */}
      <section className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg">
        <h2 className="font-oswald flex items-center gap-2.5 text-lg font-semibold uppercase tracking-wider text-[#f3ece3]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#cf9b56] text-xs font-bold text-[#121010]">
            2
          </span>
          Escolha o dia
        </h2>

        {/* Quick Date Buttons */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setDataSelecionada(hojeStr)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              dataSelecionada === hojeStr
                ? 'border-[#cf9b56] bg-[#cf9b56] text-[#121010]'
                : 'border-[#3a2f27] bg-[#1c1815] text-[#b9ac9c] hover:border-[#cf9b56]'
            }`}
          >
            Hoje ({formatarDataBR(hojeStr).slice(0, 5)})
          </button>

          {(() => {
            const amanhad = new Date();
            amanhad.setDate(amanhad.getDate() + 1);
            const amanhaStr = dataLocalISO(amanhad);
            return (
              <button
                type="button"
                onClick={() => setDataSelecionada(amanhaStr)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  dataSelecionada === amanhaStr
                    ? 'border-[#cf9b56] bg-[#cf9b56] text-[#121010]'
                    : 'border-[#3a2f27] bg-[#1c1815] text-[#b9ac9c] hover:border-[#cf9b56]'
                }`}
              >
                Amanhã ({formatarDataBR(amanhaStr).slice(0, 5)})
              </button>
            );
          })()}
        </div>

        <div className="mt-3 relative">
          <input
            type="date"
            value={dataSelecionada}
            min={hojeStr}
            max={maxDateStr}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-4 py-3 text-sm text-[#f3ece3] outline-none transition-colors focus:border-[#cf9b56]"
          />
        </div>
      </section>

      {/* SEÇÃO 3: Escolha do Horário */}
      <section className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg">
        <h2 className="font-oswald flex items-center gap-2.5 text-lg font-semibold uppercase tracking-wider text-[#f3ece3]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#cf9b56] text-xs font-bold text-[#121010]">
            3
          </span>
          Escolha o horário
        </h2>

        <div className="mt-3.5">
          {servicosSelecionados.length === 0 || !dataSelecionada ? (
            <p className="rounded-xl border border-dashed border-[#3a2f27] bg-[#1c1815]/50 p-4 text-center text-xs text-[#b9ac9c]">
              Selecione pelo menos um serviço e um dia para visualizar os horários disponíveis.
            </p>
          ) : carregandoHorarios ? (
            <p className="p-4 text-center text-xs text-[#b9ac9c] animate-pulse">
              Consultando horários livres…
            </p>
          ) : horariosDisponiveis.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#6f4426] bg-[#1c1815]/50 p-4 text-center text-xs text-[#e3b976]">
              Nenhum horário livre para essa data ou os horários já foram preenchidos. Tente outra data.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {horariosDisponiveis.map((hora) => {
                const selecionado = horaSelecionada === hora;
                return (
                  <button
                    key={hora}
                    type="button"
                    onClick={() => setHoraSelecionada(hora)}
                    className={`font-oswald rounded-lg border py-2.5 text-center text-sm font-semibold transition-all ${
                      selecionado
                        ? 'border-[#cf9b56] bg-[#cf9b56] text-[#121010] shadow-md'
                        : 'border-[#3a2f27] bg-[#1c1815] text-[#f3ece3] hover:border-[#cf9b56] hover:text-[#e3b976]'
                    }`}
                  >
                    {hora}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO 4: Seus Dados */}
      <section className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg">
        <h2 className="font-oswald flex items-center gap-2.5 text-lg font-semibold uppercase tracking-wider text-[#f3ece3]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#cf9b56] text-xs font-bold text-[#121010]">
            4
          </span>
          Seus dados
        </h2>

        <div className="mt-3.5 flex flex-col gap-3">
          {nome && telefone && (
            <div className="flex items-center gap-2 rounded-xl border border-[#cf9b56]/40 bg-[#cf9b56]/10 px-3 py-2 text-xs text-[#e3b976]">
              <Sparkles className="h-4 w-4 shrink-0 text-[#cf9b56]" />
              <span>Lembramos dos seus dados do último agendamento. (Altere se desejar)</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-[#b9ac9c]">Nome completo</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cf9b56]" />
              <input
                type="text"
                placeholder="Ex: Carlos Oliveira"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] py-2.5 pr-4 pl-10 text-sm text-[#f3ece3] outline-none transition-colors focus:border-[#cf9b56]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#b9ac9c]">WhatsApp / Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cf9b56]" />
              <input
                type="tel"
                placeholder="Ex: (35) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] py-2.5 pr-4 pl-10 text-sm text-[#f3ece3] outline-none transition-colors focus:border-[#cf9b56]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* RESUMO & CONFIRMAÇÃO */}
      <section className="rounded-2xl border border-[#cf9b56] bg-[#221c18] p-5 shadow-xl">
        <h2 className="font-oswald text-lg font-semibold uppercase tracking-wider text-[#e3b976]">
          Resumo do agendamento
        </h2>

        <div className="mt-3 flex flex-col gap-2 divide-y divide-[#3a2f27] text-sm">
          {servicosSelecionados.length === 0 ? (
            <p className="py-2 text-xs text-[#b9ac9c]">Nenhum serviço selecionado ainda.</p>
          ) : (
            <div className="flex flex-col gap-1.5 pb-2">
              {servicos
                .filter((s) => servicosSelecionados.includes(s.nome))
                .map((s) => (
                  <div key={s.nome} className="flex justify-between text-xs text-[#f3ece3]">
                    <span>{s.nome}</span>
                    <span className="font-semibold text-[#e3b976]">{formatarPreco(s.preco)}</span>
                  </div>
                ))}
            </div>
          )}

          {dataSelecionada && (
            <div className="flex justify-between py-2 text-xs text-[#b9ac9c]">
              <span>Data</span>
              <span className="font-medium text-[#f3ece3]">{formatarDataBR(dataSelecionada)}</span>
            </div>
          )}

          {horaSelecionada && (
            <div className="flex justify-between py-2 text-xs text-[#b9ac9c]">
              <span>Horário</span>
              <span className="font-medium text-[#f3ece3]">{horaSelecionada}</span>
            </div>
          )}

          {servicosSelecionados.length > 0 && (
            <div className="flex justify-between py-2 text-xs text-[#b9ac9c]">
              <span>Duração estimada</span>
              <span className="font-medium text-[#f3ece3]">
                {formatarDuracao(duracaoTotalSelecionada())}
              </span>
            </div>
          )}

          {servicosSelecionados.length > 0 && (
            <div className="flex items-center justify-between pt-3 font-oswald text-xl font-bold text-[#e3b976]">
              <span>Total</span>
              <span>{formatarPreco(precoTotalSelecionado())}</span>
            </div>
          )}
        </div>

        {erro && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-950/60 border border-red-800 p-3 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{erro}</span>
          </div>
        )}

        <button
          type="button"
          disabled={!formularioValido || enviando}
          onClick={handleConfirmar}
          className="font-oswald mt-4 w-full rounded-xl bg-[#cf9b56] py-3.5 text-center text-base font-bold uppercase tracking-wider text-[#121010] shadow-lg transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? 'Confirmando…' : 'Confirmar Agendamento'}
        </button>
      </section>

      {/* MODAL POPUP DE SUCESSO & ENDEREÇO */}
      {popupAberto && sucesso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#cf9b56] bg-[#221c18] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setPopupAberto(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-[#b9ac9c] transition-colors hover:bg-[#3a2f27] hover:text-[#f3ece3]"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <h3 className="font-oswald mt-3 text-2xl font-bold uppercase text-emerald-400">
                Agendamento Confirmado!
              </h3>
              <p className="mt-1 text-xs text-[#b9ac9c]">
                Seu horário está garantido. Te esperamos no dia e hora marcados!
              </p>
            </div>

            {/* Resumo no card */}
            <div className="mt-4 rounded-xl border border-[#3a2f27] bg-[#1c1815] p-3.5 text-xs text-[#f3ece3] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#b9ac9c]">Cliente:</span>
                <span className="font-semibold">{sucesso.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#b9ac9c]">Serviço:</span>
                <span className="font-semibold text-right">{sucesso.servicos.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#b9ac9c]">Data e Hora:</span>
                <span className="font-semibold text-[#e3b976]">
                  {formatarDataBR(sucesso.data)} às {sucesso.hora}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#3a2f27] pt-1.5 font-bold">
                <span className="text-[#b9ac9c]">Valor:</span>
                <span className="text-[#e3b976]">{formatarPreco(sucesso.precoTotal)}</span>
              </div>
            </div>

            {/* Endereço & Mapa */}
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#e3b976]">
                <MapPin className="h-4 w-4 shrink-0 text-[#cf9b56]" />
                {config.endereco}
              </p>

              <iframe
                title="Localização da Barbearia"
                src={mapaEmbedUrl}
                className="mt-2.5 h-44 w-full rounded-xl border border-[#3a2f27]"
                loading="lazy"
              />

              <a
                href={mapaLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-oswald mt-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-[#cf9b56] py-2 text-xs font-semibold text-[#e3b976] transition-colors hover:bg-[#cf9b56]/15"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir no Google Maps
              </a>
            </div>

            {/* Ações */}
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={getWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="font-oswald flex items-center justify-center gap-2 rounded-xl bg-[#25d366] py-3 text-center text-sm font-bold uppercase tracking-wider text-[#0b1b12] shadow-md transition-all hover:brightness-105"
              >
                <MessageCircle className="h-4 w-4 fill-current" />
                Confirmar no WhatsApp
              </a>

              {/* Adicionar ao Google Agenda para o cliente ser lembrado */}
              {sucesso && (() => {
                const [a, m, d] = sucesso.data.split('-').map(Number);
                const [h, min] = sucesso.hora.split(':').map(Number);
                const dtIni = new Date(a, m - 1, d, h, min, 0);
                const calUrl = storageService.criarLinkGoogleAgenda(
                  `Allan Caymi Barbearia - ${sucesso.servicos.join(', ')}`,
                  dtIni,
                  sucesso.duracaoTotal,
                  config.endereco,
                  `Agendamento de ${sucesso.nome}. Serviços: ${sucesso.servicos.join(', ')}.`
                );
                return (
                  <a
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-oswald flex items-center justify-center gap-2 rounded-xl border border-[#cf9b56] py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[#e3b976] hover:bg-[#cf9b56]/15 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    Adicionar ao Google Agenda (Lembrete)
                  </a>
                );
              })()}

              <button
                type="button"
                onClick={() => {
                  setPopupAberto(false);
                  setServicosSelecionados([]);
                  setDataSelecionada('');
                  setHoraSelecionada('');
                  setSucesso(null);
                }}
                className="rounded-xl border border-[#3a2f27] py-2 text-xs font-semibold text-[#b9ac9c] transition-colors hover:text-[#f3ece3]"
              >
                Fazer outro agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
