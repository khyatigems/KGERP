"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export type AnalyticsData = {
  type: 'inventory';
  totalItems: number;
  totalValue: number;
  activeVendors: number;
  categoryDistribution: { name: string; value: number }[];
  topVendorsByValue: { name: string; value: number }[];
} | {
  type: 'purchase';
  totalSpend: number;
  activeVendors: number;
  totalPurchases: number;
  monthlySpend: { month: string; spend: number; count: number }[];
  topVendors: { name: string; spend: number; count: number }[];
};

export function VendorAnalytics({ data }: { data: AnalyticsData }) {
  if (data.type === 'inventory') {
    return (
      <div className="space-y-6">
        {/* Inventory KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inventory Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totalValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Vendors (With Stock)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.activeVendors}</div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Distribution by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Vendors by Stock Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topVendorsByValue} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} />
                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(Number(value) || 0)}
                      labelStyle={{ color: 'black' }}
                    />
                    <Bar dataKey="value" fill="#00C49F" name="Stock Value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Purchase View (Existing Logic)
  return (
    <div className="space-y-6">
      {/* Purchase KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend (Recorded)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalSpend)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchase Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPurchases}</div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlySpend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value) || 0)}
                    labelStyle={{ color: 'black' }}
                  />
                  <Bar dataKey="spend" fill="#ef4444" name="Spend" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Vendors by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topVendors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value) || 0)}
                    labelStyle={{ color: 'black' }}
                  />
                  <Bar dataKey="spend" fill="#8884d8" name="Spend" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
