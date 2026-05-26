# Architectural & Design Justification

This document justifies the engineering decisions, stack selections, and UX paradigms implemented in the **AI Interview Buddy Platform**.

---

## 1. Dual-Mode Architecture (Vercel/Render Friendly)

### The Decision:
We designed the application to support both a fully-functional **Direct Browser Mode** and a standard **Node.js Express Full-Stack Mode**.

### Justification:
- **Instant Local Executability**: Since Node.js and MongoDB are not pre-installed or operational globally in your command path, a traditional backend-only stack would fail to run out-of-the-box. The direct browser mode lets you double-click `index.html` and experience a high-fidelity platform instantly without package installs.
- **Zero-Cost Deployment Compatibility**:
  - The static SPA is perfect for instant hosting on **Vercel** or **GitHub Pages** (free of server runtime limits).
  - The Express backend (`server.js`) is fully optimized to run on **Render** as a separate API server.
- **Privacy & Security**: Users input their private API keys directly into a settings modal. The keys are saved locally in their browser's private secure cache (`localStorage`) and sent *only* to official AI endpoints, meaning no third-party server intercepts their credentials.

---

## 2. Client-Side Resume Parsing Fallback (Mammoth.js & PDF.js)

### The Decision:
Integrating client-side versions of `pdf-js` (by Mozilla) and `mammoth.js` (for DOCX) to extract text directly in the browser, matching the server-side `pdf-parse` and `mammoth` implementations.

### Justification:
- **No File Storing Latency**: Uploaded resumes do not need to be written to a temporary folder or sent across networks to extract plain text. Text extraction is completed locally in milliseconds.
- **Elimination of Server Limits**: Large resumes don't crash the server or run into network packet bottlenecks. The browser handles extraction and sends clean, normalized text directly to the AI, saving substantial bandwidth.

---

## 3. High-Fidelity Responsive Dark Mode UX

### The Decision:
Using custom vanilla CSS tokens (Plus Jakarta Sans and JetBrains Mono typography) with glassmorphism panels, soft ambient radial gradients, and animated glowing accents.

### Justification:
- **Premium Professional Aesthetic**: Default browser inputs look unpolished. Our customized dark mode palette uses carefully harmonized deep slate backgrounds with glowing violet, indigo, and emerald states, keeping the candidate relaxed yet focused during their mock interview.
- **Dynamic State Micro-Animations**: Hover states, upload bounces, and timer flashes keep the application feeling alive and responsive, greatly improving candidate engagement.

---

## 4. Timed Assessment State Machine & Auto-Submit

### The Decision:
A centralized React state engine managing a 300-second (5-minute) global session timer, utilizing circular SVG countdown rings and automatic skips / auto-submissions.

### Justification:
- **Accurate Pressure Simulation**: A standard list of questions doesn't simulate an actual interview environment. The countdown timer forces candidates to think on their feet, capturing their true readiness.
- **Resilient Auto-Save State**: The session state (remaining seconds, questions, chat transcripts) is written to `localStorage` on every second tick. If a user accidentally closes their tab or loses network, they can re-open the page and immediately resume their timed assessment without losing progress.
- **Unified Time-Out Submissions**: When the timer reaches 0, the engine automatically registers a time-expired block, increments the question index, and resets the clock. On the final question, it triggers an "Auto-Submit" to securely analyze the session.

---

## 5. Mongoose Data Schema & Resilient Fallback DB

### The Decision:
Defining structured `UserProfile` and `InterviewSession` schemas, paired with a local JSON file database fallback (`db_fallback.json`) on the Express server.

### Justification:
- **Schema-Based Integrity**: Candidate profiles, skills arrays, experience matrices, and chat transcripts require a structured format to enable AI to analyze progress over time.
- **Zero-Setup Database Resiliency**: Setting up a MongoDB Atlas server requires configuration. If the backend fails to connect to the MongoDB URI, it automatically falls back to a structured JSON file database. The Express server remains 100% operational without manual database overhead.
