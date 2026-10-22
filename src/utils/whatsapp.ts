// Monta o link de conversa no WhatsApp.
// Usa api.whatsapp.com/send em vez de wa.me: o wa.me redireciona e, em alguns navegadores/apps,
// os emojis da mensagem chegam como "??".
export function linkWhatsapp(telefone: string, mensagem: string): string {
  let digitos = telefone.replace(/\D/g, '').replace(/^0+/, '');
  if (digitos.length <= 11) digitos = '55' + digitos;
  return `https://api.whatsapp.com/send?phone=${digitos}&text=${encodeURIComponent(mensagem)}`;
}
