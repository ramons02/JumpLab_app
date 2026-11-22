#!/usr/bin/env bash
# Monta os seis vídeos do "Como fazer" a partir dos PNG gravados por exportar.html (spec 015, R2).
# Uso: ferramentas/videos-demonstrativos/montar.sh <pasta-dos-png>
# Saída: assets/videos/como-fazer/<protocolo>.mp4 (H.264, yuv420p, 30 fps, sem áudio).
set -euo pipefail

pasta="${1:?Informe a pasta com os PNG exportados.}"
raiz="$(cd "$(dirname "$0")/../.." && pwd)"
destino="$raiz/assets/videos/como-fazer"
protocolos=(cmj_bi cmj_uni sj dj dj_uni agach)

command -v ffmpeg >/dev/null || { echo "ffmpeg não encontrado no PATH." >&2; exit 1; }
for protocolo in "${protocolos[@]}"; do
  [ -f "$pasta/$protocolo/0000.png" ] || { echo "Faltam os PNG de $protocolo em $pasta." >&2; exit 1; }
done

mkdir -p "$destino"
for protocolo in "${protocolos[@]}"; do
  ffmpeg -y -loglevel error -framerate 30 -i "$pasta/$protocolo/%04d.png" \
    -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 23 -an -movflags +faststart \
    "$destino/$protocolo.mp4"
  echo "$protocolo.mp4: $(du -h "$destino/$protocolo.mp4" | cut -f1)"
done
