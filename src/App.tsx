import { Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { ScenarioView } from "./pages/ScenarioView";
import { AuthorPage } from "./pages/AuthorPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cenario/:scenarioId" element={<ScenarioView />} />
      <Route path="/author" element={<AuthorPage />} />
    </Routes>
  );
}

export default App;
