#!/usr/bin/env bash
# Gera os vídeos do teste D1 (spec 006): o número do quadro (a partir de 0) fica impresso grande em
# cada imagem, para comparar com o número mostrado pelo app.
#   d1_240_nativo.mp4  5 s a 240 fps, faixa a 240 fps (1200 quadros)
#   d1_240_em_30.mp4   os mesmos 1200 quadros com a faixa a 30 fps (40 s), como gravam alguns
#                      aparelhos em câmera lenta
# GOP longo (-g 240) para forçar a decodificação entre quadros-chave.
# Usa o filtro drawtext; se o ffmpeg não o tiver (builds estáticos sem freetype), imprime o número
# com legendas ASS (libass), gerando a 25 fps e reposicionando cada quadro em N/240 s.
# Uso: scripts/gerar-videos-d1.sh [pasta de saída]   (padrão: videos-d1/)
set -euo pipefail

saida="${1:-videos-d1}"
quadros=1200
mkdir -p "$saida"

command -v ffmpeg >/dev/null || { echo "ffmpeg não encontrado no PATH." >&2; exit 1; }

nativo="$saida/d1_240_nativo.mp4"
em30="$saida/d1_240_em_30.mp4"
codificacao=(-c:v libx264 -pix_fmt yuv420p -g 240 -an)

if ffmpeg -hide_banner -filters 2>/dev/null | grep -qw drawtext; then
  ffmpeg -y -loglevel error \
    -f lavfi -i "testsrc2=size=720x1280:rate=240:duration=5" \
    -vf "drawtext=text='%{frame_num}':fontsize=220:fontcolor=white:box=1:boxcolor=black@0.6:x=(w-tw)/2:y=(h-th)/2" \
    "${codificacao[@]}" -r 240 "$nativo"
else
  legendas="$saida/numeros.ass"
  {
    printf '[Script Info]\nScriptType: v4.00+\nPlayResX: 720\nPlayResY: 1280\n\n'
    printf '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, BorderStyle, Outline, Shadow, Alignment\n'
    printf 'Style: Numero,DejaVu Sans,260,&H00FFFFFF,3,12,0,5\n\n'
    printf '[Events]\nFormat: Layer, Start, End, Style, Text\n'
    # a 25 fps cada quadro dura 4 centésimos, exato no formato de tempo do ASS
    awk -v n="$quadros" 'function t(cs) { return sprintf("%d:%02d:%02d.%02d", int(cs/360000), int(cs/6000)%60, int(cs/100)%60, cs%100) }
      BEGIN { for (k = 0; k < n; k++) printf "Dialogue: 0,%s,%s,Numero,%d\n", t(4*k), t(4*k+4), k }'
  } > "$legendas"
  ffmpeg -y -loglevel error \
    -f lavfi -i "testsrc2=size=720x1280:rate=25:duration=$((quadros * 4 / 100))" \
    -vf "subtitles=$legendas,settb=1/240,setpts=N" \
    "${codificacao[@]}" -fps_mode passthrough -video_track_timescale 240 "$nativo"
  rm -f "$legendas"
fi

ffmpeg -y -loglevel error -i "$nativo" -vf "settb=1/30,setpts=N" "${codificacao[@]}" -fps_mode passthrough -video_track_timescale 30 "$em30"

if command -v ffprobe >/dev/null; then
  for arquivo in "$nativo" "$em30"; do
    echo "$arquivo: $(ffprobe -v error -select_streams v:0 -count_frames \
      -show_entries stream=nb_read_frames,r_frame_rate,duration -of csv=p=0 "$arquivo")"
  done
fi
