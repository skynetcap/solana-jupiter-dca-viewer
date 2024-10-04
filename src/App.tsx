import React from 'react';
import JupiterDCAViewer from './components/JupiterDCAViewer';
import { Layout } from 'antd';

const { Header, Content, Footer } = Layout;

/**
 * App component that serves as the root of the application.
 */
function App() {
  return (
    <Layout>
      <Header style={{ background: '#001529' }}>
        <h1 style={{ color: '#fff', textAlign: 'center' }}>Solana Jupiter DCA Order Viewer</h1>
      </Header>
      <Content style={{ padding: '24px' }}>
        <JupiterDCAViewer />
      </Content>
      <Footer style={{ textAlign: 'center' }}>©2024 Solana Jupiter DCA Viewer</Footer>
    </Layout>
  );
}

export default App;