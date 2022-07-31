import React from "react";
import { Row, Col, Container } from "react-bootstrap";
import Footer from "../Footer/Footer";

const WebEditor = () => {
  const nogutterValue = true;
  return (
    <div>
      <Container fluid={true} className="pane pane-top">
        <Row nogutters={nogutterValue.toString()}>
          <Col md={4} className="editor-lang">
            <div className="editor-text">
              <i className="fab fa-html5"> </i> Html
            </div>
          </Col>

          <Col md={4} className="editor-lang">
            <div className="editor-text">
              <i className="fab fa-css3-alt"></i> Css
            </div>
          </Col>

          <Col md={4} className="editor-lang">
            <div className="editor-text">
              <i className="fab fa-js-square"></i> Js
            </div>
          </Col>
        </Row>
      </Container>

      <Container fluid={true} className="pane pane-bottom">
        <Row nogutters={nogutterValue.toString()}>
          <iframe
            srcDoc="<html><head></head><body></body></html>"
            className="output-pane"
            allowFullScreen
            title="output"
          ></iframe>
        </Row>
      </Container>

      <Footer />
    </div>
  );
};

export default WebEditor;
