import { getAllExpenses, getAllTransactions } from '@/lib/db';

function monthBounds(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const iso = (d) => d.toISOString().split('T')[0];
  return { from: iso(start), to: iso(end) };
}

export async function getDailySales(days = 7) {
  const transactions = await getAllTransactions();
  const now = new Date();
  const result = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().split('T')[0];
    const total = transactions
      .filter((t) => t.type === 'sale' && t.date === key)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    result.push({ date: key, total });
  }

  return result;
}

export async function getExpenseBreakdown(year, month) {
  const expenses = await getAllExpenses();
  const { from, to } = monthBounds(year, month);
  const grouped = {};

  expenses
    .filter((e) => e.date >= from && e.date <= to)
    .forEach((e) => {
      const category = e.category || 'Others';
      grouped[category] = (grouped[category] || 0) + Number(e.amount || 0);
    });

  return Object.entries(grouped).map(([category, total]) => ({ category, total }));
}

export async function getTopSellingItems(limit = 3) {
  const transactions = await getAllTransactions();
  const grouped = {};

  transactions
    .filter((t) => t.type === 'sale' && Array.isArray(t.items))
    .forEach((t) => {
      t.items.forEach((item) => {
        const key = item.name || 'Unknown';
        grouped[key] = (grouped[key] || 0) + Number(item.qty || 0);
      });
    });

  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

export async function getFinancialSummary(year, month) {
  const transactions = await getAllTransactions();
  const expenses = await getAllExpenses();
  const { from, to } = monthBounds(year, month);

  const monthSales = transactions
    .filter((t) => t.type === 'sale' && t.date >= from && t.date <= to)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const monthExpenses = expenses
    .filter((e) => e.date >= from && e.date <= to)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const allDates = [
    ...transactions.map((t) => t.date).filter(Boolean),
    ...expenses.map((e) => e.date).filter(Boolean),
  ];
  const oldest = allDates.length ? allDates.sort()[0] : null;
  const dataAgeDays = oldest
    ? Math.max(0, Math.floor((Date.now() - new Date(oldest).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    monthSales,
    monthExpenses,
    grossProfit: monthSales - monthExpenses,
    dailySales: await getDailySales(7),
    expenseByCategory: await getExpenseBreakdown(year, month),
    topItems: await getTopSellingItems(3),
    totalTransactions: transactions.filter((t) => t.date >= from && t.date <= to).length,
    dataAgeDays,
  };
}
