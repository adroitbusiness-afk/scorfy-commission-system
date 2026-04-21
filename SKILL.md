# Deployment Readiness Analysis Skill

## Description
This workspace-scoped skill analyzes the commission system project's code quality and readiness for commercial deployment on Vercel. It produces a comprehensive readiness report with actionable recommendations.

## Steps
1. **Code Quality Check**: Run linting, check for syntax errors, and review code standards.
2. **Build Verification**: Ensure the project builds successfully without errors.
3. **Configuration Review**: Check environment variables, Next.js configs, and Vercel-specific settings.
4. **Deployment Compatibility**: Verify components are compatible with Vercel deployment (serverless functions, static assets, etc.).
5. **Generate Readiness Report**: Produce a summary with status, issues found, and fixes needed.

## Decision Points
- If linting errors are found: Prioritize critical errors and suggest immediate fixes.
- If build fails: Identify root causes and provide debugging steps.
- If configuration issues: Recommend specific changes for Vercel compatibility.
- If all checks pass: Confirm "Vercel ready" status.

## Quality Criteria
- Complete analysis of all major deployment aspects
- Clear identification of blocking issues vs. minor improvements
- Actionable recommendations with code examples where possible
- Final "Vercel ready" determination based on objective criteria