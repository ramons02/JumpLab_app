package br.com.jumplab.leituravideo

import android.content.Context
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/*
 * Leitura da taxa de gravação nos dados do arquivo (decisão D22): a taxa de captura que a câmera grava
 * no vídeo de câmera lenta e a contagem de quadros da faixa de vídeo pela duração dela. Nada sai do
 * aparelho; o que não puder ser lido volta null.
 */
class LeituraVideoModule : Module() {
  private val contexto: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Sem contexto do app.")

  override fun definition() = ModuleDefinition {
    Name("LeituraVideo")

    AsyncFunction("lerDadosDoVideo") Coroutine { uri: String ->
      withContext(Dispatchers.IO) { lerDados(Uri.parse(uri)) }
    }
  }

  private fun lerDados(uri: Uri): Map<String, Any?> {
    var captura: Double? = null
    var quadros: Int? = null
    val retriever = MediaMetadataRetriever()
    try {
      retriever.setDataSource(contexto, uri)
      captura = retriever
        .extractMetadata(MediaMetadataRetriever.METADATA_KEY_CAPTURE_FRAMERATE)
        ?.toDoubleOrNull()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        quadros = retriever
          .extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_FRAME_COUNT)
          ?.toIntOrNull()
      }
    } catch (_: Exception) {
    } finally {
      retriever.release()
    }

    var duracaoUs: Long? = null
    var taxaDaFaixa: Double? = null
    val extrator = MediaExtractor()
    try {
      extrator.setDataSource(contexto, uri, null)
      for (i in 0 until extrator.trackCount) {
        val formato = extrator.getTrackFormat(i)
        if (formato.getString(MediaFormat.KEY_MIME)?.startsWith("video/") != true) continue
        if (formato.containsKey(MediaFormat.KEY_DURATION)) {
          duracaoUs = formato.getLong(MediaFormat.KEY_DURATION)
        }
        if (formato.containsKey(MediaFormat.KEY_FRAME_RATE)) {
          taxaDaFaixa = try {
            formato.getInteger(MediaFormat.KEY_FRAME_RATE).toDouble()
          } catch (_: ClassCastException) {
            formato.getFloat(MediaFormat.KEY_FRAME_RATE).toDouble()
          }
        }
        break
      }
    } catch (_: Exception) {
    } finally {
      extrator.release()
    }

    return mapOf(
      "taxaDeCaptura" to captura,
      "quadros" to quadros,
      "duracaoS" to duracaoUs?.let { it / 1_000_000.0 },
      "taxaDaFaixa" to taxaDaFaixa,
    )
  }
}
