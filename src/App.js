import React, { useState, useEffect } from "react";
import { Layout, Input, Button, Typography, Space } from "antd";
import "./App.css";

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedHistory = localStorage.getItem("history");
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const response = await fetch(
      `http://192.168.1.110:3002/ask?question=${question}`
    );
    const data = await response.json();
    setAnswer(data.answer);
    const newHistory = [
      ...history,
      { question: question, answer: data.answer },
    ];
    setHistory(newHistory);
    localStorage.setItem("history", JSON.stringify(newHistory));
  };

  return (
    <div className="container">
      <Layout>
        <Header>
          <Title level={2} style={{ color: "#fff" }}>
            LangChain QA
          </Title>
        </Header>
        <Content style={{ padding: "0 16px" }}>
          <form onSubmit={handleSubmit} className="form">
            <Space direction="horizontal" size={20}>
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="请输入问题"
              />
              <Button type="primary" htmlType="submit">
                提交
              </Button>
            </Space>
          </form>
          {answer && (
            <div className="answer">
              <Title level={4}>答案:</Title>
              <Paragraph>{answer}</Paragraph>
            </div>
          )}
          {history.length > 0 && (
            <div className="history">
              <Title level={4}>历史记录:</Title>
              <table>
                <thead>
                  <tr>
                    <th>问题</th>
                    <th>答案</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr key={index}>
                      <td>{item.question}</td>
                      <td>{item.answer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Content>
      </Layout>
    </div>
  );
}

export default App;
