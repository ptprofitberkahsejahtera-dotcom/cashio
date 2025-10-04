'use client'
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Plus, Trash2, Download, Upload, Filter, RotateCcw } from "lucide-react";

// Types
interface Txn {
  id: string;
  type: "in" | "out";
  amount: number;
  category: string;
  note?: string;
  date: string; // yyyy-mm-dd
}

const STORAGE_KEY = "cashio.transactions.v1";

function formatID() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function saveToStorage(items: Txn[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadFromStorage(): Txn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Txn[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t) => ({ ...t, amount: Number(t.amount) || 0 }));
  } catch {
    return [];
  }
}

function currency(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.round(n));
  } catch {
    return `Rp ${Math.round(n).toLocaleString()}`;
  }
}

export default function CashIOApp() {
  const [items, setItems] = useState<Txn[]>([]);
  const [type, setType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("Umum");
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [q, setQ] = useState("");
  const [fType, setFType] = useState<string>("all");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");
  const [fCategory, setFCategory] = useState<string>("all");

  const [importOpen, setImportOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");

  useEffect(() => setItems(loadFromStorage()), []);
  useEffect(() => saveToStorage(items), [items]);

  const balance = useMemo(() => items.reduce((sum, t) => sum + (t.type === "in" ? t.amount : -t.amount), 0), [items]);
  const totalIn = useMemo(() => items.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0), [items]);
  const totalOut = useMemo(() => items.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0), [items]);

  const categories = useMemo(() => {
    const set = new Set<string>(["Umum", "Gaji", "Penjualan", "Makan", "Transport", "Tagihan", "Hiburan", "Lainnya"]);
    items.forEach(t => set.add(t.category || "Lainnya"));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(t => {
      if (fType !== "all" && t.type !== fType) return false;
      if (fCategory !== "all" && t.category !== fCategory) return false;
      if (fFrom && t.date < fFrom) return false;
      if (fTo && t.date > fTo) return false;
      if (q) {
        const s = `${t.category} ${t.note || ""}`.toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      return true;
    }).sort((a,b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  }, [items, fType, fFrom, fTo, fCategory, q]);

  function addTxn() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return alert("Nominal harus > 0");
    const t: Txn = { id: formatID(), type, amount: Math.round(amt), category: category || "Umum", note, date };
    setItems(prev => [t, ...prev]);
    setAmount("");
    setNote("");
  }

  function removeTxn(id: string) {
    setItems(prev => prev.filter(t => t.id !== id));
  }

  function clearAll() {
    if (confirm("Hapus semua data?")) setItems([]);
  }

  function exportCSV() {
    const headers = ["id","type","amount","category","note","date"];
    const rows = items.map(t => headers.map(h => `${String((t as any)[h] ?? "").toString().replace(/"/g,'""')}`));
    const csv = [headers.join(","), ...rows.map(r => r.map(v => /[",\n]/.test(v) ? `"${v}"` : v).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashio-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON() {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("Format salah");
      const normalized: Txn[] = parsed.map((t: any) => ({
        id: t.id ?? formatID(),
        type: t.type === "out" ? "out" : "in",
        amount: Number(t.amount) || 0,
        category: t.category || "Umum",
        note: t.note || "",
        date: (t.date || new Date().toISOString().slice(0,10)).slice(0,10),
      }));
      setItems(normalized);
      setImportOpen(false);
      setJsonText("");
    } catch (e: any) {
      alert("Gagal import: " + e.message);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-slate-900 text-white shadow">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">CashIO — Cash In/Out</h1>
              <p className="text-sm text-slate-500">Aplikasi sederhana untuk catat pemasukan & pengeluaran. Data tersimpan di perangkat kamu (offline).</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="rounded-2xl"><Download className="w-4 h-4 mr-2"/>Export CSV</Button>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-2xl"><Upload className="w-4 h-4 mr-2"/>Import JSON</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Import dari JSON</DialogTitle>
                  <DialogDescription>Paste data JSON hasil export sebelumnya untuk memulihkan transaksi.</DialogDescription>
                </DialogHeader>
                <textarea value={jsonText} onChange={(e)=>setJsonText(e.target.value)} className="w-full h-56 rounded-xl border p-3 text-sm" placeholder='[ {"id":"...","type":"in","amount":150000,"category":"Gaji","note":"","date":"2025-10-03"} ]' />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={()=>setImportOpen(false)} className="rounded-2xl">Batal</Button>
                  <Button onClick={importJSON} className="rounded-2xl">Import</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Saldo</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency(balance)}</div>
              <p className="text-xs text-slate-500">Total saat ini</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Pemasukan</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency(totalIn)}</div>
              <p className="text-xs text-slate-500">Akumulasi</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Pengeluaran</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency(totalOut)}</div>
              <p className="text-xs text-slate-500">Akumulasi</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        <Card className="rounded-2xl shadow mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Tambah Transaksi</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <div className="sm:col-span-1">
                <Label className="text-xs">Jenis</Label>
                <Select value={type} onValueChange={(v:any)=>setType(v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="in">Cash In</SelectItem>
                    <SelectItem value="out">Cash Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-1">
                <Label className="text-xs">Nominal (IDR)</Label>
                <Input inputMode="numeric" placeholder="0" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="rounded-xl" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Kategori</Label>
                <Input list="cats" value={category} onChange={(e)=>setCategory(e.target.value)} className="rounded-xl" />
                <datalist id="cats">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Catatan</Label>
                <Input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="opsional" className="rounded-xl" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Tanggal</Label>
                <Input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="rounded-xl" />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button onClick={addTxn} className="w-full rounded-2xl"><Plus className="w-4 h-4 mr-2"/>Tambah</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="rounded-2xl shadow mb-4">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Filter className="w-4 h-4"/>Filter</CardTitle>
            <Button variant="ghost" size="sm" onClick={()=>{setQ("");setFType("all");setFFrom("");setFTo("");setFCategory("all");}} className="rounded-xl"><RotateCcw className="w-4 h-4 mr-1"/>Reset</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs">Cari</Label>
                <Input placeholder="kategori/catatan" value={q} onChange={(e)=>setQ(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs">Jenis</Label>
                <Select value={fType} onValueChange={setFType}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="in">Cash In</SelectItem>
                    <SelectItem value="out">Cash Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Kategori</Label>
                <Select value={fCategory} onValueChange={setFCategory}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl max-h-64 overflow-auto">
                    <SelectItem value="all">Semua</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Dari</Label>
                <Input type="date" value={fFrom} onChange={(e)=>setFFrom(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs">Sampai</Label>
                <Input type="date" value={fTo} onChange={(e)=>setFTo(e.target.value)} className="rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="rounded-2xl shadow">
          <CardHeader className="pb-2"><CardTitle className="text-base">Transaksi</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-600">{filtered.length} transaksi</div>
              <div className="flex gap-2">
                <Badge className="rounded-xl" variant="secondary">In: {currency(totalIn)}</Badge>
                <Badge className="rounded-xl" variant="secondary">Out: {currency(totalOut)}</Badge>
                <Badge className="rounded-xl">Saldo: {currency(balance)}</Badge>
                <Button variant="destructive" size="sm" onClick={clearAll} className="rounded-xl"><Trash2 className="w-4 h-4 mr-1"/>Hapus Semua</Button>
              </div>
            </div>

            <div className="divide-y rounded-xl border">
              <AnimatePresence initial={false}>
                {filtered.map(t => (
                  <motion.div key={t.id} layout initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}} className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`rounded-xl ${t.type === 'in' ? 'bg-emerald-600' : 'bg-rose-600'}`}>{t.type === 'in' ? 'IN' : 'OUT'}</Badge>
                        <div className="font-semibold">{currency(t.amount)}</div>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">{t.category} • {t.note || "-"}</div>
                      <div className="text-[10px] text-slate-400">{t.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={()=>removeTxn(t.id)} className="rounded-xl"><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filtered.length === 0 && (
              <div className="text-center text-sm text-slate-500 py-8">Belum ada data. Tambahkan transaksi pertama kamu di atas.</div>
            )}
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-slate-400 mt-6">
          Dibuat dengan ❤ — data disimpan lokal (localStorage). Aman dipakai offline & mobile-friendly.
        </footer>
      </div>
    </div>
  );
}
