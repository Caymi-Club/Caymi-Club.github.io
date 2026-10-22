import React, { useState } from 'react';
import { Clock, Calendar, MapPin, Check, Bell, ExternalLink, MessageCircle, X, Sparkles } from 'lucide-react';
import { UltimoAgendamentoCliente, ConfiguracoesBarbearia } from '../types';
import { storageService } from '../services/storage';

interface ActiveBookingReminderProps {
  lembrete: UltimoAgendamentoCliente;
  config: ConfiguracoesBarbearia;
  onDispensar: () => void;
}

export const ActiveBookingReminder: React.FC<ActiveBookingReminderProps> = ({
  lembrete,
  config,
  onDispensar,
}) => {
  const [notificacaoAtivada, setNotificacaoAtivada] = useState(lembrete.lembreteAtivado || false);
  const [mensagemNotif, setMensagemNotif] = useState<string | null>(null);

  const formatarDataBR = (dataISO: string) => {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const formatarPreco = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Link do Google Agenda
  const [ano, mes, dia] = lembrete.data.split('-').map(Number);
  const [hora, min] = lembrete.hora.split(':').map(Number);
  const dataInicio = new Date(ano, mes - 1, dia, hora, min, 0);

  const googleAgendaUrl = storageService.criarLinkGoogleAgenda(
    `Allan Caymi Barbearia - ${lembrete.servicos.join(', ')}`,
    dataInicio,
    lembrete.duracaoTotal,
    config.endereco,
    `Agendamento para ${lembrete.nome}. Serviços: ${lembrete.servicos.join(', ')}. Valor: ${formatarPreco(lembrete.precoTotal)}.`
  );

  // Link do WhatsApp
  let digitos = lembrete.telefone.replace(/\D/g, '').replace(/^0+/, '');
  if (digitos.length <= 11) digitos = '55' + digitos;

  const whatsappUrl = `https://wa.me/${digitos}?text=${encodeURIComponent(
    `Olá, ${lembrete.nome}! ✅ Lembrete do seu agendamento na ${config.nome}:\n\n` +
      `✂️ ${lembrete.servicos.join(', ')}\n` +
      `🗓️ ${formatarDataBR(lembrete.data)} às ${lembrete.hora}\n` +
      `📍 ${config.endereco}\n\n` +
      `Aguardamos você!`
  )}`;

  // Notificação do Navegador
  const handleAtivarLembreteNavegador = async () => {
    if (!('Notification' in window)) {
      setMensagemNotif('Seu navegador não suporta notificações locais.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificacaoAtivada(true);
        setMensagemNotif('🔔 Lembrete ativado no seu navegador com sucesso!');
        new Notification(`Lembrete: ${config.nome}`, {
          body: `Seu horário está agendado para ${formatarDataBR(lembrete.data)} às ${lembrete.hora}!`,
          icon: '/favicon.ico',
        });
        storageService.salvarUltimoAgendamentoCliente({
          ...lembrete,
          lembreteAtivado: true,
        });
      } else {
        setMensagemNotif('Permissão para notificações não foi autorizada.');
      }
    } catch {
      setMensagemNotif('Não foi possível ativar notificações.');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#cf9b56] bg-gradient-to-br from-[#2a1e15] to-[#1c1815] p-5 shadow-2xl">
      <button
        type="button"
        onClick={onDispensar}
        className="absolute top-3.5 right-3.5 rounded-full p-1 text-[#b9ac9c] transition-colors hover:bg-[#3a2f27] hover:text-[#f3ece3]"
        title="Dispensar lembrete"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#cf9b56] text-[#121010] shadow-md">
          <Clock className="h-6 w-6 stroke-[2.2]" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <span className="font-oswald text-xs font-bold uppercase tracking-wider text-[#cf9b56]">
              Seu Próximo Horário Agendado
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <h3 className="font-oswald mt-0.5 text-lg font-bold text-[#f3ece3] truncate">
            Olá, {lembrete.nome}!
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#b9ac9c]">
            <span className="flex items-center gap-1.5 font-semibold text-[#e3b976]">
              <Calendar className="h-3.5 w-3.5 text-[#cf9b56]" />
              {formatarDataBR(lembrete.data)} às {lembrete.hora}
            </span>
            <span>•</span>
            <span className="truncate">{lembrete.servicos.join(', ')}</span>
            <span>•</span>
            <span className="font-bold text-[#e3b976]">{formatarPreco(lembrete.precoTotal)}</span>
          </div>

          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#b9ac9c]/80 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-[#cf9b56]" />
            <span className="truncate">{config.endereco}</span>
          </div>

          {/* Ações para o cliente não esquecer o horário */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Adicionar ao Google Agenda */}
            <a
              href={googleAgendaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[#cf9b56] bg-[#cf9b56]/15 px-3 py-1.5 text-xs font-semibold text-[#e3b976] shadow-sm transition-all hover:bg-[#cf9b56] hover:text-[#121010]"
            >
              <Calendar className="h-3.5 w-3.5" />
              Adicionar ao Google Agenda
            </a>

            {/* Lembrete no WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-[#25d366]/20 border border-[#25d366]/60 px-3 py-1.5 text-xs font-semibold text-[#6bbf8a] transition-all hover:bg-[#25d366] hover:text-[#0b1b12]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Reenviar no WhatsApp
            </a>

            {/* Notificação do Navegador */}
            <button
              type="button"
              onClick={handleAtivarLembreteNavegador}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                notificacaoAtivada
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-[#3a2f27] bg-[#1c1815] text-[#b9ac9c] hover:border-[#cf9b56] hover:text-[#f3ece3]'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              {notificacaoAtivada ? 'Lembrete Ativo' : 'Ativar Lembrete'}
            </button>
          </div>

          {mensagemNotif && (
            <p className="mt-2 text-[11px] text-emerald-400 animate-fadeIn">
              {mensagemNotif}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
