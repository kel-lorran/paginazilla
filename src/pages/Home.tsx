import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listScenarios, type ScenarioSummary } from "../lib/scenarios";

export function Home() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listScenarios().then(setScenarios).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div style={{ padding: 32, maxWidth: 640, margin: "0 auto" }}>
      <h1>Paginazilla</h1>
      <p>Escolha um cenário de paginação para montar o mosaico.</p>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {!error && !scenarios && <p>Carregando cenários…</p>}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {scenarios?.map((s) => (
          <li key={s.id}>
            <Link
              to={`/cenario/${s.id}`}
              style={{
                display: "block",
                padding: "12px 16px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                textDecoration: "none",
                color: "#111827",
              }}
            >
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
