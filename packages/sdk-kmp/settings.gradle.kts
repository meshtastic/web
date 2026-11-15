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
        // Until meshtastic-sdk publishes its js artifacts (meshtastic/meshtastic-sdk#215),
        // sdk-core-js comes from `./gradlew publishToMavenLocal` in that repo.
        mavenLocal()
    }
}

rootProject.name = "sdk-kmp"
