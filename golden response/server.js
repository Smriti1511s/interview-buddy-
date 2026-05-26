const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Serve static frontend files from this directory
app.use(express.static(__dirname));

// Configure Multer for in-memory resume uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==========================================
// 1. DATABASE LAYER (MONGOOSE + LOCAL FALLBACK)
// ==========================================
let isMongoConnected = false;
let dbFallbackPath = path.join(__dirname, 'db_fallback.json');

// Initialize local JSON database if it doesn't exist
if (!fs.existsSync(dbFallbackPath)) {
  fs.writeFileSync(dbFallbackPath, JSON.stringify({ profiles: [], sessions: [] }, null, 2));
}

// Mongoose Models container
let UserProfileModel = null;
let InterviewSessionModel = null;

const MONGODB_URI = process.env.MONGODB_URI;

async function initDatabase() {
  if (MONGODB_URI) {
    try {
      const mongoose = require('mongoose');
      await mongoose.connect(MONGODB_URI);
      isMongoConnected = true;
      console.log('Successfully connected to MongoDB Database.');

      const UserProfileSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true },
        skills: [{ type: String }],
        experience: [{ role: String, company: String, duration: String, description: String }],
        projects: [{ title: String, description: String, technologies: [{ type: String }] }],
        education: [{ degree: String, institution: String, year: String }],
        certifications: [{ type: String }]
      }, { timestamps: true });

      const InterviewSessionSchema = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProfile', required: true },
        experienceLevel: { type: String, required: true },
        interviewType: { type: String, required: true },
        status: { type: String, enum: ['active', 'completed'], default: 'active' },
        timeRemainingSeconds: { type: Number, required: true },
        questions: [{ type: String }],
        currentQuestionIndex: { type: Number, default: 0 },
        chatLog: [{ role: { type: String, enum: ['ai', 'user'] }, text: String, timestamp: { type: Date, default: Date.now } }],
        evaluation: { score: { type: Number, default: 0 }, feedback: String }
      }, { timestamps: true });

      UserProfileModel = mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema);
      InterviewSessionModel = mongoose.models.InterviewSession || mongoose.model('InterviewSession', InterviewSessionSchema);
    } catch (err) {
      console.warn('MongoDB connection failed. Falling back to local JSON database.', err.message);
      isMongoConnected = false;
    }
  } else {
    console.log('No MONGODB_URI provided. Running in local JSON database mode.');
  }
}

