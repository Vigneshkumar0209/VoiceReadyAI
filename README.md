# VoiceReady AI 🎙️

**AI-Powered Mock Interview Coach**

VoiceReady AI is an AI-powered mock interview coaching application designed to help job seekers practise interviews, evaluate their answers, and improve their interview preparation.

The project aims to support fresh graduates, first-generation job seekers, and candidates from non-English-medium backgrounds by providing interview practice and actionable feedback.

## 📌 Table of Contents

- About the Project
- Features
- Technology Stack
- Project Structure
- Prerequisites
- Installation and Setup
- Configure Gemini API Key
- Run the Backend
- Run the Frontend
- How to Use the Application
- API Documentation
- Troubleshooting
- Security
- Future Improvements
- Author

## 📖 About the Project

Many fresh graduates have technical knowledge but struggle to communicate their answers confidently during job interviews. VoiceReady AI aims to provide a convenient environment where candidates can practise interview questions and receive AI-assisted feedback.

The application combines a React frontend, a Python FastAPI backend, and Google's Gemini API to support the configured interview and coaching workflows.

## ✨ Features

- **Role-Based Interview Practice:** Practise interviews for available technical, HR, and other configured roles.
- **AI-Generated Interview Questions:** Generate questions based on the selected interview role.
- **Answer Evaluation:** Receive feedback and scores for submitted answers.
- **Strengths and Improvements:** Identify positive aspects and areas that need improvement.
- **AI Practice Coach:** Chat with an AI coach for additional interview preparation.
- **Resume-Based Interview:** Use the supported resume upload flow to begin interview practice.
- **Final Interview Report:** Review the performance information and recommendations returned by the backend.
- **Audio Answer Input:** Record and submit answers through the configured audio workflow.

*Feature availability depends on the implementation and backend endpoints included in the repository.*

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development server |
| JavaScript | Frontend application logic |
| CSS | Styling and responsive layout |
| Python | Backend programming language |
| FastAPI | Backend API framework |
| Google Gemini API | AI-generated questions, feedback, and coaching |
| Uvicorn | ASGI server for FastAPI |

## 📁 Project Structure

The following is an example structure. Adjust it to match the actual files in your repository.

