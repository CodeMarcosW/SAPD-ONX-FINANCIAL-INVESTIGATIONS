import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  CartesianGrid,
  Brush,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  CalendarDays,
} from "lucide-react";

export default function App() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showDeposits, setShowDeposits] = useState(true);
  const [showTransfers, setShowTransfers] = useState(true);

  // Parse Excel file
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const rows = rawData.slice(6).filter((r) => r.length >= 6); // desde fila 7
      const parsed = rows.map((row) => ({
        fecha: new Date(row[0]),
        monto: Number(row[2]) || 0,
        tipo: String(row[3]).toLowerCase(),
        origen: row[4],
        destino: row[5],
      }));

      setData(parsed);
      setFilteredData(parsed);
    };
    reader.readAsBinaryString(file);
  };

  // Filtrar según switches
  const toggleFilter = (type) => {
    let newShowDeposits = showDeposits;
    let newShowTransfers = showTransfers;

    if (type === "deposit") newShowDeposits = !showDeposits;
    if (type === "transfer") newShowTransfers = !showTransfers;

    setShowDeposits(newShowDeposits);
    setShowTransfers(newShowTransfers);

    setFilteredData(
      data.filter(
        (d) =>
          (newShowDeposits && d.tipo === "deposit") ||
          (newShowTransfers && d.tipo === "transfer")
      )
    );
  };

  // Cálculos resumen
  const deposits = filteredData
    .filter((d) => d.tipo === "deposit")
    .reduce((a, b) => a + b.monto, 0);
  const transfers = filteredData
    .filter((d) => d.tipo === "transfer")
    .reduce((a, b) => a + b.monto, 0);
  const balance = deposits - transfers;

  const accountCounts = filteredData.reduce((acc, cur) => {
    acc[cur.destino] = (acc[cur.destino] || 0) + cur.monto;
    return acc;
  }, {});
  const topAccount =
    Object.entries(accountCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  const dayCounts = filteredData.reduce((acc, cur) => {
    const day = cur.fecha.toLocaleDateString();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  const topDay =
    Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  const uniqueDestinos = [...new Set(filteredData.map((d) => d.destino))]
    .length;

  // Timeline data
  const timelineData = filteredData.map((item) => ({
    fecha: item.fecha.toLocaleString(),
    monto: item.monto,
    tipo: item.tipo,
    destino: item.destino,
  }));

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-800 text-white p-2 rounded-md border border-gray-700">
          <p>
            <b>Fecha:</b> {d.fecha}
          </p>
          <p>
            <b>Cantidad:</b> {d.monto.toLocaleString()}
          </p>
          <p>
            <b>Cuenta destino:</b> {d.destino}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-wide text-gray-100">
          CID - Investigaciones Financieras
        </h1>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="block cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
        />
      </div>

      {/* Summary Card */}
      <motion.div
        className="grid md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="col-span-2 bg-gray-900 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-3 text-indigo-400">
            Resumen General
          </h2>
          <ul className="space-y-3 text-lg">
            <li className="flex justify-between border-b border-gray-700 pb-2">
              <span className="flex items-center gap-2">
                <ArrowUpRight className="text-green-400" /> Depósitos:
              </span>
              <span className="text-green-400">
                {deposits.toLocaleString()}
              </span>
            </li>
            <li className="flex justify-between border-b border-gray-700 pb-2">
              <span className="flex items-center gap-2">
                <ArrowDownRight className="text-red-400" /> Transferencias:
              </span>
              <span className="text-red-400">{transfers.toLocaleString()}</span>
            </li>
            <li className="flex justify-between border-b border-gray-700 pb-2">
              <span className="flex items-center gap-2">
                <TrendingUp className="text-yellow-400" /> Balance:
              </span>
              <span>{balance.toLocaleString()}</span>
            </li>
            <li className="flex justify-between border-b border-gray-700 pb-2">
              <span className="flex items-center gap-2">
                <ArrowUpRight className="text-blue-400" /> Cuenta destino con
                más movimiento:
              </span>
              <span>{topAccount}</span>
            </li>
            <li className="flex justify-between border-b border-gray-700 pb-2">
              <span className="flex items-center gap-2">
                <CalendarDays className="text-purple-400" /> Día con más
                transacciones:
              </span>
              <span>{topDay}</span>
            </li>
            <li className="flex justify-between border-b border-gray-700 pb-2">
              <span className="flex items-center gap-2">
                <ArrowUpRight className="text-pink-400" /> Total cuentas
                destino:
              </span>
              <span>{uniqueDestinos}</span>
            </li>
          </ul>
        </div>

        {/* Distribución */}
        <div className="bg-gray-900 rounded-2xl p-6 shadow-lg flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4 text-indigo-400 flex items-center justify-between w-full">
            Distribución
            <div className="flex gap-2">
              <button
                onClick={() => toggleFilter("deposit")}
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  showDeposits ? "bg-green-600" : "bg-gray-700"
                }`}
              >
                Depósitos
              </button>
              <button
                onClick={() => toggleFilter("transfer")}
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  showTransfers ? "bg-red-600" : "bg-gray-700"
                }`}
              >
                Transferencias
              </button>
            </div>
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { tipo: "Depósitos", monto: deposits },
                  { tipo: "Transferencias", monto: transfers },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="tipo" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Bar dataKey="monto" fill="#4f46e5" radius={[10, 10, 0, 0]}>
                  <LabelList dataKey="monto" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        className="bg-gray-900 rounded-2xl p-6 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="text-xl font-semibold mb-4 text-indigo-400">
          Timeline Financiero
        </h2>
        <div className="h-96 overflow-x-scroll">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={timelineData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="fecha" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip content={<CustomTooltip />} />
              <Brush dataKey="fecha" height={30} stroke="#6366f1" />
              <Bar
                dataKey="monto"
                fill="#22c55e"
                radius={[5, 5, 0, 0]}
                onWheel={(e) => {
                  e.currentTarget.parentElement.scrollLeft += e.deltaY;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Tabla de datos */}
      {filteredData.length > 0 && (
        <motion.div
          className="bg-gray-900 rounded-2xl p-6 shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl font-semibold mb-3 text-indigo-400">
            Vista Detallada
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-800 text-gray-300 uppercase">
                <tr>
                  <th className="py-2 px-3">Fecha</th>
                  <th className="py-2 px-3">Cantidad</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3">Cuenta Origen</th>
                  <th className="py-2 px-3">Cuenta Destino</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-800 hover:bg-gray-800/60 transition"
                  >
                    <td className="py-2 px-3">{row.fecha.toLocaleString()}</td>
                    <td
                      className={`py-2 px-3 font-semibold ${
                        row.tipo === "deposit"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {row.monto.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 capitalize">{row.tipo}</td>
                    <td className="py-2 px-3">{row.origen}</td>
                    <td className="py-2 px-3">{row.destino}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
