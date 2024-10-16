import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import {
  Tabs,
  Input,
  Select,
  Table,
  ConfigProvider,
  theme,
  Typography,
  Card,
  Row,
  Col,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';
import type { TabsProps } from 'antd';
import debounce from 'lodash.debounce';
import './JupiterDCAViewer.css';

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

type ChartDataType = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
};

type SortConfig = {
  key: keyof DCAOrder | 'tokenPair';
  direction: SortOrder;
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const { Option } = Select;

/**
 * Fetches DCA orders based on the provided filters.
 * @param filters - The filters to apply when fetching orders.
 * @returns A Promise that resolves to an array of DCAOrder objects.
 */
const fetchDCAOrders = async (filters: any): Promise<DCAOrder[]> => {
  const now = new Date();

  return Array(100)
    .fill(null)
    .map((_, index) => {
      const isNextHour = index % 3 === 0;
      const isNextDay = index % 3 === 1;
      const orderDate = new Date(now);
      if (isNextHour) {
        orderDate.setHours(orderDate.getHours() + 1);
      } else if (isNextDay) {
        orderDate.setHours(orderDate.getHours() + 24);
      } else {
        orderDate.setHours(orderDate.getHours() + 48);
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

  /**
   * Fetches aggregate USDC value for chart data.
   * @param orders - The array of DCAOrder objects.
   * @returns A Promise that resolves to ChartDataType.
   */
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
   * Filters and sorts orders based on sort configuration.
   * @param tabKey - The key of the current tab.
   * @returns The filtered and sorted array of DCAOrder objects for the specified tab.
   */
  const getFilteredOrders = useCallback(
    (tabKey: 'Next Hour' | 'Next Day' | 'All'): DCAOrder[] => {
      const now = new Date();
      let relevantOrders = orders.filter(order => {
        const executeTime = new Date(order.executeAt);
        if (tabKey === 'Next Hour') {
          return executeTime > now && executeTime <= new Date(now.getTime() + 60 * 60 * 1000);
        } else if (tabKey === 'Next Day') {
          return executeTime > now && executeTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else {
          return true;
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
    },
    [orders, filters, sortConfig]
  );

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
   * Manages pagination state.
   */
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['5', '10', '20', '50'],
  });

  /**
   * Handles pagination and sorting changes.
   * @param newPagination - The new pagination configuration.
   * @param _ - The filter parameters (unused).
   * @param sorter - The sorter object containing sorting information.
   */
  const handleTableChange = useCallback(
    (newPagination: TablePaginationConfig, _: any, sorter: any) => {
      setPagination(newPagination);
      if (sorter.order) {
        setSortConfig({
          key: sorter.field,
          direction: sorter.order,
        });
      } else {
        setSortConfig({
          key: 'amount',
          direction: 'descend',
        });
      }
    },
    []
  );

  /**
   * Sets up the aggregate volume chart with periodic updates.
   */
  useEffect(() => {
    const loadAggregateData = async () => {
      const data = await fetchAggregateUSDCValue(orders);
      setAggregateChartData(data);
    };

    loadAggregateData();
    const interval = setInterval(loadAggregateData, 60000);

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

  /**
   * Defines the tab items for the Ant Design Tabs component.
   */
  const tabItems: TabsProps['items'] = useMemo(
    () => [
      {
        key: 'Next Hour',
        label: 'Next Hour',
        children: (
          <Table
            columns={columns}
            dataSource={getFilteredOrders('Next Hour')}
            pagination={pagination}
            onChange={handleTableChange}
            rowKey="id"
            scroll={getFilteredOrders('Next Hour').length > 0 ? { x: 'max-content' } : undefined}
          />
        ),
      },
      {
        key: 'Next Day',
        label: 'Next Day',
        children: (
          <Table
            columns={columns}
            dataSource={getFilteredOrders('Next Day')}
            pagination={pagination}
            onChange={handleTableChange}
            rowKey="id"
            scroll={getFilteredOrders('Next Day').length > 0 ? { x: 'max-content' } : undefined}
          />
        ),
      },
      {
        key: 'All',
        label: 'All',
        children: (
          <Table
            columns={columns}
            dataSource={getFilteredOrders('All')}
            pagination={pagination}
            onChange={handleTableChange}
            rowKey="id"
            scroll={getFilteredOrders('All').length > 0 ? { x: 'max-content' } : undefined}
          />
        ),
      },
    ],
    [columns, pagination, handleTableChange, getFilteredOrders]
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

        <Card className="tabs-card">
          <Row gutter={[16, 16]} align="middle">
            <Col span={24}>
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as 'Next Hour' | 'Next Day' | 'All')}
                type="card"
                className="custom-tabs"
                tabBarExtraContent={{
                  right: (
                    <Row gutter={[16, 16]}>
                      <Col>
                        <Input
                          placeholder="Search..."
                          onChange={e => handleFilterChange(e.target.value, 'search')}
                          allowClear
                          style={{ width: 200 }}
                        />
                      </Col>
                      <Col>
                        <Select
                          placeholder="All Input Mints"
                          onChange={value => handleFilterChange(value, 'inputMint')}
                          style={{ width: 150 }}
                          allowClear
                        >
                          <Option value="">All Input Mints</Option>
                          {inputMints.map(mint => (
                            <Option key={mint} value={mint}>{mint}</Option>
                          ))}
                        </Select>
                      </Col>
                      <Col>
                        <Select
                          placeholder="All Output Mints"
                          onChange={value => handleFilterChange(value, 'outputMint')}
                          style={{ width: 150 }}
                          allowClear
                        >
                          <Option value="">All Output Mints</Option>
                          {outputMints.map(mint => (
                            <Option key={mint} value={mint}>{mint}</Option>
                          ))}
                        </Select>
                      </Col>
                    </Row>
                  ),
                }}
                items={tabItems}
              />
            </Col>
          </Row>
        </Card>
      </div>
    </ConfigProvider>
  );
}
