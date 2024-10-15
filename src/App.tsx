import React from 'react';
import { Layout } from 'antd';
import JupiterDCAViewer from './components/JupiterDCAViewer';
import './App.css';

const { Content } = Layout;

/**
 * App component that serves as the root of the application.
 */
function App() {
  return (
    <Layout className="app-layout">
      <Content>
        <JupiterDCAViewer />
      </Content>
    </Layout>
  );
}

export default App;