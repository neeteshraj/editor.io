import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Components/Home/Home";
import WebEditor from "./Components/WebEditor/WebEditor";
import MarkDownEditor from "./Components/MarkDownEditor/MarkDownEditor";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/web" element={<WebEditor />} />
        <Route path="/markdown" element={<MarkDownEditor />} />
      </Routes>
    </Router>
  );
}
