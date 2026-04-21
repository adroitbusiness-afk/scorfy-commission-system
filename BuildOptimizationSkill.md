# Build Optimization Skill

## Description
This workspace-scoped skill optimizes the commission system project's build process to achieve faster build times and fix times. It produces a performance report with before/after metrics and ongoing recommendations, focusing on Next.js best practices.

## Steps
1. **Baseline Measurement**: Run Next.js build and analyze output for times, bundle sizes, and warnings using build logs and webpack-bundle-analyzer.
2. **Bottleneck Analysis**: Identify slow components, large bundles, unoptimized images, and inefficient patterns in the Next.js app.
3. **Apply Optimizations**:
   - Implement code splitting and dynamic imports for large components
   - Optimize images and static assets
   - Enable tree shaking and remove unused code
   - Configure ISR and static generation where appropriate
   - Optimize middleware and API routes
4. **Re-measure and Validate**: Run build again and compare metrics using the same tools.
5. **Generate Optimization Report**: Provide summary of improvements, changes made, and maintenance tips.

## Decision Points
- If bundle size > 1MB: Apply code splitting and lazy loading
- If build time > 2 minutes: Optimize static assets and reduce dependencies
- If images are unoptimized: Implement Next.js Image component and compression
- If middleware is slow: Review and optimize API routes
- If all metrics are good: Focus on preventive measures

## Quality Criteria
- Measurable reduction in build times (target: 20%+ improvement)
- Bundle size under 2MB for main chunks
- All images optimized with Next.js Image
- Clear documentation of all changes
- Comprehensive maintenance checklist provided

## Example Usage
"Optimize the build process for faster development cycles in this Next.js project."