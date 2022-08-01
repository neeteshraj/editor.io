import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import TextareaAutosize from "react-autosize-textarea";
import { Remarkable } from "remarkable";
import { linkify } from "remarkable/linkify";
import { useLocalStorage } from "../../../Hooks/LocalStorage";
import { InitialVal } from "../../../Constants/constants";
import Footer from "../../Footer/Footer";

function Editor() {
  const body = {
    background: "rgb(17 36 39 / 94%)",
    paddingTop: "30px",
    paddingBottom: "50px",
    fontFamily: "monospace",
    color: "wheat",
  };
  const mdIn = {
    width: "100%",
    height: "auto",
    minHeight: "80vh",
    padding: "15px 15px",
    borderRadius: "2px",
    background: "white",
    boxShadow: "rgb(0 0 0 / 49%) 2px 2px 10px",
    border: 0,
    outline: "none",
  };
  const mdOut = {
    width: "100%",
    height: "auto",
    minHeight: "80vh",
    padding: "15px 15px",
    borderRadius: "2px",
    background: "white",
    boxShadow: "rgb(0 0 0 / 49%) 2px 2px 10px",
    backgroundColor: "#f3f3f3",
    color: "black",
  };
  var md = new Remarkable({
    html: true,
    xhtmlOut: true,
    langPrefix: "language-",
    quotes: "“”‘’",
    typographer: true,
  });
  md.use(linkify);
  const [userInput, updateStorageInput] = useLocalStorage(
    "mdEditor",
    InitialVal
  );
  useEffect(() => {
    let res = md.render(userInput);
    updateOut(res);
  }, [userInput]);

  const handelChange = (e) => {
    updateStorageInput(e.target.value);
  };
  const [userOut, updateOut] = useState("");
  return (
    <div>
      <Container fluid style={body}>
        <Row
          style={{
            justifyContent: "center",
            paddingLeft: "45px",
            paddingRight: "45px",
            paddingTop: "25px",
          }}
        >
          <Col md={6} className="text-center">
            <h3 className="text-center">Markdown Editor</h3>
            <TextareaAutosize
              id="textarea_input"
              onChange={handelChange}
              value={userInput}
              style={mdIn}
            />
          </Col>
          <Col md={6} style={{ paddingTop: "35px" }}>
            <h3 className="text-center"> Html Preview</h3>
            <div
              dangerouslySetInnerHTML={{ __html: userOut }}
              style={mdOut}
            ></div>
          </Col>
        </Row>
      </Container>
      <Footer />
    </div>
  );
}
export default Editor;
