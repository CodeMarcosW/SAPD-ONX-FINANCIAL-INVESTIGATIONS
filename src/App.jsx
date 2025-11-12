import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import {
  Upload,
  TrendingUp,
  Calendar,
  PiggyBank,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Brush,
  LabelList,
} from "recharts";

function SwitchChip({ checked, label, onChange }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`px-4 py-1 rounded-full text-sm cursor-pointer transition-all duration-200 border ${
        checked
          ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
          : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
      }`}
      onClick={() => onChange(!checked)}
    >
      {label}
    </motion.div>
  );
}

function Button({ onClick, children }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-2 px-6 py-3 text-lg bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow"
    >
      {children}
    </motion.button>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 text-gray-100 p-3 rounded-lg shadow-md border border-gray-700">
        <p className="font-semibold">{data.name}</p>
        <p>
          Cuenta destino:{" "}
          <span className="text-indigo-400">{data.dest || "N/A"}</span>
        </p>
        <p>
          Cantidad:{" "}
          <span className="font-bold">{data.amount.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
}

function parseExcelDate(cell) {
  if (cell === null || cell === undefined || cell === "") return null;
  if (typeof cell === "number") {
    const ms = Math.round((cell - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  if (cell instanceof Date) return isNaN(cell) ? null : cell;
  if (typeof cell === "string") {
    const m = cell.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const hh = parseInt(m[4] || "0", 10);
      const mm = parseInt(m[5] || "0", 10);
      const ss = parseInt(m[6] || "0", 10);
      const d = new Date(year, month, day, hh, mm, ss);
      return isNaN(d) ? null : d;
    }
    const parsed = Date.parse(cell);
    if (!isNaN(parsed)) return new Date(parsed);
  }
  return null;
}

export default function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [showDeposits, setShowDeposits] = useState(true);
  const [showTransfers, setShowTransfers] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        const rows = json.slice(6);

        const parsed = rows
          .map((r) => {
            const date = parseExcelDate(r[0]);
            const amount =
              r[2] === null || r[2] === undefined || r[2] === ""
                ? NaN
                : Number(
                    String(r[2])
                      .toString()
                      .replace(/[^0-9.-]/g, "")
                  );
            const type = (r[3] || "").toString().trim().toLowerCase();
            const origin = r[4] || "";
            const dest = r[5] || "";
            return {
              date,
              amount: isNaN(amount) ? NaN : amount,
              type,
              origin,
              dest,
            };
          })
          .filter((r) => r.date && !isNaN(r.amount));

        parsed.sort((a, b) => a.date - b.date);
        setData(parsed);
      } catch (err) {
        console.error("Error parsing file:", err);
        setData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  const filtered = data.filter((r) => {
    if (r.type.includes("deposit") && !showDeposits) return false;
    if (r.type.includes("transfer") && !showTransfers) return false;
    return true;
  });

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let valueA = a[sortConfig.key];
      let valueB = b[sortConfig.key];
      if (valueA instanceof Date) valueA = valueA.getTime();
      if (valueB instanceof Date) valueB = valueB.getTime();
      if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const totalDeposits = filtered
    .filter((r) => r.type.includes("deposit"))
    .reduce((sum, r) => sum + r.amount, 0);
  const totalTransfers = filtered
    .filter((r) => r.type.includes("transfer"))
    .reduce((sum, r) => sum + r.amount, 0);
  const balance = totalDeposits - totalTransfers;

  const accountTotals = filtered.reduce((acc, r) => {
    if (!acc[r.dest]) acc[r.dest] = 0;
    acc[r.dest] += r.amount;
    return acc;
  }, {});
  const topAccount = Object.entries(accountTotals).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const dayCounts = filtered.reduce((acc, r) => {
    const day = r.date.toLocaleDateString();
    if (!acc[day]) acc[day] = 0;
    acc[day]++;
    return acc;
  }, {});
  const mostActiveDay = Object.entries(dayCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const timelineData = filtered.map((r) => ({
    name: r.date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    amount: r.amount,
    type: r.type,
    dest: r.dest,
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="flex justify-between mb-6 gap-4 flex-wrap items-center">
          <h1 className="text-3xl font-bold text-indigo-400 tracking-wide">
            CID - Investigaciones Financieras
          </h1>
          <div>
            <input
              id="fileInput"
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <Button
              onClick={() => document.getElementById("fileInput").click()}
            >
              <Upload size={20} /> Cargar Excel
            </Button>
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-8 mt-8">
            <Card
              title={
                <div className="flex justify-between items-center">
                  <span>Distribución</span>
                  <div className="flex gap-2">
                    <SwitchChip
                      checked={showDeposits}
                      label="Depósitos"
                      onChange={setShowDeposits}
                    />
                    <SwitchChip
                      checked={showTransfers}
                      label="Transferencias"
                      onChange={setShowTransfers}
                    />
                  </div>
                </div>
              }
              className="col-span-1"
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Depósitos", value: totalDeposits },
                      { name: "Transferencias", value: totalTransfers },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                  >
                    <Cell fill="#4caf50" />
                    <Cell fill="#f44336" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Resumen General" className="col-span-2">
              <ul className="space-y-3 text-white text-xl divide-y divide-gray-800">
                <li className="flex items-center gap-3 py-2">
                  <ArrowUpCircle className="text-green-400" size={22} />
                  <span className="text-green-400 font-semibold">
                    Depósitos:
                  </span>
                  <span className="ml-auto text-white font-semibold">
                    {totalDeposits.toLocaleString()}
                  </span>
                </li>
                <li className="flex items-center gap-3 py-2">
                  <ArrowDownCircle className="text-red-400" size={22} />
                  <span className="text-red-400 font-semibold">
                    Transferencias:
                  </span>
                  <span className="ml-auto text-white font-semibold">
                    {totalTransfers.toLocaleString()}
                  </span>
                </li>
                <li className="flex items-center gap-3 py-2">
                  <Scale className="text-indigo-400" size={22} />
                  <span className="text-indigo-400 font-semibold">
                    Balance:
                  </span>
                  <span className="ml-auto text-white font-semibold">
                    {balance.toLocaleString()}
                  </span>
                </li>
                <li className="flex items-center gap-3 py-2">
                  <TrendingUp className="text-green-400" size={22} />
                  <span className="text-green-400 font-semibold">
                    Cuenta destino con más movimiento:
                  </span>
                  <span className="ml-auto text-white font-semibold">
                    {topAccount ? topAccount[0] : "N/A"}
                  </span>
                </li>
                <li className="flex items-center gap-3 py-2">
                  <Calendar className="text-yellow-400" size={22} />
                  <span className="text-yellow-400 font-semibold">
                    Día con más transacciones:
                  </span>
                  <span className="ml-auto text-white font-semibold">
                    {mostActiveDay ? mostActiveDay[0] : "N/A"}
                  </span>
                </li>
                <li className="flex items-center gap-3 py-2">
                  <PiggyBank className="text-pink-400" size={22} />
                  <span className="text-pink-400 font-semibold">
                    Total cuentas destino:
                  </span>
                  <span className="ml-auto text-white font-semibold">
                    {Object.keys(accountTotals).length}
                  </span>
                </li>
              </ul>
            </Card>

            <Card title="Timeline" className="col-span-3 w-full">
              <div className="overflow-x-auto overflow-y-auto max-h-[500px] p-6 flex justify-center">
                <ResponsiveContainer width="95%" height={450}>
                  <BarChart
                    data={timelineData}
                    layout="vertical"
                    margin={{ top: 30, left: 80, right: 40, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fill: "#ccc" }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: "#fff", fontSize: 12 }}
                      width={260}
                      interval={0}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "rgba(255,255,255,0.1)" }}
                    />
                    <Bar
                      dataKey="amount"
                      radius={[10, 10, 10, 10]}
                      barSize={18}
                    >
                      {timelineData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.type.includes("deposit")
                              ? "#4caf50"
                              : "#f44336"
                          }
                        />
                      ))}
                    </Bar>
                    <Brush
                      dataKey="name"
                      height={25}
                      stroke="#8884d8"
                      travellerWidth={15}
                      fill="#111827"
                      tickFormatter={(v) => v.split(" ")[0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Detalle de transacciones"
              className="col-span-3 overflow-x-auto"
            >
              <table className="min-w-full text-left border-collapse rounded-2xl overflow-hidden">
                <thead className="bg-gray-800 text-gray-300">
                  <tr>
                    {["date", "amount", "type", "origin", "dest"].map(
                      (key, idx) => (
                        <th
                          key={idx}
                          onClick={() => requestSort(key)}
                          className="py-2 px-4 cursor-pointer hover:bg-gray-700"
                        >
                          {key === "date"
                            ? "Fecha"
                            : key === "type"
                            ? "Tipo"
                            : key === "origin"
                            ? "Origen"
                            : key === "dest"
                            ? "Destino"
                            : "Cantidad"}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((r, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-800 hover:bg-gray-800"
                    >
                      <td className="py-2 px-4">{r.date.toLocaleString()}</td>
                      <td
                        className={`py-2 px-4 font-semibold ${
                          r.type.includes("deposit")
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {r.amount.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 capitalize">{r.type}</td>
                      <td className="py-2 px-4">{r.origin}</td>
                      <td className="py-2 px-4">{r.dest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md ${className}`}
    >
      <h2 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-800 pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}
