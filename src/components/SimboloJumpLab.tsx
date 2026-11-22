import { SvgXml } from 'react-native-svg';

import { SIMBOLO_JUMPLAB_SVG } from '@/theme/marca';

const TAMANHO_PADRAO = 40;

export function SimboloJumpLab({ tamanho = TAMANHO_PADRAO }: { tamanho?: number }) {
  return (
    <SvgXml
      xml={SIMBOLO_JUMPLAB_SVG}
      width={tamanho}
      height={tamanho}
      accessible
      accessibilityRole="image"
      accessibilityLabel="JumpLab"
    />
  );
}