// Local File DB Helper Functions
function readLocalDB() {
  try {
    const data = fs.readFileSync(dbFallbackPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { profiles: [], sessions: [] };
  }
}

function writeLocalDB(data) {
  fs.writeFileSync(dbFallbackPath, JSON.stringify(data, null, 2));
}

// ==========================================
// 2. BACKEND API ROUTE HANDLERS
// ==========================================

// GET HISTORY
app.get('/api/history', async (req, res) => {
  try {
    if (isMongoConnected) {
      const sessions = await InterviewSessionModel.find({ status: 'completed' })
        .populate('userId')
        .sort({ updatedAt: -1 });
      
      const formatted = sessions.map(s => ({
        id: s._id,
        name: s.userId?.name || 'Candidate',
        email: s.userId?.email || '',
        experienceLevel: s.experienceLevel,
        interviewType: s.interviewType,
        score: s.evaluation?.score || 0,
        feedback: s.evaluation?.feedback || '',
        date: s.updatedAt
      }));
      return res.json({ success: true, history: formatted });
    } else {
      const db = readLocalDB();
      const completedSessions = db.sessions
        .filter(s => s.status === 'completed')
        .map(s => {
          const profile = db.profiles.find(p => p.id === s.userId);
          return {
            id: s.id,
            name: profile?.name || 'Candidate',
            email: profile?.email || '',
            experienceLevel: s.experienceLevel,
            interviewType: s.interviewType,
            score: s.evaluation?.score || 0,
            feedback: s.evaluation?.feedback || '',
            date: s.updatedAt || new Date().toISOString()
          };
        })
        .reverse();
      return res.json({ success: true, history: completedSessions });
    }
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET SPECIFIC SESSION DETAILS
app.get('/api/history/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (isMongoConnected) {
      const session = await InterviewSessionModel.findById(sessionId).populate('userId');
      if (!session) return res.status(404).json({ error: 'Interview session not found' });
      return res.json({ success: true, session });
    } else {
      const db = readLocalDB();
      const session = db.sessions.find(s => s.id === sessionId);
      if (!session) return res.status(404).json({ error: 'Interview session not found' });
      const profile = db.profiles.find(p => p.id === session.userId);
      return res.json({ success: true, session: { ...session, userId: profile } });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST ENDPOINT FOR RESUME UPLOAD AND INTERVIEW INIT
app.post('/api/interview', upload.single('file'), async (req, res) => {
  try {
    const OpenAI = require('openai');
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'OPENAI_API_KEY environment variable is not defined.' });
    }
    const openai = new OpenAI({ apiKey });

    // CASE A: File Upload & Parsing Pipeline
    if (req.file) {
      const file = req.file;
      const buffer = file.buffer;
      let rawText = '';

      console.log(`Parsing file: ${file.originalname} (${file.mimetype})`);

      if (file.mimetype === 'application/pdf') {
        const pdfParse = require('pdf-parse');
        const parsed = await pdfParse(buffer);
        rawText = parsed.text;
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = require('mammoth');
        const parsed = await mammoth.extractRawText({ buffer });
        rawText = parsed.value;
      } else {
        rawText = buffer.toString('utf-8');
      }

      console.log('Sending extracted resume text to OpenAI for structured parsing...');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Extract resume fields strictly into this JSON structure:
            {
              "name": "", "email": "", "skills": [],
              "experience": [{"role": "", "company": "", "duration": "", "description": ""}],
              "projects": [{"title": "", "description": "", "technologies": []}],
              "education": [{"degree": "", "institution": "", "year": ""}],
              "certifications": []
            }`
          },
          { role: 'user', content: rawText }
        ]
      });

      const extractedData = JSON.parse(completion.choices[0].message.content || '{}');
      
      let profile;
      if (isMongoConnected) {
        profile = await UserProfileModel.create(extractedData);
      } else {
        const db = readLocalDB();
        profile = {
          id: 'prof_' + Math.random().toString(36).substr(2, 9),
          ...extractedData,
          createdAt: new Date().toISOString()
        };
        db.profiles.push(profile);
        writeLocalDB(db);
      }

      console.log(`Successfully created profile for: ${profile.name}`);
      return res.status(201).json({ success: true, profile });
    }

    // CASE B: Initialize Active Session Pipeline
    const { profileId, experienceLevel, interviewType } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: 'Missing profileId or file upload' });
    }

    let profile;
    if (isMongoConnected) {
      profile = await UserProfileModel.findById(profileId);
    } else {
      const db = readLocalDB();
      profile = db.profiles.find(p => p.id === profileId);
    }

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    console.log(`Generating interview questions for: ${profile.name} (Level: ${experienceLevel}, Focus: ${interviewType})`);

    const sessionCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Generate exactly 5 focused interview questions based on the resume matrix as a JSON array named "questions".' },
        { role: 'user', content: `Profile: ${JSON.stringify(profile)}. Level: ${experienceLevel}. Type: ${interviewType}` }
      ]
    });

    const { questions } = JSON.parse(sessionCompletion.choices[0].message.content || '{"questions":[]}');
    
    if (!questions || questions.length === 0) {
      throw new Error('AI failed to generate interview questions.');
    }

    let session;
    const initialChatLog = [{ role: 'ai', text: questions[0], timestamp: new Date().toISOString() }];

    if (isMongoConnected) {
      session = await InterviewSessionModel.create({
        userId: profileId,
        experienceLevel,
        interviewType,
        timeRemainingSeconds: 300,
        questions,
        currentQuestionIndex: 0,
        chatLog: initialChatLog
      });
    } else {
      const db = readLocalDB();
      session = {
        id: 'sess_' + Math.random().toString(36).substr(2, 9),
        userId: profileId,
        experienceLevel,
        interviewType,
        status: 'active',
        timeRemainingSeconds: 300,
        questions,
        currentQuestionIndex: 0,
        chatLog: initialChatLog,
        evaluation: { score: 0, feedback: '' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.sessions.push(session);
      writeLocalDB(db);
    }

    console.log(`Interview session created: ${session.id || session._id}`);
    return res.status(201).json({ success: true, session });
  } catch (error) {
    console.error('Error in POST /api/interview:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PUT ENDPOINT TO SUBMIT RESPONSES AND PROGRESS
app.put('/api/interview', async (req, res) => {
  try {
    const OpenAI = require('openai');
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'OPENAI_API_KEY environment variable is not defined.' });
    }
    const openai = new OpenAI({ apiKey });

    const { sessionId, answer, isAutoSubmit, timeRemainingSeconds } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    let session;
    let db;

    if (isMongoConnected) {
      session = await InterviewSessionModel.findById(sessionId);
    } else {
      db = readLocalDB();
      session = db.sessions.find(s => s.id === sessionId);
    }

    if (!session) return res.status(404).json({ error: 'Interview session not found' });

    session.timeRemainingSeconds = timeRemainingSeconds;
    if (answer) {
      session.chatLog.push({ role: 'user', text: answer, timestamp: new Date().toISOString() });
    }

    const nextIndex = session.currentQuestionIndex + 1;

    // Conclude and evaluate session if time is up, completed all questions, or skipped/finished
    if (isAutoSubmit || nextIndex >= session.questions.length) {
      console.log(`Concluding assessment for session: ${sessionId}. Generating scoring analysis...`);
      session.status = 'completed';
      
      const evaluationCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Evaluate the following interview conversation. Return an integer score (0-100) and structured text feedback in this exact format: {"score": 80, "feedback": "Your engineering insight..."}' },
          { role: 'user', content: JSON.stringify(session.chatLog) }
        ]
      });

      const evalData = JSON.parse(evaluationCompletion.choices[0].message.content || '{"score":0,"feedback":""}');
      session.evaluation = evalData;
      session.updatedAt = new Date().toISOString();

      if (isMongoConnected) {
        await session.save();
      } else {
        const index = db.sessions.findIndex(s => s.id === sessionId);
        db.sessions[index] = session;
        writeLocalDB(db);
      }

      console.log(`Assessment evaluated successfully. Score: ${evalData.score}`);
      return res.json({ success: true, session, completed: true });
    } else {
      // Transition to next question
      session.currentQuestionIndex = nextIndex;
      session.chatLog.push({ 
        role: 'ai', 
        text: session.questions[nextIndex], 
        timestamp: new Date().toISOString() 
      });
      session.updatedAt = new Date().toISOString();

      if (isMongoConnected) {
        await session.save();
      } else {
        const index = db.sessions.findIndex(s => s.id === sessionId);
        db.sessions[index] = session;
        writeLocalDB(db);
      }

      return res.json({ success: true, session, completed: false });
    }
  } catch (error) {
    console.error('Error in PUT /api/interview:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: isMongoConnected ? 'mongodb' : 'local_json' });
});

// Start Express server and database initialization
app.listen(PORT, async () => {
  console.log(`--------------------------------------------------`);
  console.log(`AI Interview Buddy Server is starting...`);
  console.log(`Port: ${PORT}`);
  console.log(`Serving Client from: ${__dirname}`);
  await initDatabase();
  console.log(`Server URL: http://localhost:${PORT}`);
  console.log(`--------------------------------------------------`);
});
