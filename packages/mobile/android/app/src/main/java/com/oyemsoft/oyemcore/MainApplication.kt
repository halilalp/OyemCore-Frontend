package com.oyemsoft.oyemcore

import android.app.Application
import android.content.res.Configuration
import com.oyemsoft.webportal.BuildConfig

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

// Custom imports for SSL bypass
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.modules.network.ReactCookieJarContainer
import okhttp3.OkHttpClient
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class TrustAllOkHttpClientFactory : OkHttpClientFactory {
    override fun createNewNetworkModuleClient(): OkHttpClient {
        android.util.Log.d("OYEM_SSL", "TrustAllOkHttpClientFactory.createNewNetworkModuleClient called!")
        try {
            val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
                @Throws(CertificateException::class)
                override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}

                @Throws(CertificateException::class)
                override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}

                override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
            })

            val sslContext = SSLContext.getInstance("TLS")
            sslContext.init(null, trustAllCerts, java.security.SecureRandom())
            val sslSocketFactory = sslContext.socketFactory

            val builder = OkHttpClient.Builder()
                .connectTimeout(15000, java.util.concurrent.TimeUnit.MILLISECONDS)
                .readTimeout(15000, java.util.concurrent.TimeUnit.MILLISECONDS)
                .writeTimeout(15000, java.util.concurrent.TimeUnit.MILLISECONDS)
                .cookieJar(ReactCookieJarContainer())
                .sslSocketFactory(sslSocketFactory, trustAllCerts[0] as X509TrustManager)
                .hostnameVerifier { _, _ -> true }

            return builder.build()
        } catch (e: Exception) {
            android.util.Log.e("OYEM_SSL", "Error creating OkHttpClient", e)
            throw RuntimeException(e)
        }
    }
}

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    android.util.Log.d("OYEM_SSL", "MainApplication.onCreate: setOkHttpClientFactory called!")
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    // Trust all certificates to allow connection to domains using local CAs (like E-Tugra)
    OkHttpClientProvider.setOkHttpClientFactory(TrustAllOkHttpClientFactory())

    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
