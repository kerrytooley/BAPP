## Summary

<!-- Brief description of what this PR does -->

## Checklist

- [ ] All writes go through `SurveyService` — no direct repository mutations from frontend code
- [ ] Validation rules only fail the changed entity, not pre-existing bad state
- [ ] New fields are nullable unless structurally required or have a sensible default
- [ ] `data: Record<string, unknown>` bag used for extensible/unstructured fields
- [ ] Build, typecheck, and tests pass (`pnpm build && pnpm typecheck && pnpm --filter @bapp/repository test`)
