import React, { useState } from 'react';
import { Smartphone, ChevronRight } from 'lucide-react';
import { ConfiguracoesBarbearia } from '../types';
import { ICONE_APP_PARCEIRO } from '../constants/assets';

interface PromoBannerProps {
  config: ConfiguracoesBarbearia;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ config }) => {
  const [iconeFalhou, setIconeFalhou] = useState(false);

  if (!config.exibir_promo_app) return null;

  return (
    <a
      href={config.promo_app_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3.5 rounded-xl border border-[#cf9b56] bg-gradient-to-r from-[#6f4426]/35 to-[#221c18]/90 p-3.5 text-decoration-none shadow-md transition-all hover:-translate-y-0.5 hover:border-[#e3b976]"
    >
      {iconeFalhou ? (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#cf9b56] to-[#6f4426] shadow-md">
          <Smartphone className="h-6 w-6 text-[#121010]" />
        </div>
      ) : (
        <img
          src={ICONE_APP_PARCEIRO}
          alt={config.promo_app_nome}
          onError={() => setIconeFalhou(true)}
          className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-md"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-oswald text-base font-bold text-[#e3b976]">
            {config.promo_app_nome}
          </span>
          <span className="rounded-full bg-[#cf9b56] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#121010]">
            {config.promo_app_badge}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[#b9ac9c] line-clamp-2 leading-relaxed">
          {config.promo_app_desc}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-[#cf9b56] transition-transform group-hover:translate-x-1" />
    </a>
  );
};
