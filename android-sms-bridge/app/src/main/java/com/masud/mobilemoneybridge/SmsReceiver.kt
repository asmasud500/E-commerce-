package com.masud.mobilemoneybridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class SmsReceiver : BroadcastReceiver() {
 override fun onReceive(context: Context, intent: Intent) {
  if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
  val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
  if (messages.isEmpty()) return
  val body = messages.joinToString(separator = "") { it.messageBody.orEmpty() }
  val sender = messages.firstOrNull()?.originatingAddress.orEmpty()
  if (body.isBlank()) return
  val input = Data.Builder().putString(SmsWorker.KEY_BODY, body.take(3500)).putString(SmsWorker.KEY_SENDER, sender.take(100)).build()
  WorkManager.getInstance(context).enqueue(OneTimeWorkRequestBuilder<SmsWorker>().setInputData(input).build())
 }
}
