'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [videoLink, setVideoLink] = useState('');
  const [videoType, setVideoType] = useState('youtube'); // 'youtube' or 'gdrive'
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    time: '',
    question: '',
    options: ['', '', '', ''],
    answer: 0
  });
  const [savedData, setSavedData] = useState(null);
  const router = useRouter();

  // Load existing data on component mount
  useEffect(() => {
    const saved = localStorage.getItem('quizData');
    if (saved) {
      const data = JSON.parse(saved);
      setSavedData(data);
      setVideoLink(data.videoLink || '');
      setVideoType(data.videoType || 'youtube');
      setQuestions(data.questions || []);
    }
  }, []);

  const extractVideoId = (url, type) => {
    if (type === 'youtube') {
      const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } else if (type === 'gdrive') {
      // Extract file ID from Google Drive share link
      // Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
      const regex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
      const match = url.match(regex);
      return match ? match[1] : null;
    }
    return null;
  };

  const validateVideoLink = (url, type) => {
    if (type === 'youtube') {
      return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/.test(url);
    } else if (type === 'gdrive') {
      return /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/.test(url);
    }
    return false;
  };

  const addQuestion = () => {
    if (newQuestion.question && newQuestion.time && newQuestion.options.every(opt => opt.trim())) {
      const questionToAdd = {
        ...newQuestion,
        time: parseInt(newQuestion.time),
        id: Date.now()
      };
      setQuestions([...questions, questionToAdd]);
      setNewQuestion({
        time: '',
        question: '',
        options: ['', '', '', ''],
        answer: 0
      });
    }
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const saveQuizData = () => {
    const videoId = extractVideoId(videoLink, videoType);
    if (!videoId) {
      alert(`Please enter a valid ${videoType === 'youtube' ? 'YouTube' : 'Google Drive'} URL`);
      return;
    }
    
    const quizData = {
      videoLink,
      videoType,
      videoId,
      questions: questions.sort((a, b) => a.time - b.time)
    };
    
    localStorage.setItem('quizData', JSON.stringify(quizData));
    setSavedData(quizData);
    alert('Quiz data saved successfully!');
  };

  const updateOption = (index, value) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Quiz Admin Panel</h1>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          View Quiz
        </button>
      </div>

      {/* Video Link Section */}
      <div style={{ marginBottom: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Video Configuration</h2>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Video Type:
          </label>
          <select
            value={videoType}
            onChange={(e) => {
              setVideoType(e.target.value);
              setVideoLink(''); // Clear link when switching types
            }}
            style={{
              padding: 8,
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 16,
              marginRight: 16
            }}
          >
            <option value="youtube">YouTube</option>
            <option value="gdrive">Google Drive</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            {videoType === 'youtube' ? 'YouTube Video URL:' : 'Google Drive Video URL:'}
          </label>
          <input
            type="text"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            placeholder={
              videoType === 'youtube' 
                ? 'https://www.youtube.com/watch?v=...' 
                : 'https://drive.google.com/file/d/.../view?usp=sharing'
            }
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
            {videoType === 'youtube' 
              ? 'Enter a YouTube video URL'
              : 'Enter a Google Drive shareable link to a video file (make sure it\'s publicly accessible)'
            }
          </p>
        </div>
        
        {videoLink && validateVideoLink(videoLink, videoType) && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: 'green' }}>✓ Valid {videoType === 'youtube' ? 'YouTube' : 'Google Drive'} URL detected</p>
            <p>Video ID: {extractVideoId(videoLink, videoType)}</p>
            {videoType === 'gdrive' && (
              <p style={{ color: 'orange', fontSize: 14 }}>
                ⚠️ Note: Google Drive videos will have playback restrictions to prevent skipping ahead
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add Question Section */}
      <div style={{ marginBottom: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Add New Question</h2>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Timestamp (seconds):
          </label>
          <input
            type="number"
            value={newQuestion.time}
            onChange={(e) => setNewQuestion({ ...newQuestion, time: e.target.value })}
            placeholder="e.g., 30"
            style={{
              width: '200px',
              padding: 8,
              border: '1px solid #ccc',
              borderRadius: 4
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Question:
          </label>
          <input
            type="text"
            value={newQuestion.question}
            onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
            placeholder="Enter your question here"
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #ccc',
              borderRadius: 4
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Options:
          </label>
          {newQuestion.options.map((option, index) => (
            <div key={index} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
              <input
                type="radio"
                name="correctAnswer"
                checked={newQuestion.answer === index}
                onChange={() => setNewQuestion({ ...newQuestion, answer: index })}
                style={{ marginRight: 8 }}
              />
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                style={{
                  flex: 1,
                  padding: 8,
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}
              />
            </div>
          ))}
          <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
            Select the radio button next to the correct answer
          </p>
        </div>

        <button
          onClick={addQuestion}
          style={{
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16
          }}
        >
          Add Question
        </button>
      </div>

      {/* Questions List */}
      <div style={{ marginBottom: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Questions ({questions.length})</h2>
        {questions.length === 0 ? (
          <p style={{ color: '#666' }}>No questions added yet.</p>
        ) : (
          <div>
            {questions
              .sort((a, b) => a.time - b.time)
              .map((q, index) => (
                <div
                  key={q.id}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    border: '1px solid #eee',
                    borderRadius: 4,
                    background: '#f9f9f9'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4>Question {index + 1} (at {q.time}s)</h4>
                      <p style={{ margin: '8px 0', fontWeight: 'bold' }}>{q.question}</p>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {q.options.map((opt, idx) => (
                          <li
                            key={idx}
                            style={{
                              color: idx === q.answer ? 'green' : 'black',
                              fontWeight: idx === q.answer ? 'bold' : 'normal'
                            }}
                          >
                            {opt} {idx === q.answer && '✓'}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      style={{
                        padding: '4px 8px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={saveQuizData}
          disabled={!videoLink || questions.length === 0 || !validateVideoLink(videoLink, videoType)}
          style={{
            padding: '12px 24px',
            background: videoLink && questions.length > 0 && validateVideoLink(videoLink, videoType) ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: videoLink && questions.length > 0 && validateVideoLink(videoLink, videoType) ? 'pointer' : 'not-allowed',
            fontSize: 18,
            fontWeight: 'bold'
          }}
        >
          Save Quiz Configuration
        </button>
      </div>

      {/* Current Configuration Display */}
      {savedData && (
        <div style={{ marginTop: 32, padding: 20, border: '1px solid #28a745', borderRadius: 8, background: '#d4edda' }}>
          <h3 style={{ color: '#155724' }}>Current Saved Configuration</h3>
          <p><strong>Video Type:</strong> {savedData.videoType || 'youtube (legacy)'}</p>
          <p><strong>Video:</strong> {savedData.videoLink}</p>
          <p><strong>Video ID:</strong> {savedData.videoId}</p>
          <p><strong>Questions:</strong> {savedData.questions.length}</p>
          <p><strong>Passing Score:</strong> {Math.ceil(savedData.questions.length * 0.6)} out of {savedData.questions.length} (60%)</p>
          {savedData.videoType === 'gdrive' && (
            <p style={{ color: '#856404', fontStyle: 'italic' }}>
              ⚠️ Google Drive video will have playback restrictions enabled
            </p>
          )}
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear all quiz data? This cannot be undone.')) {
                localStorage.removeItem('quizData');
                setSavedData(null);
                setVideoLink('');
                setVideoType('youtube');
                setQuestions([]);
                alert('Quiz data cleared successfully!');
              }
            }}
            style={{
              marginTop: 10,
              padding: '8px 16px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Clear All Data
          </button>
        </div>
      )}
    </div>
  );
}
