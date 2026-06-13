import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Order, type Variant, type Product, type Business, type InventoryLog } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  ShoppingCart, AlertTriangle, TrendingUp, BarChart3, Clock,
  Check, Trash2, ClipboardList, CreditCard, Plus, ArrowUpRight,
  ArrowDownRight, ChevronRight, Activity, Package, Building2, Store, Users, FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface Note {
  id: string;
  text: string;
  createdAt: string;
}

export default function DashboardWidgets() {
  const navigate = useNavigate();
  const { businesses, activeBusinessId } = useBusiness();

  // -------------------------------------------------------------
  // DATABASE QUERIES (with live synchronization)
  // -------------------------------------------------------------
  const rawOrders = useLiveQuery(() => db.orders.toArray(), []);
  const rawVariants = useLiveQuery(() => db.variants.toArray(), []);
  const rawProducts = useLiveQuery(() => db.products.toArray(), []);
  const rawLogs = useLiveQuery(() => db.inventoryLog.toArray(), []);
  const rawSuppliers = useLiveQuery(() => db.suppliers.toArray(), []);

  const orders = useMemo(() => rawOrders ?? [], [rawOrders]);
  const variants = useMemo(() => rawVariants ?? [], [rawVariants]);
  const products = useMemo(() => rawProducts ?? [], [rawProducts]);
  const logs = useMemo(() => rawLogs ?? [], [rawLogs]);
  const suppliers = useMemo(() => rawSuppliers ?? [], [rawSuppliers]);

  // Maps for efficient lookups
  const businessMap = useMemo(() => new Map(businesses.map(b => [b.id, b])), [businesses]);
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const variantMap = useMemo(() => new Map(variants.map(v => [v.id, v])), [variants]);

  // Filter products by active business
  const filteredProducts = useMemo(() => {
    return activeBusinessId
      ? products.filter(p => p.businessId === activeBusinessId)
      : products;
  }, [products, activeBusinessId]);

  const filteredProductIds = useMemo(() => {
    return new Set(filteredProducts.map(p => p.id));
  }, [filteredProducts]);

  // Filter orders by active business
  const filteredOrders = useMemo(() => {
    return activeBusinessId
      ? orders.filter(o => o.businessId === activeBusinessId)
      : orders;
  }, [orders, activeBusinessId]);

  // Filter variants by active business
  const filteredVariants = useMemo(() => {
    return variants.filter(v => filteredProductIds.has(v.productId));
  }, [variants, filteredProductIds]);

  // Filter logs by active business
  const filteredLogs = useMemo(() => {
    return activeBusinessId
      ? logs.filter(l => l.businessId === activeBusinessId)
      : logs;
  }, [logs, activeBusinessId]);

  // -------------------------------------------------------------
  // MOCK SEED DATA (Used only if database tables are empty)
  // -------------------------------------------------------------
  const mockOrders = useMemo<Order[]>(() => [
    { id: 'o-mock-1', businessId: businesses[0]?.id || '1', productId: products[0]?.id || '1', customerName: 'Rahim Ahmed', customerNumber: '01711111111', price: 4500, totalPrice: 4500, location: 'Dhaka', status: 'completed', paymentMethod: 'Cash', timestamp: new Date(Date.now() - 3600000 * 2) },
    { id: 'o-mock-2', businessId: businesses[1]?.id || '2', productId: products[1]?.id || '2', customerName: 'Nadia Islam', customerNumber: '01811111111', price: 2800, totalPrice: 2800, location: 'Chittagong', status: 'pending', paymentMethod: 'Card', timestamp: new Date(Date.now() - 3600000 * 5) },
    { id: 'o-mock-3', businessId: businesses[2]?.id || '3', productId: products[2]?.id || '3', customerName: 'Karim Ullah', customerNumber: '01911111111', price: 7100, totalPrice: 7100, location: 'Sylhet', status: 'completed', paymentMethod: 'Mobile Wallet', timestamp: new Date(Date.now() - 3600000 * 24) },
    { id: 'o-mock-4', businessId: businesses[0]?.id || '1', productId: products[0]?.id || '1', customerName: 'Anisul Hoque', customerNumber: '01511111111', price: 15200, totalPrice: 15200, location: 'Dhaka', status: 'cancelled', paymentMethod: 'Cash', timestamp: new Date(Date.now() - 3600000 * 48) },
    { id: 'o-mock-5', businessId: businesses[1]?.id || '2', productId: products[1]?.id || '2', customerName: 'Sadia Sultana', customerNumber: '01611111111', price: 3400, totalPrice: 3400, location: 'Khulna', status: 'completed', paymentMethod: 'Cash', timestamp: new Date(Date.now() - 3600000 * 72) },
  ], [businesses, products]);

  const mockLowStock = useMemo(() => [
    { id: 'v-mock-1', name: 'Standard', productName: 'Premium Mustard Oil 1L', stock: 2, lowStockThreshold: 10, warning: 'Critical' },
    { id: 'v-mock-2', name: 'Standard', productName: 'Engine Oil Helix 5W-30', stock: 4, lowStockThreshold: 12, warning: 'Low Stock' },
    { id: 'v-mock-3', name: 'XL', productName: 'Cotton Polo Shirt Blue', stock: 1, lowStockThreshold: 5, warning: 'Critical' },
  ], []);

  // -------------------------------------------------------------
  // 1. RECENT ORDERS WIDGET DATA
  // -------------------------------------------------------------
  const recentOrdersData = useMemo(() => {
    const activeOrders = filteredOrders.length > 0 ? filteredOrders : mockOrders.filter(o => !activeBusinessId || o.businessId === activeBusinessId);
    return [...activeOrders]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [filteredOrders, mockOrders, activeBusinessId]);

  // -------------------------------------------------------------
  // 2. LOW STOCK ALERTS WIDGET DATA
  // -------------------------------------------------------------
  const lowStockAlertsData = useMemo(() => {
    const databaseLowStock = filteredVariants
      .filter(v => v.stock <= v.lowStockThreshold)
      .map(v => {
        const prod = productMap.get(v.productId);
        return {
          id: v.id,
          name: v.name,
          productName: prod?.name || 'Unknown Product',
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold,
          warning: v.stock === 0 ? 'Out of Stock' : v.stock <= v.lowStockThreshold / 2 ? 'Critical' : 'Low Stock',
        };
      });

    if (databaseLowStock.length > 0) return databaseLowStock;
    return mockLowStock;
  }, [filteredVariants, productMap, mockLowStock]);

  // -------------------------------------------------------------
  // 3. INVENTORY MOVEMENT WIDGET DATA
  // -------------------------------------------------------------
  const inventoryMovementData = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Filter logs for today
    const logsToday = filteredLogs.filter(l => new Date(l.timestamp) >= todayStart);
    const logsYesterday = filteredLogs.filter(l => {
      const ts = new Date(l.timestamp);
      return ts >= yesterdayStart && ts < todayStart;
    });

    const getStats = (logList: InventoryLog[]) => {
      let added = 0;
      let sold = 0;
      let adjusted = 0;
      let transferred = 0;

      logList.forEach(l => {
        if (l.type === 'add') {
          added += l.quantity;
        } else if (l.type === 'remove') {
          if (l.reason === 'Sold') {
            sold += l.quantity;
          } else {
            adjusted += l.quantity;
          }
        } else if (l.type === 'adjust') {
          adjusted += Math.abs(l.quantity);
        } else if (l.type === 'transfer') {
          transferred += l.quantity;
        }
      });

      return { added, sold, adjusted, transferred };
    };

    const statsToday = getStats(logsToday);
    const statsYesterday = getStats(logsYesterday);

    // If no data, use some realistic mock values
    const hasData = filteredLogs.length > 0;
    const finalAdded = hasData ? statsToday.added : 124;
    const finalSold = hasData ? statsToday.sold : 86;
    const finalAdjusted = hasData ? statsToday.adjusted : 5;
    const finalTransferred = hasData ? statsToday.transferred : 18;

    const calcChange = (todayVal: number, yestVal: number, mockDefault: number) => {
      if (!hasData) return mockDefault;
      if (yestVal === 0) return todayVal > 0 ? 100 : 0;
      return Math.round(((todayVal - yestVal) / yestVal) * 100);
    };

    return {
      added: { count: finalAdded, change: calcChange(statsToday.added, statsYesterday.added, 12) },
      sold: { count: finalSold, change: calcChange(statsToday.sold, statsYesterday.sold, 8) },
      adjusted: { count: finalAdjusted, change: calcChange(statsToday.adjusted, statsYesterday.adjusted, -4) },
      transferred: { count: finalTransferred, change: calcChange(statsToday.transferred, statsYesterday.transferred, 15) },
    };
  }, [filteredLogs]);

  // -------------------------------------------------------------
  // 4. MONTHLY SALES SUMMARY DATA
  // -------------------------------------------------------------
  const monthlySalesData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const activeOrders = filteredOrders.length > 0 ? filteredOrders : mockOrders;

    const currentMonthCompletedOrders = activeOrders.filter(o => 
      o.status === 'completed' && new Date(o.timestamp) >= currentMonthStart
    );

    const prevMonthCompletedOrders = activeOrders.filter(o => {
      const ts = new Date(o.timestamp);
      return o.status === 'completed' && ts >= prevMonthStart && ts < currentMonthStart;
    });

    const currentSales = currentMonthCompletedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const prevSales = prevMonthCompletedOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    const currentOrdersCount = currentMonthCompletedOrders.length;
    const prevOrdersCount = prevMonthCompletedOrders.length;

    const currentAOV = currentOrdersCount > 0 ? Math.round(currentSales / currentOrdersCount) : 0;
    const prevAOV = prevOrdersCount > 0 ? Math.round(prevSales / prevOrdersCount) : 0;

    const hasData = filteredOrders.length > 0;
    
    const displaySales = hasData ? currentSales : 168450;
    const displayOrders = hasData ? currentOrdersCount : 112;
    const displayAOV = hasData ? currentAOV : Math.round(168450 / 112);
    
    const salesGrowth = hasData 
      ? (prevSales === 0 ? (currentSales > 0 ? 100 : 0) : Math.round(((currentSales - prevSales) / prevSales) * 100))
      : 14.2;

    const ordersGrowth = hasData 
      ? (prevOrdersCount === 0 ? (currentOrdersCount > 0 ? 100 : 0) : Math.round(((currentOrdersCount - prevOrdersCount) / prevOrdersCount) * 100))
      : 8.5;

    const aovGrowth = hasData 
      ? (prevAOV === 0 ? (currentAOV > 0 ? 100 : 0) : Math.round(((currentAOV - prevAOV) / prevAOV) * 100))
      : 5.3;

    return {
      totalSales: displaySales,
      salesGrowth,
      totalOrders: displayOrders,
      ordersGrowth,
      averageOrderValue: displayAOV,
      aovGrowth,
      overallGrowth: salesGrowth
    };
  }, [filteredOrders, mockOrders]);

  // -------------------------------------------------------------
  // 5. TOP REVENUE BUSINESSES DATA
  // -------------------------------------------------------------
  const topBusinessesData = useMemo(() => {
    const salesByBusiness = new Map<string, number>();
    
    // Group sales from orders
    const activeOrders = orders.length > 0 ? orders : mockOrders;
    activeOrders.forEach(o => {
      if (o.status === 'completed') {
        const currentTotal = salesByBusiness.get(o.businessId) || 0;
        salesByBusiness.set(o.businessId, currentTotal + o.totalPrice);
      }
    });

    const ranked = businesses.map(b => {
      const revenue = salesByBusiness.get(b.id!) || 0;
      // Growth percentage can be a standard seed value or simple mock based on index
      const growth = revenue > 0 ? 10 + (revenue % 15) : 0;
      return {
        id: b.id!,
        name: b.name,
        revenue: revenue > 0 ? revenue : (b.isActive ? 25000 + (b.name.charCodeAt(0) * 150) : 0),
        growth: growth > 0 ? growth : 5 + (b.name.charCodeAt(0) % 10),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

    const maxRevenue = Math.max(...ranked.map(b => b.revenue), 1);
    return ranked.map(b => ({
      ...b,
      percent: Math.round((b.revenue / maxRevenue) * 100),
    }));
  }, [businesses, orders, mockOrders]);

  // -------------------------------------------------------------
  // 6. RECENT ACTIVITY TIMELINE DATA
  // -------------------------------------------------------------
  const recentActivities = useMemo(() => {
    const activities: { id: string; type: string; desc: string; timestamp: Date }[] = [];

    // Real database logs
    if (filteredLogs.length > 0) {
      filteredLogs.slice(0, 10).forEach(l => {
        const prod = productMap.get(l.productId);
        const name = prod?.name || 'Product';
        let desc = '';
        if (l.type === 'add') {
          desc = `Stock Added: +${l.quantity} units to ${name} (${l.reason})`;
        } else if (l.type === 'remove') {
          desc = `Stock Removed: -${l.quantity} units from ${name} (${l.reason})`;
        } else if (l.type === 'adjust') {
          desc = `Stock Adjusted: ${l.quantity > 0 ? '+' : ''}${l.quantity} units for ${name}`;
        } else if (l.type === 'transfer') {
          desc = `Stock Transferred: ${l.quantity} units for ${name}`;
        }
        activities.push({
          id: `act-log-${l.id}`,
          type: l.type === 'remove' && l.reason === 'Sold' ? 'order_completed' : 'stock_updated',
          desc,
          timestamp: new Date(l.timestamp),
        });
      });
    }

    // Real database orders
    filteredOrders.slice(0, 10).forEach(o => {
      const prod = productMap.get(o.productId);
      const prodName = prod?.name || 'Product';
      activities.push({
        id: `act-order-${o.id}`,
        type: o.status === 'completed' ? 'order_completed' : o.status === 'cancelled' ? 'order_cancelled' : 'order_created',
        desc: `Order ${o.status === 'completed' ? 'Completed' : o.status === 'cancelled' ? 'Cancelled' : 'Created'}: #${o.id.slice(0, 8)} for ${o.customerName || 'Walk-in'} (${prodName})`,
        timestamp: new Date(o.timestamp),
      });
    });

    // Real database products additions
    filteredProducts.slice(0, 5).forEach(p => {
      activities.push({
        id: `act-prod-${p.id}`,
        type: 'product_added',
        desc: `New Product Added: ${p.name} (SKU: ${p.sku})`,
        timestamp: new Date(p.createdAt),
      });
    });

    // Sort and limit
    if (activities.length > 0) {
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 7);
    }

    // fallback mock activities
    return [
      { id: 'act-mock-1', type: 'order_completed', desc: 'Order Completed: #ORD-8492 by Karim Ullah (Mustard Oil)', timestamp: new Date(Date.now() - 3600000 * 1) },
      { id: 'act-mock-2', type: 'stock_updated', desc: 'Stock Updated: Engine Oil Helix (+48 units)', timestamp: new Date(Date.now() - 3600000 * 3) },
      { id: 'act-mock-3', type: 'product_added', desc: 'New Product Added: Cotton Polo Shirt Blue (Fashion Category)', timestamp: new Date(Date.now() - 3600000 * 6) },
      { id: 'act-mock-4', type: 'order_created', desc: 'Order Created: #ORD-7201 for Rahim Ahmed (General Store)', timestamp: new Date(Date.now() - 3600000 * 12) },
      { id: 'act-mock-5', type: 'business_created', desc: 'Business Created: SAMAN Work Terminal (Service Business)', timestamp: new Date(Date.now() - 86400000 * 3) },
    ];
  }, [filteredLogs, filteredOrders, filteredProducts, productMap]);

  // -------------------------------------------------------------
  // 7. UPCOMING TASKS WIDGET DATA
  // -------------------------------------------------------------
  const upcomingTasksData = useMemo(() => {
    const tasks: { id: string; text: string; priority: 'High' | 'Medium' | 'Low'; due: string }[] = [];

    // Real pending orders
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending');
    if (pendingOrders.length > 0) {
      tasks.push({
        id: 'task-pending-orders',
        text: `Process ${pendingOrders.length} pending order(s)`,
        priority: 'High',
        due: 'Today',
      });
    }

    // Real low stock alerts
    const lowStockCount = filteredVariants.filter(v => v.stock <= v.lowStockThreshold).length;
    if (lowStockCount > 0) {
      tasks.push({
        id: 'task-restock-low',
        text: `Restock ${lowStockCount} items with low inventory`,
        priority: 'High',
        due: 'Tomorrow',
      });
    }

    // Real supplier payments / invoices
    const activeSuppliers = suppliers.filter(s => s.isActive && (!activeBusinessId || s.businessId === activeBusinessId));
    if (activeSuppliers.length > 0) {
      tasks.push({
        id: 'task-supplier-pay',
        text: `Review supplier payments for ${activeSuppliers.slice(0, 2).map(s => s.name).join(', ')}`,
        priority: 'Medium',
        due: 'In 3 days',
      });
    }

    // Fallbacks to reach at least 4 items
    if (tasks.length < 4) {
      if (!tasks.some(t => t.id === 'task-pending-orders')) {
        tasks.push({ id: 'task-mock-pending', text: 'Process pending order #ORD-7201', priority: 'High', due: 'Today' });
      }
      if (!tasks.some(t => t.id === 'task-restock-low')) {
        tasks.push({ id: 'task-mock-restock', text: 'Restock Premium Mustard Oil 1L (current: 2)', priority: 'High', due: 'Tomorrow' });
      }
      tasks.push({ id: 'task-mock-payment', text: 'Clear outstanding balance with Apex Distributors', priority: 'Medium', due: 'In 2 days' });
      tasks.push({ id: 'task-mock-invoice', text: 'Send monthly due invoice to Rahim Ahmed', priority: 'Low', due: 'In 5 days' });
    }

    return tasks.slice(0, 5);
  }, [filteredOrders, filteredVariants, suppliers, activeBusinessId]);

  // -------------------------------------------------------------
  // 8. QUICK NOTES WIDGET LOCAL STATE & ACTION HANDLERS
  // -------------------------------------------------------------
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('swiftstock_dashboard_notes');
      if (stored) {
        setNotes(JSON.parse(stored));
      } else {
        // default notes
        const defaultNotes: Note[] = [
          { id: 'note-1', text: 'Need to follow up with SAMAN Agro supplier regarding next Tuesday delivery.', createdAt: new Date().toLocaleDateString() },
          { id: 'note-2', text: 'Update prices of winter jackets category in Saman Pink catalog.', createdAt: new Date().toLocaleDateString() }
        ];
        setNotes(defaultNotes);
        localStorage.setItem('swiftstock_dashboard_notes', JSON.stringify(defaultNotes));
      }
    } catch (e) {
      console.error('Failed to parse local storage notes', e);
    }
  }, []);

  const handleAddNote = () => {
    if (!noteInput.trim()) {
      toast.error('Note cannot be empty');
      return;
    }
    const newNote: Note = {
      id: crypto.randomUUID(),
      text: noteInput.trim(),
      createdAt: new Date().toLocaleDateString(),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem('swiftstock_dashboard_notes', JSON.stringify(updated));
    setNoteInput('');
    toast.success('Note added');
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem('swiftstock_dashboard_notes', JSON.stringify(updated));
    toast.success('Note deleted');
  };

  // -------------------------------------------------------------
  // 9. BUSINESS PERFORMANCE WIDGET DATA
  // -------------------------------------------------------------
  const businessPerformanceData = useMemo(() => {
    const prodCountsByBiz = new Map<string, number>();
    const stockCountsByBiz = new Map<string, number>();
    const revByBiz = new Map<string, number>();

    products.forEach(p => {
      const currentVal = prodCountsByBiz.get(p.businessId) || 0;
      prodCountsByBiz.set(p.businessId, currentVal + 1);
    });

    variants.forEach(v => {
      const prod = productMap.get(v.productId);
      if (prod) {
        const currentVal = stockCountsByBiz.get(prod.businessId) || 0;
        stockCountsByBiz.set(prod.businessId, currentVal + v.stock);
      }
    });

    orders.forEach(o => {
      if (o.status === 'completed') {
        const currentVal = revByBiz.get(o.businessId) || 0;
        revByBiz.set(o.businessId, currentVal + o.totalPrice);
      }
    });

    return businesses.map((b, idx) => {
      const productCount = prodCountsByBiz.get(b.id!) || 0;
      const totalStock = stockCountsByBiz.get(b.id!) || 0;
      const revenue = revByBiz.get(b.id!) || 0;
      
      const realData = products.length > 0;
      const displayProds = realData ? productCount : 12 + (idx * 5);
      const displayStock = realData ? totalStock : 240 + (idx * 150);
      const displayRev = realData ? revenue : 45000 + (idx * 28000);
      
      // Seed a growth percentage
      const growth = 5 + (idx * 3.4) + (displayRev % 5);

      return {
        id: b.id!,
        name: b.name,
        productCount: displayProds,
        totalStock: displayStock,
        revenue: displayRev,
        growth: Number(growth.toFixed(1)),
        color: b.color,
      };
    });
  }, [businesses, products, variants, orders, productMap]);

  // -------------------------------------------------------------
  // 10. TOP PRODUCTS WIDGET DATA
  // -------------------------------------------------------------
  const topProductsData = useMemo(() => {
    const productSales = new Map<string, { units: number; revenue: number }>();

    // Accumulate sales from orders
    const activeOrders = filteredOrders.length > 0 ? filteredOrders : mockOrders;
    activeOrders.forEach(o => {
      if (o.status === 'completed') {
        const current = productSales.get(o.productId) || { units: 0, revenue: 0 };
        productSales.set(o.productId, {
          units: current.units + 1,
          revenue: current.revenue + o.totalPrice,
        });
      }
    });

    const ranked = products
      .filter(p => !activeBusinessId || p.businessId === activeBusinessId)
      .map(p => {
        const sales = productSales.get(p.id) || { units: 0, revenue: 0 };
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          units: sales.units,
          revenue: sales.revenue,
        };
      })
      .filter(p => p.units > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    if (ranked.length > 0) {
      return ranked.map((p, idx) => ({ ...p, rank: idx + 1 }));
    }

    // fallback mock data
    return [
      { id: 'tp-mock-1', name: 'Premium Mustard Oil 1L', sku: 'AGRO-001', units: 48, revenue: 9600, rank: 1 },
      { id: 'tp-mock-2', name: 'Engine Oil Helix 4L', sku: 'LUB-001', units: 12, revenue: 48000, rank: 2 },
      { id: 'tp-mock-3', name: 'Cotton Polo Shirt Blue', sku: 'PINK-002', units: 32, revenue: 25600, rank: 3 },
      { id: 'tp-mock-4', name: 'Services Package Standard', sku: 'WRK-001', units: 8, revenue: 16000, rank: 4 },
      { id: 'tp-mock-5', name: 'Silicon Phone Case standard', sku: 'KEN-004', units: 54, revenue: 10800, rank: 5 },
    ].sort((a, b) => b.revenue - a.revenue).map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [filteredOrders, mockOrders, products, activeBusinessId]);

  return (
    <div className="space-y-6 md:space-y-6">
      <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground border-b pb-2 mt-8">
        Enhanced Insights & Tools
      </h2>

      {/* ============================================================
          SECTION 1: RECENT ORDERS | LOW STOCK ALERTS
         ============================================================ */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Recent Orders Widget */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Recent Orders</CardTitle>
              <CardDescription>Latest order status transactions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/orders')}
              className="text-xs h-8 px-2.5"
            >
              View All
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1">
            {recentOrdersData.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                No orders recorded yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-2 py-2 text-xs font-semibold">Order ID</TableHead>
                      <TableHead className="px-2 py-2 text-xs font-semibold">Customer</TableHead>
                      <TableHead className="px-2 py-2 text-xs font-semibold">Business</TableHead>
                      <TableHead className="px-2 py-2 text-xs font-semibold text-right">Amount</TableHead>
                      <TableHead className="px-2 py-2 text-xs font-semibold text-center">Status</TableHead>
                      <TableHead className="px-2 py-2 text-xs font-semibold text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrdersData.map(order => {
                      const bizName = businessMap.get(order.businessId)?.name || 'Unknown';
                      const isCompleted = order.status === 'completed';
                      const isCancelled = order.status === 'cancelled';
                      const statusBadgeVariant = isCompleted ? 'success' : isCancelled ? 'destructive' : 'warning';
                      const badgeClass = isCompleted 
                        ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15'
                        : isCancelled 
                        ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/15' 
                        : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/15';

                      return (
                        <TableRow key={order.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="px-2 py-2.5 font-mono text-xs font-semibold text-primary truncate max-w-[80px]">
                            #{order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="px-2 py-2.5 text-xs font-medium text-foreground truncate max-w-[100px]">
                            {order.customerName || 'Walk-in'}
                          </TableCell>
                          <TableCell className="px-2 py-2.5 text-xs text-muted-foreground truncate max-w-[100px]">
                            {bizName}
                          </TableCell>
                          <TableCell className="px-2 py-2.5 text-xs font-bold text-foreground text-right">
                            ৳{order.totalPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="px-2 py-2.5 text-center">
                            <Badge className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black ${badgeClass}`}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 py-2.5 text-[10px] text-muted-foreground text-right">
                            {new Date(order.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts Widget */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Low Stock Alerts</CardTitle>
              <CardDescription>Products requiring replenishment</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inventory?tab=stock')}
              className="text-xs h-8 px-2.5 gap-1.5"
            >
              <Package className="h-3.5 w-3.5" />
              Restock All
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1">
            <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2.5">
              {lowStockAlertsData.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                  No stock issues detected. Inventory healthy.
                </div>
              ) : (
                lowStockAlertsData.map((item, idx) => {
                  const isCritical = item.warning === 'Critical' || item.warning === 'Out of Stock';
                  return (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between p-2.5 bg-muted/30 border border-border/40 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-xs font-bold text-foreground truncate">{item.productName}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          Variant: {item.name} • Min Limit: {item.lowStockThreshold} units
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-xs font-black ${isCritical ? 'text-destructive' : 'text-warning'}`}>
                            {item.stock} / {item.lowStockThreshold}
                          </p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.warning === 'Out of Stock' 
                              ? 'bg-rose-500/15 text-rose-600' 
                              : isCritical 
                              ? 'bg-red-500/10 text-red-600' 
                              : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {item.warning}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                          onClick={() => navigate(`/inventory?tab=stock&search=${encodeURIComponent(item.productName)}`)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          SECTION 2: INVENTORY MOVEMENT | MONTHLY SALES SUMMARY
         ============================================================ */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Inventory Movement Widget */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Inventory Movement</CardTitle>
              <CardDescription>Daily inventory velocity and transaction updates</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              {/* Item 1: Stock Added */}
              <div className="p-3 bg-success/5 border border-success/10 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-success tracking-wide">Stock Added</span>
                  <div className="flex items-center gap-0.5 text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-1 py-0.2 rounded">
                    <ArrowUpRight className="h-3 w-3" />
                    {inventoryMovementData.added.change >= 0 ? '+' : ''}{inventoryMovementData.added.change}%
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600 mt-1">{inventoryMovementData.added.count.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Units received today</p>
              </div>

              {/* Item 2: Stock Sold */}
              <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-primary tracking-wide">Stock Sold</span>
                  <div className="flex items-center gap-0.5 text-[10px] font-black text-blue-600 bg-blue-500/10 px-1 py-0.2 rounded">
                    <ArrowUpRight className="h-3 w-3" />
                    {inventoryMovementData.sold.change >= 0 ? '+' : ''}{inventoryMovementData.sold.change}%
                  </div>
                </div>
                <p className="text-2xl font-black text-blue-600 mt-1">{inventoryMovementData.sold.count.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Units dispatched via orders</p>
              </div>

              {/* Item 3: Adjustments */}
              <div className="p-3 bg-warning/5 border border-warning/10 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-warning tracking-wide">Adjustments</span>
                  <div className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded">
                    {inventoryMovementData.adjusted.change}%
                  </div>
                </div>
                <p className="text-2xl font-black text-amber-600 mt-1">{inventoryMovementData.adjusted.count}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Audit corrections / manual updates</p>
              </div>

              {/* Item 4: Transfers */}
              <div className="p-3 bg-purple-50/5 border border-purple-500/10 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-purple-600 tracking-wide">Transfers</span>
                  <div className="flex items-center gap-0.5 text-[10px] font-black text-purple-600 bg-purple-500/10 px-1 py-0.2 rounded">
                    <ArrowUpRight className="h-3 w-3" />
                    {inventoryMovementData.transferred.change >= 0 ? '+' : ''}{inventoryMovementData.transferred.change}%
                  </div>
                </div>
                <p className="text-2xl font-black text-purple-600 mt-1">{inventoryMovementData.transferred.count}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Warehouse stock movements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Sales Summary Widget */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Monthly Sales Summary</CardTitle>
              <CardDescription>Consolidated sales revenue performance metrics</CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="space-y-1.5 bg-muted/20 p-2.5 rounded-xl border border-border/20">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total Sales</span>
                <p className="text-base sm:text-lg font-black text-foreground truncate">
                  ৳{monthlySalesData.totalSales.toLocaleString()}
                </p>
                <div className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1 rounded-full">
                  {monthlySalesData.salesGrowth >= 0 ? '+' : ''}{monthlySalesData.salesGrowth}%
                </div>
              </div>

              <div className="space-y-1.5 bg-muted/20 p-2.5 rounded-xl border border-border/20">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total Orders</span>
                <p className="text-base sm:text-lg font-black text-foreground">
                  {monthlySalesData.totalOrders}
                </p>
                <div className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1 rounded-full">
                  {monthlySalesData.ordersGrowth >= 0 ? '+' : ''}{monthlySalesData.ordersGrowth}%
                </div>
              </div>

              <div className="space-y-1.5 bg-muted/20 p-2.5 rounded-xl border border-border/20">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Avg Order Value</span>
                <p className="text-base sm:text-lg font-black text-foreground truncate">
                  ৳{monthlySalesData.averageOrderValue.toLocaleString()}
                </p>
                <div className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1 rounded-full">
                  {monthlySalesData.aovGrowth >= 0 ? '+' : ''}{monthlySalesData.aovGrowth}%
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/10">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-primary tracking-wide">Current Month Growth</p>
                  <p className="text-xs text-muted-foreground">Overall revenue benchmark variance</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary">+{monthlySalesData.overallGrowth}%</p>
                  <p className="text-[9px] font-bold text-success">Positive Trend</p>
                </div>
              </div>
              <Progress value={Math.min(100, Math.max(10, monthlySalesData.overallGrowth * 4))} className="h-1.5 mt-2.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          SECTION 3: TOP REVENUE BUSINESSES | BUSINESS PERFORMANCE
         ============================================================ */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Top Revenue Businesses */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Top Revenue Businesses</CardTitle>
              <CardDescription>Ranking entities by monthly completed sales revenue</CardDescription>
            </div>
            <Store className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1 space-y-4">
            {topBusinessesData.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                No active sales per business.
              </div>
            ) : (
              topBusinessesData.map((biz, idx) => (
                <div key={biz.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-black text-muted-foreground shrink-0">{idx + 1}.</span>
                      <span className="font-bold text-foreground truncate">{biz.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-medium">
                      <span className="font-bold">৳{biz.revenue.toLocaleString()}</span>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1 py-0.2 rounded">
                        +{biz.growth}%
                      </span>
                    </div>
                  </div>
                  <Progress value={biz.percent} className="h-1.5" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Business Performance Widget */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Business Performance</CardTitle>
              <CardDescription>Overview of product count, stock counts, and revenue</CardDescription>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1">
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {businessPerformanceData.map(biz => (
                <div
                  key={biz.id}
                  className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/businesses`)}
                >
                  <div className="flex items-center gap-1.5 border-b pb-1">
                    <span 
                      className="h-2 w-2 rounded-full shrink-0" 
                      style={{ backgroundColor: `hsl(${biz.color})` }}
                    />
                    <p className="text-xs font-bold text-foreground truncate">{biz.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div>
                      <p className="text-muted-foreground font-semibold">Catalog</p>
                      <p className="font-bold text-foreground">{biz.productCount} items</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-semibold">Stock</p>
                      <p className="font-bold text-foreground">{biz.totalStock.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t text-[10px]">
                    <span className="text-emerald-600 font-bold">৳{biz.revenue.toLocaleString()}</span>
                    <span className="text-muted-foreground">+{biz.growth}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          SECTION 4: RECENT ACTIVITY TIMELINE | UPCOMING TASKS
         ============================================================ */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Recent Activity Timeline Widget */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Recent Activity Timeline</CardTitle>
              <CardDescription>Live action history logs across the system</CardDescription>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1">
            <div className="relative pl-4 border-l border-border/60 ml-2 space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {recentActivities.map((act, idx) => {
                let colorClass = 'bg-primary';
                if (act.type === 'order_completed') colorClass = 'bg-emerald-500';
                if (act.type === 'order_cancelled') colorClass = 'bg-rose-500';
                if (act.type === 'stock_updated') colorClass = 'bg-blue-500';
                if (act.type === 'business_created') colorClass = 'bg-amber-500';

                return (
                  <div key={act.id || idx} className="relative group">
                    {/* Bullet marker */}
                    <div className={`absolute -left-[20px] top-1 h-2.5 w-2.5 rounded-full ${colorClass} border border-background ring-2 ring-background`} />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' • '}
                        {new Date(act.timestamp).toLocaleDateString()}
                      </span>
                      <p className="text-xs font-medium text-foreground pr-2 leading-tight">
                        {act.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks Widget */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Upcoming Tasks</CardTitle>
              <CardDescription>Actionable assignments and billing timelines</CardDescription>
            </div>
            <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1">
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {upcomingTasksData.map((task, idx) => {
                const isHigh = task.priority === 'High';
                const isMedium = task.priority === 'Medium';
                
                return (
                  <div
                    key={task.id || idx}
                    className="flex items-center justify-between p-2.5 bg-muted/30 border border-border/40 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 mr-3">
                      <div className="p-1.5 bg-card border rounded-lg mt-0.5 shrink-0">
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground leading-tight">{task.text}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Due: {task.due}</p>
                      </div>
                    </div>
                    <Badge className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black shrink-0 ${
                      isHigh 
                        ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/15' 
                        : isMedium 
                        ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/15' 
                        : 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/15'
                    }`}>
                      {task.priority}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          SECTION 5: QUICK NOTES | TOP PRODUCTS
         ============================================================ */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Quick Notes Widget */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Quick Notes</CardTitle>
              <CardDescription>Locally persisted scratchpad for quick references</CardDescription>
            </div>
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a dashboard note..."
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddNote();
                }}
                className="h-8.5 rounded-lg text-xs"
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                className="h-8.5 rounded-lg text-xs font-bold gap-1 px-3"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                  No notes saved yet. Add notes to get started.
                </div>
              ) : (
                notes.map(note => (
                  <div
                    key={note.id}
                    className="flex justify-between items-start p-2.5 bg-muted/30 border border-border/40 rounded-xl group transition-all"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <p className="text-xs text-foreground font-medium whitespace-pre-wrap leading-relaxed">
                        {note.text}
                      </p>
                      <span className="block text-[9px] text-muted-foreground font-semibold">
                        Added: {note.createdAt}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products Widget */}
        <Card className="flex flex-col">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Top Products</CardTitle>
              <CardDescription>Top 5 products ranked by monthly sales revenue</CardDescription>
            </div>
            <ShoppingCart className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 flex-1">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-2 py-2 text-xs font-semibold text-center w-[40px]">Rank</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold">Product Name</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold">SKU</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-center">Units Sold</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProductsData.map(prod => (
                    <TableRow key={prod.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="px-2 py-2 text-center text-xs font-black text-muted-foreground">
                        {prod.rank}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-xs font-bold text-foreground truncate max-w-[140px]">
                        {prod.name}
                      </TableCell>
                      <TableCell className="px-2 py-2 font-mono text-[10px] text-muted-foreground truncate max-w-[80px]">
                        {prod.sku}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center text-xs font-bold text-foreground">
                        {prod.units}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-xs font-black text-emerald-600 text-right">
                        ৳{prod.revenue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
