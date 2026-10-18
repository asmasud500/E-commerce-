package com.masud.mobilemoneybridge

data class ParsedPayment(val provider: String, val transactionId: String, val amount: Double, val senderLast4: String, val direction: String = "credit")

object SmsParser {
 private val txnRegex = Regex("""(?i)(?:trx\s*id|trxid|txn\s*id|transaction\s*id|transactionid)\s*[:#-]?\s*([A-Z0-9]{6,24})""")
 private val amountRegex = Regex("""(?i)(?:tk\.?|bdt|৳)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)""")
 private val phoneRegex = Regex("""(?<!\d)(?:\+?88)?01[3-9]\d{8}(?!\d)""")

 fun parse(sender: String?, body: String): ParsedPayment? {
  val text = body.trim()
  if (text.isEmpty()) return null
  val lower = text.lowercase()
  val isCredit = listOf("received", "cash in", "cash-in", "payment received", "credited", "deposit successful").any { lower.contains(it) }
  val isDebit = listOf("sent to", "cash out", "cash-out", "withdraw", "payment to", "you paid").any { lower.contains(it) }
  if (!isCredit || isDebit) return null
  val txn = txnRegex.find(text)?.groupValues?.getOrNull(1)?.uppercase() ?: return null
  val amountRaw = amountRegex.find(text)?.groupValues?.getOrNull(1) ?: return null
  val amount = amountRaw.replace(",", "").toDoubleOrNull() ?: return null
  if (!amount.isFinite() || amount <= 0) return null
  val phone = phoneRegex.find(text)?.value?.takeLast(11) ?: return null
  val combined = ((sender ?: "") + " " + text).lowercase()
  val provider = when {
   combined.contains("bkash") || combined.contains("b-kash") -> "bkash"
   combined.contains("nagad") -> "nagad"
   combined.contains("rocket") || combined.contains("dbbl") || combined.contains("dutch-bangla") -> "rocket"
   else -> return null
  }
  return ParsedPayment(provider, txn, amount, phone.takeLast(4))
 }
}
