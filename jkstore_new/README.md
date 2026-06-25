# OneFlow Backend Services

This directory is the isolated Java backend workspace for OneFlow.

## Modules

- `oneflow-api`: Spring Boot API service that keeps the existing `/api/*` frontend contract.

Future backend projects should be added as sibling Maven modules under `backend-services`, not mixed into the legacy Node.js `backend` directory.

## Runtime Baseline

- JDK: 1.8, compatible with `jdk1.8.0_261`
- Spring Boot: 2.7.18
- Build: Maven Wrapper (`mvnw.cmd`)

## Common Commands

```powershell
cd backend-services
.\mvnw.cmd test
.\mvnw.cmd -pl oneflow-api spring-boot:run
```

The default service port remains `8877`, matching the existing Node.js backend default. Environment variable names intentionally follow the legacy backend where practical, such as `PORT`, `HOST`, `JWT_SECRET`, `ORACLE_HOST`, `ORACLE_PORT`, `ORACLE_SERVICE_NAME`, `ORACLE_USER`, and `ORACLE_PASSWORD`.