```text
VoiceReadyAI/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── llm.py
│   │   └── prompts.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

## 💻 Prerequisites

Install the following software before running the application.

### 1. Python

Install Python 3.10 or another version compatible with the backend dependencies.

Check your installation:

```bash
python --version
```

On Windows, you can also run:

```bat
py -3.10 --version
```

### 2. Node.js and npm

Install a supported Node.js version from:

https://nodejs.org/

Check the installation:

```bash
node --version
npm --version
```

### 3. Git

Git is recommended for cloning the repository:

https://git-scm.com/

### 4. Google Gemini API Key

Get your own API key from:

https://aistudio.google.com/

Each developer must configure their own key. Never publish your actual key in the repository.

---

## 🚀 Installation and Setup

### Step 1: Download the project from GitHub

Open Command Prompt or PowerShell.

Clone the repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

Move into the project folder:

```bash
cd VoiceReadyAI
```

If you have already downloaded the project, open a terminal in the existing project folder instead.

### Step 2: Configure the backend

Open a terminal and enter the backend folder:

```bat
cd backend
```

Create a Python virtual environment:

```bat
py -3.10 -m venv venv
```

Activate the virtual environment:

```bat
venv\Scripts\activate
```

After activation, the terminal should show `(venv)` at the beginning of the command prompt.

Install the required Python packages:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Wait until the installation finishes.

**Important:** If the dependency installation fails, check the Python version and the error message. Do not install arbitrary package versions without checking compatibility with `requirements.txt`.

---

## 🔑 Configure the Gemini API Key

VoiceReady AI uses the Google Gemini API for its AI-powered functionality.

### Step 3: Create your `.env` file

Inside the `backend` folder, create a file named `.env`.

Add the following configuration:

```env
GEMINI_API_KEY=your_own_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
```

Replace `your_own_gemini_api_key_here` with your own Gemini API key.

For example, the value should be your actual key, not the placeholder text.

Do not share the real key in this README, GitHub, screenshots, or public issues.

### Step 4: Check the environment configuration

The backend should load the variables from `.env`. For example, if your project uses `python-dotenv`, it should load the environment configuration before accessing the API key.

Your code should retrieve the key from an environment variable rather than hardcoding it.

**Never put the Gemini API key in React code or expose it through a frontend API response.**

The `.env.example` file committed to GitHub should contain placeholder values only.

---

## ▶️ Run the Backend

### Step 5: Start the FastAPI server

Make sure you are inside the `backend` folder and the virtual environment is active.

Run:

```bash
uvicorn app.main:app --reload
```

This command assumes your FastAPI application is defined as `app` in `backend/app/main.py`.

If startup succeeds, the terminal should show a message indicating that the server is running.

Open these URLs in your browser:

- **Backend API:** http://127.0.0.1:8000
- **Interactive API documentation:** http://127.0.0.1:8000/docs

Keep this terminal open while using the application.

If your project uses a different FastAPI entry point, use the matching Uvicorn command.

---

## ▶️ Run the Frontend

### Step 6: Open a second terminal

Do not close the backend terminal.

Open a new Command Prompt or PowerShell window.

Navigate to the frontend folder from the project root:

```bat
cd path\to\VoiceReadyAI\frontend
```

Replace the path with the actual location of your project.

If your new terminal is already in the project root, simply run:

```bat
cd frontend
```

### Step 7: Install frontend dependencies

Run:

```bash
npm install
```

This installs the dependencies listed in `package.json`.

### Step 8: Start the React application

Run:

```bash
npm run dev
```

Vite will print a local development URL in the terminal. It is commonly:

http://localhost:5173

Open the URL printed by Vite in your browser.

Keep the frontend terminal open as well.

### Step 9: Check the backend connection

In your frontend configuration, verify that the API base URL points to your running FastAPI server.

For local development, your code may use:

```javascript
const API_BASE_URL = "http://127.0.0.1:8000";
```

If the frontend uses another configuration method, update the corresponding setting.

The browser frontend and backend must both be running for the full application to work.

---

## 🧑‍💻 How to Use VoiceReady AI

1. Start the backend server.
2. Start the frontend development server.
3. Open VoiceReady AI in your browser.
4. Select an available interview role and configure the interview.
5. Answer the generated interview questions.
6. Submit answers for AI evaluation.
7. Review the feedback and suggestions returned by the backend.
8. Use AI Practice Coach for additional interview preparation.
9. Review the final report after completing the interview.
10. Test the resume upload workflow if it is enabled.

The exact screens and available options depend on the current implementation.

## 📚 API Documentation

FastAPI provides interactive API documentation when the backend is running.

Open:

http://127.0.0.1:8000/docs

Use the documentation to inspect the available endpoints, request formats, and responses.

The endpoints shown in the documentation depend on the routes registered in the backend.

## 🐛 Troubleshooting

### Problem 1: `uvicorn` is not recognized

Activate the virtual environment and install the backend dependencies:

```bash
pip install -r requirements.txt
```

Then try:

```bash
python -m uvicorn app.main:app --reload
```

### Problem 2: Gemini API key is missing

Check that:

- The `.env` file exists in the backend folder.
- The variable is named `GEMINI_API_KEY`.
- The key is valid.
- The backend loads the environment variables.
- The backend was restarted after configuration changes.

Never paste the key into an error report or public issue.

### Problem 3: Frontend cannot connect to the backend

Check that:

- The backend is running on the configured port.
- The frontend API base URL is correct.
- The browser console and backend terminal do not show errors.
- FastAPI CORS settings allow the frontend's development origin.

### Problem 4: `npm install` fails

Check your Node.js and npm versions, internet connection, and the error reported by npm.

If dependencies are already installed, try:

```bash
npm run dev
```

### Problem 5: AI requests fail

Check your Gemini API configuration, API usage limits, model availability, and backend logs. Do not expose API keys in logs or screenshots.

## 🔐 Security

- Keep `.env` files out of GitHub.
- Use `.env.example` for safe configuration documentation.
- Keep API keys on the backend.
- Never commit private credentials.
- Avoid committing real candidate resumes or other personal information.
- Configure suitable CORS rules before deployment.
- Review API usage limits and applicable Google Gemini API terms.

Add the following to `.gitignore`:

```gitignore
.env
.env.*
!.env.example
venv/
.venv/
__pycache__/
*.py[cod]
.pytest_cache/
node_modules/
dist/
*.log
```

If a real API key was already committed or exposed, revoke or rotate it. Removing the file from the latest commit alone may not remove it from Git history.

## 🔮 Future Improvements

Potential future enhancements include:

- Expanded regional-language support
- More detailed speech analysis
- Personalised interview practice plans
- Persistent interview history
- Additional interview roles and question sets

These are proposed improvements unless they are already implemented in the current version.

## 👨‍💻 Author

**Vigneshkumar V**

## 📄 License

No license has been specified yet. Add a license file if you intend to grant others permission to use, modify, or distribute the project.
