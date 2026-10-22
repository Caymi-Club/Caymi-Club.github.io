import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { storageService } from '../services/storage';

const PERIODOS = [7, 30, 90] as const;

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 48 };

const formatarPreco = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatarDataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// Arredonda o topo do eixo Y para um valor "redondo" (100, 200, 500, 1000...)
const topoDoEixo = (max: number) => {
  if (max <= 100) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const normalizado = max / magnitude;
  const passo = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
  return passo * magnitude;
};

export const PerformanceChart: React.FC = () => {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [hover, setHover] = useState<number | null>(null);

  const desempenho = useMemo(() => storageService.getDesempenho(dias), [dias]);
  const { serie, totais, totaisAnterior, variacao } = desempenho;

  const maxValor = topoDoEixo(Math.max(...serie.map((d) => d.recebido), 0));
  const larguraUtil = W - PAD.left - PAD.right;
  const alturaUtil = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (serie.length === 1 ? larguraUtil / 2 : (i / (serie.length - 1)) * larguraUtil);
  const y = (v: number) => PAD.top + alturaUtil - (v / maxValor) * alturaUtil;

  const pontos = serie.map((d, i) => `${x(i)},${y(d.recebido)}`);
  const linha = `M${pontos.join(' L')}`;
  const area = `${linha} L${x(serie.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const marcasY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxValor);
  const passoRotulo = dias === 7 ? 1 : dias === 30 ? 5 : 15;

  const aoMoverMouse = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.left) / larguraUtil) * (serie.length - 1));
    setHover(Math.min(serie.length - 1, Math.max(0, idx)));
  };

  const ponto = hover !== null ? serie[hover] : null;
  const semDados = totais.recebido === 0 && totais.pendente === 0;

  const Tendencia = variacao === null || variacao === 0 ? Minus : variacao > 0 ? TrendingUp : TrendingDown;
  const corTendencia = variacao === null || variacao === 0 ? 'text-[#b9ac9c]' : variacao > 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-[#3a2f27] bg-[#1c1815] p-1">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setDias(p);
                setHover(null);
              }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                dias === p ? 'bg-[#cf9b56] text-[#121010] shadow' : 'text-[#b9ac9c] hover:text-[#f3ece3]'
              }`}
            >
              {p} dias
            </button>
          ))}
        </div>
        <span className="text-[11px] text-[#b9ac9c]">
          {formatarDataCurta(serie[0].data)} a {formatarDataCurta(serie[serie.length - 1].data)}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3.5">
          <span className="text-[11px] text-emerald-400 font-semibold uppercase">Faturamento</span>
          <p className="font-oswald text-2xl font-bold text-emerald-300 mt-1">{formatarPreco(totais.recebido)}</p>
          <span className={`flex items-center gap-1 text-[10px] ${corTendencia}`}>
            <Tendencia className="h-3 w-3" />
            {variacao === null ? 'sem período anterior' : `${variacao > 0 ? '+' : ''}${variacao.toFixed(0)}% vs. período anterior`}
          </span>
        </div>

        <div className="rounded-xl border border-[#3a2f27] bg-[#221c18] p-3.5">
          <span className="text-[11px] text-[#b9ac9c] font-semibold uppercase">Atendimentos</span>
          <p className="font-oswald text-2xl font-bold text-[#f3ece3] mt-1">{totais.quantidade}</p>
          <span className="text-[10px] text-[#b9ac9c]">antes: {totaisAnterior.quantidade}</span>
        </div>

        <div className="rounded-xl border border-[#3a2f27] bg-[#221c18] p-3.5">
          <span className="text-[11px] text-[#b9ac9c] font-semibold uppercase">Ticket Médio</span>
          <p className="font-oswald text-2xl font-bold text-[#e3b976] mt-1">{formatarPreco(totais.ticketMedio)}</p>
          <span className="text-[10px] text-[#b9ac9c]">por atendimento</span>
        </div>

        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3.5">
          <span className="text-[11px] text-amber-400 font-semibold uppercase">A Receber</span>
          <p className="font-oswald text-2xl font-bold text-amber-300 mt-1">{formatarPreco(totais.pendente)}</p>
          <span className="text-[10px] text-amber-400/80">agendado, sem baixa</span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-4 shadow-lg">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-oswald text-sm font-semibold uppercase text-[#e3b976]">
            Desempenho: Faturamento Diário
          </h4>
          <div className="min-h-[18px] text-xs text-[#f3ece3]">
            {ponto ? (
              <>
                <strong className="text-[#e3b976]">
                  {ponto.diaSemana} {formatarDataCurta(ponto.data)}
                </strong>{' '}
                · {formatarPreco(ponto.recebido)} · {ponto.quantidade} atend.
              </>
            ) : (
              <span className="text-[#b9ac9c]">Passe o mouse ou toque no gráfico</span>
            )}
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-none select-none"
          onMouseMove={aoMoverMouse}
          onTouchMove={(e) => {
            const t = e.touches[0];
            aoMoverMouse({ currentTarget: e.currentTarget, clientX: t.clientX } as React.MouseEvent<SVGSVGElement>);
          }}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={`Gráfico de faturamento diário dos últimos ${dias} dias`}
        >
          <defs>
            <linearGradient id="grad-desempenho" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cf9b56" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#cf9b56" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {marcasY.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#3a2f27" strokeDasharray={v === 0 ? undefined : '3 4'} />
              <text x={PAD.left - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#b9ac9c">
                {v >= 1000 ? `R$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `R$${Math.round(v)}`}
              </text>
            </g>
          ))}

          {serie.map((d, i) =>
            i % passoRotulo === 0 || i === serie.length - 1 ? (
              <text key={d.data} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#b9ac9c">
                {dias === 7 ? d.diaSemana : formatarDataCurta(d.data)}
              </text>
            ) : null
          )}

          {!semDados && (
            <>
              <path d={area} fill="url(#grad-desempenho)" />
              <path d={linha} fill="none" stroke="#cf9b56" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {dias <= 30 &&
                serie.map((d, i) => (
                  <circle key={d.data} cx={x(i)} cy={y(d.recebido)} r={d.recebido > 0 ? 2.5 : 0} fill="#e3b976" />
                ))}
            </>
          )}

          {ponto && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="#e3b976" strokeOpacity="0.5" />
              <circle cx={x(hover)} cy={y(ponto.recebido)} r="4.5" fill="#121010" stroke="#e3b976" strokeWidth="2" />
            </g>
          )}
        </svg>

        {semDados && (
          <p className="mt-2 text-center text-xs text-[#b9ac9c]">
            Nenhum atendimento neste período. Dê baixa nos atendimentos para ver o gráfico.
          </p>
        )}
      </div>
    </div>
  );
};
