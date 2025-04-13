import DVDContainer from './components/DVDContainer';
import Scanlines from './components/Scanlines';

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="relative w-full min-h-screen">
        <DVDContainer />
        <Scanlines opacity={0.3} />
      </div>
    </main>
  );
}
