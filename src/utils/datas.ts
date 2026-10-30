// Datas no fuso do aparelho. Não usar toISOString().slice(0, 10): ele devolve a data em UTC,
// que no Brasil já é o dia seguinte depois das 21h.

// YYYY-MM-DD da data informada (padrão: agora)
export function dataLocalISO(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// YYYY-MM-DD local de um instante em ISO (ex.: o campo `inicio` de um agendamento)
export function dataLocalDeISO(iso: string): string {
  return dataLocalISO(new Date(iso));
}

// YYYY-MM local
export function mesLocalISO(d: Date = new Date()): string {
  return dataLocalISO(d).slice(0, 7);
}

// Mesmo dia do mês seguinte. Dia 31 em mês curto cai no último dia (28/29/30) sem perder o dia 31 original,
// porque o dia de vencimento vem de `diaVencimento`, não da data anterior.
export function proximoMesISO(dataISO: string, diaVencimento: number): string {
  const [ano, mes] = dataISO.split('-').map(Number);
  const anoSeguinte = mes === 12 ? ano + 1 : ano;
  const mesSeguinte = mes === 12 ? 1 : mes + 1;
  const ultimoDia = new Date(anoSeguinte, mesSeguinte, 0).getDate();
  const dia = Math.min(diaVencimento, ultimoDia);
  return `${anoSeguinte}-${String(mesSeguinte).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Dias de `de` até `ate` (YYYY-MM-DD). Positivo quando `ate` é depois de `de`.
export function diasEntreISO(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}
