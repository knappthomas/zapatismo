

You are cursor ai in the project "Zapatismo".
Goal: Step 1 of the binding process: "Requirement / Specification" for exactly ONE ticket.

DOCUMENTATION (read for context where relevant):
- **Project rules & principles:** `.docs/system/project-rules.md` — simplicity, stateless backend, repo as source of truth, scope conventions.
- **Architecture context:** `.docs/system/setup-architecture.md` — 3-tier layout, modules (frontend/backend/iOS), non-goals.

IMPORTANT (Non-negotiables):
- The result is a clear, testable working document (Requirement Sheet / Specification) as the foundation for the next step (implementation plan).
- No implementation details (no code, no DB schemas, no final API DTOs, no Angular component details).
- No assumptions. If something is unclear: mark it as "UNRESOLVED" + formulate a precise clarification question.
- Use precise language: MUST/SHOULD/MAY.
- Focus: What exactly must be implemented + acceptance criteria + scope/out-of-scope + dependencies + risks.

INPUT (ask me when executing):
- Ticket ID (= [ticket-id])
- Short description / instruction "what to implement" (free text)
- Context / domain (optional)
- Stakeholder / user role(s) (optional)
- Relevant links / references (optional)
- Known constraints (tech / legal / security) (optional)

YOUR TASK:
1) Preparation
   - Create the following directory and inside it the file:
     `.docs/tasks/[ticket-id]/1-requirement-[ticket-id].md`
   - Use this file for all output (single document)
   - Language: English

2) Analyze the input and extract the truth:
   - Target state: what problem is solved / what value is created?
   - User roles & use cases: who does what, when, why?
   - Functional requirements (MUST/SHOULD/MAY)
   - Non-functional requirements (performance, security, privacy, logging, maintainability)
   - Data & interfaces conceptually (which data in/out, no final DTO design)
   - States / flows (happy path + error paths)
   - Acceptance criteria: concrete, testable, preferably Given/When/Then
   - Scope: In-Scope vs Out-of-Scope
   - Dependencies & risks
   - Open questions: precise items that must be clarified

OUTPUT FORMAT:
Generate exactly one Markdown document using the following template.
No additional chapters. No prose outside the template.

---
# Requirement Sheet – <TICKET-ID> – <SHORT TITLE>

## 0. Quick Facts
- Ticket-ID:
- Short Description (1 sentence):
- Goal / Value (max 5 bullets):
- Affected Roles:
- Affected Modules/Components (conceptual):
- In-Scope (max 5 bullets):
- Out-of-Scope (max 5 bullets):

## 1. Context & Problem Statement
- Current State (As-Is):
- Problem / Pain:
- Target State (To-Be, without implementation details):
- Assumptions (if any were stated):
- Non-Goals:

## 2. Stakeholders & Roles
Table:
| Role | Goal/Interest | Rights/Constraints |
|---|---|---|
| ... |

## 3. User Journeys / Use Cases
For each use case:
### UC <N>: <Name>
- Primary Actor:
- Trigger:
- Preconditions:
- Flow (numbered, precise):
- Outcome:
- Alternatives / Abort Paths:

## 4. Functional Requirements (MUST/SHOULD/MAY)
Table:
| ID | Requirement (clear, atomic) | Priority (MUST/SHOULD/MAY) | Rationale / Value | Notes |
|---|---|---|---|---|
| FR-1 | ... |

## 5. Data & Interfaces (conceptual)
- Data objects (terms + meaning, no final fields):
- Inputs / Outputs (high-level):
- External systems / integrations (if relevant):
- Authorization / AuthN/AuthZ requirements:

## 6. States, Validations & Error Cases
### 6.1 States / Modes
- Relevant states / flags:
- Transitions:

### 6.2 Validations
Table:
| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|---|---|---|---|---|
| ... |

### 6.3 Error Cases / Edge Cases
Table:
| Case | Trigger | Expected System Behavior | User Feedback | Category |
|---|---|---|---|---|
| ... |

## 7. Non-Functional Requirements
- Security:
- Privacy / Compliance:
- Performance / Scalability:
- Logging / Auditing:
- Usability / Accessibility (if relevant):
- Operability (monitoring, alerts) (if relevant):

## 8. Acceptance Criteria (testable)
List (prefer Given/When/Then):
- AC-1: Given ... When ... Then ...
- AC-2: ...

## 9. Dependencies, Risks, Impact
- Dependencies (teams / services / configs):
- Risks / open technical uncertainties:
- Impact on existing functionality:

## 10. Open Points (UNRESOLVED)
List:
- [ ] Question – required information – who can answer?

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code, no final DTOs, no migrations).
- Every ambiguity is captured as UNRESOLVED with a concrete question.
- Scope and Out-of-Scope are clearly separated.
---

EXECUTION:
- First ask for the INPUT items (Ticket-ID + Instruction + optional fields).
- Only afterwards create the file and fully populate the template based on the answers.