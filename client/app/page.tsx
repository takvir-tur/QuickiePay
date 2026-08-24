'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  HandCoins,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'

const transactions = [
  { name: 'Airtel Money', type: 'Mobile payment', date: 'Today, 10:42 AM', amount: '-$45.00', icon: Smartphone, tone: 'orange' },
  { name: 'Sophia Anderson', type: 'Money received', date: 'Today, 9:18 AM', amount: '+$250.00', icon: ArrowDownLeft, tone: 'green' },
  { name: 'Netflix.com', type: 'Subscription', date: 'Yesterday, 6:30 PM', amount: '-$15.49', icon: CreditCard, tone: 'red' },
  { name: 'Jordan Lee', type: 'Money sent', date: 'Aug 21, 2:15 PM', amount: '-$80.00', icon: ArrowUpRight, tone: 'blue' },
]

const services = [
  { label: 'Send money', detail: 'To friends & family', icon: ArrowUpRight, tone: 'blue' },
  { label: 'Request money', detail: 'Get paid faster', icon: HandCoins, tone: 'orange' },
  { label: 'Pay bills', detail: 'Stay on top of bills', icon: FileText, tone: 'green' },
  { label: 'Manage cards', detail: 'View & control cards', icon: CreditCard, tone: 'purple' },
  { label: 'Invite friends', detail: 'Earn $10 per invite', icon: Users, tone: 'pink' },
  { label: 'QuickiePay Vault', detail: 'Save for your goals', icon: ShieldCheck, tone: 'teal' },
]

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Transactions', icon: ArrowUpRight },
  { label: 'Cards', icon: CreditCard },
  { label: 'Recipients', icon: Users },
]

