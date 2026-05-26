# Mock Buddy Platform Specification

Build an AI Mock Buddy platform that helps users to prepare for interviews using AI-driven questions and timed mock interviews.

## Project Purpose

This platform is designed to:
- Help users upload and analyze resumes
- Generate personalized interview questions
- Run timed mock interviews
- Evaluate answers using AI
- Store results securely for later review

## Tech Stack and Why It Is Used

### Frontend: React and TypeScript
- Used to build an interactive, and reusable user interface.
- React helps create dynamic pages like resume upload and dashboard.
- TypeScript reduces bugs.

### Backend: Node.js and Express.js
- Used to handle server-side logic, API requests, authentication, and database operations.
- Node.js is good for scalable JavaScript-based backend development.
- Express.js makes it easy to build REST APIs quickly and cleanly.

### Database: MongoDB Atlas
- Used to store user accounts, resumes, interview sessions, feedback, and analytics in the cloud.
- Flexible schema is useful because interview data can vary in structure.

### AI APIs: Gemini
- Used to power resume parsing, question generation, and answer evaluation.
- The AI API is needed so the system can understand resume content, create smart interview questions, and give feedback automatically.

### Deployment: Vercel and Render
- Used to deploy the frontend and backend separately.
- Vercel is used for hosting the frontend.
- Render is used for hosting the backend server and APIs.

---

## Core Features

### 1. Authentication
- Implement Signup and Login with JWT authentication.
- Implement protected routes and session persistence.
- Implement secure token storage.
- Support candidate and interviewer roles.
- Rationale: To make sure only authorized users can access the platform and to separate candidate and interviewer access.

### 2. Resume Upload and Validation
- Create a drag-and-drop resume upload system.
- Support PDF, DOCX, and TXT files.
- Restrict max file size to 5MB.
- Perform file type and size validation.
- Show upload progress indicator.
- Support retry and error handling.
- Offer a Load Sample Resume option.
- Rationale: To let users upload resumes easily and ensure only valid files are processed.

### 3. AI Resume Extraction and Data Preprocessing
- Use Gemini API to extract structured resume data.
- Perform the following data preprocessing steps:
  - Text Cleaning and Normalization: Tidies up extra spaces, broken lines, and messy formatting so that the AI reads clean, consistent text instead of noise.
  - Duplicate Removal: Identifies repeated words, skills, or phrases (such as skills appearing in multiple job descriptions) and retains a single clean version to prevent over-counting.
  - Tokenization: Breaks sentences down into smaller, meaningful word chunks that the system can analyze and process.
  - Lemmatization: Converts inflected forms of words (like "developed", "developing", "developer") back to their base dictionary form so that experiences are mapped correctly regardless of wording.
  - Section Detection: Analyzes headings and contents to automatically classify sections as Skills, Experience, or Education, even if custom titles were used.
- Rationale: Preprocessing improves extraction accuracy and reduces errors.
- Action Buttons:
  - Re-upload Resume
  - Continue to Interview

### 4. Interview Setup
- Allow users to configure:
  - Interview domain: Software Engineering, Data Science, Frontend, Backend, Full Stack, DevOps, Machine Learning, or Product Management.
  - Experience level: Junior, Mid-Level, or Senior.
- Show interview summary:
  - 6 questions
  - 90 seconds per question
  - Easy, Medium, and Hard difficulty mix
  - Auto-submit on timeout
- Rationale: To personalize the interview experience based on the user's role and experience level.

### 5. Live AI Interview
- Build a real-time chat-style interview interface:
  - AI questions displayed on the left.
  - User answers displayed on the right.
  - Question counter and progress bar showing current advancement.
  - Difficulty badges showing question challenges.
  - Auto-scroll chat window keeping recent texts in focus.
  - Interactive Skip and Submit buttons.
  - Auto-next transition to the next question when the timer ends.
- Rationale: To simulate a real interview environment and keep the session interactive and timed.

### 6. AI Evaluation and Feedback
- Use AI to evaluate answers and generate:
  - Overall score ranging from 0 to 100.
  - A letter grade.
  - Detailed strengths and improvements breakdown.
  - Individual per-question feedback.
  - An AI-generated summary of the candidate's performance.
- Automatically save mock results to MongoDB.
- Rationale: To give users instant feedback and help them improve after the interview.

### 7. Interviewer Dashboard
- Create an analytics dashboard with:
  - Total sessions conducted.
  - Average score across candidates.
  - Recent interview sessions logs.
  - Candidate management lists.
  - Session history tracker.
  - Charts and analytics representations.
  - Detailed Q&A review page for specific sessions.
- Rationale: To help interviewers track performance and review candidate history in one place.

### 8. Backend APIs
- Implement REST APIs for:
  - Authentication
  - Resume parsing
  - Question generation
  - AI evaluation
  - Session management
  - Dashboard analytics
- Development rules:
  - Use Async/await operations.
  - Implement JWT middleware for authentication protection.
  - Ensure proper error handling and logging.
  - Manage parameters through environment variables.
- Rationale: APIs connect the frontend, backend, database, and AI services, enabling secure communication and data operations.

### 9. Database Schemas
- Create MongoDB schemas for:
  - Users
  - Interview Sessions
  - Feedback and evaluation data
- Rationale: To store structured data in a reusable way for login, interview history, and analytics.

### 10. UI/UX Requirements
- Design a premium responsive UI with:
  - A modern clean layout.
  - Soft shadows and card divisions.
  - Responsive layouts fitting mobile, tablet, and desktop viewports.
  - Accessible components adhering to standard design practices.
  - Smooth animations and micro-interactions.
- Rationale: To make the application interactive, user-friendly, and professional.

### 11. Error Handling
- Manage:
  - API failures and graceful retries.
  - Resume parsing exceptions and failures.
  - Empty or incomplete answers.
  - Network timeouts.
  - Timer cleanups to prevent memory leaks in the browser.
  - Fallback interview questions in the event of API outages.
- Rationale: To keep the app stable and usable even when external services fail.

### 12. Code Standards
- Adhere to:
  - Modular architecture design.
  - Reusable components.
  - Type-safe TypeScript.
  - Constants and utility folder divisions.
  - Clean and organized folder structures.
  - Secure configurations (no hardcoded secrets).
  - Production-quality code patterns.
- Rationale: To make the code easy to maintain, scale, and debug.

---

## Final Goal

Build a fully functional AI Interview Buddy platform featuring AI-powered resume parsing, resume data preprocessing, personalized interview generation, timed mock interviews, AI evaluation and analytics, an interviewer dashboard, secure cloud-based session storage, and a fully deployable architecture.
