# Mock Buddy Platform

Build  AI Mock Buddy platform that helps users  to prepare for interviews using AI-driven questions and timed mock interviews.

## Project Purpose

This platform is designed to:
- help users upload and analyze resumes,
- generate personalized interview questions,
- run timed mock interviews,
- evaluate answers using AI,
- and store results securely for later review.

## Tech Stack and Why It Is Used

### Frontend: React + TypeScript
Used to build a interactive, and reusable user interface.
- React helps create dynamic pages like resume upload and dashboard.
- TypeScript reduces bugs.

### Backend: Node.js + Express.js
Used to handle server-side logic, API requests, authentication, and database operations.
- Node.js is good for scalable JavaScript-based backend development.
- Express.js makes it easy to build REST APIs quickly and cleanly.

### Database: MongoDB Atlas
Used to store user accounts, resumes, interview sessions, feedback, and analytics in the cloud.
- Flexible schema is useful because interview data can vary in structure.

### AI APIs: Gemini
Used to power resume parsing, question generation, and answer evaluation.
- The AI API is needed so the system can understand resume content, create smart interview questions, and give feedback automatically.

### Deployment: Vercel + Render
Used to deploy the frontend and backend separately.
- Vercel is used for hosting the frontend.
- Render is used for hosting the backend server and APIs.

---

## Core Features

### 1. Authentication
Implement:
- Signup/Login with JWT authentication
- Protected routes and session persistence
- Secure token storage
- Candidate and Interviewer roles

**Why this is needed:**
To make sure only authorized users can access the platform and to separate candidate and interviewer access.

### 2. Resume Upload & Validation
Create a drag-and-drop resume upload system with:
- PDF, DOCX, TXT support
- Max file size: 5MB
- File type and size validation
- Upload progress indicator
- Retry and error handling
- “Load Sample Resume” option

**Why this is needed:**
To let users upload resumes easily and ensure only valid files are processed.

### 3. AI Resume Extraction & Data Preprocessing
Use Gemini API to extract structured resume data.

#### Data Preprocessing
Perform:
- **Text Cleaning & Normalization** — Your resume often has extra spaces, broken lines, and messy formatting. This step quietly clear all of it up so the AI reads clean, consistent text instead of noise.
- **Duplicate Removal** — Listed React in your skills and inside three job descriptions? This step catches every repeated word, skill, or phrase and keeps just one clean version so nothing gets over-counted.
- **Tokenization** — Long sentences don't mean much to a machine. This step breaks your resume down into smaller, meaningful word chunks that the system can actually analyze and understand one piece at a time.
- **Lemmatization** — You wrote "developed." Someone else wrote "developing." Another wrote "developer." This step brings all of them back to the same root word so no experience gets missed just because of how it was worded.
- **Section Detection** — Not every resume uses the same headings. This step reads through your content and figures out which part is your Skills, which is your Experience, and which is your Education — even if you named them something different.

**Why this is needed:**
Preprocessing  improves extraction accuracy and reduces errors.

**Buttons:**
- Re-upload Resume
- Continue to Interview

### 4. Interview Setup
Allow users to configure:
- Interview domain:
  - Software Engineering
  - Data Science
  - Frontend
  - Backend
  - Full Stack
  - DevOps
  - Machine Learning
  - Product Management
- Experience level:
  - Junior
  - Mid-Level
  - Senior

Show interview summary:
- 6 questions
- 90 seconds/question
- Easy, Medium, Hard difficulty mix
- Auto-submit on timeout

**Why this is needed:**
To personalize the interview experience based on the user’s role and experience level.

### 5. Live AI Interview
Build a real-time chat-style interview interface:
- AI questions on left
- User answers on right
- Question counter and progress bar
- Difficulty badges
- Auto-scroll chat
- Skip and Submit buttons
- Auto-next question when timer ends

**Why this is needed:**
To simulate a real interview environment and keep the session interactive and timed.

### 6. AI Evaluation & Feedback
Use AI to evaluate answers and generate:
- Overall score (0–100)
- Letter grade
- Strengths and improvements
- Per-question feedback
- AI-generated summary

Auto-save results to MongoDB.

**Why this is needed:**
To give users instant feedback and help them improve after the interview.

### 7. Interviewer Dashboard
Create analytics dashboard with:
- Total sessions
- Average score
- Recent interviews
- Candidate management
- Session history
- Charts and analytics
- Detailed Q&A review page

**Why this is needed:**
To help interviewers track performance and review candidate history in one place.

### 8. Backend APIs
Implement REST APIs for:
- Authentication
- Resume parsing
- Question generation
- AI evaluation
- Session management
- Dashboard analytics

Use:
- Async/await
- JWT middleware
- Proper error handling
- Environment variables

**Why APIs are used:**
APIs connect the frontend, backend, database, and AI services. They allow the app to:
- send resume data to the server,
- call AI services,
- save interview results,
- and fetch dashboard data securely.

### 9. Database Schemas
Create MongoDB schemas for:
- Users
- Interview Sessions
- Feedback and evaluation data

**Why this is needed:**
To store structured data in a reusable way for login, interview history, and analytics.

### 10. UI/UX Requirements
Design a premium responsive UI with:
- Modern clean layout
- Soft shadows and cards
- Mobile responsiveness
- Accessible components
- Smooth animations

**Why this is needed:**
To make interactive, user-friendly, and professional.

### 11. Error Handling
Handle:
- API failures and retries
- Resume parsing failures
- Empty answers
- Network timeouts
- Timer cleanup to prevent memory leaks
- Fallback interview questions

**Why this is needed:**
To keep the app stable and usable even when something goes wrong.

### 12. Code Standards
- Modular architecture
- Reusable components
- Type-safe TypeScript
- Constants and utility folders
- Clean folder structure
- No hardcoded secrets
- Production-quality code

**Why this is needed:**
To make the code easy to maintain, scale, and debug.

---

## Final Goal

Build a fully functional AI Interview Buddy platform with:
- AI-powered resume parsing
- Resume data preprocessing
- Personalized interview generation
- Timed mock interviews
- AI evaluation and analytics
- Interviewer dashboard
- Secure cloud-based session storage
- Fully deployable architecture
