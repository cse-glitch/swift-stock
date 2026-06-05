import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense } from '@/lib/db';
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
  ArrowUpRight, ArrowDownRight, PieChart, FileText,
  Download, Activity, CreditCard, Banknote, Smartphone,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  Cash:            <Banknote className="h-4 w-4" />,
  'Bank Transfer': <CreditCard className="h-4 w-4" />,
  Card:            <CreditCard className="h-4 w-4" />,
  'Mobile Banking': <Smartphone className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  general:   'bg-slate-500/10 text-slate-600',
  inventory: 'bg-blue-500/10 text-blue-600',
  rent:      'bg-amber-500/10 text-amber-600',
  salary:    'bg-purple-500/10 text-purple-600',
  marketing: 'bg-pink-500/10 text-pink-600',
};

export default function Accounting() {
  const { activeBusinessId } = useBusiness();
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: '', categoryId: 'general', description: '', paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0],
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

  const expenses = rawExpenses;
  const orders   = rawOrders;

  const stats = useMemo(() => {
    const totalIncome   = orders.reduce((s, o) => s + o.totalPrice, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit     = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, netProfit };
  }, [orders, expenses]);

  const chartData = useMemo(() => {
    const data: Record<string, { date: string; income: number; expense: number }> = {};
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

  /* recent transactions: merge expenses + orders, sort by date desc */
  const recentTx = useMemo(() => {
    const exps = expenses.map(e => ({
      id: e.id, kind: 'expense' as const, label: e.description || 'Expense',
      sub: e.categoryId, amount: e.amount, date: new Date(e.date),
      method: e.paymentMethod,
    }));
    const ords = orders.map(o => ({
      id: o.id?.toString() ?? '', kind: 'income' as const,
      label: o.customerName || 'Sale', sub: 'Revenue',
      amount: o.totalPrice, date: new Date(o.timestamp),
      method: 'Sale',
    }));
    return [...exps, ...ords].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);
  }, [expenses, orders]);

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
    } catch {
      toast.error('Failed to save expense');
    }
  };

  /* ─── Add Expense Dialog ─── */
  const ExpenseDialog = (
    <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
      <DialogTrigger asChild>
        {/* Desktop trigger (hidden on mobile — mobile uses FAB) */}
        <Button className="gap-2 shadow-lg shadow-primary/20 hidden md:flex">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-sm sm:max-w-md">
        <DialogHeader><DialogTitle>New Expense Entry</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</Label>
              <Input type="number" value={expenseForm.amount}
                onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" className="h-11 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</Label>
              <Input type="date" value={expenseForm.date}
                onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                className="h-11 rounded-xl" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</Label>
            <Input value={expenseForm.description}
              onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
              placeholder="E.g. Office Supplies" className="h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</Label>
              <Select value={expenseForm.categoryId} onValueChange={v => setExpenseForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="inventory">Inventory Purchase</SelectItem>
                  <SelectItem value="rent">Rent &amp; Utilities</SelectItem>
                  <SelectItem value="salary">Staff Salaries</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</Label>
              <Select value={expenseForm.paymentMethod} onValueChange={v => setExpenseForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
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
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setIsExpenseOpen(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={handleAddExpense} className="rounded-xl gap-2"><Plus className="h-4 w-4" /> Save Transaction</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-5 animate-page-enter pb-20 md:pb-0">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Ledger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Revenue, expenses &amp; profit overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 h-9 hidden md:flex">
            <Download className="h-4 w-4" /> Export
          </Button>
          {ExpenseDialog}
        </div>
      </div>

      {/* ── MOBILE STAT STRIP ── */}
      <div className="md:hidden space-y-3">
        {/* Big Net Profit banner */}
        <div className={cn(
          "rounded-2xl p-4 relative overflow-hidden",
          stats.netProfit >= 0
            ? "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20"
            : "bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-rose-500/5 border border-rose-500/20"
        )}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="h-20 w-20" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Net Profit</p>
          <p className={cn("text-3xl font-black mt-1", stats.netProfit >= 0 ? "text-primary" : "text-rose-600")}>
            ৳{stats.netProfit.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">All time performance</span>
          </div>
        </div>

        {/* Income + Expense mini cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-sm rounded-xl p-4">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Income</span>
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-[18px] font-black text-emerald-700 mt-2">
              ৳{stats.totalIncome.toLocaleString()}
            </div>
          </Card>
          <Card className="border border-rose-500/20 bg-rose-500/5 shadow-sm rounded-xl p-4">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Expenses</span>
              <ArrowDownRight className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-[18px] font-black text-rose-700 mt-2">
              ৳{stats.totalExpenses.toLocaleString()}
            </div>
          </Card>
        </div>
      </div>

      {/* ── DESKTOP STAT CARDS ── */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="h-20 w-20" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-700">৳{stats.totalIncome.toLocaleString()}</div>
            <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium bg-emerald-500/10 w-fit px-2 py-1 rounded-full gap-1">
              <ArrowUpRight className="h-3 w-3" /> All-time total
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown className="h-20 w-20" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-600 uppercase tracking-wider">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-rose-700">৳{stats.totalExpenses.toLocaleString()}</div>
            <div className="mt-4 flex items-center text-xs text-rose-600 font-medium bg-rose-500/10 w-fit px-2 py-1 rounded-full gap-1">
              <ArrowDownRight className="h-3 w-3" /> All-time total
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

      {/* ── MOBILE: Recent Transactions list ── */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
            Transactions
          </h2>
          <button
            onClick={() => setIsExpenseOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add Expense
          </button>
        </div>

        <div className="bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-border/30 shadow-sm divide-y divide-border/40">
          {recentTx.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
              No transactions yet
            </div>
          ) : (
            recentTx.map(tx => (
              <div key={tx.id} className="flex items-center gap-3.5 px-4 py-3.5">
                {/* Icon */}
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                  tx.kind === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                )}>
                  {tx.kind === 'income' ? <Receipt className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{tx.label}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{tx.sub} · {format(tx.date, 'MMM d')}</p>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className={cn(
                    "text-sm font-black",
                    tx.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  )}>
                    {tx.kind === 'income' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{tx.method}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── DESKTOP: Chart + Transactions ── */}
      <div className="hidden md:grid gap-6 lg:grid-cols-7">
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
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="income"  stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
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
              {recentTx.slice(0, 8).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      tx.kind === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    )}>
                      {tx.kind === 'income' ? <Receipt className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-[150px]">{tx.label}</p>
                      <p className="text-[10px] text-muted-foreground">{format(tx.date, 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-bold", tx.kind === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                      {tx.kind === 'income' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                    </p>
                    <Badge variant="outline" className="text-[8px] h-4">{tx.method}</Badge>
                  </div>
                </div>
              ))}
              {recentTx.length === 0 && (
                <div className="py-20 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No recent expenses</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Mobile FAB ── */}
      <button
        onClick={() => setIsExpenseOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform ring-4 ring-background"
        aria-label="Add expense"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      {/* The dialog is also usable from mobile FAB */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="rounded-2xl max-w-sm sm:max-w-md">
          <DialogHeader><DialogTitle>New Expense Entry</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</Label>
                <Input type="number" value={expenseForm.amount}
                  onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" className="h-11 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</Label>
                <Input type="date" value={expenseForm.date}
                  onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                  className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</Label>
              <Input value={expenseForm.description}
                onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                placeholder="E.g. Office Supplies" className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</Label>
                <Select value={expenseForm.categoryId} onValueChange={v => setExpenseForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="inventory">Inventory Purchase</SelectItem>
                    <SelectItem value="rent">Rent &amp; Utilities</SelectItem>
                    <SelectItem value="salary">Staff Salaries</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</Label>
                <Select value={expenseForm.paymentMethod} onValueChange={v => setExpenseForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
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
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsExpenseOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddExpense} className="rounded-xl gap-2"><Plus className="h-4 w-4" /> Save Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
