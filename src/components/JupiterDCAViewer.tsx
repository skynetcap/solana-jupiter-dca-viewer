import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Tabs, Input, Select, Table, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import debounce from 'lodash.debounce';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const { TabPane } = Tabs;
const { Option } = Select;

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
  key: keyof DCAOrder;
  direction: 'ascend' | 'descend' | null;
};

/**
 * Fetches DCA orders based on the provided filters.
 * @param filters - The filters to apply when fetching orders.
 * @returns A Promise that resolves to an array of DCAOrder objects.
 */
const fetchDCAOrders = async (filters: any): Promise<DCAOrder[]> => {
  // Simulated API call
  await new Promise(resolve => setTimeout(resolve, 500));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 100); // Start from 100 days ago

  return Array(1000)
    .fill(null)
    .map((_, index) => {
      const orderDate = new Date(startDate);
      orderDate.setDate(orderDate.getDate() + index);
      const executeDate = new Date(orderDate);
      executeDate.setHours(executeDate.getHours() + Math.floor(Math.random() * 48)); // Next 48 hours
      return {
        id: `order-${index}`,
        user: `user-${Math.floor(Math.random() * 100)}`,
        inputMint: ['SOL', 'USDC', 'ETH'][Math.floor(Math.random() * 3)],
        outputMint: ['BTC', 'USDT', 'RAY'][Math.floor(Math.random() * 3)],
        amount: Math.random() * 10000,
        frequency: ['daily', 'weekly', 'monthly'][Math.floor(Math.random() * 3)],
        createdAt: orderDate.toISOString(),
        executeAt: executeDate.toISOString(),
      };
    });
};


/**
 * Fetches aggregate volume data for the past month.
 * @returns A Promise that resolves to ChartDataType.
 */
const fetchAggregateVolume = async (): Promise<ChartDataType> => {
  // Simulated API call
  await new Promise(resolve => setTimeout(resolve, 500));
  const labels = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toLocaleDateString();
  });

  const data = Array.from({ length: 30 }, () => Math.floor(Math.random() * 100000));

  return {
    labels,
    datasets: [
      {
        label: 'Aggregate Volume',
        data,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };
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

  /**
   * Fetches DCA orders and sets the state.
   */
  const fetchOrders = useCallback(async () => {
    const fetchedOrders = await fetchDCAOrders(filters);
    setOrders(fetchedOrders);
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const uniqueInputMints = Array.from(new Set(orders.map(order => order.inputMint)));
    const uniqueOutputMints = Array.from(new Set(orders.map(order => order.outputMint)));
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
        if (sortConfig.direction === null) return 0;
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascend' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascend' ? 1 : -1;
        return 0;
      });
  }, [orders, filters, sortConfig, activeTab]);

  /**
   * Handles changes in filter inputs with debouncing.
   * @param value - The input value.
   * @param field - The field to update.
   */
  const handleFilterChange = debounce((value: string, field: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, 300);

  /**
   * Sets up the aggregate volume chart with periodic updates.
   */
  useEffect(() => {
    const loadAggregateData = async () => {
      const data = await fetchAggregateVolume();
      setAggregateChartData(data);
    };

    loadAggregateData();
    const interval = setInterval(loadAggregateData, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'category' as const,
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          type: 'linear' as const,
          title: {
            display: true,
            text: 'Aggregate Volume',
          },
        },
      },
    }),
    []
  );

  /**
   * Defines the columns for the Ant Design Table.
   */
  const columns: ColumnsType<DCAOrder> = [
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      sorter: (a, b) => a.user.localeCompare(b.user),
      sortOrder: sortConfig.key === 'user' ? sortConfig.direction : null,
    },
    {
      title: 'Input Mint',
      dataIndex: 'inputMint',
      key: 'inputMint',
      sorter: (a, b) => a.inputMint.localeCompare(b.inputMint),
      sortOrder: sortConfig.key === 'inputMint' ? sortConfig.direction : null,
    },
    {
      title: 'Output Mint',
      dataIndex: 'outputMint',
      key: 'outputMint',
      sorter: (a, b) => a.outputMint.localeCompare(b.outputMint),
      sortOrder: sortConfig.key === 'outputMint' ? sortConfig.direction : null,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => a.amount - b.amount,
      sortOrder: sortConfig.key === 'amount' ? sortConfig.direction : null,
      render: (amount: number) => amount.toFixed(2),
    },
    {
      title: 'Execute At',
      dataIndex: 'executeAt',
      key: 'executeAt',
      sorter: (a, b) => new Date(a.executeAt).getTime() - new Date(b.executeAt).getTime(),
      sortOrder: sortConfig.key === 'executeAt' ? sortConfig.direction : null,
      render: (executeAt: string) => new Date(executeAt).toLocaleString(),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-8">Solana Jupiter DCA Order Viewer</h1>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space direction="horizontal" size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Search..."
            onChange={e => handleFilterChange(e.target.value, 'search')}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="All Input Mints"
            onChange={value => handleFilterChange(value, 'inputMint')}
            style={{ width: 150 }}
            allowClear
          >
            {inputMints.map(mint => (
              <Option key={mint} value={mint}>
                {mint}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="All Output Mints"
            onChange={value => handleFilterChange(value, 'outputMint')}
            style={{ width: 150 }}
            allowClear
          >
            {outputMints.map(mint => (
              <Option key={mint} value={mint}>
                {mint}
              </Option>
            ))}
          </Select>
          <Input
            placeholder="Filter by User"
            onChange={e => handleFilterChange(e.target.value, 'user')}
            style={{ width: 200 }}
            allowClear
          />
        </Space>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Aggregate Volume Over the Past Month</h2>
          <div style={{ height: '400px' }}>
            <Line data={aggregateChartData} options={chartOptions} />
          </div>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={key => setActiveTab(key as 'Next Hour' | 'Next Day' | 'All')}
          type="card"
        >
          <TabPane tab="Next Hour" key="Next Hour">
            <Table
              columns={columns}
              dataSource={filteredOrders}
              pagination={{ pageSize: 10 }}
              scroll={{ y: 400 }}
              onChange={(pagination, filters, sorter: any) => {
                if (sorter.order) {
                  setSortConfig({
                    key: sorter.field as keyof DCAOrder,
                    direction: sorter.order,
                  });
                } else {
                  setSortConfig({
                    key: 'amount',
                    direction: null,
                  });
                }
              }}
            />
          </TabPane>
          <TabPane tab="Next Day" key="Next Day">
            <Table
              columns={columns}
              dataSource={filteredOrders}
              pagination={{ pageSize: 10 }}
              scroll={{ y: 400 }}
              onChange={(pagination, filters, sorter: any) => {
                if (sorter.order) {
                  setSortConfig({
                    key: sorter.field as keyof DCAOrder,
                    direction: sorter.order,
                  });
                } else {
                  setSortConfig({
                    key: 'amount',
                    direction: null,
                  });
                }
              }}
            />
          </TabPane>
          <TabPane tab="All" key="All">
            <Table
              columns={columns}
              dataSource={filteredOrders}
              pagination={{ pageSize: 10 }}
              scroll={{ y: 400 }}
              onChange={(pagination, filters, sorter: any) => {
                if (sorter.order) {
                  setSortConfig({
                    key: sorter.field as keyof DCAOrder,
                    direction: sorter.order,
                  });
                } else {
                  setSortConfig({
                    key: 'amount',
                    direction: null,
                  });
                }
              }}
            />
          </TabPane>
        </Tabs>
      </Space>
    </div>
  );
}