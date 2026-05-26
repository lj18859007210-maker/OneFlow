# Home Advanced Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accurate home-page advanced filtering with backend-backed pagination and synced summary stats.

**Architecture:** Extend the existing requirements list endpoint so every filter is applied in Oracle before pagination. Keep the Home view as the single UI entry point, with a local editable filter form and applied filters used for requests.

**Tech Stack:** Vue 3, Vite, Axios, Express, OracleDB, Node assert-based scripts

---

### Task 1: Backend filter contract

**Files:**
- Modify: `backend/controllers/requirementController.js`
- Modify: `backend/models/requirement.js`
- Test: `backend/test-requirement-filters.js`

- [ ] Write failing tests for filter normalization and SQL condition building
- [ ] Run the backend filter test script and confirm failure
- [ ] Implement filter parsing, validation, and shared SQL filter construction
- [ ] Run the backend filter test script and confirm pass

### Task 2: Home page advanced filter UI

**Files:**
- Modify: `frontend/src/api/index.js`
- Modify: `frontend/src/views/Home.vue`

- [ ] Add request params support to the requirements API client
- [ ] Add advanced filter form state, reset/apply actions, and list reload wiring
- [ ] Replace the old status-only filter controls with the full filter bar
- [ ] Keep pagination and summary cards synced with applied filters

### Task 3: Verification

**Files:**
- Test: `backend/test-requirement-filters.js`
- Test: `frontend` build output

- [ ] Run backend filter tests
- [ ] Run frontend build
- [ ] Fix any regressions and rerun checks
