# Selenium End-to-End Testing for Samadhaan

This directory contains Selenium-based end-to-end (E2E) tests for the Samadhaan Complaint Management System.

## Prerequisites

1.  **Node.js**: Ensure you have Node.js installed.
2.  **Google Chrome**: The tests are configured to use Google Chrome.
3.  **ChromeDriver**: The `chromedriver` package is included in `package.json`. It should match your Chrome version.

## Setup

1.  Navigate to this directory:
    ```bash
    cd e2e-tests
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Running Tests

1.  **Start your application**:
    Ensure the backend and frontend are running. By default, the tests expect the frontend at `http://localhost:5173`.
    - Backend: `cd backend && npm start`
    - Frontend: `cd frontend-new && npm run dev`

2.  **Run the tests**:
    In a new terminal, from the `e2e-tests` directory:
    *Ensure you have run `npm install` inside this directory first to install Mocha.*
    ```bash
    # PowerShell
    cd C:\Users\HP\Desktop\Samadhaan---complaint-management-master\e2e-tests
    Remove-Item Env:HEADLESS -ErrorAction SilentlyContinue
    npm.cmd run test:show
    ```
    This command also writes `test-output\testng-results.xml` for XSLT report generation.

3.  **Generate XSLT report HTML**:
    ```bash
    # Requires Apache Ant in PATH
    ant -f C:\Users\HP\Desktop\Samadhaan---complaint-management-master\e2e-tests\build.xml generate-report
    ```
    Generated file: `test-output\XSLT_Report.html`

## Registration Test (Backend Script)

If you only want to test the registration flow quickly, use the Selenium script in `backend/test-selenium.js`.

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Start backend API:
   ```bash
   npm start
   ```
3. In another terminal, start frontend:
   ```bash
   cd frontend-new
   npm install
   npm run dev
   ```
4. In a third terminal, run registration test:
   ```bash
   cd backend
   npm run test:selenium:register
   ```

Optional environment variables:
- `HEADLESS=true` to run Chrome in headless mode
- `FRONTEND_URL=http://localhost:5173` (default)
- `TEST_REGISTER_NAME`, `TEST_REGISTER_EMAIL`, `TEST_REGISTER_PASSWORD` to control test data

## Writing New Tests

1.  Create a new file in the `tests/` directory with the `.spec.js` extension (e.g., `tests/login.spec.js`).
2.  Use the `basic.spec.js` file as a template.
3.  Utilize the [Selenium WebDriver documentation](https://www.selenium.dev/documentation/webdriver/) for more advanced interactions.

## Troubleshooting

- **Version Mismatch**: If you get a "session not created" error, it's likely a mismatch between your Chrome browser version and the `chromedriver` version. Update the `chromedriver` version in `package.json` to match your Chrome version and run `npm install` again.
- **Timeouts**: If your application is slow to load, you might need to increase the timeout in `package.json` or use `driver.wait(until.elementLocated(...))`.
