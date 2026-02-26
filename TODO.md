# TODO

- [ ] Pass 2 performance cleanup: consolidate duplicated dashboard auth/profile/business access fetches across `Header`, `DashboardAuthGuard`, `useBusinessProfile`, and dashboard client/layout to further reduce server actions and Supabase calls.
- [ ] Admin RBAC rollout: add admin management UI in `/admin/utilisateurs` to assign `admin_access_level` and optional `admin_permissions`.
- [ ] Moderation queues: implement dedicated `business_reports` admin queue with SLA aging, filters, and bulk actions.
- [ ] Two-person approvals: require secondary approval workflow for destructive actions (company merge, hard delete, verification override).
- [ ] Settings governance: enforce typed settings schema validation server-side (reject unknown keys), add config versioning + rollback.
- [ ] Review moderation cockpit: add detail screen with full context, revision history, and policy checklist.
- [ ] Salary anti-abuse: add outlier scoring, burst detection, and clustering signals in moderation table.
- [ ] Audit logs v2: unify storage to a single append-only event stream with before/after diff and request/session metadata.
- [ ] Ops analytics: add backlog SLA dashboard, reversal rate, appeals success, and reject-reason distribution.
