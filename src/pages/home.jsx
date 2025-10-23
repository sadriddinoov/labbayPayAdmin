"use client"

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  CreditCard,
  Banknote,
  TrendingUp,
  Activity,
  DollarSign,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useCustomGet } from '../hooks/useCustomGet';
import { endpoints } from '../config/endpoints';
const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#6b7280'];

const baseDayProfit = 950000;

const generateWeeklyProfit = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const weeklyProfit = [];
  for (let i = 0; i < diffDays; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const day = currentDate.getDate().toString().padStart(2, '0');
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const dateLabel = `${day}.${month}`;
    const randomFactor = 0.7 + Math.random() * 0.6;
    const profit = Math.round(baseDayProfit * randomFactor);
    const requests = Math.round(profit * 1.2);
    const turnover = Math.round(profit / 7);
    weeklyProfit.push({ day: dateLabel, profit, requests, turnover });
  }

  return weeklyProfit;
};

export default function AdminDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate] = useState(weekAgo);
  const [endDate] = useState(today);
  const [chartFilter, setChartFilter] = useState('profit');
  const [operationFilter, setOperationFilter] = useState('profit');

  const formatDateForApi = (start, end) => {
    const format = (date) => {
      const [year, month, day] = date.split('-');
      return `${day}.${month}.${year}`;
    };
    return `${format(start)}_${format(end)}`;
  };

  const typeMap = {
    profit: 3,
    turnover: 1,
    transactions: 2,
  };

  const { data: statsData, isLoading: isStatsLoading } = useCustomGet({
    key: 'dashboardStatistics',
    endpoint: `${endpoints.dashboardStatistics}?date=01.10.2025_12.10.2025`,
    // endpoint: `${endpoints.dashboardStatistics}?date=${formatDateForApi(startDate, endDate)}`,
    enabled: true,
  });

  const { data: kioskData, isLoading: isKioskLoading } = useCustomGet({
    key: 'kiosks',
    endpoint: endpoints.kiosks,
    enabled: true,
  });

  const { data: operationsData, isLoading: isOperationsLoading } = useCustomGet({
    key: ['dashboardOperations', operationFilter],
    endpoint: `${endpoints.dashboardOperations}?type=${typeMap[operationFilter]}&date=01.10.2025_12.10.2025`,
    // endpoint: `${endpoints.dashboardOperations}?type=${typeMap[operationFilter]}&date=${formatDateForApi(startDate, endDate)}`,
    enabled: true,
  });

  const metrics = {
    turnover: statsData?.data?.turnover || 0,
    profit: statsData?.data?.conversion || 0,
    deposit: statsData?.data?.deposit || 0,
    transactions: statsData?.data?.total_transaction || 0,
    succeeded_transactions: statsData?.data?.succeeded_transaction || 0,
    active_kiosks: statsData?.data?.kiosk?.active_kiosks || 0,
    total_kiosks: kioskData?.data?.totalItems || 0,
    cash_in_kiosks: statsData?.data?.cash_in_kiosks || 0,
  };

  const processedOperationsData = operationsData?.data?.map((item, index) => ({
    name: item.category_name || 'Другое',
    value: operationFilter === 'profit' ? Number(item.percentage) : operationFilter === 'turnover' ? item.amount : item.transaction_count,
    percentage: Number(item.percentage),
    color: colors[index % colors.length], // Colors repeat after 8: 9th uses 1st, 10th uses 2nd, etc.
  })) || [];

  const weeklyProfit = generateWeeklyProfit(startDate, endDate);

  if (isStatsLoading || isKioskLoading || isOperationsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Дашборд</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">От:</label>
            <Input type="date" value={startDate} className="w-auto" disabled />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">До:</label>
            <Input type="date" value={endDate} className="w-auto" disabled />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/transactions'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Обороты</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.turnover.toLocaleString('ru-RU')} сум</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/transactions'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.profit.toLocaleString('ru-RU')} сум</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Депозит</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.deposit < 10000000 ? 'text-red-600' : ''}`}>
              {metrics.deposit.toLocaleString('ru-RU')} сум
            </div>
            {metrics.deposit < 10000000 && (
              <p className="text-xs text-red-500">⚠️ Требуется пополнение</p>
            )}
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/transactions'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Количество транзакций</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.transactions.toLocaleString('ru-RU')}
            </div>
            <p className="text-xs text-muted-foreground">
              Успешные: {metrics.succeeded_transactions.toLocaleString('ru-RU')}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/kiosks'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные киоски</CardTitle>
            <Banknote className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              <span className="font-bold text-green-600">{metrics.active_kiosks}</span>
              <span className="text-gray-400">/{metrics.total_kiosks}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/kiosks'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Наличные в киосках</CardTitle>
            <Banknote className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.cash_in_kiosks.toLocaleString('ru-RU')} сум</div>
            <p className="text-xs text-muted-foreground">Требует инкассации: 3</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/collection'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Инциденты</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">3</div>
          </CardContent>
        </Card>
      </div>
      <Card className="hover:shadow-lg transition-shadow mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Типы операций по услугам</CardTitle>
            <Select value={operationFilter} onValueChange={setOperationFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit">Прибыль</SelectItem>
                <SelectItem value="turnover">Оборот</SelectItem>
                <SelectItem value="transactions">Количество транзакций</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedOperationsData}
                    cx="40%"
                    cy="50%"
                    outerRadius={110}
                    dataKey="value"
                    label={({ name, value }) =>
                      operationFilter === 'profit'
                        ? `${value}%`
                        : operationFilter === 'turnover'
                        ? `${value.toLocaleString('ru-RU')} сум`
                        : `${value}`
                    }
                  >
                    {processedOperationsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      if (operationFilter === 'profit') {
                        return [`${value}%`, name];
                      } else if (operationFilter === 'turnover') {
                        return [`${Number(value).toLocaleString('ru-RU')} сум`, name];
                      } else {
                        return [`${value} транзакций`, name];
                      }
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {processedOperationsData.map((type) => (
                <div key={type.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                    <span className="text-sm font-medium">{type.name}</span>
                  </div>
                  <div className="text-right">
                    {operationFilter === 'profit' ? (
                      <p className="font-bold text-sm">{type.value}%</p>
                    ) : operationFilter === 'turnover' ? (
                      <p className="font-bold text-sm">{type.value.toLocaleString('ru-RU')} сум</p>
                    ) : (
                      <p className="font-bold text-sm">{type.value} транзакций</p>
                    )}
                    <p className="text-xs text-gray-500">{type.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {chartFilter === 'profit' && 'Прибыль за период'}
              {chartFilter === 'requests' && 'Количество транзакций'}
              {chartFilter === 'turnover' && 'Оборот'}
            </CardTitle>
            <Select value={chartFilter} onValueChange={setChartFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit">Прибыль</SelectItem>
                <SelectItem value="requests">Количество транзакций</SelectItem>
                <SelectItem value="turnover">Оборот</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyProfit}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" angle={-45} textAnchor="end" height={60} interval={0} />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value) => {
                    if (chartFilter === 'profit') {
                      return [`${Number(value).toLocaleString('ru-RU')} сум`, 'Прибыль'];
                    } else if (chartFilter === 'requests') {
                      return [`${Number(value)} транзакций`, 'Количество'];
                    } else {
                      return [`${(Number(value) * 7).toLocaleString('ru-RU')} сум`, 'Оборот'];
                    }
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={chartFilter === 'requests' ? 'requests' : chartFilter === 'turnover' ? 'turnover' : 'profit'}
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}