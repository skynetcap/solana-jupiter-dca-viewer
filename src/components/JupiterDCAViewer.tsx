import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import debounce from 'lodash.debounce';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
};

/**
 * Represents the structure of chart data.
 */
type ChartData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
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

  return Array(1000).fill(null).map((_, index) => {
    const orderDate = new Date(startDate);
    orderDate.setDate(orderDate.getDate() + index);
    return {
      id: `order-${index}`,
      user: `user-${Math.floor(Math.random() * 100)}`,
      inputMint: ['SOL', 'USDC', 'ETH'][Math.floor(Math.random() * 3)],
      outputMint: ['BTC', 'USDT', 'RAY'][Math.floor(Math.random() * 3)],
      amount: Math.random() * 10000,
      frequency: ['daily', 'weekly', 'monthly'][Math.floor(Math.random() * 3)],
      createdAt: orderDate.toISOString(),
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
  const [sortConfig, setSortConfig] = useState<{ key: keyof DCAOrder; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  const [inputMints, setInputMints] = useState<string[]>([]);
  const [outputMints, setOutputMints] = useState<string[]>([]);

  const fetchOrders = useCallback(async () => {
    const fetchedOrders = await fetchDCAOrders(filters);
    setOrders(fetchedOrders);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const uniqueInputMints = Array.from(new Set(orders.map(order => order.inputMint)));
    const uniqueOutputMints = Array.from(new Set(orders.map(order => order.outputMint)));
    setInputMints(uniqueInputMints);
    setOutputMints(uniqueOutputMints);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => 
      order.user.toLowerCase().includes(filters.user.toLowerCase()) &&
      (filters.inputMint === '' || order.inputMint === filters.inputMint) &&
      (filters.outputMint === '' || order.outputMint === filters.outputMint) &&
      (order.user.toLowerCase().includes(filters.search.toLowerCase()) ||
       order.inputMint.toLowerCase().includes(filters.search.toLowerCase()) ||
       order.outputMint.toLowerCase().includes(filters.search.toLowerCase()))
    ).sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, filters, sortConfig]);

  const handleSort = (key: keyof DCAOrder) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const chartData: ChartData = {
    labels: filteredOrders.slice(0, 50).map(order => new Date(order.createdAt).toLocaleDateString()),
    datasets: [{
      label: 'Order Amount',
      data: filteredOrders.slice(0, 50).map(order => order.amount),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
    }],
  };

  const chartOptions = {
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
          text: 'Amount',
        },
      },
    },
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const order = filteredOrders[index];
    return (
      <div style={style} className="flex items-center justify-between py-2 px-4 border-b border-gray-700 hover:bg-gray-700">
        <span className="w-1/6 truncate">{order.user}</span>
        <span className="w-1/6 truncate">{order.inputMint}</span>
        <span className="w-1/6 truncate">{order.outputMint}</span>
        <span className="w-1/6 truncate">{order.amount.toFixed(2)}</span>
        <span className="w-1/6 truncate">{order.frequency}</span>
        <span className="w-1/6 truncate">{new Date(order.createdAt).toLocaleDateString()}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-8">Solana Jupiter DCA Order Viewer</h1>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search..."
          className="bg-gray-800 text-white p-2 rounded"
          onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
        />
        <select
          className="bg-gray-800 text-white p-2 rounded"
          onChange={e => setFilters(prev => ({ ...prev, inputMint: e.target.value }))}
          value={filters.inputMint}
        >
          <option value="">All Input Mints</option>
          {inputMints.map(mint => (
            <option key={mint} value={mint}>{mint}</option>
          ))}
        </select>
        <select
          className="bg-gray-800 text-white p-2 rounded"
          onChange={e => setFilters(prev => ({ ...prev, outputMint: e.target.value }))}
          value={filters.outputMint}
        >
          <option value="">All Output Mints</option>
          {outputMints.map(mint => (
            <option key={mint} value={mint}>{mint}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by User"
          className="bg-gray-800 text-white p-2 rounded"
          onChange={e => setFilters(prev => ({ ...prev, user: e.target.value }))}
        />
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Order Amount Over Time (Last 50 Orders)</h2>
        <div style={{ height: '400px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between font-semibold">
        <span className="w-1/6 cursor-pointer" onClick={() => handleSort('user')}>User</span>
        <span className="w-1/6 cursor-pointer" onClick={() => handleSort('inputMint')}>Input Mint</span>
        <span className="w-1/6 cursor-pointer" onClick={() => handleSort('outputMint')}>Output Mint</span>
        <span className="w-1/6 cursor-pointer" onClick={() => handleSort('amount')}>Amount</span>
        <span className="w-1/6 cursor-pointer" onClick={() => handleSort('frequency')}>Frequency</span>
        <span className="w-1/6 cursor-pointer" onClick={() => handleSort('createdAt')}>Created At</span>
      </div>

      <List
        height={400}
        itemCount={filteredOrders.length}
        itemSize={35}
        width="100%"
        className="bg-gray-800 rounded"
      >
        {Row}
      </List>
    </div>
  );
}