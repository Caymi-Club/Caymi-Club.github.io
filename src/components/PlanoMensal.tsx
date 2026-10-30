import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MessageCircle, Check, X, Pause, Play } from 'lucide-react';
import { Assinante, ConfiguracoesBarbearia } from '../types';
import { listarAssinantes, salvarAssinante, excluirAssinante } from '../services/supabaseService';
import { dataLocalISO, proximoMesISO, diasEntreISO } from '../utils/datas';
import { linkWhatsapp } from '../utils/whatsapp';

interface PlanoMensalProps {
  config: ConfiguracoesBarbearia;
}

const formatarPreco = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const formatarDataBR = (dataISO: string) => {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
};

const novoId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

type Situacao = { texto: string; classe: string };

function situacaoDe(a: Assinante, hoje: string): Situacao {
  if (!a.ativo) return { texto: 'Pausado', classe: 'bg-[#3a2f27] text-[#b9ac9c]' };
  const dias = diasEntreISO(hoje, a.proximo_vencimento); // positivo = ainda vai vencer
  if (dias < 0) {
    const atraso = -dias;
    return {
      texto: `Atrasado ${atraso} ${atraso === 1 ? 'dia' : 'dias'}`,
      classe: 'bg-red-900/60 text-red-200',
    };
  }
  if (dias === 0) return { texto: 'Vence hoje', classe: 'bg-amber-900/60 text-amber-200' };
  if (dias <= 3) return { texto: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, classe: 'bg-amber-900/40 text-amber-200' };
  return { texto: 'Em dia', classe: 'bg-emerald-900/60 text-emerald-200' };
}

