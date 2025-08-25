'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Admin.module.css';

export default function AdminPage() {
  const [videoLink, setVideoLink] = useState('');
  const [videoType, setVideoType] = useState('youtube'); // 'youtube' or 'gdrive'
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    time: '',
    question: '',
    options: ['', '', '', ''],
    answer: 0,
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
        id: Date.now(),
      };
      setQuestions([...questions, questionToAdd]);
      setNewQuestion({
        time: '',
        question: '',
        options: ['', '', '', ''],
        answer: 0,
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
      questions: questions.sort((a, b) => a.time - b.time),
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
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Quiz Admin Panel</h1>
        <button onClick={() => router.push('/')} className={styles.viewQuizButton}>
          View Quiz
        </button>
      </header>

      <section className={styles.section}>
        <h2>Video Configuration</h2>
        <div className={styles.formGroup}>
          <label className={styles.label}>Video Type:</label>
          <select
            value={videoType}
            onChange={(e) => {
              setVideoType(e.target.value);
              setVideoLink('');
            }}
            className={styles.select}
          >
            <option value="youtube">YouTube</option>
            <option value="gdrive">Google Drive</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
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
            className={styles.input}
          />
          <p className={styles.notes}>
            {videoType === 'youtube' 
              ? 'Enter a YouTube video URL'
              : "Enter a Google Drive shareable link to a video file (make sure it's publicly accessible)"
            }
          </p>
        </div>
        
        {videoLink && validateVideoLink(videoLink, videoType) && (
          <div className={styles.validationMessage}>
            <p className={styles.valid}>✓ Valid {videoType === 'youtube' ? 'YouTube' : 'Google Drive'} URL detected</p>
            <p>Video ID: {extractVideoId(videoLink, videoType)}</p>
            {videoType === 'gdrive' && (
              <p className={styles.warning}>
                ⚠️ Note: Google Drive videos will have playback restrictions to prevent skipping ahead
              </p>
            )}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2>Add New Question</h2>
        <div className={styles.formGroup}>
          <label className={styles.label}>Timestamp (seconds):</label>
          <input
            type="number"
            value={newQuestion.time}
            onChange={(e) => setNewQuestion({ ...newQuestion, time: e.target.value })}
            placeholder="e.g., 30"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Question:</label>
          <input
            type="text"
            value={newQuestion.question}
            onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
            placeholder="Enter your question here"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Options:</label>
          {newQuestion.options.map((option, index) => (
            <div key={index} className={styles.optionInputContainer}>
              <input
                type="radio"
                name="correctAnswer"
                checked={newQuestion.answer === index}
                onChange={() => setNewQuestion({ ...newQuestion, answer: index })}
                className={styles.radio}
              />
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className={styles.input}
              />
            </div>
          ))}
          <p className={styles.notes}>
            Select the radio button next to the correct answer
          </p>
        </div>

        <button onClick={addQuestion} className={styles.addButton}>
          Add Question
        </button>
      </section>

      <section className={styles.section}>
        <h2>Questions ({questions.length})</h2>
        {questions.length === 0 ? (
          <p>No questions added yet.</p>
        ) : (
          <ul className={styles.questionList}>
            {questions
              .sort((a, b) => a.time - b.time)
              .map((q, index) => (
                <li key={q.id} className={styles.questionItem}>
                  <div className={styles.questionHeader}>
                    <div className={styles.questionContent}>
                      <h4>Question {index + 1} (at {q.time}s)</h4>
                      <p>{q.question}</p>
                      <ul>
                        {q.options.map((opt, idx) => (
                          <li
                            key={idx}
                            className={idx === q.answer ? styles.correctAnswer : ''}
                          >
                            {opt} {idx === q.answer && '✓'}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button onClick={() => removeQuestion(q.id)} className={styles.removeButton}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <div className={styles.saveButtonContainer}>
        <button
          onClick={saveQuizData}
          disabled={!videoLink || questions.length === 0 || !validateVideoLink(videoLink, videoType)}
          className={styles.saveButton}
        >
          Save Quiz Configuration
        </button>
      </div>

      {savedData && (
        <div className={styles.savedData}>
          <h3>Current Saved Configuration</h3>
          <p><strong>Video Type:</strong> {savedData.videoType || 'youtube (legacy)'}</p>
          <p><strong>Video:</strong> {savedData.videoLink}</p>
          <p><strong>Video ID:</strong> {savedData.videoId}</p>
          <p><strong>Questions:</strong> {savedData.questions.length}</p>
          <p><strong>Passing Score:</strong> {Math.ceil(savedData.questions.length * 0.6)} out of {savedData.questions.length} (60%)</p>
          {savedData.videoType === 'gdrive' && (
            <p className={styles.warning}>
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
            className={styles.clearButton}
          >
            Clear All Data
          </button>
        </div>
      )}
    </div>
  );
}
