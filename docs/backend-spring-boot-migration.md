# Backend Spring Boot Migration

## Current State

The Node.js backend has been migrated into a Java 8 compatible Spring Boot service under `backend-services/oneflow-api`.

The legacy Node.js code remains under `backend/` as a reference only. Java code, Maven build files, tests, and generated output are isolated from it.

## Project Isolation

```text
OneFlow/
|-- backend/                         # legacy Node.js backend, kept as migration reference
|-- backend-services/                # Java backend workspace
|   |-- pom.xml                      # Maven parent, shared dependency/version governance
|   `-- oneflow-api/                 # current OneFlow Spring Boot API service
|       |-- pom.xml                  # service-level dependencies and build config
|       `-- src/
|           |-- main/java/com/oneflow/api/
|           |   |-- ai/              # AI generation/chat API
|           |   |-- attachment/      # requirement/comment attachment upload and download
|           |   |-- audit/           # audit log query API
|           |   |-- auth/            # login, captcha, current user, JWT helpers
|           |   |-- comment/         # requirement comment API
|           |   |-- common/          # shared response/time helpers
|           |   |-- config/          # Spring MVC and application properties
|           |   |-- developer/       # developer list/statistics API
|           |   |-- email/           # email settings and sending API
|           |   |-- health/          # health check API
|           |   |-- notification/    # notification list/read/delete API
|           |   |-- permission/      # module and role permission API
|           |   |-- platform/        # platform options API
|           |   |-- requirement/     # requirement CRUD/workflow/dashboard API
|           |   |-- security/        # request user/role support
|           |   |-- upload/          # generic upload API
|           |   |-- user/            # user query and role update API
|           |   `-- workflow/        # requirement status and transition API
|           `-- test/                # Spring Boot controller/repository tests
`-- docs/
```

Future backend projects should be added as sibling Maven modules under `backend-services/`, for example:

```text
backend-services/
|-- oneflow-api/
|-- another-service/
`-- reporting-service/
```

This keeps each backend project independently buildable while allowing the parent Maven project to manage shared Java version and dependency policy.

## Migrated API Domains

- `auth`
- `users`
- `permissions`
- `requirements`
- `developers`
- `comments`
- `attachments`
- `upload`
- `auditLogs`
- `notifications`
- `workflows`
- `platforms`
- `email`
- `ai`
- `health`

## Runtime Baseline

- JDK: compatible with `jdk1.8.0_261`
- Spring Boot: `2.7.18`
- Build: Maven multi-module project
- Main module: `backend-services/oneflow-api`

## Verification

Run local unit/integration tests from `backend-services` only when the local environment has the required Maven/JDK setup:

```powershell
.\mvnw.cmd test
```

Latest completed verification result:

```text
Tests run: 44, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Network-dependent integrations such as real mail sending and real AI provider calls are configuration-driven and should be verified inside the target intranet environment.
