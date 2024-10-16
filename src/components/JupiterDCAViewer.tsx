import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Tabs, Input, Select, Table, Space, ConfigProvider, theme, Typography, Card, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';
import debounce from 'lodash.debounce';
import './JupiterDCAViewer.css';

/**
 * Represents a DCA (Dollar Cost Averaging) order.
 */
type DCAOrder = {
  id: string;
  user: string;
  inputMint: string;
  outputMint: string;
  amount: number;
  frequency: string;
  createdAt: string;
  executeAt: string;
};

/**
 * Represents the structure of chart data.
 */
type ChartDataType = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
};

/**
 * Represents the sorting configuration.
 */
type SortConfig = {
  key: keyof DCAOrder | 'tokenPair'; // Include 'tokenPair' as a valid key
  direction: SortOrder;
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const { TabPane } = Tabs;
const { Option } = Select;

/**
 * Fetches DCA orders based on the provided filters.
 * @param filters - The filters to apply when fetching orders.
 * @returns A Promise that resolves to an array of DCAOrder objects.
 */
const fetchDCAOrders = async (filters: any): Promise<DCAOrder[]> => {
  // Simulated API call
  await new Promise(resolve => setTimeout(resolve, 500));
  const now = new Date();
  console.log("GETDCAORDERS", filters);

  return Array(100)
    .fill(null)
    .map((_, index) => {
      const isNextHour = index % 3 === 0;
      const isNextDay = index % 3 === 1;
      const orderDate = new Date(now);
      if (isNextHour) {
        orderDate.setHours(orderDate.getHours() + 1); // Within next hour
      } else if (isNextDay) {
        orderDate.setHours(orderDate.getHours() + 24); // Within next day
      } else {
        orderDate.setHours(orderDate.getHours() + 48); // Beyond next day
      }

      const executeDate = new Date(orderDate);
      executeDate.setMinutes(executeDate.getMinutes() + Math.floor(Math.random() * 60));

      return {
        id: `order-${index}`,
        user: `user-${Math.floor(Math.random() * 100)}`,
        inputMint: ['SOL', 'USDC', 'ETH'][Math.floor(Math.random() * 3)],
        outputMint: ['BTC', 'USDT', 'RAY'][Math.floor(Math.random() * 3)],
        amount: parseFloat((Math.random() * 10000).toFixed(2)),
        frequency: ['daily', 'weekly', 'monthly'][Math.floor(Math.random() * 3)],
        createdAt: orderDate.toISOString(),
        executeAt: executeDate.toISOString(),
      };
    });
};

/**
 * JupiterDCAViewer component for displaying and managing DCA orders.
 */
export default function JupiterDCAViewer() {
  const [orders, setOrders] = useState<DCAOrder[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    inputMint: '',
    outputMint: '',
    user: '',
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'amount',
    direction: 'descend',
  });

  const [inputMints, setInputMints] = useState<string[]>([]);
  const [outputMints, setOutputMints] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'Next Hour' | 'Next Day' | 'All'>('Next Hour');
  const [aggregateChartData, setAggregateChartData] = useState<ChartDataType>({
    labels: [],
    datasets: [],
  });

  const hasFetched = useRef(false);

  const fetchAggregateUSDCValue = useCallback(async (orders: DCAOrder[]): Promise<ChartDataType> => {
    const now = new Date();
    const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const labels = Array.from({ length: 24 }, (_, i) => {
      const date = new Date(past24Hours);
      date.setHours(date.getHours() + i);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const data = labels.map((_, index) => {
      const hourStart = new Date(past24Hours);
      hourStart.setHours(hourStart.getHours() + index);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);

      return orders
        .filter(order => {
          const executeAt = new Date(order.executeAt);
          return executeAt >= hourStart && executeAt < hourEnd && order.inputMint === 'USDC';
        })
        .reduce((sum, order) => sum + order.amount, 0);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Aggregate USDC Value',
          data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
      ],
    };
  }, []);

  /**
   * Fetches DCA orders and sets the state.
   */
  const fetchOrders = useCallback(async () => {
    const fetchedOrders = await fetchDCAOrders(filters);
    setOrders(fetchedOrders);
  }, [filters]);

  useEffect(() => {
    if (!hasFetched.current) {
      fetchOrders();
      hasFetched.current = true;
    }
  }, [fetchOrders]);

  useEffect(() => {
    const uniqueInputMints = Array.from(new Set(orders.map(order => order.inputMint))).sort();
    const uniqueOutputMints = Array.from(new Set(orders.map(order => order.outputMint))).sort();
    setInputMints(uniqueInputMints);
    setOutputMints(uniqueOutputMints);
  }, [orders]);

  /**
   * Filters and sorts orders based on active tab and sort configuration.
   */
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let relevantOrders = orders.filter(order => {
      const executeTime = new Date(order.executeAt);
      if (activeTab === 'Next Hour') {
        return executeTime > now && executeTime <= new Date(now.getTime() + 60 * 60 * 1000);
      } else if (activeTab === 'Next Day') {
        return executeTime > now && executeTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else {
        return true; // All active orders
      }
    });

    return relevantOrders
      .filter(order =>
        order.user.toLowerCase().includes(filters.user.toLowerCase()) &&
        (filters.inputMint === '' || order.inputMint === filters.inputMint) &&
        (filters.outputMint === '' || order.outputMint === filters.outputMint) &&
        (order.user.toLowerCase().includes(filters.search.toLowerCase()) ||
          order.inputMint.toLowerCase().includes(filters.search.toLowerCase()) ||
          order.outputMint.toLowerCase().includes(filters.search.toLowerCase()))
      )
      .sort((a, b) => {
        if (sortConfig.key === 'tokenPair') {
          const pairA = `${a.outputMint}-${a.inputMint}`;
          const pairB = `${b.outputMint}-${b.inputMint}`;
          return sortConfig.direction === 'ascend'
            ? pairA.localeCompare(pairB)
            : pairB.localeCompare(pairA);
        }
        if (sortConfig.direction === 'ascend') {
          return a[sortConfig.key] < b[sortConfig.key] ? -1 : 1;
        }
        if (sortConfig.direction === 'descend') {
          return a[sortConfig.key] > b[sortConfig.key] ? -1 : 1;
        }
        return 0;
      });
  }, [orders, filters, sortConfig, activeTab]);

  /**
   * Memoized debounced filter change handler to prevent multiple state updates.
   */
  const handleFilterChange = useMemo(
    () =>
      debounce((value: string, field: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
      }, 300),
    []
  );

  useEffect(() => {
    return () => {
      handleFilterChange.cancel();
    };
  }, [handleFilterChange]);

  /**
   * Sets up the aggregate volume chart with periodic updates.
   */
  useEffect(() => {
    const loadAggregateData = async () => {
      const data = await fetchAggregateUSDCValue(orders);
      setAggregateChartData(data);
    };

    loadAggregateData();
    const interval = setInterval(loadAggregateData, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [orders, fetchAggregateUSDCValue]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#e0e0e0',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#e0e0e0',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#e0e0e0',
        },
      },
    },
  }), []);

  /**
   * Defines the columns for the Ant Design Table.
   */
  const columns: ColumnsType<DCAOrder> = useMemo(
    () => [
      {
        title: 'User',
        dataIndex: 'user',
        key: 'user',
        sorter: true,
        sortOrder: sortConfig.key === 'user' ? sortConfig.direction : undefined,
      },
      {
        title: 'Token Pair',
        key: 'tokenPair',
        sorter: true,
        sortOrder: sortConfig.key === 'tokenPair' ? sortConfig.direction : undefined,
        render: (_text, record) => `${record.outputMint}-${record.inputMint}`,
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        sorter: true,
        sortOrder: sortConfig.key === 'amount' ? sortConfig.direction : undefined,
        render: (value: number) => value.toLocaleString(),
      },
      {
        title: 'Frequency',
        dataIndex: 'frequency',
        key: 'frequency',
        sorter: true,
        sortOrder: sortConfig.key === 'frequency' ? sortConfig.direction : undefined,
      },
      {
        title: 'Created At',
        dataIndex: 'createdAt',
        key: 'createdAt',
        sorter: true,
        sortOrder: sortConfig.key === 'createdAt' ? sortConfig.direction : undefined,
        render: (value: string) => new Date(value).toLocaleString(),
      },
      {
        title: 'Execute At',
        dataIndex: 'executeAt',
        key: 'executeAt',
        sorter: true,
        sortOrder: sortConfig.key === 'executeAt' ? sortConfig.direction : undefined,
        render: (value: string) => new Date(value).toLocaleString(),
      },
    ],
    [sortConfig]
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#4caf50',
          colorBgContainer: '#1e1e1e',
          colorText: '#e0e0e0',
        },
      }}
    >
      <div className="dca-viewer-container">
        <Card className="header-card">
          <Typography.Title level={2} className="dca-viewer-header">
            Solana Jupiter DCA Order Viewer
          </Typography.Title>
        </Card>

        <Card className="filter-card">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={8} xl={8}>
              <Input
                placeholder="Search..."
                onChange={e => handleFilterChange(e.target.value, 'search')}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={8} xl={8}>
              <Select
                placeholder="All Input Mints"
                onChange={value => handleFilterChange(value, 'inputMint')}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="">All Input Mints</Option>
                {inputMints.map(mint => (
                  <Option key={mint} value={mint}>{mint}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={12} lg={8} xl={8}>
              <Select
                placeholder="All Output Mints"
                onChange={value => handleFilterChange(value, 'outputMint')}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="">All Output Mints</Option>
                {outputMints.map(mint => (
                  <Option key={mint} value={mint}>{mint}</Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        <Card className="tabs-card">
          <Tabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key as 'Next Hour' | 'Next Day' | 'All')}
            type="card"
            className="custom-tabs"
          >
            <TabPane tab="Next Hour" key="Next Hour">
              <Table
                columns={columns}
                dataSource={filteredOrders}
                pagination={{ pageSize: 5 }}
                rowKey="id"
                scroll={{ x: 'max-content' }}
              />
            </TabPane>
            <TabPane tab="Next Day" key="Next Day">
              <Table
                columns={columns}
                dataSource={filteredOrders}
                pagination={{ pageSize: 5 }}
                rowKey="id"
                scroll={{ x: 'max-content' }}
              />
            </TabPane>
            <TabPane tab="All" key="All">
              <Table
                columns={columns}
                dataSource={filteredOrders}
                pagination={{ pageSize: 5 }}
                rowKey="id"
                scroll={{ x: 'max-content' }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </ConfigProvider>
  );
}
