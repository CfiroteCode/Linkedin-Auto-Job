# Linkedin Auto Job Apply Bot

This project automates job applications on LinkedIn using Playwright, AI assistance (via GPT-4-Free), and a bit of Python for communication.

## Features
- Automates the "Easy Apply" process on LinkedIn
- Uses Playwright for browser automation
- Automatically fills unanswered fields using resume information wi AI via GPT-4-Free
- Simple configuration via JavaScript and environment variables

## Installation

### Prerequisites
Ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [Python](https://www.python.org/downloads/) (required for AI integration)
- [Visual Studio Code](https://code.visualstudio.com/)

### Steps
1. **Clone the Repository**
   ```sh
   git clone https://github.com/your-username/Linkedin-Auto-Job.git
   cd Linkedin-Auto-Job
   ```

2. **Install Dependencies**
   ```sh
   npm install
   ```

3. **Install Playwright Browsers**
   ```sh
   npx playwright install
   ```

4. **Set Up Configuration**
   - Create a `.env` file in the project root and add your LinkedIn credentials:
     ```sh
     LINKEDIN_EMAIL='your email'
     LINKEDIN_PASSWORD='your password'
     ```
   - Modify `config.js` with your job search preferences.
   - Ensure `resume.txt` contains as much detailed information as possible about your experience, skills, and background. The AI will use this file to generate answers when required.

5. **Run the Script**
   ```sh
   npx playwright test tests/Linkedin.spec.ts
   ```

## AI Integration (GPT-4-Free)
This project uses GPT-4-Free for AI assistance within the Playwright script. Python is required to run `gpt4free.py`, which facilitates communication with the AI. The AI will automatically fill empty application fields using the information provided in `resume.txt`.

## Running in Visual Studio Code
1. Open the project in VS Code:
   ```sh
   code Linkedin-Auto-Job
   ```
2. Install recommended extensions:
   - Playwright Test for VS Code
   - Python extension (required for AI features)
3. Run tests from the VS Code Test Explorer.

## Troubleshooting
- Ensure LinkedIn account security settings allow automation.
- If login issues occur, verify credentials in `.env`.
- Run Playwright in debug mode: `npx playwright test --debug`.

## License
This project is open-source under the MIT License.

