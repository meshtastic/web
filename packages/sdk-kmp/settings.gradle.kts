pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
        google()
    }
}

plugins { id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0" }

dependencyResolutionManagement {
    repositories {
        mavenCentral()
        google()
    }
}

rootProject.name = "sdk-kmp"

// Until a meshtastic-sdk release carries its js artifacts (meshtastic/meshtastic-sdk#215),
// the SDK compiles from source out of the pinned submodule in vendor/. Once a release
// carries them, delete the submodule and this block, and resolve meshtasticSdkVersion
// from Maven Central.
includeBuild("vendor/meshtastic-sdk") {
    dependencySubstitution {
        substitute(module("org.meshtastic:sdk-core")).using(project(":core"))
        substitute(module("org.meshtastic:sdk-core-js")).using(project(":core"))
        substitute(module("org.meshtastic:sdk-testing")).using(project(":testing"))
        substitute(module("org.meshtastic:sdk-testing-js")).using(project(":testing"))
    }
}
