import React from 'react';
import { Scissors, MapPin, Phone } from 'lucide-react';
import { ConfiguracoesBarbearia } from '../types';

interface HeaderProps {
  config: ConfiguracoesBarbearia;
  modoAtual: 'cliente' | 'admin';
  setModoAtual: (modo: 'cliente' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({ config, modoAtual, setModoAtual }) => {
  return (
    <header className="relative border-b-2 border-[#cf9b56] bg-gradient-to-b from-[#3b2a1e] via-[#1c1815] to-[#121010] px-4 pt-7 pb-6 text-center shadow-2xl">
      {/* Se o modo admin estiver ativo, exibe barra discreta no topo */}
      {modoAtual === 'admin' && (
        <div className="mx-auto mb-4 flex max-w-md items-center justify-between rounded-lg border border-[#cf9b56]/40 bg-[#cf9b56]/10 px-3 py-1.5 text-xs text-[#e3b976]">
          <span className="font-semibold">🛠️ Painel de Administração</span>
          <button
            type="button"
            onClick={() => setModoAtual('cliente')}
            className="rounded bg-[#cf9b56] px-2 py-0.5 text-[11px] font-bold text-[#121010] hover:brightness-110"
          >
            Sair do Painel
          </button>
        </div>
      )}

      <div className="mx-auto flex max-w-2xl flex-col items-center">
        {/* Emblem / Avatar Logo */}
        <div className="relative mb-3 flex h-24 w-24 items-center justify-center rounded-full border-3 border-[#cf9b56] bg-[#221c18] shadow-[0_6px_25px_rgba(0,0,0,0.65)] ring-4 ring-[#cf9b56]/20">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[#e3b976]">
              <Scissors className="h-6 w-6 stroke-[2.2]" />
            </div>
            <span className="font-oswald text-xs font-bold tracking-widest text-[#cf9b56]">
              BARBER
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#b9ac9c]">
              EST. 2020
            </span>
          </div>
        </div>

        {/* Title & Slogan */}
        <h1 className="font-oswald text-3xl font-bold uppercase tracking-wider text-[#e3b976] sm:text-4xl drop-shadow-md">
          {config.nome}
        </h1>
        <p className="mt-1 text-sm text-[#b9ac9c] sm:text-base font-medium">
          {config.slogan}
        </p>

        {/* Mini details: Address & Hours */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-[#b9ac9c]/90">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-[#cf9b56]" />
            {config.endereco}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5 text-[#cf9b56]" />
            {config.telefone_whatsapp}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="text-[#e3b976] font-semibold">
            {config.hora_abertura} às {config.hora_fechamento}
            {(config.pausa_almoco ?? true) && config.almoco_inicio && config.almoco_fim && (
              <span className="text-[#b9ac9c] font-normal ml-1">
                (Almoço: {config.almoco_inicio} - {config.almoco_fim})
              </span>
            )}
          </span>
        </div>
      </div>
    </header>
  );
};
