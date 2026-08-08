import { Routes, Route } from "react-router-dom";
import { AppStateProvider } from "./context/AppStateContext";
import { Board } from "./components/Board/Board";
import { SettingsPage } from "./components/SettingsPage/SettingsPage";

export default function App() {
  return (
    <AppStateProvider>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppStateProvider>
  );
}
