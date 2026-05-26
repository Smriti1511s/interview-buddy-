// ========================================================
// AI INTERVIEW BUDDY - FRONTEND REACT SYSTEM ENGINE
// ========================================================
const { useState, useEffect, useRef } = React;

// Define default API endpoints
const LOCAL_SERVER_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '' 
  : 'http://localhost:5000';

function App() {
  // Navigation & Workflow Routing State
  const [step, setStep] = useState('upload'); // upload, preview, setup, interview, dashboard, history
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Resume & Target Role State
  const [profile, setProfile] = useState(null);
  const [targetRole, setTargetRole] = useState('Full-Stack Software Engineer');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
  const [interviewType, setInterviewType] = useState('Technical & Coding');
  
  // Timer & Assessment Session State
  const [session, setSession] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 minutes standard
  const [totalSessionDuration, setTotalSessionDuration] = useState(300);
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState(60); // 60 seconds per question standard
  const timerRef = useRef(null);
  
  // Settings Panel State (Direct Client AI vs Node Backend)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiProvider, setApiProvider] = useState(localStorage.getItem('ib_api_provider') || 'gemini'); // gemini or openai
  const [apiKey, setApiKey] = useState(localStorage.getItem('ib_api_key') || '');
  const [useLocalServer, setUseLocalServer] = useState(
    localStorage.getItem('ib_use_server') === 'true' || 
    window.location.origin.includes('localhost') || 
    window.location.origin.includes('127.0.0.1')
  );

  // History List state
  const [historyList, setHistoryList] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  // Initialize and Load Local History & Saved Sessions
  useEffect(() => {
    loadHistory();
    // Auto-resume active session if saved in localStorage
    const savedActiveSession = localStorage.getItem('ib_active_session');
    const savedProfile = localStorage.getItem('ib_active_profile');
    if (savedActiveSession && savedProfile) {
      try {
        const parsedSession = JSON.parse(savedActiveSession);
        const parsedProfile = JSON.parse(savedProfile);
        
        // If it was not completed, prompt to resume
        if (parsedSession.status === 'active') {
          setProfile(parsedProfile);
          setSession(parsedSession);
          setSecondsLeft(parsedSession.timeRemainingSeconds);
          setTotalSessionDuration(parsedSession.totalDuration || 300);
          setQuestionSecondsLeft(60); // Set standard question timer!
          setTargetRole(parsedSession.jobTitle || 'Software Engineer');
          setExperienceLevel(parsedSession.experienceLevel);
          setInterviewType(parsedSession.interviewType);
          setStep('interview');
          setSuccessMsg("Resumed your active timed session successfully!");
          setTimeout(() => setSuccessMsg(null), 4000);
        }
      } catch (e) {
        console.error("Failed to parse saved active session", e);
      }
    }
  }, []);

  // Save changes to settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('ib_api_provider', apiProvider);
    localStorage.setItem('ib_api_key', apiKey);
    localStorage.setItem('ib_use_server', useLocalServer ? 'true' : 'false');
    setSettingsOpen(false);
    setSuccessMsg("API Settings updated successfully!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Load interview history from the active Database (Express server or LocalStorage)
  const loadHistory = async () => {
    if (useLocalServer) {
      try {
        const res = await fetch(`${LOCAL_SERVER_URL}/api/history`);
        const result = await res.json();
        if (res.ok && result.success) {
          setHistoryList(result.history);
          return;
        }
      } catch (err) {
        console.warn("Express server history endpoint not reachable. Falling back to localStorage history.");
      }
    }
    
    // Fallback: load history from LocalStorage
    const localHist = localStorage.getItem('ib_interview_history');
    if (localHist) {
      try {
        setHistoryList(JSON.parse(localHist));
      } catch (e) {
        setHistoryList([]);
      }
    }
  };

  // ========================================================
  // A. CLIENT-SIDE DOCUMENT PARSING (PDF, DOCX, TXT)
  // ========================================================
  
  const parseDocumentClientSide = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.type === 'text/plain') {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (err) => reject(new Error("Failed to read TXT file"));
        reader.readAsText(file);
      } 
      else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            // Use Mammoth.js CDN script loaded in index.html
            if (typeof mammoth === 'undefined') {
              reject(new Error("Mammoth.js library is not loaded. Try checking your internet connection."));
              return;
            }
            const result = await mammoth.extractRawText({ arrayBuffer });
            resolve(result.value);
          } catch (err) {
            reject(new Error("Error parsing Word document client-side: " + err.message));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read Word file"));
        reader.readAsArrayBuffer(file);
      } 
      else if (file.type === 'application/pdf') {
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            if (typeof pdfjsLib === 'undefined') {
              reject(new Error("PDF.js library is not loaded. Try checking your internet connection."));
              return;
            }
            
            // Set worker source
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let textContent = "";
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const text = await page.getTextContent();
              const pageStr = text.items.map(item => item.str).join(" ");
              textContent += pageStr + "\n";
            }
            resolve(textContent);
          } catch (err) {
            reject(new Error("Error parsing PDF client-side: " + err.message));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read PDF file"));
        reader.readAsArrayBuffer(file);
      } 
      else {
        reject(new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT file."));
      }
    });
  };

  // ========================================================
  // B. DIRECT AI HTTP CLIENTS (Gemini vs OpenAI)
  // ========================================================

  const callAIClient = async (systemPrompt, userPrompt, jsonMode = true) => {
    if (!apiKey) {
      throw new Error(`Direct browser mode is active but your API key is blank! Please click the "Settings" gear in the top right to paste your ${apiProvider.toUpperCase()} API key.`);
    }

    if (apiProvider === 'gemini') {
      // Direct fetch call to official Google Gemini API Endpoint
      // We use gemini-1.5-flash as it is ultra-fast, robust, and supports structured JSON outputs
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const headers = { 'Content-Type': 'application/json' };
      const body = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\nUser Content to process:\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: jsonMode ? {
          responseMimeType: 'application/json'
        } : undefined
      };

      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || "Google Gemini API Exception occurred.");
      }

      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      return textResponse;
    } 
    else {
      // Direct fetch call to OpenAI API Endpoint
      const url = 'https://api.openai.com/v1/chat/completions';
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      const body = {
        model: 'gpt-4o-mini',
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      };

      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "OpenAI API Exception occurred.");
      }

      return result.choices[0].message.content;
    }
  };

  // ========================================================
  // C. WORKFLOW CONTROLLER PIPELINES
  // ========================================================

  // 1. Resume File Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // If using Local Server Node.js Endpoint
    if (useLocalServer) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${LOCAL_SERVER_URL}/api/interview`, {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Server parsing exception.');
        setProfile(result.profile);
        setStep('preview');
        setSuccessMsg("Resume parsed successfully via Node Server!");
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        console.warn("Express server file upload failed. Suggesting client-side parsing fallback.", err.message);
        // Fall back to client side parsing if server fails
        await runClientSideExtraction(file);
      } finally {
        setLoading(false);
      }
    } else {
      // Directly parse file client-side inside the browser
      await runClientSideExtraction(file);
      setLoading(false);
    }
  };

  // Helper to parse document using client-side parsing and client AI API
  const runClientSideExtraction = async (file) => {
    try {
      const rawText = await parseDocumentClientSide(file);
      
      const systemPrompt = `Extract CV/resume fields strictly into this clean structured JSON schema:
      {
        "name": "", 
        "email": "", 
        "skills": ["JavaScript", "Python"],
        "experience": [{"role": "Frontend Architect", "company": "Stripe", "duration": "2023 - Present", "description": "Led UI redesign..."}],
        "projects": [{"title": "Cloud Sentry", "description": "AI-driven logging dashboard", "technologies": ["React", "Go"]}],
        "education": [{"degree": "B.S. Computer Science", "institution": "Stanford University", "year": "2022"}],
        "certifications": ["AWS Solutions Architect"]
      }
      
      Extract exact information cleanly, keeping description and roles professional. Ensure email is extracted. If name is not found, use a reasonable name derived from email.`;

      const aiResponse = await callAIClient(systemPrompt, rawText, true);
      const parsedProfile = JSON.parse(aiResponse);
      
      // Cache rawText in profile object
      parsedProfile.rawText = rawText;
      
      setProfile(parsedProfile);
      setStep('preview');
      setSuccessMsg("Resume parsed successfully client-side!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(`Extraction Failed: ${err.message}. If direct client mode is active, check your API Key in Settings.`);
    }
  };

  // 2. Profile Editable Update Handler
  const handleProfileFieldChange = (section, index, field, value) => {
    const updatedProfile = { ...profile };
    if (section === 'skills') {
      updatedProfile.skills = value.split(',').map(s => s.trim());
    } else if (section === 'certifications') {
      updatedProfile.certifications = value.split(',').map(c => c.trim());
    } else if (index !== undefined) {
      updatedProfile[section][index][field] = value;
    } else {
      updatedProfile[section] = value;
    }
    setProfile(updatedProfile);
  };

  const addProfileListRow = (section) => {
    const updatedProfile = { ...profile };
    if (section === 'experience') {
      updatedProfile.experience.push({ role: '', company: '', duration: '', description: '' });
    } else if (section === 'projects') {
      updatedProfile.projects.push({ title: '', description: '', technologies: [] });
    } else if (section === 'education') {
      updatedProfile.education.push({ degree: '', institution: '', year: '' });
    }
    setProfile(updatedProfile);
  };

  // 3. Initiate Active Timed Session Handler
  const handleStartInterview = async () => {
    setLoading(true);
    setError(null);

    // Save profile data in cache
    localStorage.setItem('ib_active_profile', JSON.stringify(profile));

    if (useLocalServer) {
      try {
        const res = await fetch(`${LOCAL_SERVER_URL}/api/interview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: profile.id || profile._id,
            experienceLevel,
            interviewType
          })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Server failed to start session.');
        
        setSession(result.session);
        setSecondsLeft(result.session.timeRemainingSeconds);
        setTotalSessionDuration(result.session.timeRemainingSeconds);
        setQuestionSecondsLeft(60); // Set standard question timer!
        setStep('interview');
        
        localStorage.setItem('ib_active_session', JSON.stringify(result.session));
      } catch (err) {
        console.warn("Express server session creation failed. Suggesting Client-Side session generation.", err.message);
        await runClientSideSessionInit();
      } finally {
        setLoading(false);
      }
    } else {
      await runClientSideSessionInit();
      setLoading(false);
    }
  };

  // Helper to initialize timed interview session completely client-side
  const runClientSideSessionInit = async () => {
    try {
      const systemPrompt = `Generate exactly 5 highly customized mock interview questions based on the candidate's CV profile structure. 
      Tailor them to:
      - Requested Job Title Target: ${targetRole}
      - Target Seniority: ${experienceLevel}
      - Core Interview Focus Concept: ${interviewType}

      Return response strictly in this JSON format containing a list of questions:
      {
        "questions": [
          "Can you explain your experience in...?",
          "How did you design the architecture of...?"
        ]
      }
      Do not return any conversational prefix. Generate professional, challenging questions.`;

      const aiResponse = await callAIClient(systemPrompt, JSON.stringify(profile), true);
      const { questions } = JSON.parse(aiResponse);
      
      if (!questions || questions.length === 0) {
        throw new Error("AI engine failed to generate structured questions.");
      }

      // Generate a mock session object
      const clientSession = {
        id: 'sess_' + Math.random().toString(36).substr(2, 9),
        userId: profile.id || 'prof_local',
        experienceLevel,
        interviewType,
        jobTitle: targetRole,
        status: 'active',
        timeRemainingSeconds: 300,
        totalDuration: 300,
        questions,
        currentQuestionIndex: 0,
        chatLog: [{ role: 'ai', text: questions[0], timestamp: new Date().toISOString() }],
        evaluation: { score: 0, feedback: '' }
      };

      setSession(clientSession);
      setSecondsLeft(300);
      setTotalSessionDuration(300);
      setQuestionSecondsLeft(60); // Set standard question timer!
      setStep('interview');
      
      localStorage.setItem('ib_active_session', JSON.stringify(clientSession));
    } catch (err) {
      setError(`Session Launch Failed: ${err.message}. If in Direct Client Mode, check your API Key in Settings.`);
    }
  };

  // 4. Timer Hooks
  const handleQuestionTimeout = async () => {
    if (!session) return;
    const nextIndex = session.currentQuestionIndex + 1;
    const isLastQuestion = nextIndex >= session.questions?.length;

    if (isLastQuestion) {
      await handleQuestionSubmit(true);
    } else {
      setLoading(true);
      setError(null);
      const finalAnswer = "[Question Time Expired - Skipped Automatically]";

      if (useLocalServer) {
        try {
          const res = await fetch(`${LOCAL_SERVER_URL}/api/interview`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session.id || session._id,
              answer: finalAnswer,
              isAutoSubmit: false,
              timeRemainingSeconds: secondsLeft
            })
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Server failed to save progress.');
          
          setSession(result.session);
          setUserAnswer('');
          setSecondsLeft(result.session.timeRemainingSeconds);
          setQuestionSecondsLeft(60);
          localStorage.setItem('ib_active_session', JSON.stringify(result.session));
        } catch (err) {
          console.warn("Express server progress update failed. Falling back to local client processing.", err.message);
          await runClientSideProgressUpdate(finalAnswer, false);
          setQuestionSecondsLeft(60);
        } finally {
          setLoading(false);
        }
      } else {
        await runClientSideProgressUpdate(finalAnswer, false);
        setQuestionSecondsLeft(60);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (step === 'interview' && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          const nextVal = prev - 1;
          
          // Save active state increment
          if (session) {
            const updated = { ...session, timeRemainingSeconds: nextVal, totalDuration: totalSessionDuration };
            localStorage.setItem('ib_active_session', JSON.stringify(updated));
          }

          if (nextVal <= 0) {
            clearInterval(timerRef.current);
            // Automatic countdown trigger skip/auto-submit
            handleQuestionSubmit(true);
            return 0;
          }
          return nextVal;
        });

        // Question countdown
        setQuestionSecondsLeft((prevQ) => {
          const nextQ = prevQ - 1;
          if (nextQ <= 0) {
            // Trigger skip
            setTimeout(() => handleQuestionTimeout(), 0);
            return 60;
          }
          return nextQ;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, secondsLeft, session]);

  // 5. Question Submission & AI Evaluation Engine (POST/PUT)
  const handleQuestionSubmit = async (isAutoSubmit = false) => {
    // If user submits empty answer and it is not an auto-submit, return
    if (!isAutoSubmit && !userAnswer.trim()) return;
    
    setLoading(true);
    setError(null);
    
    const finalAnswer = isAutoSubmit 
      ? "[Time Expired - Candidate response window closed automatically]" 
      : userAnswer;

    if (useLocalServer) {
      try {
        const res = await fetch(`${LOCAL_SERVER_URL}/api/interview`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id || session._id,
            answer: finalAnswer,
            isAutoSubmit,
            timeRemainingSeconds: secondsLeft
          })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Server failed to save progress.');
        
        setSession(result.session);
        setUserAnswer('');

        if (result.completed || isAutoSubmit) {
          if (timerRef.current) clearInterval(timerRef.current);
          localStorage.removeItem('ib_active_session');
          localStorage.removeItem('ib_active_profile');
          setStep('dashboard');
          loadHistory();
          triggerConfetti(result.session?.evaluation?.score || 0);
        } else {
          setSecondsLeft(result.session.timeRemainingSeconds);
          setQuestionSecondsLeft(60); // Reset question timer!
          localStorage.setItem('ib_active_session', JSON.stringify(result.session));
        }
      } catch (err) {
        console.warn("Express server progress update failed. Falling back to local client processing.", err.message);
        await runClientSideProgressUpdate(finalAnswer, isAutoSubmit);
      } finally {
        setLoading(false);
      }
    } else {
      await runClientSideProgressUpdate(finalAnswer, isAutoSubmit);
      setLoading(false);
    }
  };

  // Helper to process progress, auto-skips, and evaluation entirely on client-side
  const runClientSideProgressUpdate = async (finalAnswer, isAutoSubmit) => {
    try {
      const updatedSession = { ...session };
      updatedSession.chatLog.push({ role: 'user', text: finalAnswer, timestamp: new Date().toISOString() });
      updatedSession.timeRemainingSeconds = secondsLeft;
      
      const nextIndex = updatedSession.currentQuestionIndex + 1;
      
      // Determine if interview concludes
      if (isAutoSubmit || nextIndex >= updatedSession.questions.length) {
        updatedSession.status = 'completed';
        
        const systemPrompt = `Evaluate the following mock interview transcript between the AI interviewer and the candidate targetting the role of ${targetRole} (${experienceLevel}).
        Conduct a comprehensive evaluation:
        1. Rate their response based on experience, correctness, and conceptual clarity.
        2. Assign a cumulative score strictly between 0 and 100.
        3. Provide structured, constructive feedback critique including key Strengths, areas for Improvement, and coaching tips.

        Return response STRICTLY in this JSON format:
        {
          "score": 85,
          "feedback": "Your architectural understanding is excellent. However, you can explain your caching mechanisms more deeply."
        }
        Provide feedback in professional markdown. Do not include any HTML markdown other than structured markdown text.`;

        const aiResponse = await callAIClient(systemPrompt, JSON.stringify(updatedSession.chatLog), true);
        const evalResult = JSON.parse(aiResponse);
        
        updatedSession.evaluation = evalResult;
        updatedSession.updatedAt = new Date().toISOString();
        
        setSession(updatedSession);
        setUserAnswer('');
        
        if (timerRef.current) clearInterval(timerRef.current);
        
        // Remove active caches
        localStorage.removeItem('ib_active_session');
        localStorage.removeItem('ib_active_profile');
        
        // Add to localStorage history
        const localHist = localStorage.getItem('ib_interview_history');
        let historyArray = [];
        if (localHist) {
          try { historyArray = JSON.parse(localHist); } catch (e) { historyArray = []; }
        }
        
        const newHistoryLog = {
          id: updatedSession.id,
          name: profile.name || 'Candidate',
          email: profile.email || '',
          experienceLevel: updatedSession.experienceLevel,
          interviewType: updatedSession.interviewType,
          score: evalResult.score || 0,
          feedback: evalResult.feedback || '',
          date: new Date().toISOString(),
          chatLog: updatedSession.chatLog,
          questions: updatedSession.questions
        };

        historyArray.push(newHistoryLog);
        localStorage.setItem('ib_interview_history', JSON.stringify(historyArray));
        
        setStep('dashboard');
        loadHistory();
        triggerConfetti(evalResult.score || 0);
      } else {
        // Increment question state
        updatedSession.currentQuestionIndex = nextIndex;
        updatedSession.chatLog.push({
          role: 'ai',
          text: updatedSession.questions[nextIndex],
          timestamp: new Date().toISOString()
        });
        
        setSession(updatedSession);
        setUserAnswer('');
        setQuestionSecondsLeft(60); // Reset question timer!
        localStorage.setItem('ib_active_session', JSON.stringify(updatedSession));
      }
    } catch (err) {
      setError(`Response Submission Failed: ${err.message}. Check your API settings.`);
    }
  };

  // Celebration triggering
  const triggerConfetti = (score) => {
    if (score >= 80 && typeof confetti !== 'undefined') {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  };

  // View Past Assessment Details
  const handleViewPastHistoryDetails = async (histId) => {
    setLoading(true);
    setError(null);
    try {
      if (useLocalServer) {
        try {
          const res = await fetch(`${LOCAL_SERVER_URL}/api/history/${histId}`);
          const result = await res.json();
          if (res.ok && result.success) {
            setSession(result.session);
            setProfile(result.session.userId);
            setStep('dashboard');
            return;
          }
        } catch (err) {
          console.warn("Express server detailed record not reachable. Pulling from localStorage history.");
        }
      }

      // Local storage lookup
      const localHist = localStorage.getItem('ib_interview_history');
      if (localHist) {
        const parsed = JSON.parse(localHist);
        const record = parsed.find(r => r.id === histId);
        if (record) {
          // Re-create a session and profile wrapper
          const dummySession = {
            id: record.id,
            experienceLevel: record.experienceLevel,
            interviewType: record.interviewType,
            questions: record.questions,
            chatLog: record.chatLog,
            evaluation: { score: record.score, feedback: record.feedback },
            status: 'completed'
          };
          const dummyProfile = {
            name: record.name,
            email: record.email,
            skills: []
          };
          setSession(dummySession);
          setProfile(dummyProfile);
          setStep('dashboard');
        } else {
          throw new Error("Specified detailed record not found in local cache.");
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setProfile(null);
    setSession(null);
    setUserAnswer('');
    setError(null);
    setQuestionSecondsLeft(60);
    setStep('upload');
  };

  // Helper clock display format
  const formatTime = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Math helper for timer ring stroke
  const strokeDashoffsetValue = () => {
    const percent = secondsLeft / totalSessionDuration;
    return 283 - (283 * percent);
  };

  const strokeDashoffsetValueQ = () => {
    const percent = questionSecondsLeft / 60;
    return 283 - (283 * percent);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HEADER MODULE */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0b0f19]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleRestart}>
            <div className="bg-gradient-to-tr from-indigo-500 to-violet-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/10">
              <i className="lucide-shield-check w-5 h-5"></i>
            </div>
            <div>
              <span className="text-md font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-300 to-pink-400 bg-clip-text text-transparent">
                Interview Buddy AI
              </span>
              <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider">Mock Assessment Platform</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {step === 'interview' && (
              <div className={`flex items-center gap-3 px-4 py-1.5 rounded-full border text-xs font-mono transition-all duration-300 ${
                secondsLeft < 60 
                  ? 'pulse-danger bg-red-950/40 text-red-400 font-bold border-red-500/40' 
                  : 'bg-slate-900/60 text-slate-300 border-slate-700'
              }`} role="timer" aria-live="assertive">
                <i className="lucide-clock w-3.5 h-3.5 text-indigo-400 animate-spin-slow"></i>
                <span>Remaining: {formatTime(secondsLeft)}</span>
              </div>
            )}
            
            <button 
              onClick={() => setStep('history')} 
              className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                step === 'history' 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <i className="lucide-award w-3.5 h-3.5"></i> History Log
              </span>
            </button>

            <button 
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              title="Settings & API Setup"
            >
              <i className="lucide-settings w-4 h-4"></i>
            </button>
          </div>
        </div>
      </header>

      {/* 2. DYNAMIC SYSTEM NOTIFICATIONS */}
      {error && (
        <div className="max-w-4xl mx-auto w-full mt-4 px-4">
          <div className="p-4 bg-red-950/40 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3 text-red-300 glass-panel pulse-danger" role="alert">
            <i className="lucide-alert-triangle w-5 h-5 flex-shrink-0 mt-0.5 text-red-400"></i>
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-red-200">System Exception Event</h5>
              <p className="text-xs opacity-90 mt-0.5">{error}</p>
            </div>
            <button className="ml-auto text-red-400 hover:text-white" onClick={() => setError(null)}>
              <i className="lucide-x w-4 h-4"></i>
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="max-w-4xl mx-auto w-full mt-4 px-4">
          <div className="p-4 bg-emerald-950/40 border-l-4 border-emerald-500 rounded-r-xl flex items-start gap-3 text-emerald-300 glass-panel" role="status">
            <i className="lucide-shield-check w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400"></i>
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-200">Success Notification</h5>
              <p className="text-xs opacity-90 mt-0.5">{successMsg}</p>
            </div>
            <button className="ml-auto text-emerald-400 hover:text-white" onClick={() => setSuccessMsg(null)}>
              <i className="lucide-x w-4 h-4"></i>
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKFLOW SCREENS */}
      <main className="flex-1 max-w-5xl mx-auto w-full py-8 px-4 page-fade-in">
        
        {/* SCREEN 1: RESUME UPLOAD */}
        {step === 'upload' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Prepare for Your Next Big Interview
              </h1>
              <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                Upload your resume in PDF, DOCX, or TXT format. AI extracts your skill metrics to structure a custom interactive timed interview simulation.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-8 text-center space-y-6 border border-slate-800">
              <div className="mx-auto w-16 h-16 bg-indigo-950/50 border border-indigo-500/20 text-indigo-400 flex items-center justify-center rounded-2xl shadow-inner">
                <i className="lucide-upload w-7 h-7 animate-bounce"></i>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">Drag and drop your CV file</h3>
                <p className="text-[10px] text-slate-500">Supports PDF, Word (DOCX), or plain text (TXT) files up to 10MB</p>
              </div>

              <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-[#0f172a]/30 transition-all rounded-xl p-8 group cursor-pointer">
                <input 
                  type="file" 
                  accept=".pdf,.docx,.txt" 
                  onChange={handleFileUpload} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={loading}
                />
                <div className="text-center space-y-1.5 pointer-events-none">
                  <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Click to browse or drop file here
                  </span>
                  <p className="text-[9px] text-slate-500">AI automatically scans skills, experience, & achievements</p>
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-3 text-xs text-indigo-400 font-medium">
                  <i className="lucide-refresh-cw w-4 h-4 animate-spin"></i>
                  <span>Executing client-side parser & AI property extraction...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <i className="lucide-shield-check w-4 h-4 text-emerald-400"></i>
                <span>Keys stored purely in browser localStorage</span>
              </div>
              <button onClick={() => setSettingsOpen(true)} className="text-indigo-400 hover:text-indigo-300 font-bold underline">
                Configure API keys
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: RESUME EXTRACTION PREVIEW */}
        {step === 'preview' && profile && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] block text-indigo-400 font-bold uppercase tracking-wider">Scanning Complete</span>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">Extracted Candidate Profile</h1>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleRestart}
                  className="px-4 py-2 border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Re-upload
                </button>
                <button 
                  onClick={() => setStep('setup')} 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/10 flex items-center gap-1.5 transition-all btn-glow"
                >
                  Setup Interview Parameters <i className="lucide-arrow-right w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Left Column: Basic Info & Skills */}
              <div className="space-y-6 md:col-span-1">
                <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                    <input 
                      type="text" 
                      value={profile.name || ''} 
                      onChange={(e) => handleProfileFieldChange('name', undefined, undefined, e.target.value)}
                      className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                    <input 
                      type="email" 
                      value={profile.email || ''} 
                      onChange={(e) => handleProfileFieldChange('email', undefined, undefined, e.target.value)}
                      className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Skills Map (Comma separated)</label>
                    <textarea 
                      value={profile.skills?.join(', ') || ''} 
                      onChange={(e) => handleProfileFieldChange('skills', undefined, undefined, e.target.value)}
                      rows="4"
                      className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Certifications (Comma separated)</label>
                    <textarea 
                      value={profile.certifications?.join(', ') || ''} 
                      onChange={(e) => handleProfileFieldChange('certifications', undefined, undefined, e.target.value)}
                      rows="2"
                      className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Experience, Projects & Education */}
              <div className="space-y-6 md:col-span-2">
                <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
                  {/* Experience */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400">Professional Experience</h4>
                      <button onClick={() => addProfileListRow('experience')} className="text-[10px] text-indigo-400 font-bold hover:underline">+ Add Experience</button>
                    </div>
                    {profile.experience?.map((exp, i) => (
                      <div key={i} className="p-3 bg-[#0b0f19] rounded-xl border border-slate-800/80 space-y-2.5">
                        <div className="grid grid-cols-3 gap-2">
                          <input 
                            type="text" placeholder="Role Title" value={exp.role || ''} 
                            onChange={(e) => handleProfileFieldChange('experience', i, 'role', e.target.value)}
                            className="bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-white"
                          />
                          <input 
                            type="text" placeholder="Company" value={exp.company || ''} 
                            onChange={(e) => handleProfileFieldChange('experience', i, 'company', e.target.value)}
                            className="bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-white"
                          />
                          <input 
                            type="text" placeholder="Duration (e.g. 2021-2023)" value={exp.duration || ''} 
                            onChange={(e) => handleProfileFieldChange('experience', i, 'duration', e.target.value)}
                            className="bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <textarea 
                          placeholder="Key Responsibilities..." value={exp.description || ''} 
                          onChange={(e) => handleProfileFieldChange('experience', i, 'description', e.target.value)}
                          rows="2"
                          className="w-full bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-slate-300 resize-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Projects */}
                  <div className="space-y-3 border-t border-slate-800/60 pt-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400">Key Projects</h4>
                      <button onClick={() => addProfileListRow('projects')} className="text-[10px] text-indigo-400 font-bold hover:underline">+ Add Project</button>
                    </div>
                    {profile.projects?.map((proj, i) => (
                      <div key={i} className="p-3 bg-[#0b0f19] rounded-xl border border-slate-800/80 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="text" placeholder="Project Title" value={proj.title || ''} 
                            onChange={(e) => handleProfileFieldChange('projects', i, 'title', e.target.value)}
                            className="bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-white"
                          />
                          <input 
                            type="text" placeholder="Technologies (Comma separated)" value={proj.technologies?.join(', ') || ''} 
                            onChange={(e) => {
                              const techs = e.target.value.split(',').map(t => t.trim());
                              handleProfileFieldChange('projects', i, 'technologies', techs);
                            }}
                            className="bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <textarea 
                          placeholder="Project Description..." value={proj.description || ''} 
                          onChange={(e) => handleProfileFieldChange('projects', i, 'description', e.target.value)}
                          rows="1"
                          className="w-full bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-slate-300 resize-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Education */}
                  <div className="space-y-3 border-t border-slate-800/60 pt-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400">Education Matrix</h4>
                      <button onClick={() => addProfileListRow('education')} className="text-[10px] text-indigo-400 font-bold hover:underline">+ Add Education</button>
                    </div>
                    {profile.education?.map((edu, i) => (
                      <div key={i} className="p-2.5 bg-[#0b0f19] rounded-xl border border-slate-800/80 grid grid-cols-3 gap-2">
                        <input 
                          type="text" placeholder="Degree (e.g. B.S. CS)" value={edu.degree || ''} 
                          onChange={(e) => handleProfileFieldChange('education', i, 'degree', e.target.value)}
                          className="bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-white"
                        />
                        <input 
                          type="text" placeholder="Institution" value={edu.institution || ''} 
                          onChange={(e) => handleProfileFieldChange('education', i, 'institution', e.target.value)}
                          className="bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-white"
                        />
                        <input 
                          type="text" placeholder="Graduation Year" value={edu.year || ''} 
                          onChange={(e) => handleProfileFieldChange('education', i, 'year', e.target.value)}
                          className="bg-transparent border border-slate-800/80 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: MOCK INTERVIEW PARAMETER CONFIG */}
        {step === 'setup' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div>
              <span className="text-[10px] block text-indigo-400 font-bold uppercase tracking-wider">Assessment Parameters</span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Customize Your Mock Session</h1>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Configure your target parameters. Our AI interviewer creates 5 tailored questions specific to your CV context.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Target Job Role</label>
                <input 
                  type="text" 
                  value={targetRole} 
                  onChange={(e) => setTargetRole(e.target.value)} 
                  className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white outline-none"
                  placeholder="e.g. Lead React Developer"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Seniority Level</label>
                  <select 
                    value={experienceLevel} 
                    onChange={(e) => setExperienceLevel(e.target.value)} 
                    className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-300 outline-none cursor-pointer"
                  >
                    <option>Junior Developer (0-2 YOE)</option>
                    <option>Mid-Level Developer (2-5 YOE)</option>
                    <option>Senior Developer (5-10 YOE)</option>
                    <option>Lead Engineer / Architect (10+ YOE)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Interview Concept Focus</label>
                  <select 
                    value={interviewType} 
                    onChange={(e) => setInterviewType(e.target.value)} 
                    className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-300 outline-none cursor-pointer"
                  >
                    <option>Technical & Coding</option>
                    <option>Behavioral & Leadership</option>
                    <option>System Design & Architecture</option>
                    <option>Mixed (Technical + Behavioral)</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleStartInterview} 
                disabled={loading} 
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-500/10 disabled:opacity-50 flex items-center justify-center gap-2 btn-glow"
              >
                {loading ? (
                  <>
                    <i className="lucide-refresh-cw w-4 h-4 animate-spin"></i>
                    <span>Drafting Custom Case Questions...</span>
                  </>
                ) : (
                  <>
                    <i className="lucide-play w-3.5 h-3.5 fill-white"></i>
                    <span>Launch Assessment Arena</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 4: LIVE TIMED INTERVIEW CHAT */}
        {step === 'interview' && session && (
          <div className="grid md:grid-cols-4 gap-6">
            {/* Sidebar Stats */}
            <div className="space-y-4 md:col-span-1">
              <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-6 text-center">
                
                {/* Visual Timer Progress Circle */}
                <div className="relative w-28 h-28 mx-auto">
                  <svg className="w-full h-full timer-ring">
                    <circle className="timer-circle-bg" strokeWidth="6" fill="transparent" r="45" cx="56" cy="56" />
                    <circle 
                      className={`timer-circle transition-all duration-300 ${
                        questionSecondsLeft < 10 
                          ? 'stroke-red-500 pulse-danger' 
                          : questionSecondsLeft < 20 
                          ? 'stroke-amber-500' 
                          : 'stroke-indigo-500'
                      }`}
                      strokeWidth="6" 
                      fill="transparent" 
                      r="45" 
                      cx="56" 
                      cy="56" 
                      strokeLinecap="round"
                      style={{ strokeDashoffset: strokeDashoffsetValueQ() }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black font-mono leading-none tracking-tight">{questionSecondsLeft}s</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">NEXT QUESTION</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider block">Target Role</span>
                  <span className="text-xs text-white font-extrabold block truncate">{targetRole}</span>
                  <span className="text-[9px] text-slate-400 block">{experienceLevel} | {interviewType}</span>
                </div>

                <div className="border-t border-slate-800/80 pt-4 grid grid-cols-2 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[8px] text-slate-500 font-bold block">QUESTIONS</span>
                    <span className="font-extrabold text-white">{session.currentQuestionIndex + 1} / {session.questions?.length}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 font-bold block">OVERALL TIME</span>
                    <span className="font-extrabold text-white font-mono">{formatTime(secondsLeft)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-2xl text-[10px] text-amber-300 leading-relaxed space-y-1">
                <div className="flex items-center gap-1 font-bold text-amber-400 uppercase tracking-wider">
                  <i className="lucide-alert-triangle w-3.5 h-3.5"></i> Timed Auto-Submit Warning
                </div>
                <p>When the timer expires, your active mock logs submit instantly to AI analysis automatically. Keep answers structured and clear.</p>
              </div>
            </div>

            {/* Chat Terminal Arena */}
            <div className="md:col-span-3">
              <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-[520px]">
                {/* Header */}
                <div className="border-b border-slate-800 px-5 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-200">Interviewer AI Console Active</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assessment Transcripts</span>
                </div>

                {/* Chat Log View */}
                <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin">
                  {session.chatLog?.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'} page-fade-in`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.role === 'ai' 
                          ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none' 
                          : 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/10'
                      }`}>
                        <div className="font-bold text-[8px] uppercase tracking-wider mb-1 opacity-60">
                          {msg.role === 'ai' ? 'Interviewer AI' : 'You (Candidate)'}
                        </div>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex justify-start items-center gap-2 text-[10px] text-slate-400 font-mono italic">
                      <i className="lucide-refresh-cw w-3 h-3 animate-spin"></i>
                      <span>AI evaluates and reviews responses...</span>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-800 bg-[#0b0f19]/30">
                  <div className="flex gap-2.5 items-center">
                    <textarea 
                      value={userAnswer} 
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleQuestionSubmit(false);
                        }
                      }}
                      placeholder="Formulate structured response answer (Shift + Enter for new lines)..." 
                      disabled={loading}
                      rows="2"
                      className="flex-1 bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 resize-none font-sans leading-relaxed"
                    />
                    
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleQuestionSubmit(false)} 
                        disabled={loading || !userAnswer.trim()} 
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-600/15"
                        title="Submit Answer"
                      >
                        <i className="lucide-send w-4 h-4"></i>
                      </button>
                      <button 
                        onClick={() => handleQuestionSubmit(true)} 
                        className="px-3 py-1.5 border border-amber-500/20 text-amber-400 bg-amber-950/20 hover:bg-amber-900/40 font-bold text-[9px] rounded-lg tracking-wider uppercase transition-all"
                        title="Auto-submit early"
                      >
                        Finish
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 5: PERFORMANCE DASHBOARD */}
        {step === 'dashboard' && session && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">Diagnostic Concluded</span>
              <h1 className="text-3xl font-black text-white">Performance Diagnostics Dashboard</h1>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Score panel */}
              <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-center space-y-4 flex flex-col justify-center items-center">
                <div className="mx-auto w-14 h-14 bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 flex items-center justify-center rounded-2xl shadow-inner">
                  <i className="lucide-award w-7 h-7"></i>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumulative Diagnostic Score</h3>
                  <div className="inline-block px-5 py-2 mt-2 bg-slate-900/60 rounded-2xl border border-slate-800">
                    <span className="text-5xl font-black text-indigo-400">{session.evaluation?.score ?? 0}</span>
                    <span className="text-slate-500 font-bold text-xs"> / 100</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 leading-relaxed">
                  {session.evaluation?.score >= 80 
                    ? "Exceptional candidate capability index. Ready for final company evaluation rounds."
                    : session.evaluation?.score >= 60
                    ? "Capable performance with opportunities to enhance technical responses."
                    : "Development needed on theoretical depth and technical clarity."
                  }
                </div>
              </div>

              {/* Summary Commentary */}
              <div className="md:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 text-left">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <i className="lucide-shield-check w-4 h-4 text-indigo-400"></i> AI Analyst Critique & Coaching Report
                </h4>
                
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[160px] overflow-y-auto pr-1">
                  {session.evaluation?.feedback || "Diagnostic feedback data currently loading..."}
                </div>

                <div className="border-t border-slate-800/80 pt-4 flex gap-4 text-xs font-semibold text-slate-400">
                  <div>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">ASSESSMENT</span>
                    <span className="text-white">{session.interviewType}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">SENIORITY</span>
                    <span className="text-white">{session.experienceLevel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Conversational Logs Transcript Review */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <i className="lucide-award w-4 h-4"></i> Detailed Transcripts & Dialogue History
              </h4>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {session.chatLog?.map((msg, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${
                    msg.role === 'ai' 
                      ? 'bg-slate-900/30 border-slate-850 text-slate-300' 
                      : 'bg-indigo-950/20 border-indigo-900/30 text-indigo-200'
                  } text-xs leading-relaxed`}>
                    <div className="font-bold text-[8px] uppercase tracking-wider mb-1 opacity-70">
                      {msg.role === 'ai' ? 'AI INTERVIEWER QUESTION' : 'YOUR RESPONSE'}
                    </div>
                    <p>{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center pt-2">
              <button 
                onClick={handleRestart} 
                className="px-6 py-3 bg-white text-black font-extrabold rounded-xl text-xs hover:bg-slate-100 shadow-lg shadow-white/5 transition-all"
              >
                Restart New Assessment
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 6: HISTORY LOGS */}
        {step === 'history' && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] block text-indigo-400 font-bold uppercase tracking-wider">Assessment Archives</span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Your Interview History Log</h1>
              <p className="text-slate-400 text-xs mt-1">Review all your previous AI mock sessions, transcripts, and scored critiquing.</p>
            </div>

            {historyList.length === 0 ? (
              <div className="glass-panel rounded-2xl p-10 text-center border border-slate-800 space-y-3">
                <i className="lucide-award w-10 h-10 text-slate-650 mx-auto"></i>
                <h4 className="text-sm font-bold text-slate-300">No Assessment Records Found</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">Complete an active mock interview session to automatically log performance history charts.</p>
                <button onClick={handleRestart} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold mt-2">Start Assessment</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {historyList.map((hist, i) => (
                  <div key={i} className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-indigo-300 font-semibold font-mono">
                            {hist.experienceLevel}
                          </span>
                          <h4 className="text-sm font-extrabold text-white mt-1.5 truncate">{hist.name}</h4>
                          <span className="text-[10px] text-slate-400 block truncate">{hist.interviewType} Assessment</span>
                        </div>
                        <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl text-center">
                          <span className="text-xl font-black text-indigo-400 block">{hist.score}</span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase block">SCORE</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 block">Date Completed: {new Date(hist.date).toLocaleDateString()} | {new Date(hist.date).toLocaleTimeString()}</p>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                      <span className="text-[9px] text-indigo-400 font-bold max-w-[200px] truncate">
                        {hist.email}
                      </span>
                      <button 
                        onClick={() => handleViewPastHistoryDetails(hist.id)} 
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-white transition-all flex items-center gap-1"
                      >
                        Review Scorecard <i className="lucide-arrow-right w-3 h-3"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. SETTINGS MODAL DIALOG */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl max-w-md w-full border border-slate-800 overflow-hidden shadow-2xl page-fade-in">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b0f19]">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <i className="lucide-settings w-4 h-4 text-indigo-400"></i> Platform API Configuration
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <i className="lucide-x w-4 h-4"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveSettings} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Operation Mode</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button 
                    type="button" 
                    onClick={() => setUseLocalServer(true)}
                    className={`p-2.5 rounded-xl border font-semibold transition-all ${
                      useLocalServer 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Node Express Server
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setUseLocalServer(false)}
                    className={`p-2.5 rounded-xl border font-semibold transition-all ${
                      !useLocalServer 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Direct Browser Mode
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                  {useLocalServer 
                    ? "Connects to server.js running locally on http://localhost:5000. Uses standard server configuration parameters."
                    : "Runs entirely client-side. Zero server dependencies! Requires your own direct Google Gemini or OpenAI API Key."
                  }
                </p>
              </div>

              {!useLocalServer && (
                <>
                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Direct AI API Provider</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button 
                        type="button" 
                        onClick={() => setApiProvider('gemini')}
                        className={`p-2.5 rounded-xl border font-semibold transition-all ${
                          apiProvider === 'gemini' 
                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Google Gemini (Free)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setApiProvider('openai')}
                        className={`p-2.5 rounded-xl border font-semibold transition-all ${
                          apiProvider === 'openai' 
                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        OpenAI (GPT-4o)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      {apiProvider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
                    </label>
                    <input 
                      type="password" 
                      value={apiKey} 
                      onChange={(e) => setApiKey(e.target.value)} 
                      placeholder={apiProvider === 'gemini' ? "AIzaSy..." : "sk-proj-..."}
                      className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white outline-none font-mono"
                    />
                    <p className="text-[9px] text-slate-500">
                      Your key remains 100% private in local storage. It is only sent directly to {apiProvider === 'gemini' ? 'Google' : 'OpenAI'} API endpoints.
                    </p>
                  </div>
                </>
              )}

              <button 
                type="submit" 
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Save Settings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. FOOTER MODULE */}
      <footer className="w-full py-6 border-t border-slate-900 text-center text-[10px] text-slate-500 font-medium">
        <span>© 2026 AI Interview Buddy Platform • Fully Engineered Responsive SPA Client & Node Server</span>
      </footer>
    </div>
  );
}

// Render React App to DOM
ReactDOM.render(<App />, document.getElementById('root'));
