import { useContext, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

const ESPACO_PX = 16;

/** Altura da barra de navegação do Android embaixo da tela (zero sem provedor de área segura). */
export function useMargemInferior(): number {
  return useContext(SafeAreaInsetsContext)?.bottom ?? 0;
}

interface RodapeFixoProps {
  children: ReactNode;
  /** Por cima do conteúdo, preso ao fim da tela (o conteúdo rola por baixo). */
  sobreposto?: boolean;
  /** Classes extras do contêiner (ex.: "flex-row gap-3"). */
  className?: string;
  /** Fundo do rodapé; padrão o fundo da tela. */
  fundo?: 'bg-fundo' | 'bg-cartao';
}

/**
 * Barra de botões no fim da tela. Soma a área segura de baixo (barra de navegação do Android com o app
 * desenhado até a borda), para o botão nunca ficar atrás dela. Sem provedor (testes), a margem é zero.
 */
export function RodapeFixo({
  children,
  sobreposto = false,
  className = '',
  fundo = 'bg-fundo',
}: RodapeFixoProps) {
  const margem = useMargemInferior();
  return (
    <View
      testID="rodape-fixo"
      className={`border-t border-borda px-4 pt-4 ${fundo} ${sobreposto ? 'absolute inset-x-0 bottom-0' : ''} ${className}`}
      style={{ paddingBottom: ESPACO_PX + margem }}
    >
      {children}
    </View>
  );
}
