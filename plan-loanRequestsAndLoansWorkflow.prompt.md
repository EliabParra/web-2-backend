## Plan: Loan Requests And Loans Workflow

Implement LoanBO as a movement-based workflow where requests and loans are two lifecycle views over business.movement, with registerLoan creating business.movement_detail records and applying inventory stock updates transactionally. The approach keeps one movement per request lifecycle, enforces role-driven transitions (accept/reject/register), and returns optional traceability in detail endpoints.

**Steps**
1. Phase 1: Domain contract and constants
2. Define canonical workflow states and movement type semantics from DB seeds/config: request type, loan type, lapse pending/accepted/rejected/registered. Decide whether IDs are resolved by description at runtime or configured constants. *blocks all following steps*
3. Design final API contracts for methods: getRequest, getAllRequests, getLoan, getAllLoans, requestLoan, acceptRequestLoan, rejectRequestLoan, registerLoan. Confirm payload ownership (actor user id from session vs payload). *blocks step 4 onward*
4. Phase 2: Types and validation
5. Rewrite Loan types to model request/loan summaries, detail payloads, registerLoan detail lines, optional trace entries, and filtered list inputs. Keep movement_id as primary identifier across request and loan views. *depends on 2-3*
6. Implement Zod schemas aligned to those types, including transition-specific validation (reject requires observation, accept requires estimated return date, registerLoan requires at least one detail line). *depends on 5*
7. Phase 3: Data access design
8. Build query set for request and loan list/detail views with optional filters and joins to lapse, movement_type, movement_detail, inventory, item, location. Include queries for transition updates and stock mutation. *depends on 6*
9. Add transactional repository methods for lifecycle updates: create request movement, accept/reject update same movement, registerLoan insert details and decrement inventory safely. *depends on 8*
10. Phase 4: Service orchestration
11. Implement service guards and transitions: only pending requests can be accepted/rejected; only accepted requests can be registered; inventory cannot go negative; equipment vs component quantity rules respected when registering details. *depends on 9*
12. Add traceability strategy in service/repository: return timeline from movement timestamps plus optional audit source, exposed via include_trace flags in getRequest/getLoan detail methods. *parallel with 11 after 9*
13. Phase 5: BO surface and wiring
14. Update LoanBO methods to call new service operations and return method-specific messages. Ensure getAll methods pass optional filters through entire chain (schema -> BO -> service -> repository -> SQL). *depends on 11-12*
15. Update messages and domain errors for transition failures and stock conflicts. *parallel with 14*
16. Phase 6: Verification
17. Add/adjust unit tests for type-level contract usage and service transition behavior: request creation, accept/reject idempotency checks, registerLoan stock effects, invalid transitions, and filtered list retrieval.
18. Add integration tests for full request-to-loan lifecycle and detail trace retrieval.
19. Run quality gate for changed files and targeted loan tests.

**Relevant files**
- /home/eliabparra/Dev/web-2-backend/BO/Loan/LoanTypes.ts — define full domain contracts for request/loan workflow and method inputs/outputs.
- /home/eliabparra/Dev/web-2-backend/BO/Loan/LoanSchemas.ts — enforce transition and payload validations.
- /home/eliabparra/Dev/web-2-backend/BO/Loan/LoanQueries.ts — query layer for list/detail/transition/stock mutation operations.
- /home/eliabparra/Dev/web-2-backend/BO/Loan/LoanRepository.ts — transactional persistence methods and filter-aware reads.
- /home/eliabparra/Dev/web-2-backend/BO/Loan/LoanService.ts — business rules for lifecycle transitions and inventory enforcement.
- /home/eliabparra/Dev/web-2-backend/BO/Loan/LoanBO.ts — endpoint orchestration for request and loan methods.
- /home/eliabparra/Dev/web-2-backend/BO/Loan/LoanMessages.ts — success/error messages per operation.
- /home/eliabparra/Dev/web-2-backend/BO/Loan/LoanErrors.ts — domain exceptions for invalid state transitions and stock issues.
- /home/eliabparra/Dev/web-2-backend/migrations/ddl/84_business_movement_type.ts — source of movement type structure.
- /home/eliabparra/Dev/web-2-backend/migrations/ddl/85_business_movement.ts — core movement lifecycle record.
- /home/eliabparra/Dev/web-2-backend/migrations/ddl/86_business_movement_detail.ts — registered loan line items.
- /home/eliabparra/Dev/web-2-backend/BO/Inventory/InventoryService.ts — reuse stock adjustment rules for registerLoan.

**Verification**
1. Validate that requestLoan inserts one movement row with request movement_type and pending lapse, without movement_detail rows.
2. Validate that acceptRequestLoan and rejectRequestLoan update the same movement row and preserve traceable timestamp fields.
3. Validate that registerLoan only works on accepted requests, inserts movement_detail lines, and decrements inventory with non-negative final stock.
4. Validate that getAllRequests/getAllLoans apply optional filters (user, lapse, date range, status) and that unfiltered calls still return full dataset.
5. Validate that getRequest/getLoan detail responses include optional trace output when include_trace is true.
6. Execute targeted tests for BO/Service/Repository and run project diagnostics on changed loan files.

**Decisions**
- Included scope: loan/request lifecycle API contract, stock effect orchestration, optional traceability in detail views, and filtered list support.
- Excluded scope: new DB migrations for audit schema changes unless existing audit source is insufficient.
- Recommended state model: one movement row across request lifecycle; movement_detail rows are created only at registerLoan.
- Recommended identity model: movement_id is the single external identifier for both request and loan operations.

**Further Considerations**
1. Movement and lapse identifiers: prefer lookup by descriptive code/name at startup over hardcoded numeric IDs.
2. Trace source: if security.audit already captures transaction attempts, join it for include_trace; otherwise provide timeline from movement and movement_detail timestamps as baseline.
3. Register granularity: define whether partial fulfillment of requested items is allowed at registerLoan; if yes, include per-detail note and quantity variance handling.
