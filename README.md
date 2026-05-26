# AI Interview Buddy - Platform User Manual

Welcome to the **AI Interview Buddy**! This platform is a fully interactive, state-of-the-art mock assessment application designed to help job seekers prepare for interviews. By uploading a resume, candidates get a highly customized, timed mock interview tailored to their background and target seniority level. The system evaluates their responses in real-time, scores them out of 100, and logs their performance history.

---

## 🚀 Dual-Mode Architecture

To provide maximum adaptability and an instant testing environment, this application operates in **two modes**:

### Mode 1: Direct Browser Mode (Zero-Install, Client-Side)
- **Concept**: Runs entirely inside your local web browser. No servers to boot, no Node.js commands to run, no database to install!
- **How it Works**:
  1. Simply double-click `index.html` to open it in Chrome, Edge, Safari, or Firefox.
  2. Click the ⚙️ (Settings) icon in the top-right corner, set the mode to "Direct Browser Mode", select your provider (Google Gemini or OpenAI), and paste your API key.
  3. All document parsing (PDF and DOCX) is done securely **client-side** in your browser using high-performance JavaScript engine ports.
  4. The app fetches content directly and securely from Google Gemini or OpenAI's API.
  5. Your history and active progress are stored locally in your browser's private secure cache (`localStorage`).

### Mode 2: Full-Stack Mode (Node.js + Express + Mongoose DB)
- **Concept**: A traditional full-stack client-server architecture serving both API endpoints and static assets.
- **How it Works**:
  1. Boot the Express backend (`server.js`) on port 5000.
  2. The server handles document uploading, uses standard parsing (`pdf-parse` and `mammoth` on Node), communicates with OpenAI, and commits logs to MongoDB.
  3. If MongoDB is not running, the backend **gracefully falls back** to a local structured JSON database (`db_fallback.json`) to prevent failures!

---

## 📂 File Structure

```text
C:\Users\Admin\.gemini\antigravity\scratch\interview-buddy\
├── index.html         # Main SPA entrypoint linking Tailwind, React, and Document CDN scripts
├── app.js             # React application logic, state manager, timer engine, and API connectors
├── styles.css         # Custom stylesheet defining glassmorphism tokens, gradients, and timer animations
├── server.js          # Production-grade Node.js + Express backend server
├── package.json       # Node.js backend configuration and dependency map
├── sample_resume.txt  # Plain-text developer resume for immediate drag-and-drop testing
└── README.md          # Comprehensive user manual and API documentation (this file)
```

---

## 🛠️ Installation & Setup (Full-Stack Mode)

To run the full-stack server locally:

### 1. Prerequisites
Ensure you have Node.js (version 18 or above) installed on your system.

### 2. Install Dependencies
Open a terminal in the project directory and execute:
```bash
npm install
```

### 3. Configure Environment Variables
Create a file named `.env` in the root of the project directory and populate it with:
```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
MONGODB_URI=mongodb://localhost:27017/interview-buddy
```
*(Note: If you leave `MONGODB_URI` blank, the server automatically defaults to local JSON file storage, making it instantly runnable!)*

### 4. Run the Server
To launch the application:
```bash
npm start
```
Once started, navigate your browser to: **`http://localhost:5000`**

---

## 🔑 Environment Variables Set

The Node.js backend uses the following environment variables:

| Variable | Type | Description | Required | Fallback |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Number | The port the Express server will listen on. | No | `5000` |
| `OPENAI_API_KEY` | String | API key powering resume parsing and scoring. | Yes (in Server Mode) | None |
| `MONGODB_URI` | String | Connection string for MongoDB database. | No | Local JSON DB |

---

## 📡 API Documentation (Backend endpoints)

All endpoints accept and return JSON payloads.

### 1. GET `/api/history`
Retrieves a list of all completed mock interviews.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "history": [
      {
        "id": "sess_x12y34z",
        "name": "John Doe",
        "email": "john.doe@email.com",
        "experienceLevel": "Senior",
        "interviewType": "Technical",
        "score": 88,
        "date": "2026-05-25T17:50:23.000Z"
      }
    ]
  }
  ```

### 2. GET `/api/history/:id`
Retrieves the full detailed record of a past interview session, including full question transcripts and conversation logs.
- **Response (200 OK)**: Returns the active `session` object linked to a `userId` profile.

### 3. POST `/api/interview`
Dual-purpose endpoint depending on content headers.
- **Uploading File (multipart/form-data)**: Takes a binary resume file (`file`), parses it, sends text to OpenAI, saves and returns a structured `profile` object.
- **Initializing Session (application/json)**: Takes `{ profileId, experienceLevel, interviewType }`, generates 5 tailored questions, creates a timed session, and returns the `session` object containing the first question.

### 4. PUT `/api/interview`
Submits active question answers, saves progress, and transitions to the next question.
- **Request Body**:
  ```json
  {
    "sessionId": "sess_x12y34z",
    "answer": "My response to the question...",
    "isAutoSubmit": false,
    "timeRemainingSeconds": 240
  }
  ```
- **Response (200 OK)**:
  - If `completed: false`, returns the updated session with the next question in the `chatLog`.
  - If `completed: true`, returns the updated session evaluated by AI, including the score (0-100) and structured markdown feedback.

---

## ☁️ Deployment Process

### Frontend Deployment
Since the frontend is a fully static Single Page Application (`index.html`, `app.js`, `styles.css`), it can be deployed to any static site hosting service for **free** with zero backend requirements:
1. **GitHub Pages**: Push the repository and set the pages folder to the root.
2. **Vercel / Netlify**: Connect your repository, select "Other" as the framework, and deploy.
3. *Note*: In static deployment, users will configure their API keys in the settings modal, which connects directly to Gemini/OpenAI API endpoints.

### Backend Deployment
To host the Node.js Express server:
1. **Render / Heroku**: Connect your Github repository, select Node.js as the runtime, input your `.env` variables in the environment configuration panel, and launch.
2. **Docker**: Use a base Node image, copy files, expose port `5000`, and start the app (`node server.js`).
