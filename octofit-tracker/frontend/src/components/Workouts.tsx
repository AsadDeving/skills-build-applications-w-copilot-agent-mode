import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = { title: string; reason?: string; focus?: string; minutes?: number };

export default function Workouts() {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ suggestions: Workout[] }>('/api/workouts/suggestions/mona%40example.com')
      .then((data) => setWorkouts(data.suggestions))
      .catch(() => setError('Unable to load workout suggestions.'));
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Workout suggestions</h2>
    <p>Recommend workouts from activity patterns.</p>
    {error ? <p role="alert">{error}</p> : workouts === null ? <p role="status">Loading workout suggestions...</p> : workouts.length === 0 ? <p role="status">No workout suggestions yet.</p> : <ul>
      {workouts.map((workout) => <li key={workout.title}><strong>{workout.title}</strong>{workout.reason ? `: ${workout.reason}` : ''}</li>)}
    </ul>}
  </div></section>;
}
