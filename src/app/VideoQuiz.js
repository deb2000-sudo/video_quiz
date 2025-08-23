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
  const [maxWatchedTime, setMaxWatchedTime] = useState(0); // Track furthest point watched for restrictions
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [player, setPlayer] = useState(null);

  // Load quiz data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quizData');
    if (saved) {
      const data = JSON.parse(saved);
      // Add backward compatibility for older quiz data without videoType
      if (!data.videoType) {
        data.videoType = 'youtube'; // Default to YouTube for existing data
      }
      setQuizData(data);
    }
  }, []);

  // Poll video time
  useEffect(() => {
    if (!quizData) return;
    
    const interval = setInterval(() => {
      // Default to YouTube if videoType is not set (backward compatibility)
      const videoType = quizData.videoType || 'youtube';
      
      if (videoType === 'youtube') {
        const iframe = document.getElementById('ytplayer');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'listening' }),
            '*'
          );
        }
      } else if (videoType === 'gdrive') {
        // For Google Drive, we can't control the iframe directly
        // The time tracking is handled by the iframe's onLoad event
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [quizData, maxWatchedTime]);

  // Listen for YouTube player events
  useEffect(() => {
    const videoType = quizData?.videoType || 'youtube'; // Default to YouTube
    if (videoType !== 'youtube') return;
    
    function onMessage(event) {
      if (!event.data) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data && data.info) {
          const currentTime = data.info.currentTime;
          if (currentTime !== undefined) {
            setVideoTime(currentTime);
            setMaxWatchedTime(Math.max(maxWatchedTime, currentTime));
            
            // Prevent seeking ahead of watched content
            if (currentTime > maxWatchedTime + 2) {
              const iframe = document.getElementById('ytplayer');
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                  JSON.stringify({ event: 'command', func: 'seekTo', args: [maxWatchedTime, true] }),
                  '*'
                );
                alert('You cannot skip ahead. Please watch the video sequentially.');
              }
            }
          }
          
          // Track player state
          if (data.info.playerState !== undefined) {
            // 1 = playing, 2 = paused, 0 = ended
            console.log('Player state:', data.info.playerState);
          }
        }
      } catch (e) {
        console.error('Error parsing YouTube message:', e);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [quizData, maxWatchedTime]);

  // Show question at the right time
  useEffect(() => {
    if (!quizData || quizCompleted || !quizData.questions) return;
    
    // Check if we should show a question
    const currentQuestionData = quizData.questions[questionIndex];
    if (
      questionIndex < quizData.questions.length &&
      currentQuestionData &&
      videoTime >= currentQuestionData.time &&
      !currentQuestion
    ) {
      console.log(`Showing question ${questionIndex + 1} at time ${videoTime}s (trigger time: ${currentQuestionData.time}s)`);
      setCurrentQuestion(currentQuestionData);
      
      // Pause video based on type
      const videoType = quizData.videoType || 'youtube'; // Default to YouTube
      if (videoType === 'youtube') {
        const iframe = document.getElementById('ytplayer');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
          );
        }
      } else if (videoType === 'gdrive') {
        // For Google Drive iframe, we can't pause directly
        // The restriction is more about the warning and question timing
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
      
      // Stop video based on type
      const videoType = quizData.videoType || 'youtube'; // Default to YouTube
      if (videoType === 'youtube') {
        const iframe = document.getElementById('ytplayer');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
          );
        }
      } else if (videoType === 'gdrive') {
        // For Google Drive iframe, we can't control playback directly
      }
    } else {
      setQuestionIndex(questionIndex + 1);
      // Resume video based on type
      const videoType = quizData.videoType || 'youtube'; // Default to YouTube
      if (videoType === 'youtube') {
        const iframe = document.getElementById('ytplayer');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo' }),
            '*'
          );
        }
      } else if (videoType === 'gdrive') {
        // For Google Drive iframe, we can't control playback directly
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
    setMaxWatchedTime(0);
    
    // Restart video based on type
    const videoType = quizData.videoType || 'youtube'; // Default to YouTube
    if (videoType === 'youtube') {
      const iframe = document.getElementById('ytplayer');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
          '*'
        );
        setTimeout(() => {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo' }),
            '*'
          );
        }, 500);
      }
    } else if (videoType === 'gdrive') {
      // For Google Drive iframe, we can't control playback directly
      // Clear any existing interval
      const iframe = document.getElementById('gdrive-video');
      if (iframe) {
        const intervalId = iframe.getAttribute('data-interval');
        if (intervalId) {
          clearInterval(parseInt(intervalId));
        }
        // Reload the iframe to restart
        iframe.src = iframe.src;
      }
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

      {/* Debug info */}
      <div style={{ marginBottom: 16, padding: 10, background: '#f8f9fa', borderRadius: 4, fontSize: 12 }}>
        <strong>Debug Info:</strong> Video Type: {quizData.videoType || 'youtube (default)'}, 
        Video ID: {quizData.videoId}, Questions: {quizData.questions?.length || 0}<br/>
        <strong>Timing:</strong> Current: {Math.floor(videoTime)}s, Max Watched: {Math.floor(maxWatchedTime)}s, 
        Next Question: {quizData.questions?.[questionIndex] ? `#${questionIndex + 1} at ${quizData.questions[questionIndex].time}s` : 'None'}
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        {(quizData.videoType || 'youtube') === 'youtube' ? (
          <div style={{ position: 'relative' }}>
            <iframe
              id="ytplayer"
              ref={playerRef}
              width="100%"
              height="400"
              src={`https://www.youtube.com/embed/${quizData.videoId}?enablejsapi=1&controls=1&disablekb=1&modestbranding=1&rel=0&showinfo=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            {/* Restriction warning for YouTube */}
            <div style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'rgba(255, 152, 0, 0.9)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              🔒 Sequential viewing required
            </div>
            {/* Progress overlay */}
            <div style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: 4,
              fontSize: 12
            }}>
              Watched up to: {Math.floor(maxWatchedTime / 60)}:{Math.floor(maxWatchedTime % 60).toString().padStart(2, '0')}
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <iframe
              id="gdrive-video"
              ref={playerRef}
              width="100%"
              height="400"
              src={`https://drive.google.com/file/d/${quizData.videoId}/preview`}
              title="Google Drive video player"
              frameBorder="0"
              allow="autoplay"
              style={{ backgroundColor: '#000' }}
              onLoad={() => {
                // Set up interval to track video time for Google Drive
                const iframe = document.getElementById('gdrive-video');
                if (iframe) {
                  // Since we can't directly access iframe content from Google Drive,
                  // we'll simulate video time progression
                  const startTime = Date.now();
                  const interval = setInterval(() => {
                    const elapsed = (Date.now() - startTime) / 1000;
                    setVideoTime(elapsed);
                    setMaxWatchedTime(Math.max(maxWatchedTime, elapsed));
                  }, 1000);
                  
                  // Store interval ID to clear it later
                  iframe.setAttribute('data-interval', interval);
                }
              }}
            />
            {/* Overlay controls for Google Drive (since we can't control the iframe directly) */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              padding: '10px 15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10
            }}>
              <span style={{ color: 'white', fontSize: 14, textAlign: 'center' }}>
                ⚠️ This video has viewing restrictions. Please watch sequentially and do not skip ahead.
              </span>
            </div>
            {/* Restriction warning */}
            <div style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'rgba(255, 152, 0, 0.9)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              🔒 Sequential viewing required
            </div>
          </div>
        )}
        
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
