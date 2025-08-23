import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VideoQuiz() {
  const router = useRouter();
  const playerRef = useRef(null);
  const [quizData, setQuizData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  // Load quiz data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quizData');
    if (saved) {
      setQuizData(JSON.parse(saved));
    }
  }, []);

  // Poll video time
  useEffect(() => {
    if (!quizData) return;
    
    const interval = setInterval(() => {
      const iframe = document.getElementById('ytplayer');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [quizData]);

  // Listen for YouTube player events
  useEffect(() => {
    function onMessage(event) {
      if (!event.data) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.info && data.info.currentTime !== undefined) {
          setVideoTime(data.info.currentTime);
        }
      } catch (e) {}
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Show question at the right time
  useEffect(() => {
    if (!quizData || quizCompleted) return;
    
    if (
      questionIndex < quizData.questions.length &&
      videoTime >= quizData.questions[questionIndex].time &&
      !currentQuestion
    ) {
      setCurrentQuestion(quizData.questions[questionIndex]);
      // Pause video
      const iframe = document.getElementById('ytplayer');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo' }),
          '*'
        );
      }
    }
  }, [videoTime, questionIndex, currentQuestion, quizData, quizCompleted]);

  function handleAnswer(idx) {
    const correct = idx === currentQuestion.answer;
    const newUserAnswers = [...userAnswers, { ...currentQuestion, user: idx, correct }];
    setUserAnswers(newUserAnswers);
    setScore(score + (correct ? 1 : 0));
    setShowScore(true);
  }

  function handleNext() {
    setCurrentQuestion(null);
    setShowScore(false);
    
    if (questionIndex + 1 >= quizData.questions.length) {
      // Quiz completed
      setQuizCompleted(true);
      const finalScore = score;
      const totalQuestions = quizData.questions.length;
      const percentage = (finalScore / totalQuestions) * 100;
      const passed = percentage >= 60;
      
      setFinalResult({
        score: finalScore,
        total: totalQuestions,
        percentage: percentage.toFixed(1),
        passed
      });
      
      // Stop video
      const iframe = document.getElementById('ytplayer');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo' }),
          '*'
        );
      }
    } else {
      setQuestionIndex(questionIndex + 1);
      // Resume video
      const iframe = document.getElementById('ytplayer');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo' }),
          '*'
        );
      }
    }
  }

  function restartQuiz() {
    setCurrentQuestion(null);
    setUserAnswers([]);
    setScore(0);
    setShowScore(false);
    setQuestionIndex(0);
    setQuizCompleted(false);
    setFinalResult(null);
    setVideoTime(0);
    
    // Restart video
    const iframe = document.getElementById('ytplayer');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
        '*'
      );
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo' }),
        '*'
      );
    }
  }

  if (!quizData) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, textAlign: 'center' }}>
        <h2>No Quiz Configuration Found</h2>
        <p>Please set up the quiz in the admin panel first.</p>
        <button
          onClick={() => router.push('/admin')}
          style={{
            padding: '12px 24px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16
          }}
        >
          Go to Admin Panel
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Video Quiz</h2>
        <button
          onClick={() => router.push('/admin')}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Admin Panel
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <iframe
          id="ytplayer"
          ref={playerRef}
          width="100%"
          height="400"
          src={`https://www.youtube.com/embed/${quizData.videoId}?enablejsapi=1`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        
        {currentQuestion && !quizCompleted && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.9)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '90%' }}>
              <h3 style={{ marginBottom: 24, fontSize: 24 }}>
                Question {questionIndex + 1} of {quizData.questions.length}
              </h3>
              <h3 style={{ marginBottom: 32, fontSize: 20 }}>{currentQuestion.question}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    style={{
                      padding: '12px 16px',
                      fontSize: 16,
                      background: '#333',
                      color: '#fff',
                      border: '2px solid #fff',
                      borderRadius: 8,
                      cursor: 'pointer',
                      minHeight: 60,
                      transition: 'all 0.3s ease'
                    }}
                    disabled={showScore}
                    onMouseOver={(e) => {
                      if (!showScore) {
                        e.target.style.background = '#555';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!showScore) {
                        e.target.style.background = '#333';
                      }
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {showScore && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ 
                    fontSize: 20, 
                    marginBottom: 16,
                    color: userAnswers[userAnswers.length - 1]?.correct ? '#4caf50' : '#f44336'
                  }}>
                    {userAnswers[userAnswers.length - 1]?.correct
                      ? '✓ Correct!'
                      : `✗ Incorrect. Correct answer: ${currentQuestion.options[currentQuestion.answer]}`}
                  </div>
                  <div style={{ fontSize: 18, marginBottom: 16 }}>
                    Current Score: {score} / {questionIndex + 1}
                  </div>
                  <button
                    onClick={handleNext}
                    style={{
                      padding: '12px 24px',
                      fontSize: 18,
                      background: '#4caf50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    {questionIndex + 1 >= quizData.questions.length ? 'Finish Quiz' : 'Continue'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {quizCompleted && finalResult && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.95)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: 32, fontSize: 32 }}>Quiz Complete!</h2>
              
              <div style={{ 
                fontSize: 48, 
                marginBottom: 24,
                color: finalResult.passed ? '#4caf50' : '#f44336'
              }}>
                {finalResult.passed ? '🎉 PASSED!' : '😞 FAILED'}
              </div>
              
              <div style={{ fontSize: 24, marginBottom: 16 }}>
                Final Score: {finalResult.score} / {finalResult.total}
              </div>
              
              <div style={{ fontSize: 20, marginBottom: 32 }}>
                Percentage: {finalResult.percentage}%
              </div>
              
              <div style={{ marginBottom: 32, fontSize: 16, color: '#ccc' }}>
                {finalResult.passed 
                  ? 'Congratulations! You passed the quiz with 60% or higher.'
                  : 'You need 60% or higher to pass. Try again!'}
              </div>
              
              <button
                onClick={restartQuiz}
                style={{
                  padding: '12px 24px',
                  fontSize: 18,
                  background: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  marginRight: 16
                }}
              >
                Restart Quiz
              </button>
              
              <button
                onClick={() => router.push('/admin')}
                style={{
                  padding: '12px 24px',
                  fontSize: 18,
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Admin Panel
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18 }}>
        <div>
          Progress: {Math.min(questionIndex + (currentQuestion ? 1 : 0), quizData.questions.length)} / {quizData.questions.length} questions
        </div>
        <div>
          Current Score: {score} / {quizData.questions.length}
        </div>
      </div>
      
      {quizData.questions.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Passing score: {Math.ceil(quizData.questions.length * 0.6)} / {quizData.questions.length} (60%)
        </div>
      )}
    </div>
  );
}
