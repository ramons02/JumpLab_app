package br.com.jumplab.deteccaopose

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.ensureActive

/*
 * Detecção dos pés no aparelho (spec 018, contrato em contracts/modulos-internos.md). Lê cada quadro pelo
 * número inteiro dele no arquivo e roda o MediaPipe Pose Landmarker em modo VIDEO, sem rede. Só saem do
 * módulo os pontos dos pés e dos quadris, com a visibilidade.
 */

private const val MODELO = "pose_landmarker_lite.task"
private const val EVENTO_PROGRESSO = "progresso"
private const val QUADROS_POR_AVISO = 10

// Índices do MediaPipe Pose, lado anatômico da pessoa.
private val PES_ESQUERDO = intArrayOf(27, 29, 31) // tornozelo, calcanhar e ponta do pé
private val PES_DIREITO = intArrayOf(28, 30, 32)
private const val QUADRIL_ESQUERDO = 23
private const val QUADRIL_DIREITO = 24

class AnaliseCanceladaException :
  CodedException("ANALISE_CANCELADA", "A análise foi cancelada.", null)

class VideoIlegivelException(causa: Throwable?) :
  CodedException("VIDEO_ILEGIVEL", "Não foi possível ler os quadros do vídeo.", causa)

class DeteccaoPoseModule : Module() {
  private val analises = ConcurrentHashMap<String, Deferred<List<Map<String, Any?>>>>()

  private val contexto: Context
    get() = appContext.reactContext ?: throw VideoIlegivelException(null)

  override fun definition() = ModuleDefinition {
    Name("DeteccaoPose")

    Events(EVENTO_PROGRESSO)

    AsyncFunction("analisarQuadros") Coroutine { idAnalise: String, uri: String, fpsDoArquivo: Double, quadros: List<Int> ->
      coroutineScope {
        val tarefa = async(Dispatchers.Default) { analisar(idAnalise, uri, fpsDoArquivo, quadros) }
        analises[idAnalise] = tarefa
        try {
          tarefa.await()
        } catch (e: CancellationException) {
          throw AnaliseCanceladaException()
        } finally {
          analises.remove(idAnalise)
        }
      }
    }

    Function("cancelarAnalise") { idAnalise: String ->
      analises.remove(idAnalise)?.cancel()
      Unit
    }

    AsyncFunction("totalDeQuadrosDoArquivo") Coroutine { uri: String ->
      comLeitor(uri) { leitor ->
        leitor.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_FRAME_COUNT)?.toIntOrNull()
          ?: throw VideoIlegivelException(null)
      }
    }
  }

  private fun <T> comLeitor(uri: String, uso: (MediaMetadataRetriever) -> T): T {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) throw VideoIlegivelException(null)
    val leitor = MediaMetadataRetriever()
    try {
      try {
        leitor.setDataSource(contexto, Uri.parse(uri))
      } catch (e: RuntimeException) {
        throw VideoIlegivelException(e)
      }
      return uso(leitor)
    } finally {
      leitor.release()
    }
  }

  private suspend fun analisar(
    idAnalise: String,
    uri: String,
    fpsDoArquivo: Double,
    quadros: List<Int>
  ): List<Map<String, Any?>> = coroutineScope {
    val opcoes = PoseLandmarker.PoseLandmarkerOptions.builder()
      .setBaseOptions(BaseOptions.builder().setModelAssetPath(MODELO).build())
      .setRunningMode(RunningMode.VIDEO)
      .setNumPoses(1)
      .build()
    val detector = PoseLandmarker.createFromOptions(contexto, opcoes)
    try {
      comLeitor(uri) { leitor ->
        val resultado = ArrayList<Map<String, Any?>>(quadros.size)
        var ultimoTempo = -1L
        quadros.forEachIndexed { i, quadro ->
          ensureActive()
          // O modo VIDEO exige tempo crescente; quadros vizinhos a mais de 1000 fps caem no mesmo ms.
          val tempo = maxOf(Math.round(quadro * 1000.0 / fpsDoArquivo), ultimoTempo + 1)
          ultimoTempo = tempo
          resultado.add(detectar(detector, leitor, quadro, tempo))
          if (i % QUADROS_POR_AVISO == 0 || i == quadros.size - 1) {
            sendEvent(
              EVENTO_PROGRESSO,
              mapOf("idAnalise" to idAnalise, "fracao" to (i + 1).toDouble() / quadros.size)
            )
          }
        }
        resultado
      }
    } finally {
      detector.close()
    }
  }

  private fun detectar(
    detector: PoseLandmarker,
    leitor: MediaMetadataRetriever,
    quadro: Int,
    tempo: Long
  ): Map<String, Any?> {
    val imagem: Bitmap = try {
      leitor.getFrameAtIndex(quadro)
    } catch (e: IllegalArgumentException) {
      null
    } ?: return semPessoa(quadro)
    try {
      val pontos = detector.detectForVideo(BitmapImageBuilder(imagem).build(), tempo)
        .landmarks().firstOrNull() ?: return semPessoa(quadro)
      return mapOf(
        "quadro" to quadro,
        "pes" to mapOf(
          "esquerdo" to PES_ESQUERDO.map { ponto(pontos[it]) },
          "direito" to PES_DIREITO.map { ponto(pontos[it]) }
        ),
        "quadris" to mapOf(
          "esquerdo" to ponto(pontos[QUADRIL_ESQUERDO]),
          "direito" to ponto(pontos[QUADRIL_DIREITO])
        )
      )
    } finally {
      imagem.recycle()
    }
  }

  private fun semPessoa(quadro: Int): Map<String, Any?> =
    mapOf("quadro" to quadro, "pes" to null, "quadris" to null)

  private fun ponto(p: NormalizedLandmark): Map<String, Double> = mapOf(
    "x" to p.x().toDouble(),
    "y" to p.y().toDouble(),
    "visibilidade" to p.visibility().orElse(0f).toDouble()
  )
}
