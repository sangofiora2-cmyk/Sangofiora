---
name: security-review
description: Complete a security-focused code review of pending changes or pull requests to identify high-confidence vulnerabilities, input validation bugs, authentication flaws, and data exposure.
---

# Security Review

Perform a security-focused code review to identify HIGH-CONFIDENCE security vulnerabilities that could have real exploitation potential.

## OBJECTIVE
Perform a security-focused code review to identify HIGH-CONFIDENCE security vulnerabilities that could have real exploitation potential. This is not a general code review - focus ONLY on security implications newly added by changes. Do not comment on existing security concerns.

## CRITICAL INSTRUCTIONS
1. **MINIMIZE FALSE POSITIVES**: Only flag issues where you're >80% confident of actual exploitability
2. **AVOID NOISE**: Skip theoretical issues, style concerns, or low-impact findings
3. **FOCUS ON IMPACT**: Prioritize vulnerabilities that could lead to unauthorized access, data breaches, or system compromise
4. **EXCLUSIONS**: Do NOT report the following issue types:
   - Denial of Service (DOS) vulnerabilities, even if they allow service disruption
   - Secrets or sensitive data stored on disk (these are handled by other processes)
   - Rate limiting or resource exhaustion issues

## SECURITY CATEGORIES TO EXAMINE

### Input Validation Vulnerabilities
- SQL injection via unsanitized user input
- Command injection in system calls or subprocesses
- XXE injection in XML parsing
- Template injection in templating engines
- NoSQL injection in database queries
- Path traversal in file operations

### Authentication & Authorization Issues
- Authentication bypass logic
- Privilege escalation paths
- Session management flaws
- JWT token vulnerabilities
- Authorization logic bypasses

### Crypto & Secrets Management
- Hardcoded API keys, passwords, or tokens
- Weak cryptographic algorithms or implementations
- Improper key storage or management
- Cryptographic randomness issues
- Certificate validation bypasses

### Injection & Code Execution
- Remote code execution via deserialization
- Pickle injection in Python
- YAML deserialization vulnerabilities
- Eval injection in dynamic code execution
- XSS vulnerabilities in web applications (reflected, stored, DOM-based)

### Data Exposure
- Sensitive data logging or storage
- PII handling violations
- API endpoint data leakage
- Debug information exposure

*Note: Even if something is only exploitable from the local network, it can still be a HIGH severity issue.*

## ANALYSIS METHODOLOGY

### Phase 1 - Repository Context Research
- Identify existing security frameworks and libraries in use
- Look for established secure coding patterns in the codebase
- Examine existing sanitization and validation patterns
- Understand the project's security model and threat model

### Phase 2 - Comparative Analysis
- Compare new code changes against existing security patterns
- Identify deviations from established secure practices
- Look for inconsistent security implementations
- Flag code that introduces new attack surfaces

### Phase 3 - Vulnerability Assessment
- Examine each modified file for security implications
- Trace data flow from user inputs to sensitive operations
- Look for privilege boundaries being crossed unsafely
- Identify injection points and unsafe deserialization

## REQUIRED OUTPUT FORMAT

Output findings in Markdown with the following structure for each finding:

# Vuln 1: Category: `file_path:line_number`

* **Severity**: High / Medium / Low
* **Description**: Clear description of the vulnerability.
* **Exploit Scenario**: Concrete example scenario showing how an attacker could exploit this issue.
* **Recommendation**: Specific actionable guidance on how to fix or mitigate the vulnerability.

### SEVERITY GUIDELINES
- **HIGH**: Directly exploitable vulnerabilities leading to RCE, data breach, or authentication bypass
- **MEDIUM**: Vulnerabilities requiring specific conditions but with significant impact
- **LOW**: Defense-in-depth issues or lower-impact vulnerabilities

### CONFIDENCE SCORING
- **0.9 - 1.0**: Certain exploit path identified
- **0.8 - 0.9**: Clear vulnerability pattern with known exploitation methods
- **0.7 - 0.8**: Suspicious pattern requiring specific conditions to exploit
- **Below 0.7**: Don't report (too speculative)

## FALSE POSITIVE FILTERING & HARD EXCLUSIONS

Automatically exclude findings matching these patterns:
1. Denial of Service (DOS) vulnerabilities or resource exhaustion attacks.
2. Secrets or credentials stored on disk if they are otherwise secured.
3. Rate limiting concerns or service overload scenarios.
4. Memory consumption or CPU exhaustion issues.
5. Lack of input validation on non-security-critical fields without proven security impact.
6. Input sanitization concerns for GitHub Action workflows unless they are clearly triggerable via untrusted input.
7. Lack of hardening measures. Code is not expected to implement all security best practices, only flag concrete vulnerabilities.
8. Race conditions or timing attacks that are theoretical rather than practical.
9. Vulnerabilities related to outdated third-party libraries (managed separately).
10. Memory safety issues in memory-safe languages (Rust, Go, Java, JS/TS, Python).
11. Files that are unit tests or test helpers only.
12. Log spoofing concerns (outputting un-sanitized user input to logs is not a vulnerability).
13. SSRF vulnerabilities that only control the path (SSRF is only a concern if host/protocol can be controlled).
14. User-controlled content inside AI system prompts.
15. Regex injection or Regex DOS concerns.
16. Insecure documentation or markdown files.
17. Lack of audit logs.

### PRECEDENTS
- Logging high value secrets in plaintext is a vulnerability. Logging URLs is safe.
- UUIDs can be assumed unguessable.
- Environment variables and CLI flags are trusted values.
- Client-side JS/TS code permission checks are not required; backend handles authentication and authorization.
- React and Angular are generally secure against XSS unless using `dangerouslySetInnerHTML` or equivalent.
