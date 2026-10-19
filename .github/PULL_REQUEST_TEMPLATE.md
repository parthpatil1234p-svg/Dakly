## Description
<!-- Provide a brief summary of the changes in this pull request and the rationale behind them. -->

## Related Issues
<!-- Link related issues using GitHub keywords, e.g. Closes #12, Fixes #34 -->
Closes #

## Type of Change
<!-- Mark the relevant options with an 'x' -->
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] 📝 Documentation update
- [ ] ⚡ Performance improvement / refactor
- [ ] 🧪 Tests / CI pipeline update

## Subsystems Touched
- [ ] Core Engine / Pacing / SMTP Service (`src/services/`)
- [ ] REST API Controllers / Routes (`src/controllers/`, `src/routes/`)
- [ ] Security / IP Whitelist / RBAC (`src/middleware/`, `src/utils/ipFilter.js`)
- [ ] Email Templates & Variable Engine (`src/utils/templateEngine.js`)
- [ ] Tracking & Analytics (`src/utils/trackingHelper.js`)
- [ ] Official Node.js SDK (`packages/dakly/`, `sdk/dakly.js`)
- [ ] Official Python SDK (`sdk/python/dakly/`)
- [ ] Dashboard Frontend UI (`frontend/src/`)
- [ ] Documentation (`docs/`, `README.md`)

## Verification Checklist
- [ ] My code follows the established code style and zero-hardcoded-secret rule.
- [ ] I have executed `npm test` locally and all unit test suites passed.
- [ ] (If modifying Python SDK) I have executed `python tests/test_sdk_python.py` and all tests passed.
- [ ] (If modifying frontend) I have run `npm run build` in `frontend/` and Vite compiled successfully with 0 errors.
- [ ] I have updated documentation / README / CHANGELOG if applicable.
- [ ] Any new public methods include descriptive JSDoc / docstrings.
