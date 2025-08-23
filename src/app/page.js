
'use client';

import dynamic from 'next/dynamic';
const VideoQuiz = dynamic(() => import('./VideoQuiz'), { ssr: false });

export default function Home() {
  return (
    <main>
      <VideoQuiz />
    </main>
  );
}
