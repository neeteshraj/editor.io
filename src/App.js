import React from "react";
import Home from "./Components/Home/Home";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WebEditor from "./Components/WebEditor/WebEditor";
import MarkDownEditor from "./Components/MarkDownEditor/MarkDownEditor";

function App() {
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

export default App;
