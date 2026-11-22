const LINK_WHATSAPP = 'https://wa.me/?text=';

/** Texto que o administrador manda ao usuário pelo WhatsApp (HU016 RN06). */
export function montarMensagemSenhaTemporaria(senha: string): string {
  return `JumpLab: sua senha temporária é ${senha}. Vale 24 horas. Ao entrar, crie sua senha nova.`;
}

/** Sem número: o WhatsApp abre para escolher o contato (research R9). */
export function montarLinkWhatsapp(mensagem: string): string {
  return LINK_WHATSAPP + encodeURIComponent(mensagem);
}