export const PlanoMensal: React.FC<PlanoMensalProps> = ({ config }) => {
  const [assinantes, setAssinantes] = useState<Assinante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Assinante | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [plano, setPlano] = useState('Plano Mensal');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [salvando, setSalvando] = useState(false);

  const hoje = dataLocalISO();

  const recarregar = async () => {
    const res = await listarAssinantes(config);
    setAssinantes(res.dados);
    setErro(res.erro || null);
    setCarregando(false);
  };

  useEffect(() => {
    recarregar();
  }, [config.supabase_url, config.supabase_anon_key]);

  const paraNumero = (texto: string) => Number(texto.replace(',', '.')) || 0;

  const handleNovo = () => {
    setEditando(null);
    setNome('');
    setTelefone('');
    setPlano('Plano Mensal');
    setValor('');
    // Sugestão: o cliente paga hoje, então a próxima cobrança é no mesmo dia do mês que vem
    setVencimento(proximoMesISO(hoje, Number(hoje.slice(8))));
    setModalAberto(true);
  };

  const handleEditar = (a: Assinante) => {
    setEditando(a);
    setNome(a.nome);
    setTelefone(a.telefone);
    setPlano(a.plano);
    setValor(a.valor.toFixed(2).replace('.', ','));
    setVencimento(a.proximo_vencimento);
    setModalAberto(true);
  };

  const gravar = async (a: Assinante): Promise<boolean> => {
    const res = await salvarAssinante(config, a);
    if (!res.success) {
      setErro(res.message || 'Não foi possível salvar.');
      return false;
    }
    await recarregar();
    return true;
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !vencimento || salvando) return;
    setSalvando(true);

    // O dia de vencimento só muda se a data foi alterada
    const dia =
      editando && vencimento === editando.proximo_vencimento ? editando.dia_vencimento : Number(vencimento.slice(8));

    const ok = await gravar({
      id: editando?.id || novoId(),
      nome: nome.trim(),
      telefone: telefone.trim(),
      plano: plano.trim() || 'Plano Mensal',
      valor: paraNumero(valor),
      dia_vencimento: dia,
      proximo_vencimento: vencimento,
      ultimo_pagamento: editando?.ultimo_pagamento ?? null,
      ativo: editando?.ativo ?? true,
    });
    setSalvando(false);
    if (ok) setModalAberto(false);
  };

  const handlePago = async (a: Assinante) => {
    const proximo = proximoMesISO(a.proximo_vencimento, a.dia_vencimento);
    if (
      !window.confirm(
        `Registrar o pagamento de ${a.nome} (${formatarPreco(a.valor)})?\nA próxima mensalidade passa a vencer em ${formatarDataBR(proximo)}.`
      )
    )
      return;
    await gravar({ ...a, proximo_vencimento: proximo, ultimo_pagamento: hoje });
  };

  const handleAlternarAtivo = (a: Assinante) => gravar({ ...a, ativo: !a.ativo });

  const handleExcluir = async (a: Assinante) => {
    if (!window.confirm(`Excluir ${a.nome} do plano mensal? Isso não pode ser desfeito.`)) return;
    const res = await excluirAssinante(config, a.id);
    if (!res.success) {
      setErro(res.message || 'Não foi possível excluir.');
      return;
    }
    await recarregar();
  };

  const linkCobranca = (a: Assinante) =>
    linkWhatsapp(
      a.telefone,
      `Olá, ${a.nome}! 💈 Passando para lembrar da mensalidade do ${a.plano} (${formatarPreco(a.valor)}), com vencimento em ${formatarDataBR(a.proximo_vencimento)}. Qualquer dúvida é só chamar!`
    );

  const ativos = assinantes.filter((a) => a.ativo);
  const aCobrar = ativos.filter((a) => a.proximo_vencimento <= hoje).length;
  const totalMensal = ativos.reduce((acc, a) => acc + a.valor, 0);

  // Quem precisa de atenção primeiro; pausados por último
  const ordenados = [...assinantes].sort((x, y) => {
    if (x.ativo !== y.ativo) return x.ativo ? -1 : 1;
    return x.proximo_vencimento.localeCompare(y.proximo_vencimento);
  });

  const campo =
    'mt-1 w-full rounded-xl border border-[#3a2f27] bg-[#1c1815] px-3 py-2 text-xs text-[#f3ece3] outline-none focus:border-[#cf9b56]';

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#3a2f27] bg-[#221c18] p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-oswald text-base font-semibold uppercase text-[#e3b976]">Plano Mensal</h3>
            <p className="mt-0.5 text-[11px] text-[#b9ac9c]">
              Cadastre quem tem plano e a data da mensalidade. No dia do vencimento você recebe o aviso no Telegram
              (às 9h) e ele se repete todo dia até você marcar como pago.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNovo}
            className="font-oswald flex shrink-0 items-center gap-1 rounded-xl bg-[#cf9b56] px-3 py-2 text-xs font-bold uppercase text-[#121010] hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Novo assinante
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-[#3a2f27] bg-[#1c1815] p-2.5">
            <div className="font-oswald text-lg font-bold text-[#f3ece3]">{ativos.length}</div>
            <div className="text-[10px] uppercase text-[#b9ac9c]">Assinantes ativos</div>
          </div>
          <div className="rounded-xl border border-[#3a2f27] bg-[#1c1815] p-2.5">
            <div className="font-oswald text-lg font-bold text-[#e3b976]">{formatarPreco(totalMensal)}</div>
            <div className="text-[10px] uppercase text-[#b9ac9c]">Previsto por mês</div>
          </div>
          <div className="rounded-xl border border-[#3a2f27] bg-[#1c1815] p-2.5">
            <div className={`font-oswald text-lg font-bold ${aCobrar > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
              {aCobrar}
            </div>
            <div className="text-[10px] uppercase text-[#b9ac9c]">A cobrar</div>
          </div>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-800 bg-red-950/60 p-3 text-xs text-red-200">
          {erro}
          {/assinantes/i.test(erro) && (
            <span className="block mt-1">
              Se a tabela ainda não existe, rode o arquivo supabase/assinantes.sql no SQL Editor do Supabase.
            </span>
          )}
        </div>
      )}

      {carregando ? (
        <p className="p-4 text-center text-xs text-[#b9ac9c] animate-pulse">Carregando assinantes…</p>
      ) : ordenados.length === 0 && !erro ? (
        <p className="rounded-xl border border-dashed border-[#3a2f27] p-6 text-center text-xs text-[#b9ac9c]">
          Nenhum assinante cadastrado ainda. Clique em “Novo assinante”.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {ordenados.map((a) => {
            const situacao = situacaoDe(a, hoje);
            const vencida = a.ativo && a.proximo_vencimento <= hoje;
            return (
              <div
                key={a.id}
                className={`rounded-2xl border p-4 shadow ${
                  vencida ? 'border-[#cf9b56] bg-[#2a1e15]' : 'border-[#3a2f27] bg-[#221c18]'
                } ${a.ativo ? '' : 'opacity-70'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-oswald text-base font-semibold text-[#f3ece3]">{a.nome}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${situacao.classe}`}>
                      {situacao.texto}
                    </span>
                  </div>
                  <span className="font-oswald text-base font-bold text-[#e3b976]">{formatarPreco(a.valor)}</span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#b9ac9c]">
                  <span>{a.plano}</span>
                  <span>•</span>
                  <span>
                    Vence em <strong className="text-[#f3ece3]">{formatarDataBR(a.proximo_vencimento)}</strong> (todo dia{' '}
                    {a.dia_vencimento})
                  </span>
                  {a.telefone && (
                    <>
                      <span>•</span>
                      <span>{a.telefone}</span>
                    </>
                  )}
                  {a.ultimo_pagamento && (
                    <>
                      <span>•</span>
                      <span>Último pagamento: {formatarDataBR(a.ultimo_pagamento)}</span>
                    </>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {a.ativo && (
                    <button
                      type="button"
                      onClick={() => handlePago(a)}
                      className="flex items-center gap-1 rounded-lg bg-[#cf9b56] px-2.5 py-1.5 text-xs font-semibold text-[#121010] hover:brightness-110"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Marcar como pago
                    </button>
                  )}
                  {a.telefone && (
                    <a
                      href={linkCobranca(a)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-[#25d366]/50 bg-[#25d366]/20 px-2.5 py-1.5 text-xs font-semibold text-[#6bbf8a] transition-colors hover:bg-[#25d366] hover:text-[#0b1b12]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Cobrar no WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEditar(a)}
                    className="flex items-center gap-1 rounded-lg border border-[#3a2f27] px-2.5 py-1.5 text-xs text-[#b9ac9c] hover:border-[#cf9b56] hover:text-[#f3ece3]"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlternarAtivo(a)}
                    className="flex items-center gap-1 rounded-lg border border-[#3a2f27] px-2.5 py-1.5 text-xs text-[#b9ac9c] hover:border-[#cf9b56] hover:text-[#f3ece3]"
                    title={a.ativo ? 'Pausa a cobrança e os avisos' : 'Volta a cobrar'}
                  >
                    {a.ativo ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {a.ativo ? 'Pausar' : 'Reativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluir(a)}
                    className="flex items-center gap-1 rounded-lg border border-red-900/60 bg-red-950/40 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-900 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleSalvar}
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-[#cf9b56] bg-[#221c18] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#3a2f27] pb-2">
              <h4 className="font-oswald text-base font-bold uppercase text-[#e3b976]">
                {editando ? 'Editar assinante' : 'Novo assinante'}
              </h4>
              <button type="button" onClick={() => setModalAberto(false)} className="text-[#b9ac9c] hover:text-[#f3ece3]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[#b9ac9c]">Nome</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className={campo}
                />
              </div>
              <div>
                <label className="text-[#b9ac9c]">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Ex: (35) 99999-9999"
                  className={campo}
                />
              </div>
              <div>
                <label className="text-[#b9ac9c]">Plano</label>
                <input
                  type="text"
                  value={plano}
                  onChange={(e) => setPlano(e.target.value)}
                  placeholder="Ex: Corte + Barba ilimitado"
                  className={campo}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#b9ac9c]">Valor da mensalidade (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="Ex: 120,00"
                    className={campo}
                  />
                </div>
                <div>
                  <label className="text-[#b9ac9c]">Próximo vencimento</label>
                  <input
                    type="date"
                    required
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                    className={campo}
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#b9ac9c]">
                O dia dessa data vira o dia fixo da mensalidade. Ao marcar como pago, o vencimento vai para o mesmo dia
                do mês seguinte.
              </p>

              <div className="mt-1 flex justify-end gap-2 border-t border-[#3a2f27] pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-xl border border-[#3a2f27] px-3 py-1.5 font-semibold text-[#b9ac9c]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando || !nome.trim() || !vencimento}
                  className="rounded-xl bg-[#cf9b56] px-4 py-1.5 font-bold text-[#121010] disabled:opacity-50"
                >
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