export default function Page() {
  const [dark, setDark] = useState(true)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [query, setQuery] = useState('')
  const filteredTransactions = useMemo(() => transactions.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <div className={dark ? 'dark min-h-screen' : 'min-h-screen'}>
      <div className="flex min-h-screen bg-background text-foreground transition-colors">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-5 py-7 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Zap className="size-5 fill-current" /></div>
            <span className="text-lg font-semibold tracking-tight">quickie<span className="text-brand">pay</span></span>
          </div>
          <p className="mb-3 mt-12 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Overview</p>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => setActiveNav(label)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${activeNav === label ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-[18px]" />{label}</button>)}
          </nav>
          <p className="mb-3 mt-10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Manage</p>
          <nav className="flex flex-col gap-1">
            {[{ label: 'Settings', icon: Settings }, { label: 'Help center', icon: FileText }].map(({ label, icon: Icon }) => <button key={label} onClick={() => setActiveNav(label)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${activeNav === label ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-[18px]" />{label}</button>)}
          </nav>
          <div className="mt-auto rounded-2xl bg-muted p-4"><div className="mb-3 grid size-8 place-items-center rounded-lg bg-card text-brand"><ShieldCheck className="size-4" /></div><p className="text-sm font-semibold">Your money is safe</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Protected by bank-level security.</p><button className="mt-3 text-xs font-semibold text-brand">Learn more <span aria-hidden="true">→</span></button></div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-border bg-card/70 px-5 py-5 backdrop-blur md:px-10">
            <div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-muted lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button><div><p className="text-sm text-muted-foreground">Monday, August 25, 2024</p><h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">Good morning, Alex</h1></div></div>
            <div className="flex items-center gap-2 md:gap-4"><label className="relative hidden md:block"><span className="sr-only">Search transactions</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-10 w-48 rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none ring-brand focus:ring-2" /></label><button className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Notifications"><Bell className="size-[19px]" /></button><button onClick={() => setDark(!dark)} className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Toggle theme">{dark ? <Sun className="size-[19px]" /> : <Moon className="size-[19px]" />}</button><div className="flex items-center gap-2 border-l border-border pl-3"><div className="grid size-9 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand">AM</div><ChevronDown className="hidden size-4 text-muted-foreground sm:block" /></div></div>
          </header>

          <div className="mx-auto max-w-[1380px] px-5 py-7 md:px-10 md:py-9">
            <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr_1fr]">
              <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/10 md:p-8"><div className="relative z-10"><div className="flex items-center justify-between"><p className="text-sm text-primary-foreground/65">Total balance</p><button onClick={() => setBalanceVisible(!balanceVisible)} className="rounded-lg p-1 text-primary-foreground/70 hover:bg-primary-foreground/10" aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}>{balanceVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button></div><p className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{balanceVisible ? '$12,480.50' : '••••••••'}</p><div className="mt-8 flex items-end justify-between"><div><p className="text-xs text-primary-foreground/60">Available to spend</p><p className="mt-1 text-sm font-medium">{balanceVisible ? '$9,650.00' : '••••••'}</p></div><Wallet className="size-8 text-brand" /></div></div><div className="absolute -right-12 -top-16 size-64 rounded-full border border-primary-foreground/10" /><div className="absolute -bottom-32 right-12 size-72 rounded-full border border-primary-foreground/10" /></div>
              <SummaryCard title="This month" value="$2,840.25" change="12.4%" positive={false} icon={ArrowUpRight} />
              <SummaryCard title="Money received" value="$4,125.00" change="8.2%" positive icon={ArrowDownLeft} />
            </section>

            <section className="mt-9"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold tracking-tight">Quick actions</h2><p className="mt-1 text-sm text-muted-foreground">What would you like to do?</p></div><button className="text-sm font-semibold text-brand hover:underline">View all</button></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{services.map(({ label, detail, icon: Icon, tone }) => <button key={label} className="group rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-foreground/5"><div className={`mb-4 grid size-10 place-items-center rounded-xl service-${tone}`}><Icon className="size-5" /></div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></button>)}</div></section>

            <section className="mt-9 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><div className="rounded-2xl border border-border bg-card p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold tracking-tight">Recent transactions</h2><p className="mt-1 text-sm text-muted-foreground">Your latest account activity</p></div><button className="text-sm font-semibold text-brand hover:underline">See all</button></div><div className="flex flex-col">{filteredTransactions.length ? filteredTransactions.map(({ name, type, date, amount, icon: Icon, tone }) => <div key={name} className="flex items-center justify-between border-t border-border py-4 first:border-0"><div className="flex items-center gap-3"><div className={`grid size-10 place-items-center rounded-full transaction-${tone}`}><Icon className="size-[18px]" /></div><div><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-muted-foreground">{type} · {date}</p></div></div><p className={`text-sm font-semibold ${amount.startsWith('+') ? 'text-positive' : ''}`}>{amount}</p></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No transactions found.</p>}</div></div><div className="rounded-2xl border border-border bg-card p-5 md:p-6"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold tracking-tight">Spending snapshot</h2><p className="mt-1 text-sm text-muted-foreground">August 2024</p></div><button aria-label="More spending options" className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="size-5" /></button></div><div className="mt-7 flex items-center gap-6"><div className="spending-donut grid size-32 shrink-0 place-items-center rounded-full"><div className="grid size-24 place-items-center rounded-full bg-card"><div className="text-center"><p className="text-xl font-semibold">$2.8k</p><p className="text-[10px] text-muted-foreground">spent</p></div></div></div><div className="flex flex-col gap-3 text-xs"><Legend color="bg-brand" label="Bills" value="$1,240" /><Legend color="bg-orange" label="Shopping" value="$840" /><Legend color="bg-green" label="Food & dining" value="$560" /><Legend color="bg-muted-foreground" label="Other" value="$200" /></div></div><button className="mt-7 w-full rounded-xl bg-muted py-3 text-sm font-semibold hover:bg-border">View spending report</button></div></section>
          </div>
        </main>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, change, positive, icon: Icon }: { title: string; value: string; change: string; positive: boolean; icon: typeof ArrowUpRight }) { return <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-7"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{title}</p><div className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-4" /></div></div><p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-4 text-xs text-muted-foreground"><span className={positive ? 'text-positive' : 'text-brand'}>{positive ? '↑' : '↓'} {change}</span> vs last month</p></div> }
function Legend({ color, label, value }: { color: string; label: string; value: string }) { return <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${color}`} /><span className="w-20 text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div> }
