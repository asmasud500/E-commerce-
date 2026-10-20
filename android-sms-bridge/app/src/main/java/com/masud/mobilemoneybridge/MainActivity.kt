package com.masud.mobilemoneybridge

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.text.InputType
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class MainActivity : Activity() {
 private lateinit var endpoint: EditText
 private lateinit var secret: EditText
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  val prefs = securePrefs()
  val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32, 36, 32, 24) }
  layout.addView(TextView(this).apply { text = "Mobile Money SMS Bridge\nConfigure private webhook endpoint and secret."; textSize = 20f })
  endpoint = EditText(this).apply { hint = "https://your-domain/api/webhooks/mobile-money-sms"; setText(prefs.getString("endpoint", "")); singleLine = true }
  layout.addView(endpoint, fieldParams())
  secret = EditText(this).apply { hint = "MOBILE_MONEY_SMS_WEBHOOK_SECRET"; setText(prefs.getString("secret", "")); singleLine = true; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD }
  layout.addView(secret, fieldParams())
  layout.addView(Button(this).apply {
   text = "Save settings"
   setOnClickListener {
    val url = endpoint.text.toString().trim(); val key = secret.text.toString().trim()
    if (!url.startsWith("https://") || key.length < 24) Toast.makeText(this@MainActivity, "Use HTTPS and a long secret.", Toast.LENGTH_LONG).show()
    else { prefs.edit().putString("endpoint", url).putString("secret", key).apply(); Toast.makeText(this@MainActivity, "Settings saved securely.", Toast.LENGTH_SHORT).show() }
   }
  }, fieldParams())
  layout.addView(Button(this).apply {
   text = "Allow incoming SMS"
   setOnClickListener {
    if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED)
     ActivityCompat.requestPermissions(this@MainActivity, arrayOf(Manifest.permission.RECEIVE_SMS), 42)
    else Toast.makeText(this@MainActivity, "SMS permission already enabled.", Toast.LENGTH_SHORT).show()
   }
  }, fieldParams())
  layout.addView(TextView(this).apply {
   text = "Only parsed provider, transaction ID, amount and sender last 4 digits are sent. Unsupported SMS formats are ignored."; textSize = 14f
  }, fieldParams())
  setContentView(layout)
 }
 private fun securePrefs() = run {
  val key = MasterKey.Builder(this).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
  EncryptedSharedPreferences.create(this, "bridge_settings", key,
   EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
   EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM)
 }
 private fun fieldParams() = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = 18 }
}
