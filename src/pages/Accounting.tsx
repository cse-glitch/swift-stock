import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense, type Business, type Order } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wallet, Plus, Receipt, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Calendar, Tag,
  CreditCard, Banknote, DollarSign, PieChart,
  FileText, Download, Filter, Search, MoreHorizontal,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function Accounting() {
  const { activeBusinessId } = useBusiness();
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ 
    amount: '', categoryId: 'general', description: '', paymentMethod: 'Cash', date: new Date().toISOString().split('T')[0] 
  });

  const rawExpenses = useLiveQuery(
    () => activeBusinessId 
      ? db.expenses.where('businessId').equals(activeBusinessId).toArray()
      : db.expenses.toArray(),
    [activeBusinessId]
  ) ?? [];

  const rawOrders = useLiveQuery(
    () => activeBusinessId 
      ? db.orders.where('businessId').equals(activeBusinessId).toArray()
      : db.orders.toArray(),
    [activeBusinessId]
  ) ?? [];

  // Wrap in useMemo to stabilize dependencies for other hooks
  const expenses = useMemo(() => rawExpenses, [rawExpenses]);
  const orders = useMemo(() => rawOrders, [rawOrders]);

  const stats = useMemo(() => {
    const totalIncome = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, netProfit };
  }, [orders, expenses]);

  const chartData = useMemo(() => {
    // Basic aggregation by date
    const data: Record<string, { date: string, income: number, expense: number }> = {};
    
    orders.forEach(o => {
      const d = format(o.timestamp, 'MMM dd');
      if (!data[d]) data[d] = { date: d, income: 0, expense: 0 };
      data[d].income += o.totalPrice;
    });

    expenses.forEach(e => {
      const d = format(new Date(e.date), 'MMM dd');
      if (!data[d]) data[d] = { date: d, income: 0, expense: 0 };
      data[d].expense += e.amount;
    });

    return Object.values(data).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [orders, expenses]);

  const handleAddExpense = async () => {
    if (!expenseForm.amount || !activeBusinessId) {
      toast.error('Amount and Business are required');
      return;
    }

    try {
      await db.expenses.add({
        id: crypto.randomUUID(),
        businessId: activeBusinessId,
        categoryId: expenseForm.categoryId,
        amount: parseFloat(expenseForm.amount),
        date: new Date(expenseForm.date),
        description: expenseForm.description,
        paymentMethod: expenseForm.paymentMethod,
      });
      toast.success('Expense recorded');
      setIsExpenseOpen(false);
      setExpenseForm({ amount: '', categoryId: 'general', description: '', paymentMethod: 'Cash', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      toast.error('Failed to save expense');
    }
  };

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Ledger</h1>
          <p className="text-muted-foreground mt-1">Monitor revenue, expenses, and overall business health</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export Report</Button>
          <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Expense Entry</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Amount</Label>
                    <Input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="E.g. Office Supplies" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={expenseForm.categoryId} onValueChange={v => setExpenseForm(f => ({ ...f, categoryId: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="inventory">Inventory Purchase</SelectItem>
                        <SelectItem value="rent">Rent & Utilities</SelectItem>
                        <SelectItem value="salary">Staff Salaries</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Payment Method</Label>
                    <Select value={expenseForm.paymentMethod} onValueChange={v => setExpenseForm(f => ({ ...f, paymentMethod: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Card">Credit/Debit Card</SelectItem>
                        <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsExpenseOpen(false)}>Cancel</Button>
                <Button onClick={handleAddExpense}>Save Transaction</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="h-20 w-20" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">৳{stats.totalIncome.toLocaleString()}</div>
            <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium bg-emerald-500/10 w-fit px-2 py-1 rounded-full gap-1">
              <ArrowUpRight className="h-3 w-3" /> +12% vs last month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown className="h-20 w-20" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-rose-700 dark:text-rose-300">৳{stats.totalExpenses.toLocaleString()}</div>
            <div className="mt-4 flex items-center text-xs text-rose-600 font-medium bg-rose-500/10 w-fit px-2 py-1 rounded-full gap-1">
              <ArrowDownRight className="h-3 w-3" /> -5% vs last month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="h-20 w-20" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-4xl font-bold", stats.netProfit >= 0 ? "text-primary" : "text-destructive")}>
              ৳{stats.netProfit.toLocaleString()}
            </div>
            <div className="mt-4 flex items-center text-xs text-primary font-medium bg-primary/10 w-fit px-2 py-1 rounded-full gap-1">
              <Activity className="h-3 w-3" /> Performance Stable
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-xl bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> Cash Flow Overview</CardTitle>
            <CardDescription>Visualizing revenue vs expenditures over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-xl bg-card/50 backdrop-blur-md overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary text-xs">View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {expenses.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-[150px]">{e.description}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(e.date), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-600">-৳{e.amount}</p>
                    <Badge variant="outline" className="text-[8px] h-4">{e.paymentMethod}</Badge>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <div className="py-20 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No recent expenses</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
