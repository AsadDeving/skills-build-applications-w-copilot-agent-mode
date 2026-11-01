import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { name: string; mascot?: string; members?: unknown[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ teams: Team[] }>('/api/teams')
      .then((data) => setTeams(data.teams))
      .catch(() => setError('Unable to load teams.'));
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Teams</h2>
    <p>Manage teams and members.</p>
    {error ? <p role="alert">{error}</p> : teams === null ? <p role="status">Loading teams...</p> : teams.length === 0 ? <p role="status">No teams yet.</p> : <ul>
      {teams.map((team) => <li key={team.name}>{team.name}{team.mascot ? ` (${team.mascot})` : ''}: {team.members?.length ?? 0} members</li>)}
    </ul>}
  </div></section>;
}
