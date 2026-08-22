# ============================================================
# Dockerfile – Backend Spring Boot (multistage)
# Etapa 1: compilar con Maven
# Etapa 2: imagen de ejecución mínima con JRE 17
# ============================================================

# ── Etapa 1: build ───────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /workspace

# Copiar solo el POM primero para aprovechar caché de capas de Docker.
# Las dependencias solo se re-descargan si cambia el pom.xml.
COPY pom.xml .

# Copiar el código fuente y compilar (skip tests para imagen de producción)
# Maven resolverá dependencias durante el package.
COPY src ./src
RUN mvn package -DskipTests --no-transfer-progress

# ── Etapa 2: runtime ─────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Usuario no-root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copiar el JAR generado desde la etapa de build
COPY --from=build /workspace/target/cotizador-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
