package com.masud.mobilemoneybridge

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class SmsWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    companion object {
        const val KEY_BODY = "sms_body"
        const val KEY_SENDER = "sms_sender"
    }

    override fun doWork(): Result {
        val body = inputData.getString(KEY_BODY).orEmpty()
        val sender = inputData.getString(KEY_SENDER).orEmpty()
        if (body.isBlank()) return Result.success()

        val parsed = SmsParser.parse(sender, body) ?: return Result.success()
        val prefs = try {
            val masterKey = MasterKey.Builder(applicationContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                applicationContext,
                "bridge_settings",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (_: Exception) {
            return Result.failure()
        }

        val endpoint = prefs.getString("endpoint", null)?.trim().orEmpty()
        val secret = prefs.getString("secret", null)?.trim().orEmpty()
        if (!endpoint.startsWith("https://") || secret.length < 24) return Result.failure()

        var connection: HttpURLConnection? = null
        return try {
            connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000
                readTimeout = 15_000
                doOutput = true
                setRequestProperty("Authorization", "Bearer $secret")
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
            }

            // Only normalized fields are sent; the original SMS text is never uploaded.
            val payload = JSONObject()
                .put("provider", parsed.provider.uppercase())
                .put("transactionId", parsed.transactionId)
                .put("amount", parsed.amount)
                .put("senderLast4", parsed.senderLast4)
                .put("direction", parsed.direction)

            connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            when {
                status in 200..299 -> Result.success()
                status == 409 -> Result.success() // duplicate/ambiguous payment requires no automatic retry
                status == 408 || status == 429 || status >= 500 -> Result.retry()
                else -> Result.failure()
            }
        } catch (_: Exception) {
            Result.retry()
        } finally {
            connection?.disconnect()
        }
    }
}
