import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './VideoQuiz.module.css';

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
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('quizData');
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.videoType) {
        data.videoType = 'youtube';
      }
      setQuizData(data);
    }
  }, []);

  useEffect(() => {
    if (!quizData) return;
    
    const interval = setInterval(() => {
      const videoType = quizData.videoType || 'youtube';
      
      if (videoType === 'youtube') {
        const iframe = document.getElementById('ytplayer');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'listening' }),
            '*'
          );
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [quizData, maxWatchedTime]);

  useEffect(() => {
    const videoType = quizData?.videoType || 'youtube';
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
        }
      } catch (e) {
        console.error('Error parsing YouTube message:', e);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [quizData, maxWatchedTime]);

  useEffect(() => {
    if (!quizData || quizCompleted || !quizData.questions) return;
    
    const currentQuestionData = quizData.questions[questionIndex];
    if (
      questionIndex < quizData.questions.length &&
      currentQuestionData &&
      videoTime >= currentQuestionData.time &&
      !currentQuestion
    ) {
      setCurrentQuestion(currentQuestionData);
      
      const videoType = quizData.videoType || 'youtube';
      if (videoType === 'youtube') {
        const iframe = document.getElementById('ytplayer');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
          );
        }
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
      
      const videoType = quizData.videoType || 'youtube';
      if (videoType === 'youtube') {
        const iframe = document.getElementById('ytplayer');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
          );
        }
      }
    } else {
      setQuestionIndex(questionIndex + 1);
      const videoType = quizData.videoType || 'youtube';
      if (videoType === 'youtube') {
        const iframe = document.getElementById('ytplayer');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo' }),
            '*'
          );
        }
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
    
    const videoType = quizData.videoType || 'youtube';
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
      const iframe = document.getElementById('gdrive-video');
      if (iframe) {
        const intervalId = iframe.getAttribute('data-interval');
        if (intervalId) {
          clearInterval(parseInt(intervalId));
        }
        iframe.src = iframe.src;
      }
    }
  }

  if (!quizData) {
    return (
      <div className={styles.noQuizContainer}>
        <h2>No Quiz Configuration Found</h2>
        <p>Please set up the quiz in the admin panel first.</p>
        <button
          onClick={() => router.push('/admin')}
          className={styles.goToAdminButton}
        >
          Go to Admin Panel
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Video Quiz</h2>
        <button onClick={() => router.push('/admin')} className={styles.adminButton}>
          Admin Panel
        </button>
      </header>

      <div className={styles.debugInfo}>
        <strong>Debug Info:</strong> Video Type: {quizData.videoType || 'youtube (default)'}, 
        Video ID: {quizData.videoId}, Questions: {quizData.questions?.length || 0}<br/>
        <strong>Timing:</strong> Current: {Math.floor(videoTime)}s, Max Watched: {Math.floor(maxWatchedTime)}s, 
        Next Question: {quizData.questions?.[questionIndex] ? `#${questionIndex + 1} at ${quizData.questions[questionIndex].time}s` : 'None'}
      </div>

      <div className={styles.videoContainer}>
        {(quizData.videoType || 'youtube') === 'youtube' ? (
          <>
            <iframe
              id="ytplayer"
              ref={playerRef}
              className={styles.videoPlayer}
              src={`https://www.youtube.com/embed/${quizData.videoId}?enablejsapi=1&controls=1&disablekb=1&modestbranding=1&rel=0&showinfo=0`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <div className={styles.videoOverlay}>
              🔒 Sequential viewing required
            </div>
            <div className={styles.progressOverlay}>
              Watched up to: {Math.floor(maxWatchedTime / 60)}:{Math.floor(maxWatchedTime % 60).toString().padStart(2, '0')}
            </div>
          </>
        ) : (
          <>
            <iframe
              id="gdrive-video"
              ref={playerRef}
              className={styles.videoPlayer}
              src={`https://drive.google.com/file/d/${quizData.videoId}/preview`}
              title="Google Drive video player"
              allow="autoplay"
              onLoad={() => {
                const iframe = document.getElementById('gdrive-video');
                if (iframe) {
                  const startTime = Date.now();
                  const interval = setInterval(() => {
                    const elapsed = (Date.now() - startTime) / 1000;
                    setVideoTime(elapsed);
                    setMaxWatchedTime(Math.max(maxWatchedTime, elapsed));
                  }, 1000);
                  iframe.setAttribute('data-interval', interval);
                }
              }}
            />
            <div className={styles.gdriveWarning}>
              ⚠️ This video has viewing restrictions. Please watch sequentially and do not skip ahead.
            </div>
            <div className={styles.videoOverlay}>
              🔒 Sequential viewing required
            </div>
          </>
        )}
        
        {currentQuestion && !quizCompleted && (
          <div className={styles.questionOverlay}>
            <div className={styles.questionBox}>
              <h3 className={styles.questionTitle}>
                Question {questionIndex + 1} of {quizData.questions.length}
              </h3>
              <h3 className={styles.questionText}>{currentQuestion.question}</h3>
              <div className={styles.optionsGrid}>
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={styles.optionButton}
                    disabled={showScore}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {showScore && (
                <div className={styles.scoreScreen}>
                  <div className={`${styles.feedbackMessage} ${userAnswers[userAnswers.length - 1]?.correct ? styles.correct : styles.incorrect}`}>
                    {userAnswers[userAnswers.length - 1]?.correct
                      ? '✓ Correct!'
                      : `✗ Incorrect. Correct answer: ${currentQuestion.options[currentQuestion.answer]}`}
                  </div>
                  <div className={styles.currentScore}>
                    Current Score: {score} / {questionIndex + 1}
                  </div>
                  <button onClick={handleNext} className={styles.continueButton}>
                    {questionIndex + 1 >= quizData.questions.length ? 'Finish Quiz' : 'Continue'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {quizCompleted && finalResult && (
          <div className={styles.finalResultOverlay}>
            <div className={styles.finalResultBox}>
              <h2 className={styles.finalResultTitle}>Quiz Complete!</h2>
              <div className={`${styles.passFailMessage} ${finalResult.passed ? styles.passed : styles.failed}`}>
                {finalResult.passed ? '🎉 PASSED!' : '😞 FAILED'}
              </div>
              <div className={styles.finalScore}>
                Final Score: {finalResult.score} / {finalResult.total}
              </div>
              <div className={styles.percentage}>
                Percentage: {finalResult.percentage}%
              </div>
              <div className={styles.passInfo}>
                {finalResult.passed 
                  ? 'Congratulations! You passed the quiz with 60% or higher.'
                  : 'You need 60% or higher to pass. Try again!'}
              </div>
              <div className={styles.resultActions}>
                <button onClick={restartQuiz} className={styles.restartButton}>
                  Restart Quiz
                </button>
                <button onClick={() => router.push('/admin')} className={styles.adminPanelButton}>
                  Admin Panel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.quizProgress}>
        <div>
          Progress: {Math.min(questionIndex + (currentQuestion ? 1 : 0), quizData.questions.length)} / {quizData.questions.length} questions
        </div>
        <div>
          Current Score: {score} / {quizData.questions.length}
        </div>
      </div>
      
      {quizData.questions.length > 0 && (
        <div className={styles.passingScoreInfo}>
          Passing score: {Math.ceil(quizData.questions.length * 0.6)} / {quizData.questions.length} (60%)
        </div>
      )}
    </div>
  );
}
