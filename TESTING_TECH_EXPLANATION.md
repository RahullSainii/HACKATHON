# Testing Technology Choice: Selenium WebDriver via npm (No External JAR Files)

## Overview

This project uses **Selenium WebDriver as an npm package** instead of external JAR files. This is a modern JavaScript/Node.js approach rather than traditional Java Maven.

---

## What We're Using

### ✅ **Our Approach: npm + JavaScript + Selenium WebDriver**

**Location**: `e2e-tests/` folder

**Package Configuration** (`e2e-tests/package.json`):
```json
{
  "dependencies": {
    "selenium-webdriver": "^4.17.0",  // Selenium WebDriver npm package
    "chromedriver": "^147.0.0"         // ChromeDriver npm package
  },
  "devDependencies": {
    "mocha": "^10.2.0",
    "chai": "^4.3.10"
  }
}
```

**How it works**:
1. Dependencies are installed via `npm install` (from npm registry, not external JARs)
2. Tests are written in **JavaScript** using Selenium WebDriver
3. No compilation needed; runs directly with Node.js
4. ChromeDriver is managed as an npm package

---

## What We're NOT Using

### ❌ **Traditional Java/Maven Approach with External JAR Files**

**Note**: The `selenium_test/` folder contains a `pom.xml` file (Maven config), but it is **not actively used**.

**Why we avoided this approach**:
- Would require downloading external JAR files (selenium-java, etc.)
- Would need Maven compilation step
- More complex setup for browser automation
- Less flexible for a Node.js/JavaScript project

---

## Actual Test Implementation

### Test File Example
**File**: `e2e-tests/tests/basic.spec.js`

```javascript
const { Builder, By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');  // npm package

describe('Complaint System E2E Tests', () => {
  let driver;

  beforeEach(async () => {
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeService(new chrome.ServiceBuilder(chromedriver.path))
      .build();
  });

  it('should register a new user', async () => {
    await driver.get(FRONTEND_URL + '/register');
    // Browser automation logic...
  });
});
```

**Key Points**:
- `selenium-webdriver` is installed via npm (no JAR files)
- `chromedriver` is managed as npm package (not external download)
- Tests run with Mocha test runner
- No Java compilation or Maven build needed

---

## Advantages of This Approach

| Aspect | npm Approach | External JAR Approach |
|--------|-------------|---------------------|
| **Package Management** | npm install (automatic) | Manual JAR downloads |
| **Language** | JavaScript (Node.js) | Java |
| **Build Step** | None needed | Maven compile required |
| **Setup Complexity** | Simple | Complex |
| **Consistency** | Full-stack JavaScript | Mixed Java/JavaScript |

---

## How to Run Tests (No External JAR Files Required)

```bash
# Install dependencies (npm packages only)
cd e2e-tests
npm install

# Run tests
npm run test:show

# Generate HTML report
ant -f build.xml generate-report
```

---

## What This Demonstrates

1. **Modern Testing Stack**: Using current JavaScript/Node.js ecosystem
2. **No External Dependencies**: All dependencies via npm (not external JARs)
3. **Selenium WebDriver Usage**: Direct use of browser automation API
4. **Full-Stack Consistency**: Backend (Node.js), Frontend (React/Node), Tests (Node.js) - all JavaScript-based

---

## Comparison Table

| Criterion | Our Implementation | Traditional JAR Approach |
|-----------|-------------------|------------------------|
| Package Manager | npm | Maven (downloads JARs) |
| Language | JavaScript | Java |
| Selenium WebDriver | Via npm package | Via external JAR |
| ChromeDriver | npm package | Manual download |
| Test Runner | Mocha | TestNG/JUnit |
| Entry Point | `npm install` + `npm run test` | `mvn compile` + `mvn test` |

---

## Conclusion

This project uses **Selenium WebDriver as an npm package**, which means:
- ✅ No external JAR files downloaded
- ✅ All dependencies managed via npm
- ✅ Modern JavaScript/Node.js stack
- ✅ Cleaner, simpler setup
- ✅ Consistent with the rest of the tech stack (Node.js backend, React frontend)
