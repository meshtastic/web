import org.jetbrains.kotlin.gradle.targets.js.nodejs.NodeJsEnvSpec
import org.jetbrains.kotlin.gradle.targets.js.nodejs.NodeJsRootPlugin
import org.jetbrains.kotlin.gradle.targets.js.npm.LockFileMismatchReport
import org.jetbrains.kotlin.gradle.targets.js.npm.NpmExtension

plugins {
    kotlin("multiplatform") version "2.4.10"
}

val sdkVersion = providers.gradleProperty("meshtasticSdkVersion").get()

kotlin {
    js {
        browser()
        binaries.library()
        generateTypeScriptDefinitions()
        useEsModules()
    }
    sourceSets {
        jsMain.dependencies {
            api("org.meshtastic:sdk-core:$sdkVersion")
        }
    }
}

plugins.withType<NodeJsRootPlugin> {
    extensions.configure<NodeJsEnvSpec> { download.set(false) }
    extensions.configure<NpmExtension> {
        packageLockMismatchReport.set(LockFileMismatchReport.NONE)
        reportNewPackageLock.set(false)
    }
}
